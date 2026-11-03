import { describe, expect, it } from "vitest";
import { assinaturaValida, formEncode, situacaoDaAssinatura } from "../../supabase/functions/_shared/stripe";

async function assinar(corpo: string, segredo: string, t: number) {
    const enc = new TextEncoder();
    const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", chave, enc.encode(`${t}.${corpo}`));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("assinaturaValida", () => {
    const segredo = "whsec_teste";
    const corpo = '{"id":"evt_1","type":"customer.subscription.updated"}';
    const t = 1_800_000_000;

    it("aceita a assinatura certa dentro do prazo", async () => {
        const v1 = await assinar(corpo, segredo, t);
        expect(await assinaturaValida(corpo, `t=${t},v1=${v1}`, segredo, t + 10)).toBe(true);
    });

    it("recusa corpo alterado, segredo errado, prazo vencido e cabeçalho vazio", async () => {
        const v1 = await assinar(corpo, segredo, t);
        expect(await assinaturaValida(corpo + " ", `t=${t},v1=${v1}`, segredo, t)).toBe(false);
        expect(await assinaturaValida(corpo, `t=${t},v1=${v1}`, "whsec_outro", t)).toBe(false);
        expect(await assinaturaValida(corpo, `t=${t},v1=${v1}`, segredo, t + 301)).toBe(false);
        expect(await assinaturaValida(corpo, null, segredo, t)).toBe(false);
        expect(await assinaturaValida(corpo, `t=${t},v1=${v1}`, "", t)).toBe(false);
    });

    it("aceita quando uma das v1 bate (troca de segredo)", async () => {
        const v1 = await assinar(corpo, segredo, t);
        expect(await assinaturaValida(corpo, `t=${t},v1=abc,v1=${v1}`, segredo, t)).toBe(true);
    });
});

describe("formEncode", () => {
    it("achata objetos e listas no formato do Stripe", () => {
        const s = decodeURIComponent(
            formEncode({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], metadata: { company_id: "c1" }, vazio: null }),
        );
        expect(s).toBe("mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&metadata[company_id]=c1");
    });
});

describe("situacaoDaAssinatura", () => {
    const fim = 1_800_000_000;
    const fimIso = new Date(fim * 1000).toISOString();

    it("ativa renovando: paga, sem cancelamento", () => {
        expect(situacaoDaAssinatura({ status: "active", items: { data: [{ current_period_end: fim }] } })).toEqual({
            subscription_status: "active",
            subscription_cancelled_at: null,
            subscription_ends_at: fimIso,
        });
    });

    it("cancelada no fim do ciclo: segue paga até o fim", () => {
        const r = situacaoDaAssinatura({ status: "active", cancel_at_period_end: true, canceled_at: fim - 100, current_period_end: fim });
        expect(r.subscription_status).toBe("active");
        expect(r.subscription_ends_at).toBe(fimIso);
        expect(r.subscription_cancelled_at).not.toBeNull();
    });

    it("pagamento atrasado segue ativo; encerrada e não paga cortam", () => {
        expect(situacaoDaAssinatura({ status: "past_due" }).subscription_status).toBe("active");
        expect(situacaoDaAssinatura({ status: "canceled", ended_at: fim }).subscription_status).toBe("cancelled");
        expect(situacaoDaAssinatura({ status: "unpaid" }).subscription_status).toBe("expired");
        expect(situacaoDaAssinatura({ status: "incomplete" }).subscription_status).toBe("inactive");
    });
});
