// VENDAS.0 — regras do bot de vendas sobre o pipeline do próprio Vyzon: card
// só com telefone e nota, etapa válida, nunca venda ganha pelo bot.
import { describe, expect, it } from "vitest";
import { anexarNota, telefoneBR, validarAtualizacao, validarNovoCard } from "../../supabase/functions/_shared/vendas";

const errosDe = (v: { ok: boolean }): string[] => ("erros" in v ? (v as { erros: string[] }).erros : []);

describe("telefoneBR", () => {
    it("aceita com ou sem 55 e com máscara", () => {
        expect(telefoneBR("(48) 99821-4712")).toBe("5548998214712");
        expect(telefoneBR("5548998214712")).toBe("5548998214712");
        expect(telefoneBR("48 3241-1655")).toBe("554832411655");
    });
    it("recusa o que não é número BR", () => {
        expect(telefoneBR("123")).toBeNull();
        expect(telefoneBR("+1 415 555 0100")).toBeNull();
        expect(telefoneBR(undefined)).toBeNull();
    });
});

describe("validarNovoCard", () => {
    const base = { empresa: "Judá Vidros", telefone: "(48) 99821-4712", nicho: "vidraçaria", nota: "Respondeu que esquece de mandar orçamento depois de medir." };

    it("aceita o mínimo e põe Qualificação como padrão", () => {
        const v = validarNovoCard(base);
        expect(v.ok).toBe(true);
        if ("valor" in v) {
            expect(v.valor.etapa).toBe("qualification");
            expect(v.valor.telefone).toBe("5548998214712");
        }
    });

    it("exige telefone, nicho e uma nota que explique o card", () => {
        const erros = errosDe(validarNovoCard({ empresa: "X" })).join(" | ");
        expect(erros).toContain("telefone");
        expect(erros).toContain("nicho");
        expect(erros).toContain("nota");
    });

    it("card novo não nasce perdido", () => {
        expect(validarNovoCard({ ...base, etapa: "closed_lost" }).ok).toBe(false);
    });
});

describe("validarAtualizacao", () => {
    const id = "3f1d2c4b-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

    it("move etapa e anota", () => {
        expect(validarAtualizacao({ deal_id: id, etapa: "proposal", nota: "Pediu o Raio-X." }).ok).toBe(true);
    });

    it("nunca marca venda ganha", () => {
        expect(errosDe(validarAtualizacao({ deal_id: id, etapa: "closed_won" })).join()).toContain("Markus");
    });

    it("perdido exige motivo", () => {
        expect(validarAtualizacao({ deal_id: id, etapa: "closed_lost" }).ok).toBe(false);
        expect(validarAtualizacao({ deal_id: id, etapa: "closed_lost", motivo_perda: "Já usa ferramenta do setor." }).ok).toBe(true);
    });

    it("recusa id inválido e pedido vazio", () => {
        expect(validarAtualizacao({ deal_id: "abc", nota: "oi tudo bem" }).ok).toBe(false);
        expect(validarAtualizacao({ deal_id: id }).ok).toBe(false);
    });
});

describe("anexarNota", () => {
    it("põe a nota nova no topo, com data, sem perder o histórico", () => {
        const agora = new Date("2026-10-24T15:00:00Z");
        const n = anexarNota("Cidade: Floripa.", "Pediu o preço.", agora);
        expect(n.split("\n")[0]).toBe("[24/10 bot de vendas] Pediu o preço.");
        expect(n).toContain("Cidade: Floripa.");
    });
});
