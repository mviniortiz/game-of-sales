// @vitest-environment node
// Kapso: o risco aqui é gravar a mensagem do lado errado da conversa (lead vira
// dono), perder o PDF da proposta ou aceitar webhook sem assinatura válida.
import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
    ingestPayload,
    normalizeKapsoMessage,
    unwrapWebhookBody,
    verifyKapsoSignature,
    type KapsoMessage,
} from "../../supabase/functions/_shared/kapso";

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("hex");

describe("verifyKapsoSignature", () => {
    const body = JSON.stringify({ phone_number_id: "123" });

    it("aceita assinatura de qualquer um dos segredos", async () => {
        expect(await verifyKapsoSignature(body, sign(body, "projeto"), ["numero", "projeto"])).toBe(true);
    });

    it("recusa corpo alterado, segredo errado e header ausente", async () => {
        expect(await verifyKapsoSignature(body + " ", sign(body, "numero"), ["numero"])).toBe(false);
        expect(await verifyKapsoSignature(body, sign(body, "outro"), ["numero"])).toBe(false);
        expect(await verifyKapsoSignature(body, null, ["numero"])).toBe(false);
    });

    it("segredo vazio não valida nada", async () => {
        expect(await verifyKapsoSignature(body, sign(body, ""), ["", ""])).toBe(false);
    });
});

describe("unwrapWebhookBody", () => {
    it("abre o envelope batch", () => {
        expect(unwrapWebhookBody({ type: "whatsapp.message.received", batch: true, data: [{ a: 1 }, { a: 2 }] })).toHaveLength(2);
    });

    it("sem batch, o próprio corpo é o evento", () => {
        expect(unwrapWebhookBody({ message: { id: "x" } })).toEqual([{ message: { id: "x" } }]);
    });
});

describe("normalizeKapsoMessage", () => {
    it("inbound: contato é quem mandou, com nome da conversa", () => {
        const n = normalizeKapsoMessage(
            {
                id: "wamid.1",
                timestamp: "1730092800",
                type: "text",
                from: "5543991765623",
                text: { body: "Oi, quero orçamento" },
                kapso: { direction: "inbound", status: "received", origin: "cloud_api" },
            },
            { id: "conv_1", contact_name: "Carlos", phone_number: "5543991765623" },
        );
        expect(n).toMatchObject({
            providerMessageId: "wamid.1",
            direction: "inbound",
            messageType: "text",
            body: "Oi, quero orçamento",
            status: "received",
            contactExternalId: "5543991765623",
            contactName: "Carlos",
            timestamp: "2024-10-28T05:20:00.000Z",
        });
    });

    it("outbound pelo app do dono: contato é o destinatário e não herda nome", () => {
        const n = normalizeKapsoMessage({
            id: "wamid.2",
            type: "text",
            to: "+55 (32) 99909-4825",
            text: { body: "Segue a proposta" },
            kapso: { direction: "outbound", status: "delivered", origin: "business_app", contact_name: "Mirele" },
        });
        expect(n?.contactExternalId).toBe("5532999094825");
        expect(n?.contactName).toBeNull();
        expect(n?.status).toBe("delivered");
        expect(n?.origin).toBe("business_app");
    });

    it("PDF da proposta: mantém tipo cru, nome do arquivo e legenda para o detectQuote", () => {
        const msg: KapsoMessage = {
            id: "wamid.3",
            type: "document",
            to: "5551981420146",
            document: { caption: "Proposta 6,2 kWp R$ 24.900", filename: "Proposta Oliveira.pdf", mime_type: "application/pdf" },
            kapso: { direction: "outbound", status: "sent", media_url: "https://api.kapso.ai/storage/media/p.pdf" },
        };
        const n = normalizeKapsoMessage(msg)!;
        expect(n).toMatchObject({
            messageType: "document",
            rawType: "document",
            caption: "Proposta 6,2 kWp R$ 24.900",
            fileName: "Proposta Oliveira.pdf",
            mimetype: "application/pdf",
            body: "Proposta 6,2 kWp R$ 24.900",
        });
        const payload = ingestPayload(n, "647015955153740", "user-1", msg);
        expect(payload.message.sent_by_user_id).toBe("user-1");
        expect(payload.message.media_ref).toMatchObject({ file_name: "Proposta Oliveira.pdf", mimetype: "application/pdf" });
        expect(payload.connection).toEqual({ external_id: "647015955153740", metadata: { transport: "kapso" } });
    });

    it("mídia só com dados da Kapso (listagem do histórico)", () => {
        const n = normalizeKapsoMessage({
            id: "wamid.4",
            type: "document",
            kapso: {
                direction: "outbound",
                phone_number: "+5534991977842",
                media_data: { url: "https://x/y.pdf", filename: "orcamento.pdf", content_type: "application/pdf" },
            },
        });
        expect(n).toMatchObject({ contactExternalId: "5534991977842", fileName: "orcamento.pdf", mimetype: "application/pdf", mediaUrl: "https://x/y.pdf" });
    });

    it("sem telefone usa o BSUID como id do contato", () => {
        const n = normalizeKapsoMessage({
            id: "wamid.5",
            type: "text",
            from_user_id: "BR.123456",
            text: { body: "oi" },
            kapso: { direction: "inbound" },
        });
        expect(n?.contactExternalId).toBe("BR.123456");
        expect(n?.contactPhone).toBeNull();
    });

    it("tipo fora do enum vira unknown com o texto da Kapso; sticker vira image", () => {
        expect(normalizeKapsoMessage({ id: "a", type: "interactive", from: "5511999990000", kapso: { direction: "inbound", content: "Sim, pode ser" } }))
            .toMatchObject({ messageType: "unknown", body: "Sim, pode ser" });
        expect(normalizeKapsoMessage({ id: "b", type: "sticker", from: "5511999990000", kapso: { direction: "inbound" } })?.messageType).toBe("image");
    });

    it("descarta mensagem sem id, sem direção ou sem ninguém do outro lado", () => {
        expect(normalizeKapsoMessage({ type: "text", kapso: { direction: "inbound" } })).toBeNull();
        expect(normalizeKapsoMessage({ id: "x", type: "text", from: "5511999990000" })).toBeNull();
        expect(normalizeKapsoMessage({ id: "x", type: "text", kapso: { direction: "outbound" } })).toBeNull();
    });
});
