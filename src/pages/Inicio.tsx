import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowClockwise as RefreshCw } from "@phosphor-icons/react";
import { useInicioData } from "@/hooks/useInicioData";
import { useCockpitData } from "@/hooks/useCockpitData";
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import { AgoraQueue, type QueueHandlers } from "@/components/inicio/AgoraQueue";
import { AGORA_SAMPLE_PRIORITIES, SAMPLE_COCKPIT, SAMPLE_DIARY, SAMPLE_FUNNEL } from "@/components/inicio/inicioSample";
import { WhatsappDownCard } from "@/components/inicio/WhatsappDownCard";
import { EvaDiaryCard } from "@/components/inicio/EvaDiaryCard";
import { MonthCard, type MonthNumbers } from "@/components/inicio/MonthCard";
import { PipelineFunnel } from "@/components/inicio/PipelineFunnel";
import { QuinzenaCard, type QuinzenaDay } from "@/components/inicio/QuinzenaCard";
import { useEvaDiary } from "@/hooks/useEvaDiary";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { brl, plural } from "@/lib/quoteText";
import { useEvolutionSender } from "@/hooks/useEvolutionSender";
import {
    loadLiveActions,
    resolvePriority,
    snoozePriority,
    startOfTomorrowIso,
    isResolved,
    isSnoozed,
    type PriorityActionState,
} from "@/lib/priorityActions";
// ─────────────────────────────────────────────────────────────────────────────
// Início — responde o que o dono faz agora (2026-09-29).
//
// Ordem: frase do dia (quem espera resposta, quanto está parado) → aviso de
// WhatsApp desconectado, quando for o caso → à esquerda, a fila "Agora"
// (AgoraQueue) e o que a EVA fez (EvaDiaryCard); à direita, o mês em reais
// (MonthCard), o funil de blocos (PipelineFunnel) e os últimos 14 dias em
// quadradinhos (QuinzenaCard). Sem gráfico de linha nem barra proporcional:
// com o volume de uma PME, cada unidade conta.
//
// Análise de período (funil, ciclo, ranking, heatmap) continua em /performance.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "#0B1220";
const SUB = "#475569";
const BLUE = "#2563EB";

function relativeTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "agora";
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

function localDayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getHourlyGreeting(hour: number): string {
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
}

function usePriorityActions(companyId: string | null | undefined) {
    const [state, setState] = useState<PriorityActionState>({ resolved: {}, snoozed: {} });
    useEffect(() => {
        setState(loadLiveActions(companyId, Date.now()));
    }, [companyId]);
    const resolve = useCallback(
        (id: string) => {
            if (!companyId) return;
            setState(resolvePriority(companyId, id, new Date().toISOString()));
        },
        [companyId],
    );
    const snooze = useCallback(
        (id: string) => {
            if (!companyId) return;
            setState(snoozePriority(companyId, id, startOfTomorrowIso()));
        },
        [companyId],
    );
    return { state, resolve, snooze };
}

// ─── Main page ──────────────────────────────────────────────────────────────

const Inicio = () => {
    const navigate = useNavigate();
    const reduce = useReducedMotion();
    const { profile, companyId } = useAuth();

    const { pipeline } = useInicioData();
    const cockpit = useCockpitData();
    const cc = useCommandCenterData();
    const wa = useWhatsappConnection();
    const liveDiary = useEvaDiary();
    const [searchParams] = useSearchParams();
    // Só em dev: ?preview=1 mostra a tela com dados de exemplo; ?preview=desconectado, o WhatsApp caído.
    const preview = import.meta.env.DEV ? searchParams.get("preview") : null;
    const { query: quoteBoard } = useQuoteBoard(30, preview ? "1" : null);

    const [manualRefreshing, setManualRefreshing] = useState(false);
    const handleRefresh = useCallback(async () => {
        setManualRefreshing(true);
        try {
            await Promise.all([cc.refetch(), pipeline.refetch(), cockpit.refetch(), quoteBoard.refetch()]);
        } finally {
            setManualRefreshing(false);
        }
    }, [cc, pipeline, cockpit, quoteBoard]);
    const refreshing = manualRefreshing || cc.isFetching || pipeline.isFetching;

    const actions = usePriorityActions(companyId);
    const sender = useEvolutionSender();
    const handleQuickReply = useCallback(
        async (chatJid: string, text: string) => {
            await sender.sendMessage(chatJid, text);
            void cc.refetch();
        },
        [sender, cc],
    );

    const { dayItems, pendingAll } = useMemo(() => {
        const nowMs = Date.now();
        const source = preview ? AGORA_SAMPLE_PRIORITIES : cc.dailyPriorities;
        const day = source.filter((p) => !isSnoozed(actions.state, p.id, nowMs));
        const pending = day.filter((p) => !isResolved(actions.state, p.id));
        return { dayItems: day, pendingAll: pending };
    }, [cc.dailyPriorities, actions.state, preview]);
    const queueLoading = preview ? false : cc.loading;

    // A linha do banco fica 'active' com a sessão caída; na Evolution, o check ao
    // vivo (sender) decide. Kapso/Meta não tem esse check: vale o banco.
    const liveDown = wa.viaEvolution && sender.lastStatusCheckedAt !== null && !sender.connected;
    const waNeverConnected = preview === "desconectado" ? false : !wa.connected;
    const waDown = preview
        ? preview === "desconectado"
        : searchParams.get("firstrun") === "1" || (!wa.loading && (!wa.connected || liveDown));
    const lastInboundAt = preview === "desconectado" ? "2026-06-28T14:10:00-03:00" : wa.lastInboundAt;

    const dayComplete = dayItems.length > 0 && pendingAll.length === 0;
    const handlers: QueueHandlers = {
        onNavigate: navigate,
        onResolve: actions.resolve,
        onSnooze: actions.snooze,
        sendReply: handleQuickReply,
        replyConnected: sender.connected,
    };

    // Coluna do mês: fechado/meta do cockpit, retomada/perdas/conversa do placar.
    const ck = preview ? SAMPLE_COCKPIT : cockpit.data;
    const numbersLoading = preview ? false : cockpit.loading;
    const quotes = quoteBoard.data?.items ?? [];
    const qt = quoteBoard.data?.totals;
    const monthNumbers: MonthNumbers | null = ck
        ? {
            wonTotal: ck.wonMonthTotal,
            wonCount: ck.wonMonthCount,
            goal: ck.monthGoal,
            recoveredAmount: qt?.recovered_amount ?? 0,
            recoveredCount: qt?.recovered_count ?? 0,
            talkingAmount: quotes.filter((q) => q.state === "talking").reduce((s, q) => s + (q.amount ?? 0), 0),
            lostCount: qt?.lost_count ?? 0,
            expiredCount: qt?.expired_count ?? 0,
        }
        : null;

    const quotesPerDay = new Map<string, number>();
    for (const q of quotes) {
        const k = localDayKey(q.sent_at);
        quotesPerDay.set(k, (quotesPerDay.get(k) ?? 0) + 1);
    }
    const quinzena: QuinzenaDay[] = (ck?.days ?? []).map((d) => ({ ...d, quotes: quotesPerDay.get(d.day) ?? 0 }));

    const funnelStages = preview
        ? SAMPLE_FUNNEL
        : (pipeline.data ?? []).map((s) => ({ key: s.key, name: s.name, count: s.count, totalValue: s.totalValue, values: s.values }));
    const funnelLoading = preview ? false : pipeline.isLoading;

    const firstName = (profile?.nome || "").split(" ")[0] || "";
    const greeting = getHourlyGreeting(new Date().getHours());
    const covered = new Set(pendingAll.map((p) => p.conversationId).filter(Boolean));
    const waiting =
        pendingAll.filter((p) => p.source === "conversation").length +
        quotes.filter((q) => q.state === "your_turn" && !(q.conversation_id && covered.has(q.conversation_id))).length;
    const dayParts = [
        waiting > 0 && `${waiting === 1 ? "1 pessoa espera" : `${waiting} pessoas esperam`} a sua resposta`,
        qt && qt.parked_count > 0 &&
            `${brl(qt.parked_amount)} ${qt.parked_count === 1 ? "está parado" : "estão parados"} em ${plural(qt.parked_count, "orçamento", "orçamentos")}`,
    ].filter(Boolean);
    const subtitle = waDown
        ? "Seu WhatsApp está desconectado, então a EVA não vê as conversas novas."
        : queueLoading
            ? "Carregando sua operação…"
            : dayParts.length === 0
                ? "Nada esperando por você agora."
                : `${dayParts.join(", e ")}.`.replace(/^./, (c) => c.toUpperCase());

    return (
        <div className="vz-stagger space-y-5 sm:space-y-6 mx-auto w-full max-w-[1920px] 2xl:px-2">
            {/* Header */}
            <div
                className="rounded-2xl px-5 sm:px-9 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative overflow-hidden"
                style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
            >
                <div
                    className="absolute top-0 inset-x-0 h-px pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.30) 40%, rgba(37,99,235,0.16) 70%, transparent)" }}
                />
                <div className="relative z-10">
                    <h1 className="mb-2 text-[30px] sm:text-[40px] leading-[1.04]"
                        style={{ color: INK, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, letterSpacing: "-0.012em" }}>
                        {greeting}{firstName ? `, ${firstName}` : ""}
                    </h1>
                    <p className="text-[14.5px] sm:text-[15.5px]" style={{ color: SUB }}>{subtitle}</p>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                    <motion.button
                        onClick={() => void handleRefresh()}
                        disabled={refreshing}
                        whileTap={reduce ? undefined : { scale: 0.95 }}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white hover:border-[#BFD3F2] shrink-0 disabled:opacity-70"
                        style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #D9E2EC", color: SUB }}
                    >
                        <motion.span
                            className="inline-flex"
                            animate={refreshing && !reduce ? { rotate: 360 } : { rotate: 0 }}
                            transition={refreshing && !reduce ? { repeat: Infinity, ease: "linear", duration: 0.7 } : { type: "spring", stiffness: 260, damping: 18 }}
                            style={{ color: refreshing ? BLUE : "#64748B" }}
                        >
                            <RefreshCw size={15} weight="bold" />
                        </motion.span>
                        {refreshing ? "Atualizando…" : "Atualizar"}
                    </motion.button>
                </div>
            </div>

            {waDown && <WhatsappDownCard neverConnected={waNeverConnected} lastInboundAt={lastInboundAt} />}

            {/* Esquerda: o que fazer e o que a EVA fez. Direita: os números. No
                celular a fila vem primeiro, porque é a razão de ser da tela. */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_372px] gap-6 2xl:gap-8 items-start">
                <div className="flex flex-col gap-8 min-w-0">
                    <AgoraQueue
                        pending={pendingAll}
                        dayTotal={dayItems.length}
                        dayComplete={dayComplete}
                        loading={queueLoading}
                        handlers={handlers}
                        quotes={quotes}
                        parkedCount={qt?.parked_count ?? 0}
                        parkedAmount={qt?.parked_amount ?? 0}
                    />
                    <EvaDiaryCard diary={preview ? SAMPLE_DIARY : liveDiary} />
                </div>
                <aside className="flex flex-col gap-4 min-w-0">
                    <MonthCard numbers={monthNumbers} loading={numbersLoading} />
                    <PipelineFunnel stages={funnelStages} loading={funnelLoading} onNavigate={navigate} />
                    <QuinzenaCard days={quinzena} responseMedianMin={ck?.responseMedianMin ?? null} loading={numbersLoading} />
                </aside>
            </div>

            {cc.error && !preview && (
                <div className="text-[11.5px] py-3 px-4 rounded-lg"
                    style={{ background: "rgba(220,38,38,0.06)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.20)" }}>
                    Erro ao carregar Central: {cc.error}
                </div>
            )}

            <div className="text-center text-[11.5px] py-4" style={{ color: SUB }}>
                Dados em tempo real {cc.lastUpdatedAt ? `· atualizado ${relativeTime(cc.lastUpdatedAt.toISOString())}` : ""}
            </div>
        </div>
    );
};

export default Inicio;
