// ─────────────────────────────────────────────────────────────────────────────
// COMMAND.UI.7 — dados do Cockpit do gestor (/inicio como dashboard).
//
// Read-only, 4 leituras em paralelo:
//   - Receita ganha no mês (deals closed_won) + série acumulada por dia
//   - Meta do mês (metas_consolidadas, mes_referencia = YYYY-MM)
//   - Novos leads por dia (deals.created_at, período selecionado 7/14/30d)
//   - Tempo de resposta (channel_messages: 1º outbound após cada inbound,
//     MEDIANA por dia no período selecionado — mediana, não média: uma noite sem
//     resposta não pode distorcer o número; gaps > 12h ficam de fora)
//
// Identidade da tela: /inicio = operação de hoje/semana. Análise de período
// (funil, ciclo, ranking) continua em /performance — sem duplicar insight.
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface DayPoint {
    /** "2026-07-06" (dia local) */
    day: string;
    /** rótulo curto pro eixo ("6/7") */
    label: string;
    value: number;
}

export interface CockpitData {
    /** Receita ganha no mês corrente (R$). */
    wonMonthTotal: number;
    /** Série acumulada da receita por dia do mês (até hoje). */
    wonMonthSeries: DayPoint[];
    /** Meta consolidada do mês (null = sem meta cadastrada). */
    monthGoal: number | null;
    /** Novos leads (deals criados) por dia, no período selecionado. */
    leadsPerDay: DayPoint[];
    leads7dTotal: number;
    /** Mediana do tempo de 1ª resposta por dia (minutos), no período. */
    responsePerDay: DayPoint[];
    /** Mediana geral do período (minutos; null = sem par inbound→outbound). */
    responseMedianMin: number | null;
}

const RESPONSE_CAP_MS = 12 * 3_600_000; // acima disso não é "resposta", é retomada

function localDayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shortLabel(dayKey: string): string {
    const [, m, d] = dayKey.split("-");
    return `${Number(d)}/${Number(m)}`;
}
/** Todos os dias entre start e end (inclusive), zerados. */
function dayRange(start: Date, end: Date): Map<string, number> {
    const map = new Map<string, number>();
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cur <= end) {
        map.set(localDayKey(cur.toISOString()), 0);
        cur.setDate(cur.getDate() + 1);
    }
    return map;
}
function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function toSeries(map: Map<string, number>): DayPoint[] {
    return [...map.entries()].map(([day, value]) => ({ day, label: shortLabel(day), value }));
}

export type CockpitRange = 7 | 14 | 30;

export function useCockpitData(rangeDays: CockpitRange = 14) {
    const { companyId: authCompanyId } = useAuth();
    const { activeCompanyId } = useTenant();
    // Mesmo padrão dos outros hooks da Central: super_admin pode estar operando
    // outra empresa (activeCompanyId) — sem isso o cockpit vem vazio pro Markus.
    const companyId = activeCompanyId || authCompanyId;

    const query = useQuery({
        queryKey: ["cockpit", companyId, rangeDays],
        enabled: !!companyId,
        // Dashboard vivo: cache curto + repoll de 60s (padrão da Central) e
        // refetch on focus — marcar um ganho no pipeline reflete aqui sozinho.
        staleTime: 15 * 1000,
        refetchInterval: 60 * 1000,
        queryFn: async (): Promise<CockpitData> => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const d14 = new Date(now.getTime() - (rangeDays - 1) * 86_400_000);
            const d7 = new Date(now.getTime() - (Math.min(rangeDays, 30) - 1) * 86_400_000);
            // metas_consolidadas.mes_referencia é DATE (1º dia do mês), não "YYYY-MM"
            const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

            const [wonQ, goalQ, leadsQ, msgsQ] = await Promise.all([
                supabase
                    .from("deals")
                    .select("value, updated_at")
                    .eq("company_id", companyId!)
                    .eq("stage", "closed_won")
                    .gte("updated_at", monthStart.toISOString()),
                supabase
                    .from("metas_consolidadas")
                    .select("valor_meta")
                    .eq("company_id", companyId!)
                    .eq("mes_referencia", mesRef)
                    .limit(1),
                supabase
                    .from("deals")
                    .select("created_at")
                    .eq("company_id", companyId!)
                    .gte("created_at", new Date(d14.getFullYear(), d14.getMonth(), d14.getDate()).toISOString()),
                supabase
                    .from("channel_messages")
                    .select("conversation_id, direction, message_timestamp")
                    .eq("company_id", companyId!)
                    .gte("message_timestamp", new Date(d7.getFullYear(), d7.getMonth(), d7.getDate()).toISOString())
                    .order("message_timestamp", { ascending: true })
                    .limit(8000),
            ]);
            // Essenciais derrubam o painel com erro visível; meta e mensagens são
            // opcionais — falha vira null/vazio, não tela morta.
            if (wonQ.error) throw wonQ.error;
            if (leadsQ.error) throw leadsQ.error;
            if (goalQ.error) console.warn("cockpit: meta indisponível:", goalQ.error.message);
            if (msgsQ.error) console.warn("cockpit: mensagens indisponíveis:", msgsQ.error.message);

            // Receita do mês: acumulada por dia
            const wonByDay = dayRange(monthStart, now);
            let wonMonthTotal = 0;
            for (const r of wonQ.data ?? []) {
                const v = Number(r.value) || 0;
                wonMonthTotal += v;
                const k = localDayKey(r.updated_at);
                if (wonByDay.has(k)) wonByDay.set(k, (wonByDay.get(k) ?? 0) + v);
            }
            let acc = 0;
            const wonMonthSeries = toSeries(wonByDay).map((p) => ({ ...p, value: (acc += p.value) }));

            // Leads por dia (14d)
            const leadsByDay = dayRange(d14, now);
            for (const r of leadsQ.data ?? []) {
                const k = localDayKey(r.created_at);
                if (leadsByDay.has(k)) leadsByDay.set(k, (leadsByDay.get(k) ?? 0) + 1);
            }
            const leadsPerDay = toSeries(leadsByDay);
            const leads7dTotal = leadsPerDay.slice(-7).reduce((s, p) => s + p.value, 0);

            // Tempo de 1ª resposta: por conversa, cada inbound → 1º outbound seguinte
            const byConv = new Map<string, { direction: string; ts: number }[]>();
            for (const m of msgsQ.data ?? []) {
                const arr = byConv.get(m.conversation_id) ?? [];
                arr.push({ direction: m.direction, ts: new Date(m.message_timestamp).getTime() });
                byConv.set(m.conversation_id, arr);
            }
            const deltasByDay = new Map<string, number[]>();
            const allDeltas: number[] = [];
            for (const msgs of byConv.values()) {
                let pendingInbound: number | null = null;
                for (const m of msgs) {
                    if (m.direction === "inbound") {
                        // 1ª mensagem sem resposta marca o início da espera
                        if (pendingInbound == null) pendingInbound = m.ts;
                    } else if (pendingInbound != null) {
                        const delta = m.ts - pendingInbound;
                        pendingInbound = null;
                        if (delta <= 0 || delta > RESPONSE_CAP_MS) continue;
                        const min = delta / 60_000;
                        allDeltas.push(min);
                        const k = localDayKey(new Date(m.ts).toISOString());
                        deltasByDay.set(k, [...(deltasByDay.get(k) ?? []), min]);
                    }
                }
            }
            const respByDay = dayRange(d7, now);
            const responsePerDay = toSeries(respByDay).map((p) => ({
                ...p,
                value: Math.round(median(deltasByDay.get(p.day) ?? []) ?? 0),
            }));

            return {
                wonMonthTotal,
                wonMonthSeries,
                monthGoal: goalQ.data?.[0]?.valor_meta != null ? Number(goalQ.data[0].valor_meta) : null,
                leadsPerDay,
                leads7dTotal,
                responsePerDay,
                responseMedianMin: median(allDeltas) != null ? Math.round(median(allDeltas)!) : null,
            };
        },
    });

    return { data: query.data ?? null, loading: query.isLoading, error: query.error, refetch: query.refetch, isFetching: query.isFetching };
}
