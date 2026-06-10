// ─────────────────────────────────────────────────────────────────────────────
// EVA.STUDIO.F3 (2026-06-09) — generate-eva-replay-moments
//
// Pré-computa os MOMENTOS-CHAVE do replay de prova de confiança. Pega conversas
// REAIS com desfecho (perdida/sumida/ganha), acha o ponto onde o lead testou o
// vendedor, e gera como a EVA TERIA respondido ali — usando o MESMO
// eva_business_context que o whatsapp-copilot usa, pra não divergir da EVA real.
//
// MANUAL: só roda quando o admin clica "Atualizar replay" na aba Simulações.
// Sem cron, sem trigger. Persiste em eva_replay_moments (service_role).
//
// Curadoria (núcleo perdidas/sumidas + tempero de ganhas):
//   - lost    → deal.stage = 'closed_lost'  (loss_reason vira detalhe)
//   - won     → deal.stage = 'closed_won'    (limitado: no máx GANHAS_CAP)
//   - ghosted → deal ativo + lead falou por último + parado há GHOST_DAYS dias
//
// Anti-alucinação (espelha generate-eva-context-suggestions):
//   - "Use SÓ o que está no transcript." Sem inventar fala.
//   - "Preço/número só se aparecer no contexto da agência."
//   - "Respeite as promessas proibidas: a EVA não pode prometer o que é vetado."
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const MODEL = "gpt-5.4-nano";
const MAX_CONVERSATIONS = 8;   // teto de custo por run
const GANHAS_CAP = 2;          // ganhas são tempero, não núcleo
const MIN_MESSAGES = 4;        // conversa curta demais não vira momento
const GHOST_DAYS = 7;          // parado há mais que isso + lead por último = sumido
const MAX_TRANSCRIPT_MSGS = 40;

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

type Outcome = "lost" | "ghosted" | "won";

const SYSTEM_PROMPT = `Você é a EVA, assistente comercial de uma agência de marketing, avaliando uma conversa de vendas que JÁ TERMINOU.

Sua tarefa: olhar o transcript real e o contexto da agência, achar o MOMENTO-CHAVE (o ponto onde o lead testou o vendedor: objeção de preço, pedido de garantia, dúvida que trava, sinal de fechamento) e mostrar como VOCÊ teria respondido ali.

Regras estritas:
1. Use SÓ o que está no transcript. Não invente falas que o lead ou o vendedor não disseram.
2. Preço, prazo ou número só se aparecerem no contexto da agência ou no transcript. Senão, responda sem cravar valor.
3. Respeite as PROMESSAS PROIBIDAS do contexto: você nunca pode prometer o que é vetado (ex: resultado garantido). Se o momento exige isso, sua resposta deve ser honesta e reenquadrar, não prometer.
4. "critical" = true APENAS quando o momento envolve: promessa proibida / pedido de garantia de resultado, ou objeção forte de preço/risco que decidiu a venda. Nesses, errar é grave.
5. "lead_message" = a fala do lead que criou a tensão (cite do transcript, encurte se longa).
6. "seller_reply" = o que o vendedor humano respondeu de fato logo depois (cite do transcript). Se não houver, use null.
7. "eva_reply" = como VOCÊ responderia: específica, no tom da agência, sem clichê, respeitando as regras. 1 a 4 frases.
8. "tension" = rótulo curto do tipo de momento (ex: "Objeção de preço", "Pedido de garantia", "Sinal de fechamento").
9. "context" = 1 frase do que rolou até o momento.
10. "outcome_detail" = 1 frase curta amarrando ao desfecho informado (te passo se foi perdido/sumido/ganho), sem culpar o vendedor.

Retorne JSON estrito:
{
  "tension": "Objeção de preço",
  "critical": true,
  "context": "...",
  "lead_message": "...",
  "eva_reply": "...",
  "seller_reply": "..." | null,
  "outcome_detail": "..."
}`;

// ── Contexto compacto da agência (subset do buildContextBlock do copilot) ────
function buildContextBlock(ctx: Record<string, unknown> | null): string {
  if (!ctx) return "(sem contexto cadastrado — responda genérico, sem cravar números)";
  const lines: string[] = [];
  const a = (ctx.agency ?? {}) as Record<string, unknown>;
  const str = (k: string, max = 400): string | null => {
    const v = a[k];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };
  const parts: string[] = [];
  const desc = str("descricao", 500);
  if (desc) parts.push(`Descrição: ${desc}`);
  const tom = str("tom_de_voz", 300);
  if (tom) parts.push(`Tom de voz: ${tom}`);
  const handoff = str("regras_handoff", 300);
  if (handoff) parts.push(`Regras de handoff: ${handoff}`);
  const promessas = a.promessas_proibidas;
  if (Array.isArray(promessas) && promessas.length) {
    parts.push(`PROMESSAS PROIBIDAS: ${promessas.slice(0, 10).join("; ")}`);
  }
  if (parts.length) lines.push("## Agência\n" + parts.join("\n"));

  const services = Array.isArray(ctx.services) ? ctx.services : [];
  if (services.length) {
    const top = services.slice(0, 5).map((s: any, i: number) => {
      const nome = typeof s?.nome === "string" ? s.nome : `Serviço ${i + 1}`;
      const min = typeof s?.preco_min === "number" ? s.preco_min : null;
      const max = typeof s?.preco_max === "number" ? s.preco_max : null;
      const price = min != null && max != null ? `R$ ${min}–${max}`
        : min != null ? `a partir de R$ ${min}`
        : max != null ? `até R$ ${max}` : "preço não cadastrado";
      return `- ${nome} (${price})`;
    });
    lines.push("## Serviços\n" + top.join("\n"));
  }
  const icp = (ctx.icp ?? {}) as Record<string, unknown>;
  const icpDesc = typeof icp.descricao === "string" ? icp.descricao.slice(0, 300) : null;
  if (icpDesc) lines.push("## Cliente ideal\n" + icpDesc);
  return lines.join("\n\n") || "(contexto vazio)";
}

interface ConvRow {
  id: string;
  deal_id: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  last_message_at: string | null;
  contact: { name: string | null } | null;
  deal: { stage: string | null; loss_reason: string | null; customer_name: string | null } | null;
}

/** Classifica o desfecho a partir do deal + atividade. null = não elegível. */
function classifyOutcome(c: ConvRow, nowMs: number): Outcome | null {
  const stage = c.deal?.stage ?? null;
  if (stage === "closed_lost") return "lost";
  if (stage === "closed_won") return "won";
  // ghosted: deal ainda vivo, lead falou por último, parado há GHOST_DAYS+
  const inb = c.last_inbound_at ? Date.parse(c.last_inbound_at) : 0;
  const outb = c.last_outbound_at ? Date.parse(c.last_outbound_at) : 0;
  const last = c.last_message_at ? Date.parse(c.last_message_at) : 0;
  const ghostMs = GHOST_DAYS * 24 * 60 * 60 * 1000;
  if (inb > outb && last > 0 && nowMs - last > ghostMs) return "ghosted";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "missing_auth" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "invalid_auth" });

  // company_id do próprio usuário (via RLS)
  const { data: prof } = await userClient
    .from("profiles").select("company_id").eq("id", user.id).maybeSingle();
  const companyId = prof?.company_id;
  if (!companyId) return json(400, { error: "no_company" });

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!OPENAI_API_KEY) throw new Error("missing_openai_key");

    // Contexto da agência (mesma fonte do copilot)
    const { data: ctxRow } = await adminClient
      .from("eva_business_context")
      .select("agency, services, icp, playbooks")
      .eq("company_id", companyId)
      .maybeSingle();
    const contextBlock = buildContextBlock(ctxRow ?? null);

    // Conversas da company com possível desfecho
    const { data: convsRaw, error: convErr } = await adminClient
      .from("channel_conversations")
      .select("id, deal_id, last_inbound_at, last_outbound_at, last_message_at, contact:channel_contacts(name), deal:deals(stage, loss_reason, customer_name)")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (convErr) throw new Error(`conv_query:${convErr.message?.slice(0, 120)}`);

    const nowMs = Date.now();
    const classified = (convsRaw ?? [])
      .map((c) => ({ row: c as unknown as ConvRow, outcome: classifyOutcome(c as unknown as ConvRow, nowMs) }))
      .filter((x): x is { row: ConvRow; outcome: Outcome } => x.outcome !== null);

    // Núcleo = perdidas/sumidas; ganhas entram com teto baixo (tempero)
    const core = classified.filter((x) => x.outcome !== "won");
    const wins = classified.filter((x) => x.outcome === "won").slice(0, GANHAS_CAP);
    const selected = [...core, ...wins].slice(0, MAX_CONVERSATIONS);

    if (selected.length === 0) {
      return json(200, { ok: true, generated: 0, reason: "no_eligible_conversations" });
    }

    let generated = 0;
    const skipped: string[] = [];

    for (const { row, outcome } of selected) {
      // Transcript real (texto)
      const { data: msgs } = await adminClient
        .from("channel_messages")
        .select("direction, body, message_timestamp")
        .eq("conversation_id", row.id)
        .not("body", "is", null)
        .order("message_timestamp", { ascending: true })
        .limit(MAX_TRANSCRIPT_MSGS);
      const lines = (msgs ?? [])
        .filter((m) => typeof m.body === "string" && m.body.trim())
        .map((m) => `${m.direction === "inbound" ? "Lead" : "Vendedor"}: ${String(m.body).trim().slice(0, 500)}`);
      if (lines.length < MIN_MESSAGES) { skipped.push(row.id); continue; }

      const leadName = row.contact?.name || row.deal?.customer_name || "Lead";
      const outcomeWord = outcome === "lost" ? "PERDIDO" : outcome === "won" ? "GANHO" : "SUMIU (lead parou de responder)";
      const lossHint = outcome === "lost" && row.deal?.loss_reason ? ` Motivo registrado da perda: ${row.deal.loss_reason}.` : "";

      const userPrompt = `CONTEXTO DA AGÊNCIA:\n${contextBlock}\n\nDESFECHO REAL desta conversa: ${outcomeWord}.${lossHint}\nLEAD: ${leadName}\n\nTRANSCRIPT:\n${lines.join("\n")}\n\nAche o momento-chave e devolva o JSON estrito.`;

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: 900,
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) {
        console.error(`[replay] OpenAI ${resp.status} conv=${row.id}:`, (await resp.text()).slice(0, 200));
        skipped.push(row.id);
        continue;
      }
      const completion = await resp.json();
      const content = completion?.choices?.[0]?.message?.content;
      if (!content) { skipped.push(row.id); continue; }

      let parsed: any;
      try {
        parsed = JSON.parse(String(content).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch { skipped.push(row.id); continue; }

      const evaReply = typeof parsed?.eva_reply === "string" ? parsed.eva_reply.trim() : "";
      const leadMessage = typeof parsed?.lead_message === "string" ? parsed.lead_message.trim() : "";
      if (!evaReply || !leadMessage) { skipped.push(row.id); continue; }

      const { error: upErr } = await adminClient
        .from("eva_replay_moments")
        .upsert({
          company_id: companyId,
          conversation_id: row.id,
          deal_id: row.deal_id,
          lead_name: leadName.slice(0, 160),
          tension: (typeof parsed?.tension === "string" ? parsed.tension : "Momento de tensão").slice(0, 120),
          critical: parsed?.critical === true,
          outcome,
          outcome_detail: (typeof parsed?.outcome_detail === "string" ? parsed.outcome_detail : "").slice(0, 300),
          context: (typeof parsed?.context === "string" ? parsed.context : "").slice(0, 500),
          lead_message: leadMessage.slice(0, 800),
          eva_reply: evaReply.slice(0, 1200),
          seller_reply: typeof parsed?.seller_reply === "string" ? parsed.seller_reply.trim().slice(0, 800) : null,
          model: MODEL,
          generated_at: new Date().toISOString(),
        }, { onConflict: "company_id,conversation_id" });
      if (upErr) { console.error("[replay] upsert error:", upErr.message); skipped.push(row.id); continue; }
      generated++;
    }

    return json(200, { ok: true, generated, skipped: skipped.length, considered: selected.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-eva-replay-moments] failed:", msg);
    return json(500, { ok: false, error: msg });
  }
});
