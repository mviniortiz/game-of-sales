// Agenda: as contas puras da tela (agrupar por dia, contar por tipo, rótulos de data).
// Sem supabase aqui, para o teste não precisar de rede nem de sessão.
import {
    addDays,
    differenceInCalendarDays,
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    isSameMonth,
    isSameYear,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type TipoEvento = "visita" | "instalacao" | "vistoria" | "outro";
/** Os valores que o banco guarda em agendamentos.status. */
export type StatusAgenda = "agendado" | "realizado" | "nao_compareceu" | "cancelado";
export type VisaoAgenda = "semana" | "mes" | "dia";

export interface Agendamento {
    id: string;
    cliente_nome: string;
    data_agendamento: string;
    observacoes: string;
    status: string;
    user_id: string;
    tipo?: TipoEvento | null;
    google_event_id?: string;
    seller_name?: string;
}

export const TIPOS: Exclude<TipoEvento, "outro">[] = ["visita", "instalacao", "vistoria"];

export const NOME_TIPO: Record<TipoEvento, string> = {
    visita: "Visita técnica",
    instalacao: "Instalação",
    vistoria: "Vistoria",
    outro: "Compromisso",
};

const PLURAL_TIPO: Record<TipoEvento, [string, string]> = {
    visita: ["visita", "visitas"],
    instalacao: ["instalação", "instalações"],
    vistoria: ["vistoria", "vistorias"],
    outro: ["outro", "outros"],
};

export const NOME_STATUS: Record<StatusAgenda, string> = {
    agendado: "Marcado",
    realizado: "Aconteceu",
    nao_compareceu: "Não foi",
    cancelado: "Cancelado",
};

/** Compromisso antigo, sem tipo, conta como "outro". */
export const tipoDe = (ag: Pick<Agendamento, "tipo">): TipoEvento =>
    ag.tipo === "visita" || ag.tipo === "instalacao" || ag.tipo === "vistoria" ? ag.tipo : "outro";

export const statusDe = (status?: string | null): StatusAgenda =>
    status === "realizado" || status === "nao_compareceu" || status === "cancelado" ? status : "agendado";

/** Marcado e com a hora já passada: falta o dono dizer se aconteceu. */
export const precisaMarcar = (ag: Pick<Agendamento, "status" | "data_agendamento">, agora: Date = new Date()) =>
    statusDe(ag.status) === "agendado" && parseISO(ag.data_agendamento).getTime() <= agora.getTime();

export const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export const chaveDia = (d: Date) => format(d, "yyyy-MM-dd");

export type Periodo = { inicio: Date; fim: Date };

export const semanaDe = (d: Date): Periodo => ({ inicio: startOfWeek(d, { locale: ptBR }), fim: endOfWeek(d, { locale: ptBR }) });
export const mesDe = (d: Date): Periodo => ({ inicio: startOfMonth(d), fim: endOfMonth(d) });
/** As semanas inteiras que o mês ocupa: é o que a tela carrega, em qualquer visão. */
export const gradeDoMes = (d: Date): Periodo => ({
    inicio: startOfWeek(startOfMonth(d), { locale: ptBR }),
    fim: endOfWeek(endOfMonth(d), { locale: ptBR }),
});
export const periodoDa = (visao: VisaoAgenda, d: Date): Periodo =>
    visao === "semana" ? semanaDe(d) : visao === "mes" ? mesDe(d) : { inicio: startOfDay(d), fim: endOfDay(d) };

export const dentro = (ag: Pick<Agendamento, "data_agendamento">, p: Periodo) => {
    const t = parseISO(ag.data_agendamento).getTime();
    return t >= p.inicio.getTime() && t <= p.fim.getTime();
};

export const porHorario = <T extends Pick<Agendamento, "data_agendamento">>(a: T, b: T) =>
    parseISO(a.data_agendamento).getTime() - parseISO(b.data_agendamento).getTime();

export type GrupoDia<T> = { dia: Date; chave: string; itens: T[] };

/** Um grupo por dia que tem compromisso, em ordem de data; dentro do dia, por horário. */
export function agruparPorDia<T extends Pick<Agendamento, "data_agendamento">>(ags: T[]): GrupoDia<T>[] {
    const grupos = new Map<string, GrupoDia<T>>();
    for (const ag of [...ags].sort(porHorario)) {
        const dia = startOfDay(parseISO(ag.data_agendamento));
        const chave = chaveDia(dia);
        const g = grupos.get(chave);
        if (g) g.itens.push(ag);
        else grupos.set(chave, { dia, chave, itens: [ag] });
    }
    return [...grupos.values()];
}

/**
 * A semana lida a partir de hoje: hoje primeiro (mesmo vazio, quando a semana tem hoje),
 * depois os dias que vêm, e os que já passaram por último.
 */
export function ordemDaSemana<T>(grupos: GrupoDia<T>[], periodo: Periodo, hoje: Date = new Date()) {
    const h = startOfDay(hoje);
    const temHoje = h >= startOfDay(periodo.inicio) && h <= periodo.fim;
    if (!temHoje) return { adiante: grupos, passados: [] as GrupoDia<T>[], temHoje };
    const chaveHoje = chaveDia(h);
    const deHoje = grupos.find((g) => g.chave === chaveHoje) ?? { dia: h, chave: chaveHoje, itens: [] as T[] };
    return {
        adiante: [deHoje, ...grupos.filter((g) => g.dia > h)],
        passados: grupos.filter((g) => g.dia < h),
        temHoje,
    };
}

export type ContagemTipo = Record<TipoEvento, number>;

export function contarPorTipo(ags: Pick<Agendamento, "tipo">[]): ContagemTipo {
    const c: ContagemTipo = { visita: 0, instalacao: 0, vistoria: 0, outro: 0 };
    for (const ag of ags) c[tipoDe(ag)] += 1;
    return c;
}

export const nomeContado = (tipo: TipoEvento, n: number) => plural(n, ...PLURAL_TIPO[tipo]);

/** "4 visitas · 2 instalações · 1 vistoria"; tipo zerado fica de fora. */
export function textoContagem(c: ContagemTipo): string {
    const partes = (["visita", "instalacao", "vistoria", "outro"] as TipoEvento[])
        .filter((t) => c[t] > 0)
        .map((t) => `${c[t]} ${nomeContado(t, c[t])}`);
    return partes.length ? partes.join(" · ") : "Nada marcado";
}

export const DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIA_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "Hoje, qua 4", "Amanhã, qui 5", "Ontem, ter 3" ou "sex 6". */
export function rotuloDoDia(dia: Date, hoje: Date = new Date()): string {
    const curto = `${DIA_CURTO[dia.getDay()]} ${dia.getDate()}`;
    const delta = differenceInCalendarDays(dia, hoje);
    if (delta === 0) return `Hoje, ${curto}`;
    if (delta === 1) return `Amanhã, ${curto}`;
    if (delta === -1) return `Ontem, ${curto}`;
    return curto;
}

/** O nome do período mostrado: "1 a 7 de novembro", "Novembro de 2026", "Quarta, 4 de novembro". */
export function rotuloPeriodo(visao: VisaoAgenda, d: Date, hoje: Date = new Date()): string {
    if (visao === "mes") {
        const nome = MES[d.getMonth()];
        return `${nome[0].toUpperCase()}${nome.slice(1)}${isSameYear(d, hoje) ? "" : ` de ${d.getFullYear()}`}`;
    }
    if (visao === "dia") {
        return `${DIA_LONGO[d.getDay()]}, ${d.getDate()} de ${MES[d.getMonth()]}${isSameYear(d, hoje) ? "" : ` de ${d.getFullYear()}`}`;
    }
    const { inicio, fim } = semanaDe(d);
    const ano = isSameYear(fim, hoje) ? "" : ` de ${fim.getFullYear()}`;
    if (isSameMonth(inicio, fim)) return `${inicio.getDate()} a ${fim.getDate()} de ${MES[fim.getMonth()]}${ano}`;
    return `${inicio.getDate()} de ${MES[inicio.getMonth()]} a ${fim.getDate()} de ${MES[fim.getMonth()]}${ano}`;
}

/** Mesmo horário, outro dia: o que acontece ao arrastar no mês. */
export function mesmoHorarioEm(dataIso: string, dia: Date): Date {
    const atual = parseISO(dataIso);
    const novo = new Date(dia);
    novo.setHours(atual.getHours(), atual.getMinutes(), 0, 0);
    return novo;
}

export const diasDaGrade = (p: Periodo) => {
    const dias: Date[] = [];
    for (let d = startOfDay(p.inicio); d <= p.fim; d = addDays(d, 1)) dias.push(d);
    return dias;
};
