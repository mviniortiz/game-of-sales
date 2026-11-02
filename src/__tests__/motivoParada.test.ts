import { describe, it, expect } from "vitest";
import { motivoParada } from "../../supabase/functions/_shared/motivoParada";

describe("motivoParada", () => {
    it.each([
        ["O banco não aprovou", "credito"],
        ["o financiamento foi negado", "credito"],
        ["Vou falar com a minha esposa", "decisor"],
        ["preciso mostrar pro meu sócio", "decisor"],
        ["Peguei outro orçamento, vou comparar", "comparando"],
        ["A parcela ficou um pouco alta", "parcela"],
        ["achei caro", "parcela"],
    ])("%s", (texto, motivo) => {
        expect(motivoParada([texto])).toBe(motivo);
    });

    it("sem frase clara não chuta", () => {
        expect(motivoParada(["Recebi, obrigado", "vou pensar"])).toBeNull();
        expect(motivoParada([])).toBeNull();
    });

    it("vale o que o cliente disse por último", () => {
        expect(motivoParada(["achei caro", "o banco não aprovou"])).toBe("credito");
    });
});
