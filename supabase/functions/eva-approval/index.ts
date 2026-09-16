// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL.1 (2026-08-24) — Entrega os rascunhos pendentes no WhatsApp do dono.
//
// A decisão humana continua obrigatória; esta edge só leva o rascunho até onde
// o dono está. Quem lê a resposta dele é a evolution-message-webhook.
//
// action=notify   varre agent_suggestions pending sem notified_at e manda.
// action=ping     diagnóstico: diz se acha o número do dono da instância.
//
// Chamada por cron (service_role) ou pelo app (JWT do usuário, escopo da
// própria empresa).
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    instanceNameFor,
    notifyPendingSuggestions,
    resolveOwnerNumber,
} from "../_shared/whatsappApproval.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Mesmo segredo que o pg_cron lê do vault (name='eva_cron_secret').
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");

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

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }
    const action = String(body.action || "notify");

    // Auth: cron e service_role rodam sem escopo; usuário fica preso à própria
    // empresa, mesmo que peça outra no payload. Mesmo par de credenciais que a
    // eva-stale-deal-followup usa, porque quem chama é o mesmo pg_cron.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const cronSecret = req.headers.get("x-cron-secret") || "";
    const isService = Boolean(
        (token && token === SUPABASE_SERVICE_ROLE_KEY) ||
        (EVA_CRON_SECRET && cronSecret === EVA_CRON_SECRET),
    );

    let scopedCompanyId: string | null = null;
    let callerUserId: string | null = null;

    if (!isService) {
        if (!token) return json(401, { error: "unauthorized" });
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
        callerUserId = userData.user.id;
        const { data: profile } = await admin
            .from("profiles")
            .select("company_id")
            .eq("id", callerUserId)
            .maybeSingle();
        if (!profile?.company_id) return json(403, { error: "sem empresa" });
        scopedCompanyId = profile.company_id;
    }

    try {
        if (action === "ping") {
            const userId = String(body.userId || callerUserId || "");
            if (!userId) return json(400, { error: "userId obrigatorio" });
            const instanceName = instanceNameFor(userId);
            const ownerNumber = await resolveOwnerNumber(admin, instanceName);
            return json(200, { ok: true, instanceName, ownerNumber, canNotify: Boolean(ownerNumber) });
        }

        if (action === "notify") {
            const result = await notifyPendingSuggestions(admin, {
                companyId: isService ? (body.companyId ?? null) : scopedCompanyId,
                suggestionId: body.suggestionId ?? null,
                limit: Number(body.limit) || 10,
            });
            return json(200, { ok: true, ...result });
        }

        return json(400, { error: `action desconhecida: ${action}` });
    } catch (err) {
        const msg = (err as Error)?.message || "erro desconhecido";
        console.error("[eva-approval]", msg);
        return json(500, { error: msg });
    }
});
