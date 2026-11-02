// Abre o checkout do Stripe para assinar o Vyzon (R$ 97/mês). Devolve a URL;
// o front redireciona. Quem libera a conta é o assinatura-webhook, nunca esta edge.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, empresaDoAdmin, origemPermitida } from "../_shared/empresaAdmin.ts";
import { precoMensal, stripe } from "../_shared/stripe.ts";

serve(async (req) => {
    const headers = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { headers });

    try {
        const { companyId } = await req.json().catch(() => ({}));
        const r = await empresaDoAdmin(req, companyId);
        if (!r.ok) return new Response(JSON.stringify({ error: r.erro }), { status: r.status, headers });
        const { empresa, email } = r;

        if (empresa.subscription_status === "active" && empresa.stripe_subscription_id) {
            return new Response(JSON.stringify({ error: "A assinatura já está ativa" }), { status: 409, headers });
        }

        let cliente = empresa.stripe_customer_id;
        if (!cliente) {
            const novo = await stripe("customers", {
                email,
                name: empresa.name,
                metadata: { company_id: empresa.id },
            });
            cliente = novo.id as string;
            await admin.from("companies").update({ stripe_customer_id: cliente }).eq("id", empresa.id);
        }

        const origem = origemPermitida(req);
        const sessao = await stripe("checkout/sessions", {
            mode: "subscription",
            customer: cliente,
            client_reference_id: empresa.id,
            line_items: [{ price: await precoMensal(), quantity: 1 }],
            subscription_data: { metadata: { company_id: empresa.id } },
            metadata: { company_id: empresa.id },
            locale: "pt-BR",
            allow_promotion_codes: true,
            success_url: `${origem}/configuracoes/faturamento?assinatura=ok`,
            cancel_url: `${origem}/upgrade`,
        });

        return new Response(JSON.stringify({ url: sessao.url }), { headers });
    } catch (e) {
        console.error("[assinatura-checkout]", e);
        return new Response(JSON.stringify({ error: "Não deu para abrir o pagamento agora" }), { status: 500, headers });
    }
});
