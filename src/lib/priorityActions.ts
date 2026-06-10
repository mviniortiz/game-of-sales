// ─────────────────────────────────────────────────────────────────────────────
// Ações da Central sobre prioridades do dia (resolver / adiar) — persistência
// REAL em localStorage por empresa. "Missão do dia": resolvido é escopo DIÁRIO
// (reseta amanhã); adiar guarda um ISO "esconder até". Cross-device exigiria
// uma tabela Supabase — fica como upgrade (mesmo padrão do metricHistory).
//
// Os ids são os mesmos que o useCommandCenterData gera (conv:<id>, deal:<id>,
// topic:<x>) — estáveis dentro do dia, então a marcação sobrevive a reloads.
// ─────────────────────────────────────────────────────────────────────────────

export interface PriorityActionState {
    /** id da prioridade -> ISO datetime em que foi resolvida */
    resolved: Record<string, string>;
    /** id da prioridade -> ISO datetime até quando deve ficar escondida */
    snoozed: Record<string, string>;
}

const EMPTY: PriorityActionState = { resolved: {}, snoozed: {} };

const storageKey = (companyId: string) => `vyzon:cc-actions:${companyId}`;

function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function omit<T extends Record<string, string>>(obj: T, key: string): T {
    const next = { ...obj };
    delete next[key];
    return next;
}

function read(companyId: string): PriorityActionState {
    try {
        const raw = localStorage.getItem(storageKey(companyId));
        if (!raw) return { resolved: {}, snoozed: {} };
        const parsed = JSON.parse(raw) as Partial<PriorityActionState>;
        return { resolved: parsed.resolved ?? {}, snoozed: parsed.snoozed ?? {} };
    } catch {
        return { resolved: {}, snoozed: {} };
    }
}

function write(companyId: string, state: PriorityActionState): void {
    try {
        localStorage.setItem(storageKey(companyId), JSON.stringify(state));
    } catch {
        /* localStorage indisponível — silencioso */
    }
}

/** Lê o estado "vivo": descarta resolvidos de dias anteriores e snoozes já
 *  expirados. Persiste a limpeza. É a forma correta de carregar no mount. */
export function loadLiveActions(companyId: string | null | undefined, nowMs: number): PriorityActionState {
    if (!companyId) return EMPTY;
    const state = read(companyId);
    const today = todayStr();
    const resolved: Record<string, string> = {};
    for (const [id, iso] of Object.entries(state.resolved)) {
        if (iso.slice(0, 10) === today) resolved[id] = iso; // só resolvidos de hoje
    }
    const snoozed: Record<string, string> = {};
    for (const [id, iso] of Object.entries(state.snoozed)) {
        if (new Date(iso).getTime() > nowMs) snoozed[id] = iso; // snooze ainda no futuro
    }
    const pruned = { resolved, snoozed };
    write(companyId, pruned);
    return pruned;
}

export function resolvePriority(companyId: string, id: string, nowIso: string): PriorityActionState {
    const state = read(companyId);
    const next: PriorityActionState = {
        resolved: { ...state.resolved, [id]: nowIso },
        snoozed: omit(state.snoozed, id), // resolver cancela um eventual snooze
    };
    write(companyId, next);
    return next;
}

export function unresolvePriority(companyId: string, id: string): PriorityActionState {
    const state = read(companyId);
    const next: PriorityActionState = { resolved: omit(state.resolved, id), snoozed: state.snoozed };
    write(companyId, next);
    return next;
}

export function snoozePriority(companyId: string, id: string, untilIso: string): PriorityActionState {
    const state = read(companyId);
    const next: PriorityActionState = {
        resolved: omit(state.resolved, id), // adiar tira de "resolvido" se estava
        snoozed: { ...state.snoozed, [id]: untilIso },
    };
    write(companyId, next);
    return next;
}

export function isResolved(state: PriorityActionState, id: string): boolean {
    return !!state.resolved[id];
}

export function isSnoozed(state: PriorityActionState, id: string, nowMs: number): boolean {
    const iso = state.snoozed[id];
    return !!iso && new Date(iso).getTime() > nowMs;
}

/** "Adiar" = tira do plano de hoje; volta no começo de amanhã (horário local). */
export function startOfTomorrowIso(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
}
