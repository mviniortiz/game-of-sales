// Botão "Nova integradora" do painel de empresas (só super admin).
// Num pedido só: cria a empresa, cria o login da dona como admin, manda o
// e-mail de convite (template "Seu acesso ao Vyzon", com link para definir a
// senha) e, se pedido, dá a próxima vaga das 10 grátis (conceder_fundadora).
// Antes isso era feito à mão no banco, e a empresa marcada "Pago" à mão ficava
// fora da lista de fundadoras.
//
// Se algo falha depois de criar a empresa, desfaz o que já foi criado.
import { admin, cors, origemPermitida } from "../_shared/empresaAdmin.ts";
import { lerPedido } from "../_shared/novaIntegradora.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SEGMENTO_SOLAR = "energia_solar";

const MOTIVOS: Record<string, string> = {
    "sem vaga": "As 10 vagas grátis já foram usadas.",
    teste: "O nome ou o e-mail parecem de teste, então ela não ocupou vaga.",
    "ja paga": "A empresa já estava paga, então não ocupou vaga.",
    "sem dono": "O login não ficou como dono, então não ocupou vaga.",
};

Deno.serve(async (req) => {
    const headers = cors(req);
    const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST") return resp({ error: "Método não permitido" }, 405);

    // Quem chama vem do JWT, nunca do corpo.
    const auth = req.headers.get("Authorization");
    if (!auth) return resp({ error: "Unauthorized" }, 401);
    const doUsuario = createClient(URL_SUPABASE, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await doUsuario.auth.getUser();
    if (!user) return resp({ error: "Unauthorized" }, 401);
    const { data: perfil } = await admin.from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle();
    if (perfil?.is_super_admin !== true) return resp({ error: "Só o time do Vyzon cria integradora." }, 403);

    const lido = lerPedido(await req.json().catch(() => null));
    if (!lido.ok) return resp({ error: lido.erro }, 400);
    const p = lido.pedido;

    const { data: jaTem } = await admin.from("profiles").select("id").ilike("email", p.email).limit(1);
    if (jaTem && jaTem.length > 0) return resp({ error: "Esse e-mail já tem login no Vyzon." }, 409);

    if (p.fundadora) {
        const { count } = await admin.from("fundadoras").select("company_id", { count: "exact", head: true }).is("revogada_em", null);
        if ((count ?? 0) >= 10) return resp({ error: "As 10 vagas grátis já foram usadas. Desmarque para criar sem vaga." }, 409);
    }

    const companyId = crypto.randomUUID();
    let userId: string | null = null;
    const desfaz = async () => {
        if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
        await admin.from("companies").delete().eq("id", companyId);
    };

    try {
        const { error: errEmpresa } = await admin.from("companies").insert({
            id: companyId,
            name: p.empresa,
            phone: p.whats,
            segment: SEGMENTO_SOLAR,
            plan: "free",
            subscription_status: "inactive",
        });
        if (errEmpresa) throw new Error(`empresa: ${errEmpresa.message}`);

        // O gatilho handle_new_user liga o perfil à empresa pelo company_id do
        // metadata (só porque a empresa ainda não tem ninguém).
        const { data: convite, error: errConvite } = await admin.auth.admin.inviteUserByEmail(p.email, {
            data: { company_id: companyId, nome: p.nome ?? p.empresa },
            redirectTo: `${origemPermitida(req)}/redefinir-senha`,
        });
        if (errConvite || !convite?.user) {
            const jaExiste = /already|registered|exists/i.test(errConvite?.message ?? "");
            await desfaz();
            return resp({ error: jaExiste ? "Esse e-mail já tem login no Vyzon." : "Não deu para enviar o convite." }, jaExiste ? 409 : 502);
        }
        userId = convite.user.id;

        // O gatilho deixa o perfil com o papel padrão (vendedor); o cadastro
        // normal (onboarding_assign_company) deixa a dona como admin.
        const { data: ligado, error: errPerfil } = await admin
            .from("profiles")
            .update({ role: "admin", company_id: companyId, ...(p.whats ? { phone: p.whats } : {}) })
            .eq("id", userId)
            .select("id");
        if (errPerfil || !ligado?.length) throw new Error(`perfil: ${errPerfil?.message ?? "não encontrado"}`);
        const { error: errPapel } = await admin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
        if (errPapel) throw new Error(`papel: ${errPapel.message}`);

        let numero: number | null = null;
        let aviso: string | null = null;
        if (p.fundadora) {
            const { data: vaga, error: errVaga } = await admin.rpc("conceder_fundadora", { p_company: companyId });
            if (errVaga) aviso = "Conta criada, mas a vaga grátis não foi dada. Tente pela ficha da empresa.";
            else if (vaga?.concedida) numero = vaga.numero ?? null;
            else aviso = MOTIVOS[vaga?.motivo] ?? "Conta criada sem vaga grátis.";
        }

        console.log(JSON.stringify({ at: "admin-nova-integradora", company_id: companyId, fundadora: numero, por: user.id }));
        return resp({ ok: true, company_id: companyId, numero, aviso });
    } catch (e) {
        console.error("[admin-nova-integradora]", e);
        await desfaz();
        return resp({ error: "Não deu para criar a integradora. Nada ficou gravado." }, 500);
    }
});
