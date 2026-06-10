// COMMAND.UI.4 — histórico REAL de métricas da Central (sem mocks).
// Grava 1 snapshot por dia/empresa em localStorage e deriva tendência (delta vs
// ontem) + série pra sparkline. Honesto: só existe trend quando há ≥2 dias reais.
// (Versão cross-device/imediata exigiria uma tabela Supabase — fica como upgrade.)

type DayMap = Record<string, Record<string, number>>; // 'YYYY-MM-DD' -> { metricKey: value }

const storageKey = (companyId: string) => `vyzon:cc-metrics:${companyId}`;
const RETAIN_DAYS = 14;

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function read(companyId: string): DayMap {
    try {
        const raw = localStorage.getItem(storageKey(companyId));
        return raw ? (JSON.parse(raw) as DayMap) : {};
    } catch {
        return {};
    }
}

/** Grava o snapshot de hoje (sobrescreve o do dia, mantém últimos 14 dias). */
export function recordMetricSnapshot(
    companyId: string | null | undefined,
    metrics: Record<string, number | null | undefined>,
): void {
    if (!companyId) return;
    try {
        const map = read(companyId);
        const clean: Record<string, number> = {};
        for (const [k, v] of Object.entries(metrics)) if (typeof v === "number") clean[k] = v;
        map[today()] = clean;
        for (const d of Object.keys(map).sort().slice(0, -RETAIN_DAYS)) delete map[d];
        localStorage.setItem(storageKey(companyId), JSON.stringify(map));
    } catch {
        /* localStorage indisponível — silencioso */
    }
}

export interface MetricTrend {
    /** Valores em ordem cronológica (até `days` pontos). */
    series: number[];
    /** Diferença vs o dia anterior com registro. null quando não há histórico. */
    delta: number | null;
}

export function getMetricTrend(companyId: string | null | undefined, key: string, days = 7): MetricTrend {
    if (!companyId) return { series: [], delta: null };
    const map = read(companyId);
    const vals = Object.keys(map)
        .sort()
        .map((d) => map[d]?.[key])
        .filter((v): v is number => typeof v === "number");
    const series = vals.slice(-days);
    const delta = vals.length >= 2 ? vals[vals.length - 1] - vals[vals.length - 2] : null;
    return { series, delta };
}
