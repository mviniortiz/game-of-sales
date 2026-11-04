import { describe, expect, it } from "vitest";
import { PASSOS_PRIMEIRO_ACESSO, rotuloPasso, SO_LEIO } from "@/lib/primeiroAcesso";

describe("primeiro acesso", () => {
    it("tem 3 passos: conta, conectar e ver as propostas", () => {
        expect(PASSOS_PRIMEIRO_ACESSO).toEqual(["Conta", "Conectar", "Ver as propostas"]);
    });

    it("rotula cada passo com o mesmo contador", () => {
        expect(rotuloPasso(0)).toBe("Passo 1 de 3 · Conta");
        expect(rotuloPasso(1)).toBe("Passo 2 de 3 · Conectar");
        expect(rotuloPasso(2)).toBe("Passo 3 de 3 · Ver as propostas");
        expect(rotuloPasso(9)).toBe("Passo 3 de 3 · Ver as propostas");
        expect(rotuloPasso(-1)).toBe("Passo 1 de 3 · Conta");
    });

    it("a frase da leitura não usa travessão", () => {
        expect(SO_LEIO).not.toMatch(/[—–]/);
    });
});
