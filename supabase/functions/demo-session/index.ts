import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// demo-session — auto-login da demo embutida (iframe da landing /v2). Faz login
// num ambiente demo DEDICADO ("Vyzon Demo", clonado uma vez do seed "Agência
// Metria Growth", separado do seed-fonte pra visitante não bagunçar a demo real)
// e devolve os tokens da sessão. A senha do usuário demo fica só como secret no
// servidor (LANDING_DEMO_PASSWORD), nunca no navegador. Idempotente: cria o
// ambiente/usuário no 1º uso e nas próximas só faz signIn. Rate-limit por IP.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DEMO_EMAIL = (Deno.env.get("LANDING_DEMO_EMAIL") || "landing-demo@vyzon.com.br").toLowerCase();
const DEMO_PASSWORD = Deno.env.get("LANDING_DEMO_PASSWORD");
const DEMO_COMPANY_NAME = Deno.env.get("LANDING_DEMO_COMPANY_NAME") || "Vyzon Demo";
const SOURCE_COMPANY_ID = Deno.env.get("DEMO_SOURCE_COMPANY_ID") || "7e2e21ac-d834-448b-a61b-79ca01255702";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });
    if (!DEMO_PASSWORD) return json(200, { ok: false, reason: "not_configured" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

    // rate-limit por IP (fail-open)
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    try {
        const { data } = await admin.rpc("consume_rate_limit", { p_bucket: `demo-session:${ip}`, p_limit: 20, p_window_seconds: 3600 });
        if (data === false) return json(429, { ok: false, reason: "rate_limit" });
    } catch {
        /* fail-open */
    }

    const signIn = async () => {
        const { data } = await anon.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        return data?.session ?? null;
    };

    let session = await signIn();

    if (!session) {
        // bootstrap (1ª vez): clona ambiente dedicado (guard por nome) + cria usuário admin
        try {
            const { data: existing } = await admin.from("companies").select("id").eq("name", DEMO_COMPANY_NAME).limit(1).maybeSingle();
            let companyId = existing?.id as string | undefined;
            if (!companyId) {
                const { data: clonedId, error: cloneErr } = await admin.rpc("clone_demo_environment", {
                    p_source_company: SOURCE_COMPANY_ID,
                    p_new_name: DEMO_COMPANY_NAME,
                    p_segment: null,
                });
                if (cloneErr || !clonedId) throw cloneErr || new Error("clone_demo_environment retornou vazio");
                companyId = clonedId as string;
            }
            const { error: cuErr } = await admin.auth.admin.createUser({
                email: DEMO_EMAIL,
                password: DEMO_PASSWORD,
                email_confirm: true,
                user_metadata: { nome: "Demo Vyzon", company_id: companyId },
            });
            if (cuErr && !/already|registered|exists/i.test(cuErr.message || "")) throw cuErr;
        } catch (e) {
            console.error("[demo-session] bootstrap error:", e);
        }
        session = await signIn();
    }

    if (!session) return json(200, { ok: false, reason: "signin_failed" });
    return json(200, { ok: true, access_token: session.access_token, refresh_token: session.refresh_token });
});
