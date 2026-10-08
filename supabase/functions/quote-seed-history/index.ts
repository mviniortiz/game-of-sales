// quote-seed-history — grava no placar as propostas que já estavam no WhatsApp
// antes da conexão. Sem isso o integrador conectava e via o placar vazio até
// mandar uma proposta nova. A lógica está em _shared/quoteSeed.ts.
//
// Quem chama:
//   - a tela de primeiros passos, com o usuário logado (admin da empresa);
//   - o webhook, quando chega um lote do histórico (service role, com intervalo
//     mínimo entre rodadas pelo companies.quote_seed_at).
// Só grava rastreio e card: nenhuma mensagem sai daqui.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { seedQuotesFromHistory } from "../_shared/quoteSeed.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MIN_INTERVAL_MS = 2 * 60_000;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({})) as { company_id?: string; user_id?: string };
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let companyId: string | null = null;
    let ownerId: string | null = null;
    const service = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    if (service) {
        companyId = body.company_id ?? null;
        ownerId = body.user_id ?? null;
    } else {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) return json({ error: "unauthorized" }, 401);
        const { data: me } = await admin.from("profiles").select("company_id, is_super_admin").eq("id", user.id).maybeSingle();
        const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (me?.is_super_admin && body.company_id) {
            companyId = body.company_id;
        } else if (role && me?.company_id) {
            companyId = me.company_id;
            ownerId = user.id;
        } else {
            return json({ error: "forbidden" }, 403);
        }
    }
    if (!companyId) return json({ error: "company_id ausente" }, 400);

    const { data: company } = await admin.from("companies").select("id, quote_seed_at").eq("id", companyId).maybeSingle();
    if (!company) return json({ error: "empresa não encontrada" }, 404);
    if (service && company.quote_seed_at && Date.now() - Date.parse(company.quote_seed_at) < MIN_INTERVAL_MS) {
        return json({ skipped: "recente" });
    }
    await admin.from("companies").update({ quote_seed_at: new Date().toISOString() }).eq("id", companyId);

    try {
        return json(await seedQuotesFromHistory(admin, companyId, ownerId));
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : "falhou" }, 500);
    }
});
