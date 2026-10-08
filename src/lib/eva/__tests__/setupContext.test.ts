import { describe, expect, it } from "vitest";
import { composeContext, perguntasPendentes, resumoInicial, type SiteDraft } from "../setupContext";

const draft: SiteDraft = {
    site: "https://solar.com.br",
    nome: "Sol do Vale",
    e_energia_solar: true,
    descricao: "Projeta e instala energia solar para casas e empresas.",
    cidades: ["Campinas", "Valinhos"],
    tipos_cliente: ["residencial", "comercial", "outro"],
    financiamento: true,
    servicos: [{ nome: "Sistema on-grid", descricao: "Reduz a conta de luz." }],
    diferenciais: ["garantia de 25 anos nos painéis"],
};

describe("configuração da EVA por conversa", () => {
    it("o site preenche o que sabe e a conversa pergunta só o resto", () => {
        const r = resumoInicial(draft, "Empresa");
        expect(r.nome).toBe("Sol do Vale");
        expect(r.clientes).toBe("residencial, comercial");
        expect(r.financiamento).toBe("sim");
        expect(perguntasPendentes(r)).toEqual(["ticket", "travas", "tom"]);
    });

    it("sem site, pergunta tudo e usa o nome do cadastro", () => {
        const r = resumoInicial(null, "Minha Solar");
        expect(r.nome).toBe("Minha Solar");
        expect(perguntasPendentes(r)).toEqual(["oQueFaz", "cidades", "financiamento", "ticket", "travas", "tom"]);
    });

    it("monta o contexto que a EVA lê, só com o que foi confirmado", () => {
        const r = { ...resumoInicial(draft, "x"), ticket: "R$ 15 a 30 mil", travas: ["financiamento" as const, "sumiu" as const], tom: "proximo" as const };
        const ctx = composeContext(r);
        expect(ctx.agency.descricao).toBe("Projeta e instala energia solar para casas e empresas. Atende Campinas, Valinhos. Trabalha com financiamento do sistema.");
        expect(ctx.agency.ticket_medio).toBe("R$ 15 a 30 mil por proposta");
        expect(ctx.services).toHaveLength(1);
        expect(ctx.services[0].preco_min).toBeNull();
        expect(ctx.playbooks.filter((p) => p.kind === "objection")).toHaveLength(2);
        expect(ctx.playbooks.some((p) => p.kind === "forbidden_promise")).toBe(true);
        expect(JSON.stringify(ctx)).not.toContain("—");
    });

    it("sem serviço no site, entra um serviço genérico de energia solar", () => {
        const ctx = composeContext({ ...resumoInicial(null, "x"), oQueFaz: "Instala placas — residencial" });
        expect(ctx.services[0].nome).toBe("Sistema de energia solar");
        expect(ctx.agency.descricao).toBe("Instala placas, residencial");
    });
});
