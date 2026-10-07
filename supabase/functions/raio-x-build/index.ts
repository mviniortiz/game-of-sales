// raio-x-build — monta o Raio-X das propostas paradas de uma empresa a partir do
// histórico do WhatsApp conectado (90 dias). Quem chama é o Markus, super admin,
// na conversa de 20 minutos com o integrador; o resultado fica em
// raio_x_reports e abre em /relatorio/:token.
//
// Só lê e escreve rascunho dentro do relatório: nenhuma mensagem sai daqui.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildRaioX } from "./build.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: me } = await admin.from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle();
    if (!me?.is_super_admin) return json({ error: "forbidden" }, 403);

    const { company_id: companyId, demo_request_id: demoRequestId } = await req.json().catch(() => ({}));
    if (!companyId) return json({ error: "company_id obrigatório" }, 400);

    const { data: company } = await admin.from("companies").select("id, name").eq("id", companyId).maybeSingle();
    if (!company) return json({ error: "empresa não encontrada" }, 404);

    let built;
    try {
        built = await buildRaioX(admin, companyId);
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : "falhou" }, 500);
    }
    const { summary, items: reportItems } = built;
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    const { error: insErr } = await admin.from("raio_x_reports").insert({
        token,
        company_id: companyId,
        demo_request_id: demoRequestId ?? null,
        created_by: user.id,
        company_name: company.name,
        summary,
        items: reportItems,
    });
    if (insErr) return json({ error: `gravar falhou: ${insErr.message}` }, 500);

    return json({ token, summary });
});
