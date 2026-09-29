// AgoraQueue — a fila única do Início: o que o dono faz agora, em ordem.
//   1. Quem espera resposta (prioridades do dia, useCommandCenterData). O
//      primeiro vem maior, com resposta rápida pelo WhatsApp, adiar e resolver.
//   2. Cliente com orçamento que escreveu e ficou sem resposta (placar,
//      state your_turn) e ainda não está entre as prioridades.
//   3. Orçamentos parados (nunca respondeu / respondeu e sumiu), maior valor
//      primeiro, com a régua de dias até morrer.
// Severidade é um ponto de cor, nunca bloco saturado.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleNotch, PaperPlaneRight, X } from "@phosphor-icons/react";
import type { DailyPriority } from "@/hooks/useCommandCenterData";
import type { QuoteItem } from "@/hooks/useQuoteBoard";
import { brl, evaLine, plural, quoteName, stateLine } from "@/lib/quoteText";
import { DayTicks } from "@/components/quotes/DayTicks";

export interface QueueHandlers {
    onNavigate: (href: string) => void;
    onResolve: (id: string) => void;
    onSnooze: (id: string) => void;
    /** Enviar resposta direta (Evolution). Ausente = sem "Responder rápido". */
    sendReply?: (chatJid: string, text: string) => Promise<void>;
    replyConnected?: boolean;
}

const PARKED_SHOWN = 4;

const DOT: Record<DailyPriority["priority"], string> = {
    critical: "bg-amber-500",
    high: "bg-amber-500",
    medium: "bg-[var(--vyz-accent)]",
    low: "bg-[var(--vyz-text-soft)]",
};

const SOURCE_LABEL: Record<DailyPriority["source"], string> = {
    conversation: "Esperando você",
    deal: "Oportunidade",
    eva: "Sugestão da EVA",
    calendar: "Agenda",
};

function waitingFor(iso?: string): string | null {
    if (!iso) return null;
    const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
    if (hours < 1) return "há menos de 1 hora";
    if (hours < 72) return `há ${plural(hours, "hora", "horas")}`;
    return `há ${Math.floor(hours / 24)} dias`;
}

function priorityLabel(p: DailyPriority): string {
    const since = waitingFor(p.createdAt);
    return since ? `${SOURCE_LABEL[p.source]} ${since}` : SOURCE_LABEL[p.source];
}

// Resolver com micro-recompensa: check "pop" + linha esmaecendo antes de sair.
// Em reduced-motion, resolve na hora.
function useResolveTransition(onResolve: (id: string) => void, id: string) {
    const [resolving, setResolving] = useState(false);
    const resolve = () => {
        if (resolving) return;
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduce) { onResolve(id); return; }
        setResolving(true);
        window.setTimeout(() => onResolve(id), 300);
    };
    return { resolving, resolve };
}

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2";
const PILL = `inline-flex h-10 items-center gap-1.5 rounded-full px-[18px] text-[14px] font-semibold transition-colors duration-150 disabled:opacity-50 ${FOCUS}`;
const TEXT_BTN = `inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--vyz-text-muted)] transition-colors duration-150 hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-primary)] disabled:opacity-60 ${FOCUS}`;

function FocusItem({ item, amount, handlers }: { item: DailyPriority; amount: number | null; handlers: QueueHandlers }) {
    const { onNavigate, onResolve, onSnooze, sendReply, replyConnected } = handlers;
    const canQuickReply = !!item.chatJid && !!sendReply;
    const { resolving, resolve } = useResolveTransition(onResolve, item.id);
    const [replyOpen, setReplyOpen] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleSend = async () => {
        if (!item.chatJid || !sendReply || !text.trim() || sending) return;
        setSending(true);
        setErr(null);
        try {
            await sendReply(item.chatJid, text.trim());
            setReplyOpen(false);
            setText("");
            onResolve(item.id); // respondeu = ação resolvida
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Falha ao enviar. Tente abrir a conversa.");
        } finally {
            setSending(false);
        }
    };

    return (
        <article className={`flex flex-col gap-3 border-b border-[var(--vyz-border-subtle)] px-5 py-5 sm:px-6 ${resolving ? "vz-resolving" : ""}`}>
            <div className="flex items-center justify-between gap-3">
                <span className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${item.source === "conversation" ? "text-amber-700" : "text-[var(--vyz-text-muted)]"}`}>
                    <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${DOT[item.priority]}`} />
                    {priorityLabel(item)}
                </span>
                {amount != null && <span className="text-[17px] font-semibold tabular-nums text-[var(--vyz-text-primary)]">{brl(amount)}</span>}
            </div>
            <div>
                <h3 className="vz-row-title text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[var(--vyz-text-primary)]">
                    {item.contactName || item.title}
                </h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--vyz-text)]">{item.reason || item.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {item.href && (
                    <button type="button" onClick={() => onNavigate(item.href!)} className={`${PILL} bg-[#0B1220] text-white hover:bg-[#1F2A3B]`}>
                        {item.actionLabel}
                        <ArrowRight size={13} weight="bold" aria-hidden />
                    </button>
                )}
                {canQuickReply && (
                    <button
                        type="button"
                        onClick={() => setReplyOpen((o) => !o)}
                        aria-expanded={replyOpen}
                        className={`${PILL} border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] font-medium text-[var(--vyz-text-primary)] hover:bg-[var(--vyz-surface-2)]`}
                    >
                        <PaperPlaneRight size={13} weight="duotone" aria-hidden />
                        Responder rápido
                    </button>
                )}
                <span className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={() => onSnooze(item.id)} title="Adiar para amanhã" className={TEXT_BTN}>Adiar</button>
                    <button type="button" onClick={resolve} disabled={resolving} title="Marcar como resolvido" className={TEXT_BTN}>
                        <Check size={13} weight="bold" className={resolving ? "vz-check-pop text-emerald-700" : ""} aria-hidden />
                        {resolving ? "Resolvido" : "Já resolvi"}
                    </button>
                </span>
            </div>

            {/* Composer inline: envia de verdade pela Evolution */}
            {replyOpen && canQuickReply && (
                <div className="rounded-[12px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-3">
                    {!replyConnected && (
                        <p className="mb-2 px-1 text-[12px] text-amber-700">WhatsApp pode estar desconectado. Se falhar, abra a conversa para responder.</p>
                    )}
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                        placeholder={`Responder ${item.contactName || "o cliente"}…`}
                        aria-label={`Resposta para ${item.contactName || "o cliente"}`}
                        rows={2}
                        autoFocus
                        disabled={sending}
                        className="w-full resize-none bg-transparent px-1 py-1 text-[14px] text-[var(--vyz-text-primary)] outline-none disabled:opacity-60"
                    />
                    {err && <p className="mt-1 px-1 text-[12px] text-red-700">{err}</p>}
                    <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={() => { setReplyOpen(false); setText(""); setErr(null); }} className={TEXT_BTN}>
                            <X size={12} weight="bold" aria-hidden /> Cancelar
                        </button>
                        <button type="button" onClick={() => void handleSend()} disabled={!text.trim() || sending} className={`${PILL} h-9 bg-[#0B1220] text-white hover:bg-[#1F2A3B]`}>
                            {sending ? <CircleNotch size={13} weight="bold" className="animate-spin" aria-hidden /> : <PaperPlaneRight size={13} weight="fill" aria-hidden />}
                            {sending ? "Enviando…" : "Enviar"}
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

function PriorityRow({ item, amount, handlers }: { item: DailyPriority; amount: number | null; handlers: QueueHandlers }) {
    const { resolving, resolve } = useResolveTransition(handlers.onResolve, item.id);
    const label = priorityLabel(item);
    return (
        <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-[var(--vyz-border-subtle)] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-6 ${resolving ? "vz-resolving" : ""}`}>
            <div className="min-w-0">
                <p className="vz-row-title truncate text-[15px] font-semibold text-[var(--vyz-text-primary)]">{item.contactName || item.title}</p>
                <p className={`truncate text-[13px] ${item.source === "conversation" ? "text-amber-700" : "text-[var(--vyz-text-muted)]"}`}>
                    {label}{item.reason ? ` · ${item.reason}` : ""}
                </p>
            </div>
            <span className="hidden text-[15px] font-semibold tabular-nums text-[var(--vyz-text-primary)] sm:block">{amount != null ? brl(amount) : ""}</span>
            <span className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={resolve}
                    disabled={resolving}
                    aria-label={`Marcar ${item.contactName || item.title} como resolvido`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--vyz-border)] text-emerald-700 transition-colors duration-150 hover:bg-emerald-50 ${FOCUS}`}
                >
                    <Check size={14} weight="bold" className={resolving ? "vz-check-pop" : ""} aria-hidden />
                </button>
                {item.href && (
                    <button type="button" onClick={() => handlers.onNavigate(item.href!)} className={`${TEXT_BTN} font-semibold text-[var(--vyz-text-primary)]`}>
                        Abrir
                    </button>
                )}
            </span>
        </div>
    );
}

function QuoteRow({ q }: { q: QuoteItem }) {
    const eva = evaLine(q);
    const name = quoteName(q);
    const target = q.conversation_id ? `/inbox?conversationId=${q.conversation_id}` : q.deal_id ? `/deals/${q.deal_id}` : null;
    return (
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-[var(--vyz-border-subtle)] px-5 py-4 transition-colors duration-150 hover:bg-[var(--vyz-surface-2)] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-6">
            <div className="min-w-0">
                {target ? (
                    // Link esticado: a linha inteira abre a conversa.
                    <Link to={target} className={`block truncate text-[15px] font-semibold text-[var(--vyz-text-primary)] after:absolute after:inset-0 after:content-[''] ${FOCUS}`}>
                        {name}
                    </Link>
                ) : (
                    <p className="truncate text-[15px] font-semibold text-[var(--vyz-text-primary)]">{name}</p>
                )}
                <p className={`text-[13px] ${q.state === "your_turn" ? "text-amber-700" : "text-[var(--vyz-text-muted)]"}`}>{stateLine(q)}</p>
                {eva && (
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--vyz-text)]">
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d28d9]" />
                        {eva}
                    </p>
                )}
            </div>
            <DayTicks days={q.days} />
            <span
                className={
                    q.amount != null
                        ? "text-right text-[15px] font-semibold tabular-nums text-[var(--vyz-text-primary)]"
                        : "text-right text-[12.5px] text-[var(--vyz-text-soft)]"
                }
            >
                {q.amount != null ? brl(q.amount) : "valor não identificado"}
            </span>
        </div>
    );
}

export function AgoraQueue({
    pending, dayTotal, dayComplete, loading, handlers, quotes, parkedCount, parkedAmount,
}: {
    /** Prioridades do dia ainda abertas, na ordem da fila. */
    pending: DailyPriority[];
    /** Prioridades do dia, resolvidas ou não (para o progresso). */
    dayTotal: number;
    dayComplete: boolean;
    loading: boolean;
    handlers: QueueHandlers;
    /** Itens do placar de orçamentos (qualquer estado; a fila filtra). */
    quotes: QuoteItem[];
    parkedCount: number;
    parkedAmount: number;
}) {
    // Valor do orçamento da conversa, pra quem espera resposta aparecer com o dinheiro junto.
    const amountByConversation = new Map<string, number>();
    for (const q of quotes) {
        if (q.conversation_id && q.amount != null && !amountByConversation.has(q.conversation_id)) {
            amountByConversation.set(q.conversation_id, q.amount);
        }
    }
    const amountOf = (p: DailyPriority) => (p.conversationId ? amountByConversation.get(p.conversationId) ?? null : null);

    const coveredConversations = new Set(pending.map((p) => p.conversationId).filter(Boolean));
    const yourTurn = quotes.filter((q) => q.state === "your_turn" && !(q.conversation_id && coveredConversations.has(q.conversation_id)));
    const parked = quotes
        .filter((q) => q.state === "no_reply" || q.state === "went_quiet")
        .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1))
        .slice(0, PARKED_SHOWN);
    const resolved = dayTotal - pending.length;
    const empty = !loading && pending.length === 0 && yourTurn.length === 0 && parked.length === 0;

    return (
        <section aria-labelledby="agora-titulo" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="agora-titulo" className="text-[16px] font-semibold text-[var(--vyz-text-primary)]">Agora</h2>
                {dayTotal > 0 && (
                    <span className="flex items-center gap-2 text-[12.5px] tabular-nums text-[var(--vyz-text-muted)]">
                        {resolved} de {dayTotal} {resolved === 1 ? "resolvido" : "resolvidos"} hoje
                        <span aria-hidden className="flex gap-[3px]">
                            {Array.from({ length: dayTotal }, (_, i) => (
                                <span key={i} className={`h-1.5 w-[18px] rounded-[2px] ${i < resolved ? "bg-emerald-600" : "bg-[var(--vyz-border-strong)]"}`} />
                            ))}
                        </span>
                    </span>
                )}
            </div>

            <div
                className="overflow-hidden rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -20px rgba(15,23,42,0.18)" }}
            >
                {loading ? (
                    <div aria-busy="true" aria-label="Carregando a fila" className="flex flex-col gap-px">
                        {[96, 64, 64].map((h, i) => (
                            <div key={i} className="bg-[var(--vyz-surface-3)] motion-safe:animate-pulse" style={{ height: h }} />
                        ))}
                    </div>
                ) : empty ? (
                    <p className="px-6 py-8 text-[14px] leading-relaxed text-[var(--vyz-text-muted)]">
                        {dayComplete
                            ? "Você resolveu tudo o que tinha para hoje. Quando surgir algo novo, aparece aqui."
                            : "Nada esperando por você agora. Quando um cliente escrever e ficar sem resposta, ou um orçamento parar, ele aparece aqui."}
                    </p>
                ) : (
                    <>
                        {pending[0] && <FocusItem key={pending[0].id} item={pending[0]} amount={amountOf(pending[0])} handlers={handlers} />}
                        {pending.slice(1).map((p) => (
                            <PriorityRow key={p.id} item={p} amount={amountOf(p)} handlers={handlers} />
                        ))}
                        {yourTurn.map((q) => <QuoteRow key={q.id} q={q} />)}

                        {parked.length > 0 && (
                            <>
                                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--vyz-border-subtle)] bg-[var(--vyz-surface-2)] px-5 py-2 sm:px-6">
                                    <span className="text-[12.5px] font-semibold text-[var(--vyz-text-strong)]">Parados</span>
                                    <span className="text-[12.5px] tabular-nums text-[var(--vyz-text-muted)]">
                                        {plural(parkedCount, "orçamento", "orçamentos")} · {brl(parkedAmount)}
                                    </span>
                                </div>
                                {parked.map((q) => <QuoteRow key={q.id} q={q} />)}
                            </>
                        )}

                        <Link
                            to="/orcamentos"
                            className={`flex items-center justify-between px-5 py-3.5 text-[13px] text-[var(--vyz-text)] transition-colors duration-150 hover:bg-[var(--vyz-surface-2)] sm:px-6 ${FOCUS}`}
                        >
                            {parkedCount > parked.length ? `Ver os ${parkedCount} parados em Orçamentos` : "Ver todos em Orçamentos"}
                            <ArrowRight size={13} weight="bold" aria-hidden />
                        </Link>
                    </>
                )}
            </div>
        </section>
    );
}
