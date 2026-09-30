// O integrador de energia solar não pode abrir a EVA e ver o Padrão de Agência,
// nem uma agência passar a ver o pacote de solar.
import { describe, it, expect } from "vitest";
import { buildSuggestion, SOLAR_SEGMENT } from "../blueprint";

const empty = { context: null, companyTags: [], dealStages: [], openGaps: [] };

describe("buildSuggestion por segmento", () => {
    it("empresa solar sem contexto nasce com o pacote de energia solar", () => {
        const { bp, origin } = buildSuggestion({ ...empty, companySegment: SOLAR_SEGMENT });
        expect(origin).toBe("seeded");
        expect(bp.segment).toBe("Energia solar");
        expect(bp.pipeline).toContain("Proposta enviada");
    });

    it("sem segmento e sem contexto continua no Padrão de Agência", () => {
        expect(buildSuggestion(empty).bp.segment).toBe("Agência");
    });

    it("contexto que fala de sistema fotovoltaico vira solar mesmo sem segmento", () => {
        const { bp, origin } = buildSuggestion({
            ...empty,
            context: { agency: { descricao: "Integradora de sistemas fotovoltaicos em Londrina" } },
        });
        expect(origin).toBe("context");
        expect(bp.segment).toBe("Energia solar");
        expect(bp.fields).toContain("Valor da conta de luz");
    });

    it("segmento solar vence contexto que parece agência", () => {
        const { bp } = buildSuggestion({
            ...empty,
            companySegment: SOLAR_SEGMENT,
            context: { agency: { descricao: "fazemos marketing e tráfego pago" } },
        });
        expect(bp.segment).toBe("Energia solar");
    });

    it("funil real da empresa vence o sugerido", () => {
        const { bp } = buildSuggestion({ ...empty, companySegment: SOLAR_SEGMENT, dealStages: ["Novo lead", "Proposta enviada", "Fechado"] });
        expect(bp.pipeline).toEqual(["Novo lead", "Proposta enviada", "Fechado"]);
    });
});
