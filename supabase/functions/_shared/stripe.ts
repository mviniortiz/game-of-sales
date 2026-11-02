// Cobrança da assinatura do Vyzon pelo Stripe (02/11/2026, substitui o Mercado
// Pago). Chamada direto na API REST, sem SDK: são 6 endpoints e a assinatura do
// webhook é um HMAC. As edges assinatura-checkout, assinatura-portal e assinatura-webhook
// usam daqui; o que não depende de Deno tem teste em src/__tests__/stripe.test.ts.

// globalThis: o arquivo também roda no vitest, onde Deno não existe.
const env = (k: string): string => (globalThis as any).Deno?.env.get(k) ?? "";

/** Espelha PLANS.pro.monthlyPrice (src/config/plans.ts), em centavos. */
export const PRECO_CENTAVOS = 9700;
/** Preço achado pela lookup_key; criado na primeira compra se não existir. */
export const LOOKUP_KEY = "vyzon_mensal";

/** Achata objeto aninhado no formato de formulário do Stripe: a[b][0][c]=x. */
export function formEncode(obj: Record<string, unknown>, prefix = ""): string {
    const partes: string[] = [];
    for (const [chave, valor] of Object.entries(obj)) {
        if (valor === undefined || valor === null) continue;
        const nome = prefix ? `${prefix}[${chave}]` : chave;
        if (Array.isArray(valor)) {
            valor.forEach((item, i) => {
                if (item !== null && typeof item === "object") {
                    partes.push(formEncode(item as Record<string, unknown>, `${nome}[${i}]`));
                } else {
                    partes.push(`${encodeURIComponent(`${nome}[${i}]`)}=${encodeURIComponent(String(item))}`);
                }
            });
        } else if (typeof valor === "object") {
            partes.push(formEncode(valor as Record<string, unknown>, nome));
        } else {
            partes.push(`${encodeURIComponent(nome)}=${encodeURIComponent(String(valor))}`);
        }
    }
    return partes.filter(Boolean).join("&");
}

export async function stripe<T = any>(
    caminho: string,
    params?: Record<string, unknown>,
    metodo: "GET" | "POST" = params ? "POST" : "GET",
): Promise<T> {
    const chave = env("STRIPE_SECRET_KEY");
    if (!chave) throw new Error("STRIPE_SECRET_KEY não configurada");
    const corpo = params ? formEncode(params) : "";
    const url = `https://api.stripe.com/v1/${caminho}${metodo === "GET" && corpo ? `?${corpo}` : ""}`;
    const res = await fetch(url, {
        method: metodo,
        headers: {
            Authorization: `Bearer ${chave}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: metodo === "POST" ? corpo : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Stripe ${caminho}: ${json?.error?.message || res.status}`);
    return json as T;
}

/** Id do preço mensal; cria produto e preço na primeira vez. */
export async function precoMensal(): Promise<string> {
    const lista = await stripe("prices", { lookup_keys: [LOOKUP_KEY], active: true, limit: 1 }, "GET");
    if (lista.data?.[0]?.id) return lista.data[0].id;
    const produto = await stripe("products", { name: "Vyzon", metadata: { vyzon: "1" } });
    const preco = await stripe("prices", {
        product: produto.id,
        currency: "brl",
        unit_amount: PRECO_CENTAVOS,
        recurring: { interval: "month" },
        lookup_key: LOOKUP_KEY,
    });
    return preco.id;
}

/** Configuração do portal do cliente marcada com metadata vyzon=1; cria se faltar. */
export async function configuracaoPortal(): Promise<string> {
    const lista = await stripe("billing_portal/configurations", { active: true, limit: 20 }, "GET");
    const nossa = (lista.data || []).find((c: any) => c.metadata?.vyzon === "1");
    if (nossa) return nossa.id;
    const nova = await stripe("billing_portal/configurations", {
        business_profile: { headline: "Assinatura do Vyzon" },
        features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] },
            subscription_cancel: {
                enabled: true,
                mode: "at_period_end",
                cancellation_reason: {
                    enabled: true,
                    options: ["too_expensive", "missing_features", "unused", "switched_service", "other"],
                },
            },
        },
        metadata: { vyzon: "1" },
    });
    return nova.id;
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Confere o cabeçalho Stripe-Signature (t=...,v1=...): HMAC-SHA256 de
 * "t.corpo" com o segredo do endpoint, e t a no máximo `tolerancia` segundos.
 */
export async function assinaturaValida(
    corpo: string,
    cabecalho: string | null,
    segredo: string,
    agora = Math.floor(Date.now() / 1000),
    tolerancia = 300,
): Promise<boolean> {
    if (!cabecalho || !segredo) return false;
    const partes = cabecalho.split(",").map((p) => p.trim().split("="));
    const t = Number(partes.find(([k]) => k === "t")?.[1]);
    const assinaturas = partes.filter(([k]) => k === "v1").map(([, v]) => v);
    if (!Number.isFinite(t) || !assinaturas.length || Math.abs(agora - t) > tolerancia) return false;

    const enc = new TextEncoder();
    const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const esperado = hex(await crypto.subtle.sign("HMAC", chave, enc.encode(`${t}.${corpo}`)));
    return assinaturas.some((a) => {
        if (a.length !== esperado.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ esperado.charCodeAt(i);
        return diff === 0;
    });
}

const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

/**
 * Situação da empresa a partir da assinatura do Stripe. Paga é 'active'
 * (company_is_paid). past_due segue ativa enquanto o Stripe tenta cobrar de
 * novo; se desistir, a assinatura vira canceled ou unpaid e chega outro evento.
 */
export function situacaoDaAssinatura(sub: any) {
    const fimDoCiclo = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
    let status: "active" | "inactive" | "expired" | "cancelled";
    switch (sub.status) {
        case "active":
        case "trialing":
        case "past_due":
            status = "active";
            break;
        case "canceled":
            status = "cancelled";
            break;
        case "unpaid":
            status = "expired";
            break;
        default:
            status = "inactive";
    }
    const cancelando = status === "active" && (sub.cancel_at_period_end || sub.cancel_at);
    return {
        subscription_status: status,
        subscription_cancelled_at:
            status === "cancelled" || cancelando ? iso(sub.canceled_at) ?? new Date().toISOString() : null,
        subscription_ends_at: cancelando ? iso(sub.cancel_at ?? fimDoCiclo) : status === "cancelled" ? iso(sub.ended_at ?? fimDoCiclo) : iso(fimDoCiclo),
    };
}
