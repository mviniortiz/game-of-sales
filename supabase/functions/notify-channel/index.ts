import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BLUE = 0x2563eb;
const GREEN = 0x16a34a;

interface SalePayload {
  id?: string;
  cliente_nome?: string | null;
  produto_nome?: string | null;
  valor?: number | string | null;
  user_id?: string | null;
  vendedor_nome?: string | null;
}

interface GoalPayload {
  reached: boolean;
  valor_meta?: number | null;
  current_value?: number | null;
}

interface ChannelConfig {
  platform: string;
  hottok: string | null; // a webhook URL do canal
  settings: { events?: string[] } | null;
}

// Defesa contra SSRF: só aceita webhooks dos hosts oficiais Slack/Discord
function isAllowedWebhookUrl(platform: string, url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (platform === "slack") return host === "hooks.slack.com";
    if (platform === "discord") {
      return ["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"].includes(host);
    }
    return false;
  } catch {
    return false;
  }
}

function brl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function firstName(full?: string | null): string {
  if (!full) return "alguém do time";
  return full.trim().split(/\s+/)[0];
}

// ──────────────── Copy da EVA (com fallback template) ────────────────
async function evaWriteSaleMessage(ctx: {
  vendedor: string;
  cliente: string;
  produto: string;
  valor: number;
  vendasNoMes: number;
  pctMeta: number | null;
}): Promise<string> {
  const fallback = () => {
    const base = `${ctx.vendedor} fechou ${brl(ctx.valor)} com ${ctx.cliente} (${ctx.produto}).`;
    if (ctx.pctMeta !== null) return `${base} Já em ${ctx.pctMeta}% da meta do mês.`;
    return base;
  };

  if (!OPENAI_API_KEY) return fallback();

  try {
    const sys =
      "Você é a EVA, copiloto comercial do Vyzon. Escreva uma notificação curta (1 frase, no máximo 2) " +
      "para o canal interno do time comemorar uma venda. Tom direto e positivo, sem ser piegas. " +
      "Sem emojis. Sem travessão (—), use vírgula ou ponto. Não invente dados além dos fornecidos. " +
      "Pode citar ritmo (quantidade de vendas no mês) e progresso da meta se fizer sentido.";
    const userMsg = JSON.stringify(ctx);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Dados da venda: ${userMsg}` },
        ],
        max_completion_tokens: 200,
      }),
    });

    if (!response.ok) return fallback();
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || fallback();
  } catch {
    return fallback();
  }
}

// ──────────────── Formatação por canal ────────────────
function buildSlackBody(title: string, body: string, footer: string, accent: "blue" | "green") {
  return {
    text: `${title} ${body}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${title}*\n${body}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: footer }] },
    ],
    // barra colorida via attachments (Slack legacy color funciona bem)
    attachments: [{ color: accent === "green" ? "#16A34A" : "#2563EB", blocks: [] }],
  };
}

function buildDiscordBody(title: string, body: string, footer: string, accent: "blue" | "green") {
  return {
    embeds: [
      {
        title,
        description: body,
        color: accent === "green" ? GREEN : BLUE,
        footer: { text: footer },
      },
    ],
  };
}

async function postToChannel(platform: string, url: string, title: string, body: string, footer: string, accent: "blue" | "green") {
  if (!isAllowedWebhookUrl(platform, url)) return false;

  const payload = platform === "discord"
    ? buildDiscordBody(title, body, footer, accent)
    : buildSlackBody(title, body, footer, accent);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

async function logEvent(companyId: string | null, platform: string, eventType: string, ok: boolean, error?: string) {
  try {
    await supabaseAdmin.from("webhook_logs").insert({
      company_id: companyId,
      platform,
      event_type: eventType,
      status: ok ? "success" : "error",
      error_message: error ?? null,
      payload: {},
    });
  } catch (_) { /* logging não pode quebrar o fluxo */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // ─── Modo TESTE (chamado do frontend ao cadastrar o canal) ───
    if (body.test) {
      const { platform, webhook_url } = body as { platform: string; webhook_url: string };
      if (!webhook_url) {
        return new Response(JSON.stringify({ error: "webhook_url ausente" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const ok = await postToChannel(
        platform,
        webhook_url,
        "Vyzon conectado",
        "Tudo certo. Quando uma venda for fechada, a EVA avisa o time por aqui.",
        "Mensagem de teste enviada pelo Vyzon",
        "blue",
      );
      return new Response(JSON.stringify({ ok }), {
        status: ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Modo PRODUÇÃO (chamado pelo trigger pg_net) ───
    const companyId: string | null = body.company_id ?? null;
    const sale: SalePayload = body.sale ?? {};
    const goal: GoalPayload | null = body.goal ?? null;

    if (!companyId) {
      return new Response(JSON.stringify({ skipped: "sem company_id" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Canais ativos da empresa
    const { data: channels } = await supabaseAdmin
      .from("integration_configs")
      .select("platform, hottok, settings")
      .eq("company_id", companyId)
      .in("platform", ["slack", "discord"])
      .eq("is_active", true);

    const active = (channels ?? []) as ChannelConfig[];
    if (active.length === 0) {
      return new Response(JSON.stringify({ skipped: "nenhum canal ativo" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const valor = Number(sale.valor) || 0;
    const vendedor = firstName(sale.vendedor_nome);
    const cliente = sale.cliente_nome || "cliente";
    const produto = sale.produto_nome || "produto";

    // Contexto extra pra EVA: nº de vendas do vendedor no mês + % da meta
    let vendasNoMes = 0;
    let pctMeta: number | null = null;
    if (sale.user_id) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const { count } = await supabaseAdmin
        .from("vendas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sale.user_id)
        .gte("data_venda", monthStart);
      vendasNoMes = count ?? 0;
    }
    if (goal?.valor_meta && goal.valor_meta > 0 && goal.current_value != null) {
      pctMeta = Math.round((Number(goal.current_value) / Number(goal.valor_meta)) * 100);
    }

    const results: Record<string, boolean> = {};

    // ── Evento: venda fechada ──
    const saleMsg = await evaWriteSaleMessage({ vendedor, cliente, produto, valor, vendasNoMes, pctMeta });
    const saleFooter = pctMeta !== null ? `Vyzon · ${vendasNoMes} vendas no mês · ${pctMeta}% da meta` : `Vyzon · ${vendasNoMes} vendas no mês`;

    for (const ch of active) {
      const events = ch.settings?.events ?? ["sale_closed", "goal_reached"];
      if (!ch.hottok || !events.includes("sale_closed")) continue;
      const ok = await postToChannel(ch.platform, ch.hottok, "Venda fechada", saleMsg, saleFooter, "blue");
      results[`${ch.platform}:sale`] = ok;
      await logEvent(companyId, ch.platform, "sale_closed", ok);
    }

    // ── Evento: meta batida ──
    if (goal?.reached) {
      const metaMsg = `${vendedor} bateu a meta do mês (${brl(Number(goal.current_value))} de ${brl(Number(goal.valor_meta))}). Bora pra cima.`;
      for (const ch of active) {
        const events = ch.settings?.events ?? ["sale_closed", "goal_reached"];
        if (!ch.hottok || !events.includes("goal_reached")) continue;
        const ok = await postToChannel(ch.platform, ch.hottok, "Meta batida", metaMsg, "Vyzon · meta mensal atingida", "green");
        results[`${ch.platform}:goal`] = ok;
        await logEvent(companyId, ch.platform, "goal_reached", ok);
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notify-channel] erro:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
