// APPROVAL.1 — o parser lê o que o dono digita no próprio chat do WhatsApp.
// O risco não é errar um comando: é engolir uma anotação pessoal dele achando
// que era resposta a um rascunho. Por isso a maioria dos casos aqui verifica o
// que o parser deve IGNORAR.
import { describe, it, expect } from "vitest";
import {
    parseOwnerCommand,
    normalizeNumber,
    instanceNameFor,
    userIdFromInstance,
} from "../../supabase/functions/_shared/whatsappApproval";

describe("parseOwnerCommand", () => {
    it("entende o aprovar de um toque", () => {
        expect(parseOwnerCommand("1")).toEqual({ code: null, intent: "send" });
        expect(parseOwnerCommand("ok")).toEqual({ code: null, intent: "send" });
        expect(parseOwnerCommand("manda")).toEqual({ code: null, intent: "send" });
        expect(parseOwnerCommand("  Sim.  ")).toEqual({ code: null, intent: "send" });
    });

    it("entende o descartar", () => {
        expect(parseOwnerCommand("2")).toEqual({ code: null, intent: "reject" });
        expect(parseOwnerCommand("não")).toEqual({ code: null, intent: "reject" });
        expect(parseOwnerCommand("descartar")).toEqual({ code: null, intent: "reject" });
    });

    it("lê o código na frente, com ou sem colchete", () => {
        expect(parseOwnerCommand("A2 1")).toEqual({ code: "A2", intent: "send" });
        expect(parseOwnerCommand("[a2] 2")).toEqual({ code: "A2", intent: "reject" });
        expect(parseOwnerCommand("K7: ok")).toEqual({ code: "K7", intent: "send" });
    });

    it("trata texto de mensagem como correção", () => {
        const r = parseOwnerCommand("Oi João, consigo te mostrar amanhã às 10h?");
        expect(r.intent).toBe("replace");
        expect(r.replacement).toContain("João");
    });

    it("separa a correção do código", () => {
        const r = parseOwnerCommand("A2 Oi João, amanhã às 10h fica bom?");
        expect(r.code).toBe("A2");
        expect(r.intent).toBe("replace");
        expect(r.replacement?.startsWith("Oi João")).toBe(true);
    });

    it("ignora recado curto solto no chat pessoal", () => {
        expect(parseOwnerCommand("comprar pão").intent).toBe("none");
        expect(parseOwnerCommand("ligar joao").intent).toBe("none");
        expect(parseOwnerCommand("").intent).toBe("none");
    });

    it("ignora a própria confirmação da EVA voltando pelo webhook", () => {
        expect(parseOwnerCommand("EVA Enviado para João Silva.").intent).toBe("none");
        expect(parseOwnerCommand("EVA [A2] rascunho pronto\n\nLead: João").intent).toBe("none");
    });
});

describe("normalizeNumber", () => {
    it("põe o 55 em celular e fixo brasileiros", () => {
        expect(normalizeNumber("(11) 98765-4321")).toBe("5511987654321");
        expect(normalizeNumber("1133334444")).toBe("551133334444");
    });

    it("não mexe em número que já tem DDI", () => {
        expect(normalizeNumber("5511987654321")).toBe("5511987654321");
        expect(normalizeNumber("5511987654321@s.whatsapp.net")).toBe("5511987654321");
    });

    it("recusa o que não dá para discar", () => {
        expect(normalizeNumber("")).toBeNull();
        expect(normalizeNumber("98765")).toBeNull();
    });
});

describe("nome da instância", () => {
    it("faz a volta completa userId → instância → userId", () => {
        const userId = "99289fe5-9bf4-4323-8a18-4ccedef2126b";
        const instance = instanceNameFor(userId);
        expect(instance).toBe("wa_99289fe59bf443238a184ccedef2126b");
        expect(userIdFromInstance(instance)).toBe(userId);
    });

    it("devolve null para instância fora do padrão", () => {
        expect(userIdFromInstance("wa_demo_incorp_d1e0000000004000")).toBeNull();
    });
});
