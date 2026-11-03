// Avisos do Stripe: única porta que libera ou corta a conta paga.
// Assinatura conferida com STRIPE_WEBHOOK_SECRET; sem ela, 400 e nada muda.
// Todo evento relê a assinatura na API, então ordem de chegada não importa.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin } from "../_shared/empresaAdmin.ts";
import { assinaturaValida, situacaoDaAssinatura, stripe } from "../_shared/stripe.ts";

const EVENTOS = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
]);

const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
    if (req.method !== "POST") return json({ error: "method" }, 405);

    const corpo = await req.text();
    const ok = await assinaturaValida(corpo, req.headers.get("stripe-signature"), Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "");
    if (!ok) return json({ error: "assinatura inválida" }, 400);

    const evento = JSON.parse(corpo);
    if (!EVENTOS.has(evento.type)) return json({ ignorado: evento.type });

    const obj = evento.data.object;
    const idAssinatura: string | null = evento.type === "checkout.session.completed" ? obj.subscription : obj.id;
    if (!idAssinatura) return json({ ignorado: "sem assinatura" });

    try {
        const sub = await stripe(`subscriptions/${idAssinatura}`);
        const cliente = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

        let companyId: string | null = obj.client_reference_id || sub.metadata?.company_id || null;
        if (!companyId && cliente) {
            const { data } = await admin.from("companies").select("id").eq("stripe_customer_id", cliente).maybeSingle();
            companyId = data?.id ?? null;
        }
        if (!companyId) {
            console.warn("[assinatura-webhook] assinatura sem empresa", idAssinatura);
            return json({ ignorado: "sem empresa" });
        }

        const situacao = situacaoDaAssinatura(sub);
        const { error } = await admin
            .from("companies")
            .update({
                ...situacao,
                ...(situacao.subscription_status === "active" ? { plan: "pro" } : {}),
                stripe_customer_id: cliente,
                stripe_subscription_id: sub.id,
            })
            .eq("id", companyId);
        if (error) throw error;

        console.log("[assinatura-webhook]", evento.type, companyId, situacao.subscription_status);
        return json({ ok: true });
    } catch (e) {
        // 500 faz o Stripe tentar de novo.
        console.error("[assinatura-webhook]", evento.type, e);
        return json({ error: "falhou" }, 500);
    }
});
