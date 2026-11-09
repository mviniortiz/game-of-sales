import { describe, expect, it } from "vitest";
import { montarLinhas, type Ativacao, type UsoDia } from "./usoApp";

const at = (id: string, nome: string, extra: Partial<Ativacao> = {}): Ativacao => ({
    company_id: id,
    empresa: nome,
    conta_criada: "2026-10-01T12:00:00Z",
    whatsapp_conectado: null,
    raiox_visto: null,
    primeira_conversa: null,
    primeiro_aviso_aprovado: null,
    voltou_depois_de_7_dias: null,
    ...extra,
});
const dia = (id: string, d: string, extra: Partial<UsoDia> = {}): UsoDia => ({
    company_id: id,
    empresa: null,
    dia: d,
    pessoas: 1,
    sessoes: 1,
    telas_vistas: 3,
    conversas_abertas: 0,
    mensagens_enviadas: 0,
    interacoes_lume: 0,
    negocios_criados: 0,
    telas: ["inicio"],
    ...extra,
});

describe("montarLinhas", () => {
    it("soma o período por empresa e conta os passos feitos", () => {
        const [l] = montarLinhas(
            [at("a", "Sol Norte", { whatsapp_conectado: "2026-10-02T12:00:00Z", raiox_visto: "2026-10-03T12:00:00Z" })],
            [
                dia("a", "2026-11-05", { sessoes: 2, conversas_abertas: 4, telas: ["conversas", "inicio"] }),
                dia("a", "2026-11-07", { sessoes: 1, conversas_abertas: 1, interacoes_lume: 3, telas: ["conversas"] }),
            ],
        );
        expect(l).toMatchObject({ nome: "Sol Norte", feitos: 2, dias: 2, sessoes: 3, conversas: 5, lume: 3, ultimo: "2026-11-07" });
        expect(l.telas[0]).toBe("Conversas");
    });

    it("põe quem usou primeiro e quem não usou fica com zero", () => {
        const linhas = montarLinhas([at("a", "Parada"), at("b", "Ativa")], [dia("b", "2026-11-06")]);
        expect(linhas.map((l) => l.nome)).toEqual(["Ativa", "Parada"]);
        expect(linhas[1]).toMatchObject({ dias: 0, sessoes: 0, ultimo: null, telas: [] });
    });
});
