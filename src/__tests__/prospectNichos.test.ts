// PROSPECT.3 — prospecção por nicho: vidraçaria fala a língua dela, sem print,
// e solar continua com os textos de antes.
import { describe, expect, it } from "vitest";
import { contextoDaLeitura, notaDoVendedor, perfilDoNicho, VIDRACARIA } from "../../supabase/functions/_shared/prospectNichos";
import { firstMessage, followupMessage, MARCA_IMAGEM, portaJaFoi, respostaPorta } from "../../supabase/functions/_shared/prospectingText";
import { problemasDeCopy } from "../../supabase/functions/_shared/distribuicao";

const vidro = { agency_name: "Judá Vidros", city: "São José", rating_count: 71, niche: "vidraçaria", metadata: { socio: null } };

describe("perfilDoNicho", () => {
    it("reconhece vidraçaria e deixa solar no fluxo antigo", () => {
        expect(perfilDoNicho("Vidraçaria")).toBe(VIDRACARIA);
        expect(perfilDoNicho("integradora solar")).toBeNull();
        expect(perfilDoNicho("distribuidora solar")).toBeNull();
        expect(perfilDoNicho(null)).toBeNull();
    });
});

describe("textos de vidraçaria", () => {
    it("primeira mensagem fala de vidraçaria e orçamento, nunca de solar", () => {
        for (const v of ["encaminha", "time", "aberta", "pergunta"] as const) {
            const t = firstMessage(vidro, v);
            expect(t).toContain("vidraçaria");
            expect(t).toContain("orçamento");
            expect(t).not.toMatch(/solar|integradora/i);
            expect(problemasDeCopy(t)).toEqual([]);
        }
    });

    it("usa o primeiro nome do sócio quando existe", () => {
        expect(firstMessage({ ...vidro, metadata: { socio: "JOAO DA SILVA" } })).toMatch(/^Oi, Joao/);
    });

    it("a resposta a quem abriu a porta não leva print", () => {
        const p = respostaPorta("vidraçaria");
        expect(p).not.toContain(MARCA_IMAGEM);
        expect(p).toContain(VIDRACARIA.perguntaFazem);
        expect(portaJaFoi(`Markus: ${p}`, "vidraçaria")).toBe(true);
        expect(respostaPorta(null)).toContain(MARCA_IMAGEM);
    });

    it("seguimento do dia 4 usa a pergunta do nicho", () => {
        expect(followupMessage(vidro)).toContain("mandam o orçamento e o cliente some");
    });

    it("a leitura de respostas recebe o vocabulário e proíbe o print", () => {
        const c = contextoDaLeitura(VIDRACARIA);
        expect(c).toContain("VIDRAÇARIA");
        expect(c).toContain("[imagem]");
        expect(c).toContain("10 primeiras empresas");
    });
});

describe("notaDoVendedor", () => {
    it("começa no corte e sobe com as avaliações", () => {
        expect(notaDoVendedor(71, 4.9).nota).toBe(64);
        expect(notaDoVendedor(100, null).nota).toBe(70);
        expect(notaDoVendedor(500, null).nota).toBe(70);
    });

    it("nota baixa no Google pode deixar a empresa abaixo do corte", () => {
        expect(notaDoVendedor(20, 3.9).nota).toBe(49);
    });
});
