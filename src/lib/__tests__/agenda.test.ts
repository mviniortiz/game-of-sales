import { describe, expect, it } from "vitest";
import {
    agruparPorDia,
    contarPorTipo,
    mesmoHorarioEm,
    ordemDaSemana,
    precisaMarcar,
    rotuloDoDia,
    rotuloPeriodo,
    semanaDe,
    textoContagem,
    type Agendamento,
} from "@/lib/agenda";

// Quarta, 4 de novembro de 2026, 10h
const HOJE = new Date(2026, 10, 4, 10, 0);
const em = (dia: number, h: number, m = 0) => new Date(2026, 10, dia, h, m).toISOString();
const ag = (id: string, data: string, extra: Partial<Agendamento> = {}): Agendamento => ({
    id,
    cliente_nome: id,
    data_agendamento: data,
    observacoes: "",
    status: "agendado",
    user_id: "u",
    ...extra,
});

describe("agruparPorDia", () => {
    it("junta por dia, em ordem de data e de horário, e pula dia vazio", () => {
        const grupos = agruparPorDia([ag("c", em(6, 9)), ag("b", em(4, 15)), ag("a", em(4, 8))]);
        expect(grupos.map((g) => g.chave)).toEqual(["2026-11-04", "2026-11-06"]);
        expect(grupos[0].itens.map((i) => i.id)).toEqual(["a", "b"]);
    });
});

describe("ordemDaSemana", () => {
    const semana = semanaDe(HOJE);
    it("põe hoje primeiro, depois o que vem, e o que passou no fim", () => {
        const grupos = agruparPorDia([ag("ontem", em(3, 9)), ag("hoje", em(4, 9)), ag("sexta", em(6, 9))]);
        const { adiante, passados, temHoje } = ordemDaSemana(grupos, semana, HOJE);
        expect(temHoje).toBe(true);
        expect(adiante.map((g) => g.chave)).toEqual(["2026-11-04", "2026-11-06"]);
        expect(passados.map((g) => g.chave)).toEqual(["2026-11-03"]);
    });
    it("cria o grupo de hoje vazio quando hoje não tem nada", () => {
        const { adiante } = ordemDaSemana(agruparPorDia([ag("sexta", em(6, 9))]), semana, HOJE);
        expect(adiante[0].chave).toBe("2026-11-04");
        expect(adiante[0].itens).toEqual([]);
    });
    it("semana sem hoje fica em ordem de data", () => {
        const outra = semanaDe(new Date(2026, 10, 11));
        const grupos = agruparPorDia([ag("a", em(10, 9)), ag("b", em(12, 9))]);
        const r = ordemDaSemana(grupos, outra, HOJE);
        expect(r.temHoje).toBe(false);
        expect(r.adiante).toBe(grupos);
        expect(r.passados).toEqual([]);
    });
});

describe("contagem da semana", () => {
    it("conta por tipo, com compromisso sem tipo em outro", () => {
        const c = contarPorTipo([
            ag("1", em(4, 9), { tipo: "visita" }),
            ag("2", em(4, 9), { tipo: "visita" }),
            ag("3", em(4, 9), { tipo: "instalacao" }),
            ag("4", em(4, 9), { tipo: null }),
        ]);
        expect(c).toEqual({ visita: 2, instalacao: 1, vistoria: 0, outro: 1 });
        expect(textoContagem(c)).toBe("2 visitas · 1 instalação · 1 outro");
    });
    it("semana vazia diz que não tem nada", () => {
        expect(textoContagem(contarPorTipo([]))).toBe("Nada marcado");
    });
});

describe("rótulos", () => {
    it("nomeia hoje, amanhã, ontem e os outros dias", () => {
        expect(rotuloDoDia(new Date(2026, 10, 4), HOJE)).toBe("Hoje, qua 4");
        expect(rotuloDoDia(new Date(2026, 10, 5), HOJE)).toBe("Amanhã, qui 5");
        expect(rotuloDoDia(new Date(2026, 10, 3), HOJE)).toBe("Ontem, ter 3");
        expect(rotuloDoDia(new Date(2026, 10, 6), HOJE)).toBe("sex 6");
    });
    it("nomeia a semana, o mês e o dia", () => {
        expect(rotuloPeriodo("semana", HOJE, HOJE)).toBe("1 a 7 de novembro");
        expect(rotuloPeriodo("semana", new Date(2026, 10, 30), HOJE)).toBe("29 de novembro a 5 de dezembro");
        expect(rotuloPeriodo("mes", HOJE, HOJE)).toBe("Novembro");
        expect(rotuloPeriodo("dia", HOJE, HOJE)).toBe("Quarta, 4 de novembro");
        expect(rotuloPeriodo("mes", new Date(2027, 0, 10), HOJE)).toBe("Janeiro de 2027");
    });
});

describe("precisaMarcar e remarcar", () => {
    it("pede resposta só do que está marcado e já passou da hora", () => {
        expect(precisaMarcar(ag("a", em(4, 9)), HOJE)).toBe(true);
        expect(precisaMarcar(ag("b", em(4, 15)), HOJE)).toBe(false);
        expect(precisaMarcar(ag("c", em(3, 9), { status: "realizado" }), HOJE)).toBe(false);
    });
    it("arrastar mantém o horário e troca o dia", () => {
        const novo = mesmoHorarioEm(em(4, 9, 30), new Date(2026, 10, 12));
        expect([novo.getDate(), novo.getHours(), novo.getMinutes()]).toEqual([12, 9, 30]);
    });
});
