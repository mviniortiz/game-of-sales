// admin-lead-digest
// Quando um novo demo_request cai, esse agente:
// 1. Enriquece a empresa (web search via Tavily — opcional, com fallback gracioso)
// 2. Gera resumo executivo via OpenAI (Claude/GPT)
// 3. Envia WhatsApp pro admin (via Evolution API)
// 4. Cria conta demo pré-populada (auth + profile + company, sem plano)
// 5. Atualiza demo_requests.notes com status

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasLlmKey, llmChat } from "../_shared/llm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const SDR_EVOLUTION_INSTANCE = Deno.env.get("SDR_EVOLUTION_INSTANCE");
const ADMIN_WHATSAPP = Deno.env.get("ADMIN_WHATSAPP"); // formato: 5511999999999
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY"); // opcional — sem ele, pula enrichment
// E-mail do Markus para o aviso de pedido de Raio-X. O WhatsApp acima depende
// de uma instância que caiu em set/2026 ("whatsapp: falhou" nos dois últimos
// pedidos); o e-mail pelo Resend é o aviso que não depende dela.
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <suporte@vyzon.com.br>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface LeadRecord {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  team_size: string | null;
  uses_spreadsheets: boolean | null;
  biggest_pain: string | null;
  improvement_goal: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  source?: string | null;
}

interface Enrichment {
  website?: string;
  industry?: string;
  employeeRange?: string;
  description?: string;
  linkedin?: string;
  raw?: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "!" + Math.floor(Math.random() * 99);
}

async function enrichCompany(company: string, email: string): Promise<Enrichment | null> {
  if (!TAVILY_API_KEY) {
    console.log("[digest] TAVILY_API_KEY ausente — pulando enrichment");
    return null;
  }
  const domain = email.split("@")[1] || "";
  const query = `${company} ${domain} empresa Brasil site linkedin`;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
    });
    if (!res.ok) {
      console.warn("[digest] tavily status", res.status);
      return null;
    }
    const data = await res.json();
    const answer: string = data.answer || "";
    const firstResult = (data.results || [])[0] || {};
    const linkedinResult = (data.results || []).find((r: any) =>
      String(r.url || "").includes("linkedin.com/company")
    );
    return {
      website: firstResult.url,
      description: answer || firstResult.content?.slice(0, 300),
      linkedin: linkedinResult?.url,
      raw: answer,
    };
  } catch (err) {
    console.error("[digest] tavily error", err);
    return null;
  }
}

async function summarizeWithAI(lead: LeadRecord, enrichment: Enrichment | null): Promise<string> {
  if (!hasLlmKey()) {
    return buildFallbackSummary(lead, enrichment);
  }

  const prompt = `Você é um assistente executivo. Um lead preencheu o form de demo. Monte um resumo CURTO (máximo 8 linhas) no formato ideal pra WhatsApp, em português brasileiro. Sem emojis excessivos (max 1-2 no topo). Sem markdown pesado. Use quebras de linha simples. Foque no contexto de qualificação e no que o vendedor deve saber ANTES da demo.

Dados do lead:
- Nome: ${lead.name || "—"}
- Email: ${lead.email}
- Empresa: ${lead.company || "—"}
- WhatsApp: ${lead.phone || "—"}
- Tamanho do time: ${lead.team_size || "—"}
- Usa planilhas: ${lead.uses_spreadsheets === true ? "Sim" : lead.uses_spreadsheets === false ? "Não" : "—"}
- Maior dor: ${lead.biggest_pain || "—"}
- Meta de melhoria: ${lead.improvement_goal || "—"}
- Origem: ${lead.utm_source || lead.source || "direto"}

${enrichment ? `Contexto da empresa (web search):
${enrichment.description || enrichment.raw || "—"}
${enrichment.website ? `Site: ${enrichment.website}` : ""}
${enrichment.linkedin ? `LinkedIn: ${enrichment.linkedin}` : ""}` : ""}

Monte o resumo agora (entregue texto puro, sem preâmbulo):`;

  try {
    const res = await llmChat({
      model: "gpt-5.4-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 400,
    }, { label: "admin-lead-digest" });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) return text;
    console.warn("[digest] openai empty response", data);
  } catch (err) {
    console.error("[digest] openai error", err);
  }
  return buildFallbackSummary(lead, enrichment);
}

function buildFallbackSummary(lead: LeadRecord, enrichment: Enrichment | null): string {
  const parts: string[] = [];
  parts.push("🔥 Novo lead da landing");
  parts.push("");
  parts.push(`${lead.name || "Lead"}${lead.company ? ` · ${lead.company}` : ""}`);
  parts.push(`📧 ${lead.email}`);
  if (lead.phone) parts.push(`📱 ${lead.phone}`);
  parts.push("");
  if (lead.team_size) parts.push(`Time: ${lead.team_size} vendedores`);
  if (lead.uses_spreadsheets === true) parts.push("Ainda usa planilhas");
  if (lead.biggest_pain) parts.push(`Dor: ${lead.biggest_pain}`);
  if (lead.improvement_goal) parts.push(`Meta: ${lead.improvement_goal}`);
  if (enrichment?.description) {
    parts.push("");
    parts.push(`Contexto: ${enrichment.description.slice(0, 200)}`);
  }
  if (lead.utm_source) {
    parts.push("");
    parts.push(`Origem: ${lead.utm_source}${lead.utm_campaign ? ` / ${lead.utm_campaign}` : ""}`);
  }
  return parts.join("\n");
}

async function appendNotes(id: string, lines: string[]) {
  const { data: current } = await supabaseAdmin
    .from("demo_requests")
    .select("notes")
    .eq("id", id)
    .maybeSingle();
  const prev = (current?.notes as string) || "";
  await supabaseAdmin
    .from("demo_requests")
    .update({ notes: prev ? `${prev}\n\n${lines.join(" | ")}` : lines.join(" | ") })
    .eq("id", id);
}

// Pedido de Raio-X da home solar e das páginas por ângulo. Não cria conta
// demo: o lead se cadastra na conversa de 20 minutos, e uma conta prévia com o
// mesmo e-mail travaria esse cadastro. Mensagem fixa, sem IA: o que importa é
// o Markus chamar rápido, com o ângulo e o anúncio de origem à vista.
const RAIO_X_SOURCE = "orcamento_teste";
const ANGLE_LABEL: Record<string, string> = {
  "/": "home (proposta que sumiu)",
  "/raio-x/parado": "dinheiro parado",
  "/raio-x/vou-pensar": "vou pensar",
};

async function buildRaioXDigest(lead: LeadRecord): Promise<string> {
  const { data: req } = await supabaseAdmin
    .from("demo_requests")
    .select("landing_page, utm_content, utm_campaign")
    .eq("id", lead.id)
    .maybeSingle();
  let path = "";
  try {
    path = req?.landing_page ? new URL(req.landing_page, "https://vyzon.com.br").pathname : "";
  } catch {
    path = "";
  }
  const first = (lead.name || "").trim().split(/\s+/)[0] || "tudo bem";
  const opening =
    `Oi, ${first}, aqui é o Markus, do Vyzon. Vi que você pediu o Raio-X das suas propostas. ` +
    `Consegue 20 minutos hoje ou amanhã pra gente olhar juntos? Você conecta o WhatsApp na hora e já vê quanto tem parado.`;
  const digits = lead.phone ? normalizePhone(lead.phone) : "";
  const monthly = (lead.biggest_pain || "").replace(/^Energia solar\.\s*/, "");
  const origin = req?.utm_content
    ? `Anúncio: ${req.utm_content}`
    : req?.utm_campaign
    ? `Campanha: ${req.utm_campaign}`
    : "Origem: sem anúncio";
  const lines = [
    "Novo pedido de Raio-X",
    "",
    `${lead.name || "Lead"}${lead.company ? `, ${lead.company}` : ""}`,
    digits ? `WhatsApp: +${digits}` : "",
    `E-mail: ${lead.email}`,
    monthly,
    `Página: ${ANGLE_LABEL[path] || path || "desconhecida"}`,
    origin,
  ].filter(Boolean);
  if (digits) lines.push("", "Chamar agora:", `https://wa.me/${digits}?text=${encodeURIComponent(opening)}`);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendAdminEmail(subject: string, message: string): Promise<boolean> {
  if (!ADMIN_EMAIL || !RESEND_API_KEY) {
    console.warn("[digest] ADMIN_EMAIL ou RESEND_API_KEY ausente — pulando e-mail");
    return false;
  }
  const html = message
    .split("\n")
    .map((linha) => {
      if (/^https?:\/\//.test(linha)) {
        return `<p><a href="${escapeHtml(linha)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0d1421;color:#fff;text-decoration:none;font-weight:600">Chamar no WhatsApp</a></p>`;
      }
      return linha ? `<p style="margin:0 0 6px">${escapeHtml(linha)}</p>` : "<br>";
    })
    .join("");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#111;line-height:1.5">${html}</div>`,
        text: message,
      }),
    });
    if (!res.ok) {
      console.error("[digest] resend status", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[digest] resend error", err);
    return false;
  }
}

async function sendAdminWhatsApp(message: string): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !SDR_EVOLUTION_INSTANCE || !ADMIN_WHATSAPP) {
    console.warn("[digest] WhatsApp env incompletas — pulando envio");
    return false;
  }
  const normalized = normalizePhone(ADMIN_WHATSAPP);
  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${SDR_EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({ number: normalized, text: message }),
      }
    );
    if (!res.ok) {
      console.error("[digest] evolution status", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[digest] evolution error", err);
    return false;
  }
}

async function createDemoAccount(lead: LeadRecord): Promise<{
  user_id?: string;
  company_id?: string;
  already_exists?: boolean;
  error?: string;
}> {
  try {
    // Check se já existe
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", lead.email)
      .maybeSingle();

    if (existing?.id) {
      return { user_id: existing.id, already_exists: true };
    }

    // Cria user
    const password = randomPassword();
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: lead.email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: lead.name || "Demo",
        role: "admin",
        source: "admin-lead-digest",
      },
    });

    if (createErr || !created?.user) {
      console.error("[digest] createUser error", createErr);
      return { error: createErr?.message || "createUser_failed" };
    }

    const userId = created.user.id;

    // Cria company
    const companyName = lead.company || (lead.name ? `${lead.name} — Demo` : "Demo Account");
    const { data: companyRow, error: companyErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyName,
        // Sem teste grátis desde 08/10/2026: conta nasce sem plano.
        plan: "free",
        subscription_status: "inactive",
      })
      .select("id")
      .single();

    if (companyErr) {
      console.error("[digest] company insert error", companyErr);
    }

    const companyId = companyRow?.id;

    // Upsert profile
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        nome: lead.name || "Demo",
        email: lead.email,
        company_id: companyId,
      });

    if (profileErr) {
      console.error("[digest] profile upsert error", profileErr);
    }

    // User role (admin da própria empresa demo)
    if (companyId) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin", company_id: companyId });
    }

    void slugify(companyName);
    return { user_id: userId, company_id: companyId };
  } catch (err) {
    console.error("[digest] createDemoAccount threw", err);
    return { error: err instanceof Error ? err.message : "unknown" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record } = await req.json() as { record: LeadRecord };
    if (!record?.id || !record?.email) {
      return new Response(JSON.stringify({ error: "missing_record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[digest] start lead=${record.id} email=${record.email}`);

    if (record.source === RAIO_X_SOURCE) {
      const digest = await buildRaioXDigest(record);
      const [whatsappOk, emailOk] = await Promise.all([
        sendAdminWhatsApp(digest),
        sendAdminEmail(`Novo pedido de Raio-X: ${record.name || record.email}`, digest),
      ]);
      await appendNotes(record.id, [
        `[admin-digest] ${new Date().toISOString()}`,
        `whatsapp: ${whatsappOk ? "ok" : "falhou"}`,
        `email: ${emailOk ? "ok" : "falhou"}`,
      ]);
      return new Response(JSON.stringify({ ok: true, whatsapp_sent: whatsappOk, email_sent: emailOk, raio_x: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Enrichment (opcional)
    const enrichment = record.company
      ? await enrichCompany(record.company, record.email)
      : null;

    // 2. Summary via AI
    const summary = await summarizeWithAI(record, enrichment);

    // 3. Create demo account (rodando em paralelo com WhatsApp send)
    const [accountResult, whatsappOk] = await Promise.all([
      createDemoAccount(record),
      sendAdminWhatsApp(summary),
    ]);

    // 4. Atualiza demo_request.notes com status
    const noteLines: string[] = [
      `[admin-digest] ${new Date().toISOString()}`,
      `whatsapp: ${whatsappOk ? "ok" : "falhou"}`,
      `conta demo: ${accountResult.already_exists ? "já existia" : accountResult.user_id ? "criada" : accountResult.error || "falhou"}`,
    ];
    if (enrichment?.website) noteLines.push(`site: ${enrichment.website}`);
    if (enrichment?.linkedin) noteLines.push(`linkedin: ${enrichment.linkedin}`);

    await appendNotes(record.id, noteLines);

    return new Response(
      JSON.stringify({
        ok: true,
        whatsapp_sent: whatsappOk,
        account: accountResult,
        enriched: !!enrichment,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[digest] top error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
