import { describe, expect, it } from "vitest";
import { fraseFundadora, lerVaga, ofertaFundadora } from "@/lib/fundadora";

describe("lerVaga", () => {
    it("lê a resposta da RPC", () => {
        expect(lerVaga({ fundadora: true, numero: 3, vagas_restantes: 7, limite: 10 })).toEqual({
            fundadora: true,
            numero: 3,
            vagas_restantes: 7,
            limite: 10,
        });
    });

    it("sem número não é fundadora", () => {
        expect(lerVaga({ fundadora: true, numero: null, vagas_restantes: 2, limite: 10 })?.fundadora).toBe(false);
    });

    it("resposta vazia ou estranha vira null ou zero vaga", () => {
        expect(lerVaga(null)).toBeNull();
        expect(lerVaga("x")).toBeNull();
        expect(lerVaga({})).toEqual({ fundadora: false, numero: null, vagas_restantes: 0, limite: 10 });
        expect(lerVaga({ vagas_restantes: -4 })?.vagas_restantes).toBe(0);
        expect(lerVaga({ vagas_restantes: 40, limite: 10 })?.vagas_restantes).toBe(10);
    });
});

describe("fraseFundadora", () => {
    it("diz o número e que é sem cobrança", () => {
        expect(fraseFundadora(3)).toBe("Você é a 3ª das 10 primeiras. A Lume está liberada pra sempre, sem cobrança.");
        expect(fraseFundadora(1, 10)).toContain("a 1ª das 10");
    });

    it("não usa travessão", () => {
        expect(fraseFundadora(10)).not.toMatch(/[—–]/);
    });
});

describe("ofertaFundadora", () => {
    const vaga = (restantes: number, fundadora = false) => ({ fundadora, numero: fundadora ? 1 : null, vagas_restantes: restantes, limite: 10 });

    it("mostra a oferta para quem ainda não conectou e tem vaga", () => {
        expect(ofertaFundadora(vaga(4), false)).toBe("As 10 primeiras integradoras que conectam o WhatsApp usam a Lume sem cobrança. Restam 4 vagas.");
        expect(ofertaFundadora(vaga(1), false)).toContain("Resta 1 vaga.");
    });

    it("cala quando não vale para essa conta", () => {
        expect(ofertaFundadora(vaga(0), false)).toBeNull();
        expect(ofertaFundadora(vaga(5), true)).toBeNull();
        expect(ofertaFundadora(vaga(5, true), false)).toBeNull();
        expect(ofertaFundadora(null, false)).toBeNull();
    });
});
