// ─────────────────────────────────────────────────────────────────────────────
// kapso-whatsapp (2026-09-29) — ações da API oficial do WhatsApp via Kapso.
//
// Actions:
//   connect         (usuário) Cria o customer da empresa na Kapso, se ainda não
//                   existe, e gera um setup link de coexistência: o dono
//                   continua usando o WhatsApp Business no celular e aceita
//                   compartilhar o histórico. A conexão chega depois pelo
//                   kapso-webhook (whatsapp.phone_number.created).
//   import_history  (usuário ou service_role) Copia até HISTORY_DAYS de
//                   mensagens da Kapso para channel_*. Não abre quote_tracking:
//                   orçamento antigo não pode virar retomada automática; quem
//                   lê o histórico é o Raio-X. Roda com teto de tempo e, se
//                   sobrar página, chama a si mesma com o cursor.
//                   Estado em channel_connections.metadata.history_import.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, KAPSO_API_KEY.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    HISTORY_DAYS,
    KAPSO_PLATFORM,
    KAPSO_WHATSAPP,
    ingestPayload,
    kapsoFetch,
    normalizeKapsoMessage,
    type KapsoMessage,
} from "../_shared/kapso.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Folga dentro do limite de execução da edge function.
const IMPORT_BUDGET_MS = 100_000;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Body = { action?: string; companyId?: string; connectionId?: string; cursor?: string | null };

type Caller = { internal: true } | { internal: false; userId: string; companyId: string };

/** service_role (chamada interna) ou usuário logado na própria empresa; super_admin opera qualquer uma. */
async function resolveCaller(req: Request, body: Body): Promise<Caller | Response> {
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader === `Bearer ${SERVICE_ROLE_KEY}`) return { internal: true };
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });

    const { data: profile } = await admin
        .from("profiles")
        .select("company_id, is_super_admin")
        .eq("id", user.id)
        .maybeSingle();
    if (!profile) return json(403, { error: "Profile not found" });

    const isSuperAdmin = profile.is_super_admin === true;
    if (!isSuperAdmin && body.companyId && body.companyId !== profile.company_id) {
        return json(403, { error: "Forbidden company context" });
    }
    const companyId = isSuperAdmin ? body.companyId || profile.company_id : profile.company_id;
    if (!companyId) return json(400, { error: "companyId is required" });
    return { internal: false, userId: user.id, companyId };
}

async function connect(companyId: string, userId: string): Promise<Response> {
    const { data: company } = await admin.from("companies").select("id, name").eq("id", companyId).maybeSingle();
    if (!company) return json(404, { error: "Empresa não encontrada" });

    const { data: existing } = await admin
        .from("kapso_customers")
        .select("kapso_customer_id")
        .eq("company_id", companyId)
        .maybeSingle();

    let customerId = existing?.kapso_customer_id as string | undefined;
    if (!customerId) {
        const created = await kapsoFetch(`${KAPSO_PLATFORM}/customers`, {
            method: "POST",
            body: JSON.stringify({ customer: { name: company.name || companyId, external_customer_id: companyId } }),
        });
        customerId = created?.data?.id;
        if (!customerId) return json(502, { error: "Kapso não devolveu o customer" });
    }

    const link = await kapsoFetch(`${KAPSO_PLATFORM}/customers/${customerId}/setup_links`, {
        method: "POST",
        body: JSON.stringify({ setup_link: { allowed_connection_types: ["coexistence"], language: "pt" } }),
    });
    const url = link?.data?.url as string | undefined;
    if (!url) return json(502, { error: "Kapso não devolveu o link" });

    const { error } = await admin.from("kapso_customers").upsert(
        {
            company_id: companyId,
            kapso_customer_id: customerId,
            requested_by: userId,
            setup_link_id: link.data.id || null,
            setup_link_url: url,
            setup_link_expires_at: link.data.expires_at || null,
        },
        { onConflict: "company_id" },
    );
    if (error) return json(500, { error: `Link criado, mas não salvo: ${error.message}` });

    return json(200, { url, expiresAt: link.data.expires_at || null });
}

type ImportState = { status: string; imported: number; cursor: string | null; started_at: string; finished_at?: string; error?: string };

async function saveImportState(connectionId: string, metadata: Record<string, unknown>, state: ImportState) {
    await admin
        .from("channel_connections")
        .update({ metadata: { ...metadata, history_import: state } })
        .eq("id", connectionId);
}

async function importHistory(connectionId: string, cursor: string | null): Promise<Response> {
    const { data: conn } = await admin
        .from("channel_connections")
        .select("id, company_id, external_id, metadata")
        .eq("id", connectionId)
        .maybeSingle();
    const metadata = (conn?.metadata || {}) as Record<string, unknown>;
    if (!conn || metadata.transport !== "kapso") return json(404, { error: "Conexão Kapso não encontrada" });

    const previous = metadata.history_import as ImportState | undefined;
    const state: ImportState = cursor && previous
        ? { ...previous, status: "running", cursor }
        : { status: "running", imported: 0, cursor: null, started_at: new Date().toISOString() };
    await saveImportState(conn.id, metadata, state);

    const ownerUserId = (metadata.user_id as string | undefined) || null;
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();
    const startedAt = Date.now();
    let next: string | null = cursor;

    try {
        do {
            const params = new URLSearchParams({ limit: "100", fields: "kapso()", since });
            if (next) params.set("after", next);
            const page = await kapsoFetch(`${KAPSO_WHATSAPP}/${conn.external_id}/messages?${params}`);
            const messages = (page?.data || []) as KapsoMessage[];

            for (const msg of messages) {
                const n = normalizeKapsoMessage(msg);
                if (!n) continue;
                const { error } = await admin.rpc("ingest_channel_message", {
                    p_company_id: conn.company_id,
                    p_provider: "meta_cloud",
                    p_channel_type: "whatsapp",
                    p_payload: ingestPayload(n, conn.external_id, ownerUserId, msg),
                });
                if (error) console.warn("[kapso-import] ingest falhou:", error.message?.slice(0, 200));
                else state.imported++;
            }

            next = messages.length ? (page?.paging?.cursors?.after as string | undefined) || null : null;
        } while (next && Date.now() - startedAt < IMPORT_BUDGET_MS);
    } catch (e) {
        const failed = { ...state, status: "error", cursor: next, error: (e as Error).message.slice(0, 300) };
        await saveImportState(conn.id, metadata, failed);
        return json(502, failed);
    }

    if (next) {
        await saveImportState(conn.id, metadata, { ...state, cursor: next });
        const cont = fetch(`${SUPABASE_URL}/functions/v1/kapso-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ action: "import_history", connectionId: conn.id, cursor: next }),
        }).catch((e) => console.warn("[kapso-import] continuação falhou:", e?.message));
        // deno-lint-ignore no-explicit-any
        try { (globalThis as any).EdgeRuntime?.waitUntil?.(cont); } catch { /* noop */ }
        return json(202, { ...state, cursor: next });
    }

    // A RPC soma unread a cada inbound; histórico de meses não é "não lido".
    await admin.from("channel_conversations").update({ unread_count: 0 }).eq("connection_id", conn.id);
    const done = { ...state, status: "done", cursor: null, finished_at: new Date().toISOString() };
    await saveImportState(conn.id, metadata, done);
    console.log(`[kapso-import] ${conn.external_id} concluído: ${done.imported} mensagens`);
    return json(200, done);
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    let body: Body;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "invalid json" });
    }

    const caller = await resolveCaller(req, body);
    if (caller instanceof Response) return caller;

    try {
        if (body.action === "connect") {
            if (caller.internal) return json(400, { error: "connect exige usuário" });
            return await connect(caller.companyId, caller.userId);
        }

        if (body.action === "import_history") {
            let connectionId = body.connectionId;
            if (!caller.internal) {
                const { data } = await admin
                    .from("channel_connections")
                    .select("id")
                    .eq("company_id", caller.companyId)
                    .eq("provider", "meta_cloud")
                    .eq("metadata->>transport", "kapso")
                    .limit(1)
                    .maybeSingle();
                connectionId = data?.id;
            }
            if (!connectionId) return json(404, { error: "Empresa sem WhatsApp oficial conectado" });
            return await importHistory(connectionId, caller.internal ? body.cursor || null : null);
        }

        return json(400, { error: "action inválida" });
    } catch (e) {
        console.error("[kapso-whatsapp]", body.action, (e as Error).message);
        return json(500, { error: (e as Error).message });
    }
});
