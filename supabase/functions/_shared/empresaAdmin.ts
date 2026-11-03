// Empresa de quem chamou a edge, só para admin da empresa ou super admin.
// O usuário vem do JWT (auth.getUser); companyId do corpo só vale para super
// admin operando outra empresa (regra das edges de 22/10/2026).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const admin = createClient(URL_SUPABASE, SERVICE);

const ORIGENS = ["https://vyzon.com.br", "https://www.vyzon.com.br", "http://localhost:5173", "http://localhost:8080"];

/** Origem do pedido quando é nossa (inclusive prévia da Vercel); senão o site. */
export function origemPermitida(req: Request): string {
    const o = req.headers.get("origin") || "";
    if (ORIGENS.includes(o) || /^https:\/\/vyzon[a-z0-9-]*\.vercel\.app$/.test(o)) return o;
    return ORIGENS[0];
}

export function cors(req: Request) {
    return {
        "Access-Control-Allow-Origin": origemPermitida(req),
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
    };
}

export type Resultado =
    | { ok: true; email: string | undefined; empresa: { id: string; name: string; subscription_status: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null } }
    | { ok: false; status: number; erro: string };

export async function empresaDoAdmin(req: Request, companyIdPedido?: string): Promise<Resultado> {
    const auth = req.headers.get("Authorization");
    if (!auth) return { ok: false, status: 401, erro: "Unauthorized" };

    const doUsuario = createClient(URL_SUPABASE, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await doUsuario.auth.getUser();
    if (!user) return { ok: false, status: 401, erro: "Unauthorized" };

    const { data: perfil } = await admin.from("profiles").select("company_id, is_super_admin").eq("id", user.id).maybeSingle();
    if (!perfil) return { ok: false, status: 403, erro: "Perfil não encontrado" };
    const superAdmin = perfil.is_super_admin === true;

    if (!superAdmin) {
        const { data: papel } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!papel) return { ok: false, status: 403, erro: "Só o admin da empresa cuida da assinatura" };
    }

    const companyId = superAdmin && companyIdPedido ? companyIdPedido : perfil.company_id;
    if (!companyId) return { ok: false, status: 400, erro: "Conta sem empresa" };

    const { data: empresa } = await admin
        .from("companies")
        .select("id, name, subscription_status, stripe_customer_id, stripe_subscription_id")
        .eq("id", companyId)
        .maybeSingle();
    if (!empresa) return { ok: false, status: 404, erro: "Empresa não encontrada" };

    return { ok: true, email: user.email, empresa };
}
