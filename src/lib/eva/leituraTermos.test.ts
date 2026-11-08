import { describe, expect, it } from "vitest";
import { marcarTermos, termosPorGrupo } from "./leituraTermos";

describe("marcarTermos", () => {
    it("marca valor, consumo, prazo e decisão sem perder texto", () => {
        const t = "Achei caro, a conta de luz vem R$ 412 e uns 450 kWh. Dá pra parcelar? Semana que vem eu fecho.";
        const trechos = marcarTermos(t);
        expect(trechos.map((x) => x.texto).join("")).toBe(t);
        const marcados = trechos.filter((x) => x.grupo).map((x) => `${x.grupo}:${x.texto}`);
        expect(marcados).toEqual([
            "decisao:caro",
            "valor:conta de luz",
            "valor:R$ 412",
            "valor:450 kWh",
            "prazo:parcelar",
            "prazo:Semana que vem",
        ]);
    });

    it("não marca nada numa saudação", () => {
        expect(marcarTermos("Opa, tudo bem?").every((x) => x.grupo === null)).toBe(true);
    });
});

describe("termosPorGrupo", () => {
    it("junta por grupo sem repetir", () => {
        const g = termosPorGrupo(["quero fechar", "Quero sim, R$ 30 mil à vista"]);
        expect(g.decisao).toEqual(["quero", "fechar"]);
        expect(g.valor).toEqual(["R$ 30 mil"]);
        expect(g.prazo).toEqual(["à vista"]);
    });
});
