// Supabase Edge Function: Notion Sync (NOTION.1, 2026-07-17)
// Espelha o pipeline (deals) numa database do Notion, por empresa.
//
// Modelo: o usuário cria uma INTEGRAÇÃO INTERNA no Notion
// (notion.so/my-integrations), compartilha UMA página com ela e cola o token
// (secret_...) no modal de Integrações. No primeiro sync, esta função acha a
// página compartilhada via /search, cria a database "Pipeline Vyzon" dentro
// dela e passa a fazer upsert de cada deal como página da database.
//
// Config (integration_configs, platform='notion'):
//   hottok      = token da integração interna (secret_...)
//   webhook_url = estado do sync: null (primeiro sync) | "db:<database_id>"
// Idempotência: deals.notion_page_id guarda a página de cada deal.
//
// Auth: x-cron-secret === EVA_CRON_SECRET (padrão de cron do projeto).
// Agendada a cada 15min por trigger_notion_sync (pg_cron + pg_net + vault).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");
const NOTION_VERSION = "2022-06-28";
const MAX_DEALS_PER_RUN = 100;

const STAGE_LABELS: Record<string, string> = {
    novo: "Novo",
    em_negociacao: "Em negociação",
    proposta: "Proposta",
    fechamento: "Fechamento",
    closed_won: "Ganho",
    closed_lost: "Perdido",
};

async function notion(token: string, path: string, method: string, body?: unknown) {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Notion ${method} ${path} -> ${res.status}: ${json?.message || "erro"}`);
    }
    return json;
}

/** Primeiro sync: acha a página compartilhada e cria a database do pipeline. */
async function ensureDatabase(token: string): Promise<string> {
    const search = await notion(token, "/search", "POST", {
        filter: { property: "object", value: "page" },
        page_size: 5,
    });
    const page = (search?.results || []).find((r: any) => r.object === "page");
    if (!page) {
        throw new Error(
            "Nenhuma página compartilhada com a integração. Compartilhe uma página do Notion com a integração Vyzon e tente de novo.",
        );
    }
    const db = await notion(token, "/databases", "POST", {
        parent: { type: "page_id", page_id: page.id },
        title: [{ type: "text", text: { content: "Pipeline Vyzon" } }],
        properties: {
            Nome: { title: {} },
            Etapa: { rich_text: {} },
            "Valor (R$)": { number: { format: "real" } },
            Cliente: { rich_text: {} },
            Telefone: { phone_number: {} },
            Email: { email: {} },
            "Ver no Vyzon": { url: {} },
        },
    });
    return db.id as string;
}

function dealProperties(deal: any) {
    return {
        Nome: { title: [{ type: "text", text: { content: String(deal.title || "Deal").slice(0, 200) } }] },
        Etapa: { rich_text: [{ type: "text", text: { content: STAGE_LABELS[deal.stage] || deal.stage || "" } }] },
        "Valor (R$)": { number: typeof deal.value === "number" ? deal.value : null },
        Cliente: { rich_text: [{ type: "text", text: { content: String(deal.customer_name || "").slice(0, 200) } }] },
        Telefone: { phone_number: deal.customer_phone || null },
        Email: { email: deal.customer_email || null },
        "Ver no Vyzon": { url: `https://vyzon.com.br/deal/${deal.id}` },
    };
}

serve(async (req: Request) => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    const provided = req.headers.get("x-cron-secret");
    if (!EVA_CRON_SECRET || provided !== EVA_CRON_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: configs, error: cfgErr } = await supabase
        .from("integration_configs")
        .select("id, company_id, hottok, webhook_url")
        .eq("platform", "notion")
        .eq("is_active", true);
    if (cfgErr) {
        return new Response(JSON.stringify({ error: cfgErr.message }), { status: 500 });
    }

    const results: Record<string, unknown>[] = [];

    for (const cfg of configs || []) {
        const token = cfg.hottok as string | null;
        if (!token || !cfg.company_id) continue;
        const summary: Record<string, unknown> = { company_id: cfg.company_id, created: 0, updated: 0 };
        try {
            // Database do pipeline (cria no primeiro sync)
            let databaseId = (cfg.webhook_url || "").startsWith("db:")
                ? (cfg.webhook_url as string).slice(3)
                : null;
            if (!databaseId) {
                databaseId = await ensureDatabase(token);
                await supabase
                    .from("integration_configs")
                    .update({ webhook_url: `db:${databaseId}` })
                    .eq("id", cfg.id);
                summary.database_created = true;
            }

            // Deals a sincronizar: nunca sincronizados OU mexidos nas últimas 24h
            const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
            const { data: deals, error: dealsErr } = await supabase
                .from("deals")
                .select("id, title, stage, value, customer_name, customer_phone, customer_email, notion_page_id, updated_at")
                .eq("company_id", cfg.company_id)
                .or(`notion_page_id.is.null,updated_at.gte.${cutoff}`)
                .order("updated_at", { ascending: false })
                .limit(MAX_DEALS_PER_RUN);
            if (dealsErr) throw dealsErr;

            for (const deal of deals || []) {
                if (deal.notion_page_id) {
                    await notion(token, `/pages/${deal.notion_page_id}`, "PATCH", {
                        properties: dealProperties(deal),
                    });
                    summary.updated = (summary.updated as number) + 1;
                } else {
                    const page = await notion(token, "/pages", "POST", {
                        parent: { type: "database_id", database_id: databaseId },
                        properties: dealProperties(deal),
                    });
                    await supabase.from("deals").update({ notion_page_id: page.id }).eq("id", deal.id);
                    summary.created = (summary.created as number) + 1;
                }
            }
        } catch (err) {
            summary.error = err instanceof Error ? err.message : String(err);
            console.error(`[notion-sync] company ${cfg.company_id}:`, summary.error);
        }
        results.push(summary);
    }

    return new Response(JSON.stringify({ success: true, companies: results.length, results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
});
