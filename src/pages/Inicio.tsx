import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInicioData } from "@/hooks/useInicioData";
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import { AGORA_SAMPLE_PRIORITIES, SAMPLE_DIARY } from "@/components/inicio/inicioSample";
import { WhatsappDownCard } from "@/components/inicio/WhatsappDownCard";
import { PalcoEva } from "@/components/inicio/PalcoEva";
import { PedemVoce } from "@/components/inicio/PedemVoce";
import { useEvaDiary } from "@/hooks/useEvaDiary";
import { Count } from "@/vendor/stageshow/motion/Count";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { brl, plural, OPEN_QUOTE_STATES } from "@/lib/quoteText";
import { useEvolutionSender } from "@/hooks/useEvolutionSender";
import {
    loadLiveActions,
    resolvePriority,
    snoozePriority,
    startOfTomorrowIso,
    unresolvePriority,
    unsnoozePriority,
    isResolved,
    isSnoozed,
    type PriorityActionState,
} from "@/lib/priorityActions";
// ─────────────────────────────────────────────────────────────────────────────
// Hoje (/inicio) — responde o que o dono faz agora (redesenhada em 01/11/2026).
//
// Palco amarelo com o rascunho que espera o 1 (PalcoEva), a fila do dia
// (PedemVoce) e, à direita, o dinheiro parado, a agenda e a Lume em 30 dias. O
// mês, o funil e o tempo de resposta moram em Resultados; o diário, na aba Lume.
// ─────────────────────────────────────────────────────────────────────────────

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
    // Resolver e adiar tiram o item da fila na hora; o aviso dá a volta.
    const resolve = useCallback(
        (id: string) => {
            if (!companyId) return;
            setState(resolvePriority(companyId, id, new Date().toISOString()));
            toast.success("Marcado como resolvido.", {
                action: { label: "Desfazer", onClick: () => setState(unresolvePriority(companyId, id)) },
            });
        },
        [companyId],
    );
    const snooze = useCallback(
        (id: string) => {
            if (!companyId) return;
            setState(snoozePriority(companyId, id, startOfTomorrowIso()));
            toast("Adiado para amanhã.", {
                action: { label: "Desfazer", onClick: () => setState(unsnoozePriority(companyId, id)) },
            });
        },
        [companyId],
    );
    return { state, resolve, snooze };
}

// ─── Main page ──────────────────────────────────────────────────────────────

const Inicio = () => {
    const { profile, companyId } = useAuth();

    const { agenda } = useInicioData();
    const cc = useCommandCenterData();
    const wa = useWhatsappConnection();
    const liveDiary = useEvaDiary();
    const [searchParams] = useSearchParams();
    // Só em dev: ?preview=1 mostra a tela com dados de exemplo; ?preview=desconectado, o WhatsApp caído.
    const preview = import.meta.env.DEV ? searchParams.get("preview") : null;
    const { query: quoteBoard } = useQuoteBoard(30, preview ? "1" : null);

    const actions = usePriorityActions(companyId);
    const sender = useEvolutionSender();
    const { dayItems, pendingAll } = useMemo(() => {
        const nowMs = Date.now();
        const source = preview ? AGORA_SAMPLE_PRIORITIES : cc.dailyPriorities;
        // Negócio com orçamento aberto já aparece na lista de orçamentos, com
        // valor e retomada; repetir ele no topo da fila mostrava o mesmo
        // cliente duas vezes na mesma tela.
        const comOrcamento = new Set((quoteBoard.data?.items ?? []).filter((q) => OPEN_QUOTE_STATES.includes(q.state) && q.deal_id).map((q) => q.deal_id));
        const day = source.filter((p) => !isSnoozed(actions.state, p.id, nowMs) && !(p.source === "deal" && p.dealId && comOrcamento.has(p.dealId)));
        const pending = day.filter((p) => !isResolved(actions.state, p.id));
        return { dayItems: day, pendingAll: pending };
    }, [cc.dailyPriorities, actions.state, preview, quoteBoard.data]);
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

    const quotes = quoteBoard.data?.items ?? [];
    const qt = quoteBoard.data?.totals;
    const diary = preview ? SAMPLE_DIARY : liveDiary;
    const acompanhando = quotes.filter((q) => OPEN_QUOTE_STATES.includes(q.state)).length;
    const agendaHoje = (agenda.data?.items ?? []).filter((a) => new Date(a.dataIso).toDateString() === new Date().toDateString());

    const firstName = (profile?.nome || "").split(" ")[0] || "";
    const weekday = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    const today = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const greeting = getHourlyGreeting(new Date().getHours());

    return (
        <div className="vp-tela">
            <header className="vp-cabeca" style={{ marginBottom: 0 }}>
                <div>
                    <h1 className="vp-titulo">{greeting}{firstName ? `, ${firstName}` : ""}.</h1>
                    <p className="vp-sub">{today}</p>
                </div>
            </header>

            {waDown && (
                <div className="mt-6">
                    <WhatsappDownCard neverConnected={waNeverConnected} lastInboundAt={lastInboundAt} />
                </div>
            )}

            <div className="vp-hoje" data-sentada>
                <div className="vp-coluna">
                    <PalcoEva rascunho={diary.rascunhos[0] ?? null} enviados={diary.enviados} acompanhando={acompanhando} carregando={diary.loading} />
                    <PedemVoce
                        prioridades={pendingAll}
                        orcamentos={quotes}
                        carregando={queueLoading}
                        diaResolvido={dayComplete}
                        aoResolver={actions.resolve}
                        aoAdiar={actions.snooze}
                    />
                </div>
                <aside className="vp-coluna">
                    <Link to="/orcamentos?aba=parados" className="vp-noite">
                        <div className="vp-rotulo">Parado agora</div>
                        <div className="vp-noite__numero">
                            <Count value={qt?.parked_amount ?? 0} format={brl} />
                        </div>
                        <p>{qt ? (qt.parked_count === 0 ? "Nenhum orçamento sem resposta" : `${plural(qt.parked_count, "orçamento", "orçamentos")} sem resposta`) : "Carregando"}</p>
                    </Link>
                    <section className="vp-cartao" aria-label="Hoje na rua">
                        <div className="vp-rotulo">Hoje na rua</div>
                        {agendaHoje.length === 0 ? (
                            <p className="vp-sub" style={{ marginTop: 8, fontSize: 14 }}>Nada na agenda de hoje.</p>
                        ) : (
                            <div className="vp-agenda">
                                {agendaHoje.slice(0, 4).map((a) => (
                                    <div key={a.id}>
                                        <time>{a.time}</time>
                                        <b>{a.title}</b>
                                        <span>{a.subtitle}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    <section className="vp-cartao" aria-label="A Lume nos últimos 30 dias">
                        <div className="vp-rotulo">A Lume em 30 dias</div>
                        <div className="vp-placar">
                            <div>
                                <b>{qt?.recovered_count ?? 0}</b>
                                <span>{(qt?.recovered_count ?? 0) === 1 ? "fechou depois da retomada" : "fecharam depois da retomada"}</span>
                            </div>
                            <div>
                                <b>{brl(qt?.recovered_amount ?? 0)}</b>
                                <span>de volta</span>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            {cc.error && !preview && (
                <div className="mt-4 rounded-lg px-4 py-3 text-[12.5px]" style={{ background: "var(--vyz-danger-bg)", color: "var(--vyz-danger)" }}>
                    Não consegui carregar a fila: {cc.error}
                </div>
            )}
        </div>
    );
};

export default Inicio;
