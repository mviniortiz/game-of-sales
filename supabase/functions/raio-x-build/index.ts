// raio-x-build — monta o Raio-X das propostas paradas de uma empresa a partir do
// histórico do WhatsApp conectado (90 dias). Quem chama: o Markus, super admin,
// na conversa de 20 minutos com o integrador, ou o próprio dono no Raio-X
// automático (/raio-x). O resultado fica em raio_x_reports e abre em
// /relatorio/:token, onde quem é da empresa confere e corrige.
//
// Só lê e escreve rascunho dentro do relatório: nenhuma mensagem sai daqui.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildRaioX } from "./build.ts";
import { seedQuotesFromHistory } from "../_shared/quoteSeed.ts";

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
    const { data: me } = await admin.from("profiles").select("is_super_admin, company_id").eq("id", user.id).maybeSingle();
    const body = await req.json().catch(() => ({})) as { company_id?: string; demo_request_id?: string };
    const demoRequestId = body.demo_request_id;

    // Super admin monta o de qualquer empresa (conversa de 20 min). O dono monta
    // o da própria empresa sozinho (Raio-X automático), até 3 por dia.
    let companyId: string | undefined;
    const autoatendimento = !me?.is_super_admin;
    if (me?.is_super_admin) {
        companyId = body.company_id;
    } else {
        const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!role || !me?.company_id) return json({ error: "forbidden" }, 403);
        companyId = me.company_id;
        const { count } = await admin
            .from("raio_x_reports")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
        if ((count ?? 0) >= 3) return json({ error: "limite", message: "Você já fez 3 Raio-X hoje. Abra o último ou tente amanhã." }, 429);
    }
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

    // No automático, as propostas também entram no placar do app.
    if (autoatendimento) {
        try {
            await seedQuotesFromHistory(admin, companyId, user.id);
        } catch (e) {
            console.warn("[raio-x-build] placar:", e instanceof Error ? e.message : e);
        }
    }

    return json({ token, summary });
});
