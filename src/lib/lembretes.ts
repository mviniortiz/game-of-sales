// Como o lembrete aparece: em que grupo cai e o horário em português de gente.

export type GrupoLembrete = "atrasado" | "hoje" | "proximo";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const hh = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function grupoDo(remindAt: string, agora = new Date()): GrupoLembrete {
    const t = new Date(remindAt);
    if (t.getTime() <= agora.getTime()) return "atrasado";
    return inicioDoDia(t) === inicioDoDia(agora) ? "hoje" : "proximo";
}

export function quandoTexto(remindAt: string, agora = new Date()): string {
    const t = new Date(remindAt);
    const diff = agora.getTime() - t.getTime();
    if (diff >= 0) {
        const min = Math.floor(diff / 60_000);
        if (min < 1) return "agora";
        if (min < 60) return `há ${min} min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `há ${h} h`;
        const d = Math.floor(h / 24);
        return d === 1 ? "ontem" : `há ${d} dias`;
    }
    const dias = Math.round((inicioDoDia(t) - inicioDoDia(agora)) / 86_400_000);
    if (dias === 0) return `às ${hh(t)}`;
    if (dias === 1) return `amanhã ${hh(t)}`;
    if (dias < 7) return `${DIAS[t.getDay()]} ${hh(t)}`;
    return `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}`;
}

/** Amanhã às 9h, no horário local: o "adiar" de um clique. */
export function amanhaNove(agora = new Date()): Date {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 9, 0, 0, 0);
}
