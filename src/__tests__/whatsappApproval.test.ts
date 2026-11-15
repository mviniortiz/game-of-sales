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
    brNumberVariants,
    sameNumber,
    templateParam,
    buildDraftMessage,
    buildAmbiguousReply,
    handleOwnerCommand,
} from "../../supabase/functions/_shared/whatsappApproval";

describe("texto do aviso ao dono", () => {
    const rascunho = { code: "A2", contactName: "Carlos", stage: null, why: null, text: "Oi, Carlos" };

    it("pede só 1 ou 2, sem o código", () => {
        const texto = buildDraftMessage(rascunho);
        expect(texto).toContain("Responda 1 para enviar, 2 para descartar, ou responda esta mensagem com o texto corrigido.");
        expect(texto).not.toContain("A2 1");
    });

    it("mantém o código no cabeçalho, para quando houver mais de um aberto", () => {
        expect(buildDraftMessage(rascunho)).toContain("[A2]");
    });

    it("com dois abertos, mostra quem é cada um", () => {
        const texto = buildAmbiguousReply([
            { approval_code: "A2", suggestion: { contact_name: "Carlos" } },
            { approval_code: "A3", suggestion: {} },
        ]);
        expect(texto).toContain("Tem 2 rascunhos abertos.");
        expect(texto).toContain("A2 1 para Carlos");
        expect(texto).toContain("A3 1");
    });
});

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
        expect(parseOwnerCommand("Lume Enviado para João Silva.").intent).toBe("none");
        expect(parseOwnerCommand("EVA Enviado para João Silva.").intent).toBe("none");
        expect(parseOwnerCommand("EVA [A2] rascunho pronto\n\nLead: João").intent).toBe("none");
    });

    it("ignora aviso automático de outra ferramenta no mesmo chat", () => {
        const aviso = "📤 Prospecção: enviei a mensagem para corrego-grande-odontologia às 09:12. Se responder, a apresentação (vídeo + link) vai por você.";
        expect(parseOwnerCommand(aviso)).toEqual({ code: null, intent: "none" });
        expect(parseOwnerCommand("🔔 odonto-art respondeu: \"Oi, quem fala?\"").intent).toBe("none");
        expect(parseOwnerCommand("⚠️ Prospecção: não consegui enviar para lux-clinic").intent).toBe("none");
        expect(parseOwnerCommand("✅ red respondeu: \"pode\"").intent).toBe("none");
    });

    it("texto corrigido sem emoji na frente continua valendo", () => {
        expect(parseOwnerCommand("Oi João, tudo bem? Segue a proposta atualizada.").intent).toBe("replace");
        expect(parseOwnerCommand("A2 Oi João, segue a proposta 😊").intent).toBe("replace");
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

describe("número oficial da EVA", () => {
    it("acha o mesmo celular com e sem o nono dígito", () => {
        expect(brNumberVariants("11 99876-5432")).toEqual(["5511998765432", "551198765432"]);
        expect(sameNumber("551198765432", "(11) 99876-5432")).toBe(true);
        expect(sameNumber("5511998765432", "5511998765433")).toBe(false);
    });

    it("não inventa nono dígito em telefone fixo", () => {
        expect(brNumberVariants("1133334444")).toEqual(["551133334444"]);
    });

    it("achata o parâmetro do template e respeita o teto", () => {
        expect(templateParam("Oi Carlos,\n\ntudo bem?\t  ", 100)).toBe("Oi Carlos, tudo bem?");
        const longo = templateParam("a".repeat(700), 600);
        expect(longo.length).toBe(600);
        expect(longo.endsWith("…")).toBe(true);
    });

    it("entende os botões do aviso", () => {
        expect(parseOwnerCommand("A2 1")).toEqual({ code: "A2", intent: "send" });
        expect(parseOwnerCommand("Enviar")).toEqual({ code: null, intent: "send" });
        expect(parseOwnerCommand("Descartar")).toEqual({ code: null, intent: "reject" });
    });
});

describe("handleOwnerCommand: texto solto no chat do dono", () => {
    // Qualquer consulta ao banco quebra o teste: texto solto tem que parar antes.
    const admin = { from: () => { throw new Error("não devia consultar o banco"); } };
    const base = { instanceName: "x", companyId: "c1", ownerNumber: "5548999999999", replyVia: async () => {} };

    it("aviso do Workana sem emoji e sem código não vira texto corrigido", async () => {
        const aviso = "Workana: 1 projeto precisa do seu pode\nAuditoria de site Empis (GA4 + SEO) · R$ 2.700 a 5.000";
        await expect(handleOwnerCommand(admin, { ...base, text: aviso })).resolves.toEqual({ handled: false });
    });

    it("aviso com emoji na frente também não", async () => {
        const aviso = "🎯 Workana: 1 projeto precisa do seu pode\nProposta pronta em Documentos/Freela/workana-propostas-2026-11-02.md";
        await expect(handleOwnerCommand(admin, { ...base, text: aviso })).resolves.toEqual({ handled: false });
    });
});
