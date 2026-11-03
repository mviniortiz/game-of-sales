// Portal do cliente do Stripe: trocar cartão, ver faturas e cancelar no fim do
// ciclo. O cancelamento volta pelo assinatura-webhook.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cors, empresaDoAdmin, origemPermitida } from "../_shared/empresaAdmin.ts";
import { configuracaoPortal, stripe } from "../_shared/stripe.ts";

serve(async (req) => {
    const headers = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { headers });

    try {
        const { companyId } = await req.json().catch(() => ({}));
        const r = await empresaDoAdmin(req, companyId);
        if (!r.ok) return new Response(JSON.stringify({ error: r.erro }), { status: r.status, headers });

        if (!r.empresa.stripe_customer_id) {
            return new Response(JSON.stringify({ error: "Esta conta não tem assinatura no cartão" }), { status: 404, headers });
        }

        const sessao = await stripe("billing_portal/sessions", {
            customer: r.empresa.stripe_customer_id,
            configuration: await configuracaoPortal(),
            locale: "pt-BR",
            return_url: `${origemPermitida(req)}/configuracoes/faturamento`,
        });

        return new Response(JSON.stringify({ url: sessao.url }), { headers });
    } catch (e) {
        console.error("[assinatura-portal]", e);
        return new Response(JSON.stringify({ error: "Não deu para abrir a assinatura agora" }), { status: 500, headers });
    }
});
