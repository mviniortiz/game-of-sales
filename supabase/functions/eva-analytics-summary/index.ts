// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: eva-analytics-summary
//
// Backend de agregação do painel "Analytics da EVA". POST { rangeDays?: 7|30|90 }
// (default 7). Valida JWT (authenticated) e escopa TUDO por company_id do usuário
// (super_admin pode passar companyId no body, no padrão report-agent).
//
// Devolve o contrato consumido pelo painel front (ver README do painel). Tudo é
// best-effort: cada bloco roda isolado e, se a tabela/coluna não existir num
// ambiente sem migration, retorna 0/null/empty em vez de quebrar a resposta.
//
// Sem custo de IA: são apenas queries agregadas no Postgres via service_role,
// já escopadas por company_id (a auth do usuário foi validada antes).
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ALLOWED_RANGES = new Set([7, 30, 90]);

// ─── Helpers ────────────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Extrai o texto da qualification JSON. O shape real (ver
// src/lib/eva/qualificationSchema.ts) usa score_sugerido, temperatura e objecao
// (string singular). A coluna nativa conversation_summaries.temperature/objections
// é o fallback quando a qualification JSON está vazia (análises legadas).
type QualJson = {
  score_sugerido?: number | null;
  temperatura?: string | null;
  objecao?: string | null;
  proxima_acao?: string | null;
};

function normalizeObjection(raw: string): string {
  return raw.trim().toLowerCase();
}

function titleCase(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// ─── Blocos de agregação ────────────────────────────────────────────────────

async function buildApproval(admin: any, companyId: string, sinceIso: string) {
  // agent_suggestions criadas no período, contadas por status.
  const { data, error } = await admin
    .from("agent_suggestions")
    .select("status")
    .eq("company_id", companyId)
    .gte("created_at", sinceIso);
  if (error) throw error;

  const rows = (data || []) as { status: string }[];
  if (rows.length === 0) return { empty: true as const };

  const counts = { pending: 0, accepted: 0, adjusted: 0, rejected: 0, sent: 0 };
  for (const r of rows) {
    if (r.status in counts) (counts as Record<string, number>)[r.status]++;
  }
  // expired não entra no denominador (não é um desfecho de qualidade).
  const resolved = counts.accepted + counts.adjusted + counts.rejected + counts.sent;
  const positive = counts.accepted + counts.adjusted + counts.sent;
  const rate = resolved > 0 ? positive / resolved : 0;

  return {
    total: rows.length,
    pending: counts.pending,
    accepted: counts.accepted,
    adjusted: counts.adjusted,
    rejected: counts.rejected,
    sent: counts.sent,
    rate,
  };
}

async function buildConversationBlocks(admin: any, companyId: string, sinceIso: string) {
  const { data, error } = await admin
    .from("conversation_summaries")
    .select("qualification, temperature, objections")
    .eq("company_id", companyId)
    .gte("analyzed_at", sinceIso);
  if (error) throw error;

  const rows = (data || []) as {
    qualification: QualJson | null;
    temperature: string | null;
    objections: string[] | null;
  }[];

  const temperature = { quente: 0, morno: 0, frio: 0 };
  const scores: number[] = [];
  let qualified = 0;
  const objectionCounts = new Map<string, { label: string; count: number }>();

  for (const r of rows) {
    const q = (r.qualification || {}) as QualJson;

    // Temperatura: qualification.temperatura tem prioridade; fallback coluna nativa.
    const temp = q.temperatura ?? r.temperature ?? null;
    if (temp === "quente" || temp === "morno" || temp === "frio") temperature[temp]++;

    // Score médio (de qualification.score_sugerido, 0..100).
    if (typeof q.score_sugerido === "number") scores.push(q.score_sugerido);

    // Qualified: contamos conversa como qualificada quando há score sugerido
    // (a EVA conseguiu pontuar o lead) ou temperatura definida.
    if (typeof q.score_sugerido === "number" || temp) qualified++;

    // Objeções: qualification.objecao (string singular) + coluna objections[].
    const objs: string[] = [];
    if (typeof q.objecao === "string" && q.objecao.trim()) objs.push(q.objecao);
    if (Array.isArray(r.objections)) {
      for (const o of r.objections) if (typeof o === "string" && o.trim()) objs.push(o);
    }
    for (const o of objs) {
      const key = normalizeObjection(o);
      const existing = objectionCounts.get(key);
      if (existing) existing.count++;
      else objectionCounts.set(key, { label: titleCase(o.trim()), count: 1 });
    }
  }

  const topObjections = [...objectionCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const scoreAvg = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  return { temperature, scoreAvg, qualified, topObjections };
}

async function buildSla(admin: any, companyId: string, sinceIso: string) {
  // firstReplyMedianMin: mediana de (last_outbound_at - last_inbound_at) em minutos,
  // sobre conversas com ambos timestamps e resposta DEPOIS do último inbound.
  const { data, error } = await admin
    .from("channel_conversations")
    .select("last_inbound_at, last_outbound_at")
    .eq("company_id", companyId)
    .gte("updated_at", sinceIso);
  if (error) throw error;

  const rows = (data || []) as {
    last_inbound_at: string | null;
    last_outbound_at: string | null;
  }[];

  const deltas: number[] = [];
  for (const r of rows) {
    if (!r.last_inbound_at || !r.last_outbound_at) continue;
    const inbound = new Date(r.last_inbound_at).getTime();
    const outbound = new Date(r.last_outbound_at).getTime();
    if (Number.isNaN(inbound) || Number.isNaN(outbound)) continue;
    const diffMin = (outbound - inbound) / 60_000;
    if (diffMin > 0) deltas.push(diffMin);
  }

  const med = median(deltas);
  return {
    firstReplyMedianMin: med !== null ? Math.round(med * 10) / 10 : null,
    conversations: rows.length,
  };
}

async function buildFunnel(admin: any, companyId: string, sinceIso: string) {
  const { data, error } = await admin
    .from("deals")
    .select("stage")
    .eq("company_id", companyId)
    .gte("created_at", sinceIso);
  if (error) throw error;

  const funnel = {
    lead: 0,
    qualification: 0,
    proposal: 0,
    negotiation: 0,
    closed_won: 0,
    closed_lost: 0,
  };
  for (const r of (data || []) as { stage: string }[]) {
    if (r.stage in funnel) (funnel as Record<string, number>)[r.stage]++;
  }
  return funnel;
}

// ─── Fase 2 — Funil atribuível à EVA ──────────────────────────────────────────
// Counts por stage SÓ de deals com agent_suggestion_id não-null no período.
// Atribuição: o deal nasceu de uma sugestão da EVA (manual ou híbrido).
async function buildFunnelEva(admin: any, companyId: string, sinceIso: string) {
  const { data, error } = await admin
    .from("deals")
    .select("stage")
    .eq("company_id", companyId)
    .not("agent_suggestion_id", "is", null)
    .gte("created_at", sinceIso);
  if (error) throw error;

  const rows = (data || []) as { stage: string }[];
  if (rows.length === 0) return { empty: true as const };

  const funnel = {
    lead: 0,
    qualification: 0,
    proposal: 0,
    negotiation: 0,
    closed_won: 0,
    closed_lost: 0,
  };
  for (const r of rows) {
    if (r.stage in funnel) (funnel as Record<string, number>)[r.stage]++;
  }
  return { ...funnel, total: rows.length };
}

// ─── Fase 2 — Tendência temporal diária ───────────────────────────────────────
// Para cada dia do período:
//   approvalRate = (accepted+adjusted+sent) / (resolvidas no dia) ou null se 0.
//     "resolvidas" = sugestões com resolved_at naquele dia e desfecho de
//     qualidade (accepted/adjusted/sent/rejected). expired não conta.
//   qualified = conversation_summaries analisadas com qualificação naquele dia.
function dayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function buildTrend(admin: any, companyId: string, sinceIso: string) {
  // Sugestões resolvidas no período (por resolved_at).
  const { data: sugData, error: sugErr } = await admin
    .from("agent_suggestions")
    .select("status, resolved_at")
    .eq("company_id", companyId)
    .gte("resolved_at", sinceIso);
  if (sugErr) throw sugErr;

  // Conversas analisadas no período (por analyzed_at).
  const { data: convData, error: convErr } = await admin
    .from("conversation_summaries")
    .select("qualification, temperature, analyzed_at")
    .eq("company_id", companyId)
    .gte("analyzed_at", sinceIso);
  if (convErr) throw convErr;

  // Acumuladores por dia.
  const days = new Map<string, { resolved: number; positive: number; qualified: number }>();
  const bump = (key: string) => {
    let e = days.get(key);
    if (!e) { e = { resolved: 0, positive: 0, qualified: 0 }; days.set(key, e); }
    return e;
  };

  for (const r of (sugData || []) as { status: string; resolved_at: string | null }[]) {
    if (!r.resolved_at) continue;
    const key = dayKey(r.resolved_at);
    if (!key) continue;
    const e = bump(key);
    // expired não entra no denominador de qualidade.
    if (r.status === "accepted" || r.status === "adjusted" || r.status === "sent") {
      e.resolved++; e.positive++;
    } else if (r.status === "rejected") {
      e.resolved++;
    }
  }

  for (const r of (convData || []) as { qualification: QualJson | null; temperature: string | null; analyzed_at: string }[]) {
    const key = dayKey(r.analyzed_at);
    if (!key) continue;
    const q = (r.qualification || {}) as QualJson;
    const temp = q.temperatura ?? r.temperature ?? null;
    // qualificada = a EVA pontuou (score) ou definiu temperatura (espelha o
    // critério de "qualified" do bloco de conversas da Fase 1).
    if (typeof q.score_sugerido === "number" || temp) bump(key).qualified++;
  }

  return [...days.entries()]
    .map(([date, v]) => ({
      date,
      approvalRate: v.resolved > 0 ? v.positive / v.resolved : null,
      qualified: v.qualified,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

async function buildTopGaps(admin: any, companyId: string, sinceIso: string) {
  // Gaps abertos primeiro (status='open'), por occurrence_count desc, top 5.
  // Sem filtro de período: um gap reincidente é relevante mesmo se nasceu antes.
  const { data, error } = await admin
    .from("eva_knowledge_gaps")
    .select("gap_description, occurrence_count, status")
    .eq("company_id", companyId)
    .order("occurrence_count", { ascending: false })
    .limit(40);
  if (error) throw error;

  const rows = (data || []) as {
    gap_description: string;
    occurrence_count: number;
    status: string;
  }[];

  // open primeiro, depois resolved; dentro de cada grupo já vem por occurrence desc.
  const open = rows.filter((r) => r.status === "open");
  const others = rows.filter((r) => r.status !== "open");
  return [...open, ...others].slice(0, 5).map((r) => ({
    description: r.gap_description,
    count: r.occurrence_count,
    status: r.status === "open" ? ("open" as const) : ("resolved" as const),
  }));
  // sinceIso intencionalmente não usado aqui (gaps são acumulativos).
}

async function buildTopMemory(admin: any, companyId: string) {
  const { data, error } = await admin
    .from("eva_memory")
    .select("content, usage_count, type")
    .eq("company_id", companyId)
    .order("usage_count", { ascending: false })
    .limit(5);
  if (error) throw error;
  return ((data || []) as { content: string; usage_count: number; type: string }[]).map((r) => ({
    content: r.content,
    usageCount: r.usage_count,
    type: r.type,
  }));
}

// Roda um bloco isolando falhas: se a tabela não existir ou der erro, devolve
// o fallback e loga, sem derrubar a resposta inteira.
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[eva-analytics-summary] ${label} unavailable:`, err);
    return fallback;
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const { data: profile } = await admin
      .from("profiles")
      .select("is_super_admin, company_id")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = !!profile?.is_super_admin;

    let body: { rangeDays?: number; companyId?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rangeDays = ALLOWED_RANGES.has(Number(body.rangeDays)) ? Number(body.rangeDays) : 7;

    const effectiveCompanyId = isSuperAdmin && body.companyId
      ? body.companyId
      : profile?.company_id;
    if (!effectiveCompanyId) return json(400, { error: "company_id não encontrado" });

    const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    const [approval, convBlocks, sla, funnel, funnelEva, trend, topGaps, topMemory] = await Promise.all([
      safe("approval", () => buildApproval(admin, effectiveCompanyId, sinceIso), { empty: true as const }),
      safe(
        "conversation_summaries",
        () => buildConversationBlocks(admin, effectiveCompanyId, sinceIso),
        { temperature: { quente: 0, morno: 0, frio: 0 }, scoreAvg: null as number | null, qualified: 0, topObjections: [] as { label: string; count: number }[] },
      ),
      safe("sla", () => buildSla(admin, effectiveCompanyId, sinceIso), { firstReplyMedianMin: null as number | null, conversations: 0 }),
      safe("funnel", () => buildFunnel(admin, effectiveCompanyId, sinceIso), { lead: 0, qualification: 0, proposal: 0, negotiation: 0, closed_won: 0, closed_lost: 0 }),
      safe("funnelEva", () => buildFunnelEva(admin, effectiveCompanyId, sinceIso), { empty: true as const }),
      safe("trend", () => buildTrend(admin, effectiveCompanyId, sinceIso), [] as { date: string; approvalRate: number | null; qualified: number }[]),
      safe("topGaps", () => buildTopGaps(admin, effectiveCompanyId, sinceIso), [] as { description: string; count: number; status: "open" | "resolved" }[]),
      safe("topMemory", () => buildTopMemory(admin, effectiveCompanyId), [] as { content: string; usageCount: number; type: string }[]),
    ]);

    return json(200, {
      rangeDays,
      approval,
      sla,
      funnel,
      // Fase 2 — funil atribuível à EVA + tendência temporal diária.
      funnelEva,
      trend,
      temperature: convBlocks.temperature,
      scoreAvg: convBlocks.scoreAvg,
      qualified: convBlocks.qualified,
      topObjections: convBlocks.topObjections,
      topGaps,
      topMemory,
      // Fase 1 — sem dado claro de "enviou sem aprovação" pra medir linhas vermelhas.
      // Todo envio passa por aprovar-e-enviar, então não há violação a contar.
      redLines: { empty: true as const },
    });
  } catch (err) {
    console.error("[eva-analytics-summary] error:", err);
    return json(500, { error: "Falha ao agregar analytics da EVA" });
  }
});
