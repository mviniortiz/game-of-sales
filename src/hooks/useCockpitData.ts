// ─────────────────────────────────────────────────────────────────────────────
// Números do Início (/inicio): a coluna do mês e os últimos 14 dias.
//
// Read-only, 4 leituras em paralelo:
//   - Ganho no mês (deals closed_won, data = updated_at): total e quantidade,
//     mais quantos fecharam por dia nos últimos 14 dias
//   - Meta do mês (metas_consolidadas, mes_referencia = 1º dia do mês)
//   - Novos leads por dia nos últimos 14 dias (deals.created_at)
//   - Tempo de 1ª resposta em 14 dias (channel_messages: 1º outbound após cada
//     inbound). Mediana, não média: uma noite sem resposta não pode distorcer
//     o número; esperas acima de 12h ficam de fora.
//
// Análise de período (funil, ciclo, ranking) continua em /performance.
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface CockpitDay {
    /** "2026-07-06" (dia local) */
    day: string;
    /** rótulo curto ("6/7") */
    label: string;
    leads: number;
    won: number;
}

export interface CockpitData {
    /** Receita ganha no mês corrente (R$). */
    wonMonthTotal: number;
    wonMonthCount: number;
    /** Meta consolidada do mês (null = sem meta cadastrada). */
    monthGoal: number | null;
    /** Últimos 14 dias, do mais antigo para hoje. */
    days: CockpitDay[];
    /** Mediana da 1ª resposta em 14 dias (minutos; null = sem par inbound→outbound). */
    responseMedianMin: number | null;
}

export const COCKPIT_DAYS = 14;

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
export function useCockpitData() {
    const { companyId: authCompanyId } = useAuth();
    const { activeCompanyId } = useTenant();
    // Mesmo padrão dos outros hooks da Central: super_admin pode estar operando
    // outra empresa (activeCompanyId) — sem isso o cockpit vem vazio pro Markus.
    const companyId = activeCompanyId || authCompanyId;

    const query = useQuery({
        queryKey: ["cockpit", companyId],
        enabled: !!companyId,
        // Dashboard vivo: cache curto + repoll de 60s (padrão da Central) e
        // refetch on focus — marcar um ganho no pipeline reflete aqui sozinho.
        staleTime: 15 * 1000,
        refetchInterval: 60 * 1000,
        queryFn: async (): Promise<CockpitData> => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const d14 = new Date(now.getTime() - (COCKPIT_DAYS - 1) * 86_400_000);
            const since14 = new Date(d14.getFullYear(), d14.getMonth(), d14.getDate());
            // Ganhos desde o que vier antes: início do mês (total) ou 14 dias (por dia).
            const wonSince = since14 < monthStart ? since14 : monthStart;
            // metas_consolidadas.mes_referencia é DATE (1º dia do mês), não "YYYY-MM"
            const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

            const [wonQ, goalQ, leadsQ, msgsQ] = await Promise.all([
                supabase
                    .from("deals")
                    .select("value, updated_at")
                    .eq("company_id", companyId!)
                    .eq("stage", "closed_won")
                    .gte("updated_at", wonSince.toISOString()),
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
                    .gte("created_at", since14.toISOString()),
                supabase
                    .from("channel_messages")
                    .select("conversation_id, direction, message_timestamp")
                    .eq("company_id", companyId!)
                    .gte("message_timestamp", since14.toISOString())
                    .order("message_timestamp", { ascending: true })
                    .limit(8000),
            ]);
            // Essenciais derrubam o painel com erro visível; meta e mensagens são
            // opcionais — falha vira null/vazio, não tela morta.
            if (wonQ.error) throw wonQ.error;
            if (leadsQ.error) throw leadsQ.error;
            if (goalQ.error) console.warn("cockpit: meta indisponível:", goalQ.error.message);
            if (msgsQ.error) console.warn("cockpit: mensagens indisponíveis:", msgsQ.error.message);

            const leadsByDay = dayRange(since14, now);
            const wonByDay = dayRange(since14, now);
            let wonMonthTotal = 0;
            let wonMonthCount = 0;
            for (const r of wonQ.data ?? []) {
                if (new Date(r.updated_at) >= monthStart) {
                    wonMonthTotal += Number(r.value) || 0;
                    wonMonthCount += 1;
                }
                const k = localDayKey(r.updated_at);
                if (wonByDay.has(k)) wonByDay.set(k, (wonByDay.get(k) ?? 0) + 1);
            }
            for (const r of leadsQ.data ?? []) {
                const k = localDayKey(r.created_at);
                if (leadsByDay.has(k)) leadsByDay.set(k, (leadsByDay.get(k) ?? 0) + 1);
            }
            const days: CockpitDay[] = [...leadsByDay.keys()].map((day) => ({
                day,
                label: shortLabel(day),
                leads: leadsByDay.get(day) ?? 0,
                won: wonByDay.get(day) ?? 0,
            }));

            // Tempo de 1ª resposta: por conversa, cada inbound → 1º outbound seguinte
            const byConv = new Map<string, { direction: string; ts: number }[]>();
            for (const m of msgsQ.data ?? []) {
                const arr = byConv.get(m.conversation_id) ?? [];
                arr.push({ direction: m.direction, ts: new Date(m.message_timestamp).getTime() });
                byConv.set(m.conversation_id, arr);
            }
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
                        allDeltas.push(delta / 60_000);
                    }
                }
            }
            const responseMedian = median(allDeltas);
            return {
                wonMonthTotal,
                wonMonthCount,
                monthGoal: goalQ.data?.[0]?.valor_meta != null ? Number(goalQ.data[0].valor_meta) : null,
                days,
                responseMedianMin: responseMedian != null ? Math.round(responseMedian) : null,
            };
        },
    });

    return { data: query.data ?? null, loading: query.isLoading, error: query.error, refetch: query.refetch, isFetching: query.isFetching };
}
