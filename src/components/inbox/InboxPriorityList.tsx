// ─────────────────────────────────────────────────────────────────────────────
// InboxPriorityList — lista de conversas do integrador, ordenada pelo que vale
// dinheiro e mostrando o porquê:
//   1. "Responda agora": o cliente está esperando resposta sua (inclui quem
//      respondeu depois de receber a proposta).
//   2. "Propostas paradas": proposta enviada sem resposta, maior valor primeiro.
//   3. "Outras conversas".
// Cada linha mostra o valor da proposta e há quanto tempo ela está parada
// (placar de orçamentos, get_quote_board). Temperatura da EVA aparece quando
// não há proposta.
//
// CONTROLE DO HUMANO: "Por horário" volta pro cronológico, como no WhatsApp.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Clock3, ListOrdered, Search, X } from "lucide-react";
import type { QuoteItem } from "@/hooks/useQuoteBoard";
import type { Chat } from "@/hooks/useEvolutionAPI";
import { EvaBot } from "@/components/eva/EvaBot";
import { ago, brl } from "@/lib/quoteText";

// ─── Tipos do sinal de prioridade (placeholder do cálculo real) ─────────────

export type LeadPriority = "quente" | "esfriando" | "frio";

export interface InboxLeadSignal {
    /** Prioridade de valor — ausente quando a EVA ainda não leu a conversa. */
    priority?: LeadPriority;
    /** Motivo curto da etiqueta ("perto de fechar", "sem resposta há 4h"). */
    reason?: string;
    /** Minutos que o LEAD espera resposta sua; null = a bola está com o lead. */
    waitingMinutes: number | null;
}

export interface InboxPriorityListProps {
    chats: Chat[];
    /** chatId → sinal da EVA (temperatura, motivo, tempo de espera). */
    signals: Record<string, InboxLeadSignal>;
    selectedChatId: string | null;
    onSelect: (chatId: string) => void;
    /** Conteúdo injetado abaixo do header/busca (ex: card de conexão WhatsApp no Inbox). */
    headerSlot?: ReactNode;
    /** Primeira carga ainda não voltou: mostra esqueleto, não "nenhuma conversa". */
    loading?: boolean;
    /** Texto da lista vazia, dito pelo host conforme o motivo (sem WhatsApp, sem conversa). */
    emptyMessage?: string;
    /** Orçamento aberto de cada conversa (placar), por id da conversa. */
    quoteByChat?: Map<string, QuoteItem>;
    /** Sem conversa aberta, abre a primeira da fila (desktop: evita duas colunas vazias). */
    autoSelectFirst?: boolean;
}

type ListFilter = "all" | "yourTurn" | "quote" | "unread";
const isParkedQuote = (q?: QuoteItem) => !!q && (q.state === "no_reply" || q.state === "went_quiet");

/** Situação da proposta em poucas palavras, para a linha da lista. */
function quoteShort(q: QuoteItem): { text: string; tone: "parked" | "turn" | "talking" } | null {
    switch (q.state) {
        case "no_reply":
            return { text: `sem resposta ${ago(q.days)}`, tone: "parked" };
        case "went_quiet":
            return { text: `sumiu ${ago(q.days)}`, tone: "parked" };
        case "your_turn":
            return { text: "esperando você", tone: "turn" };
        case "talking":
            return { text: "em conversa", tone: "talking" };
        default:
            return null;
    }
}
const QUOTE_TONE: Record<"parked" | "turn" | "talking", string> = {
    parked: "var(--vyz-warning)",
    turn: "var(--vyz-accent)",
    talking: "var(--vyz-text-muted)",
};

const ORDER_KEY = "vyz:inbox:ordem";
function loadOrder(): "eva" | "time" {
    try {
        return localStorage.getItem(ORDER_KEY) === "time" ? "time" : "eva";
    } catch {
        return "eva";
    }
}

const PRIORITY_LABEL: Record<LeadPriority, string> = {
    quente: "Quente",
    esfriando: "Esfriando",
    frio: "Frio",
};
const PRIORITY_RANK: Record<LeadPriority, number> = { quente: 0, esfriando: 1, frio: 2 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTimeAgo(timeStr?: string): string {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

function formatWaiting(minutes: number): string {
    if (minutes < 60) return `esperando ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `esperando ${hours}h`;
    return `esperando ${Math.floor(hours / 24)}d`;
}

function lastTime(chat: Chat): number {
    if (chat.lastMessage?.at) return chat.lastMessage.at;
    const t = chat.lastMessage?.time ? new Date(chat.lastMessage.time).getTime() : NaN;
    return isNaN(t) ? 0 : t;
}

/** Conversa "trabalhável" = tem pelo menos uma mensagem. O resto é lixo recolhível. */
function hasConversation(chat: Chat): boolean {
    return !!chat.lastMessage?.text;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function InboxPriorityList({
    chats,
    signals,
    selectedChatId,
    onSelect,
    headerSlot,
    loading = false,
    emptyMessage = "Nenhuma conversa ainda.",
    quoteByChat,
    autoSelectFirst = false,
}: InboxPriorityListProps) {
    const [filter, setFilter] = useState<ListFilter>("all");
    const [query, setQuery] = useState("");
    // A EVA propõe a ordem; "time" é o humano revogando pro cronológico. Vale entre visitas.
    const [order, setOrderState] = useState<"eva" | "time">(loadOrder);
    const setOrder = (next: "eva" | "time") => {
        setOrderState(next);
        try {
            localStorage.setItem(ORDER_KEY, next);
        } catch {
            /* sem storage: vale só nesta visita */
        }
    };
    const [junkOpen, setJunkOpen] = useState(false);
    const [groupsOpen, setGroupsOpen] = useState(false);

    /** O cliente está esperando resposta sua: respondeu depois da proposta ou mandou a última mensagem. */
    const isYourTurn = (c: Chat) => quoteByChat?.get(c.id)?.state === "your_turn" || signals[c.id]?.waitingMinutes != null;
    const amountOf = (c: Chat) => quoteByChat?.get(c.id)?.amount ?? 0;

    const { active, junk, groups } = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matched = q
            ? chats.filter(
                  (c) =>
                      c.name?.toLowerCase().includes(q) ||
                      c.phone?.toLowerCase().includes(q),
              )
            : chats;
        const visible = matched
            .filter((c) => !c.isGroup)
            .filter((c) => {
                if (filter === "unread") return c.unreadCount > 0;
                if (filter === "quote") return isParkedQuote(quoteByChat?.get(c.id));
                if (filter === "yourTurn") return isYourTurn(c);
                return true;
            });
        return {
            active: visible.filter(hasConversation),
            junk: visible.filter((c) => !hasConversation(c)),
            // Grupos fora do fluxo de venda (EVA não analisa), mas acessíveis
            groups: matched
                .filter((c) => c.isGroup)
                .sort((a, b) => lastTime(b) - lastTime(a)),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chats, query, filter, quoteByChat, signals]);

    const unreadCount = chats.filter((c) => !c.isGroup && c.unreadCount > 0).length;
    const parkedCount = chats.filter((c) => !c.isGroup && isParkedQuote(quoteByChat?.get(c.id))).length;
    const yourTurnCount = chats.filter((c) => !c.isGroup && hasConversation(c) && isYourTurn(c)).length;

    // Ordenações. waitingMinutes desc = quem espera VOCÊ há mais tempo primeiro.
    const byWaiting = (a: Chat, b: Chat) => {
        const wa = signals[a.id]?.waitingMinutes;
        const wb = signals[b.id]?.waitingMinutes;
        if (wa === null || wa === undefined) {
            if (wb === null || wb === undefined) return lastTime(b) - lastTime(a);
            return 1;
        }
        if (wb === null || wb === undefined) return -1;
        return wb - wa;
    };

    const sections = useMemo(() => {
        if (order === "time") {
            return [{ key: "all", label: null, chats: [...active].sort((a, b) => lastTime(b) - lastTime(a)) }];
        }
        // Quem espera você primeiro (proposta respondida antes, depois o maior
        // valor), depois as propostas paradas pelo maior valor, depois o resto.
        const now = active.filter(isYourTurn).sort((a, b) => {
            const ta = quoteByChat?.get(a.id)?.state === "your_turn" ? 0 : 1;
            const tb = quoteByChat?.get(b.id)?.state === "your_turn" ? 0 : 1;
            if (ta !== tb) return ta - tb;
            if (amountOf(b) !== amountOf(a)) return amountOf(b) - amountOf(a);
            return byWaiting(a, b);
        });
        const parked = active
            .filter((c) => !isYourTurn(c) && isParkedQuote(quoteByChat?.get(c.id)))
            .sort((a, b) => amountOf(b) - amountOf(a));
        const rest = active
            .filter((c) => !isYourTurn(c) && !isParkedQuote(quoteByChat?.get(c.id)))
            .sort((a, b) => {
                const pa = PRIORITY_RANK[signals[a.id]?.priority ?? "frio"];
                const pb = PRIORITY_RANK[signals[b.id]?.priority ?? "frio"];
                if (pa !== pb) return pa - pb;
                return lastTime(b) - lastTime(a);
            });
        return [
            { key: "now", label: "Responda agora", chats: now },
            { key: "parked", label: "Propostas paradas", chats: parked },
            { key: "rest", label: "Outras conversas", chats: rest },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, order, signals, quoteByChat]);

    const primeira = sections.find((sec) => sec.chats.length > 0)?.chats[0]?.id ?? null;
    useEffect(() => {
        if (autoSelectFirst && !selectedChatId && primeira) onSelect(primeira);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSelectFirst, selectedChatId, primeira]);

    return (
        <div className="vz-evlist">
            {/* Header — a entidade sinaliza o modo: roxo priorizando, slate sem base */}
            <div className="vz-evlist-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <EvaBot state="idle" size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="vz-evlist-title">Conversas</p>
                        <p className="vz-evlist-subtitle">
                            {order === "time" ? "Ordem cronológica" : "Quem espera você primeiro"}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="vz-evlist-toggle"
                        onClick={() => setOrder(order === "eva" ? "time" : "eva")}
                        title={
                            order === "eva"
                                ? "Voltar pra ordem cronológica"
                                : "Voltar pra ordem da EVA"
                        }
                    >
                        {order === "eva" ? (
                            <>
                                <Clock3 style={{ width: 11, height: 11 }} />
                                Por horário
                            </>
                        ) : (
                            <>
                                <ListOrdered style={{ width: 11, height: 11 }} />
                                Ordem da EVA
                            </>
                        )}
                    </button>
                </div>

                {/* Busca */}
                <div style={{ position: "relative", marginTop: 10 }}>
                    <Search
                        style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 13,
                            height: 13,
                            color: "#94A3B8",
                        }}
                    />
                    <input
                        type="search"
                        aria-label="Buscar conversa"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape" && query) {
                                e.preventDefault();
                                setQuery("");
                            }
                        }}
                        placeholder="Buscar nome ou telefone"
                        className="text-base md:text-[12px] border border-[var(--ibx-line)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--vyz-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] [&::-webkit-search-cancel-button]:hidden"
                        style={{
                            width: "100%",
                            height: 34,
                            paddingLeft: 32,
                            paddingRight: query ? 30 : 12,
                            borderRadius: 999,
                            background: "var(--ibx-sunken)",
                            color: "#0B1220",
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label="Limpar busca"
                            onClick={() => setQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--vyz-text-muted)] hover:bg-[var(--ibx-line)] transition-colors duration-150"
                        >
                            <X style={{ width: 11, height: 11 }} />
                        </button>
                    )}
                </div>
            </div>

            {chats.length > 0 && (
                <div role="group" aria-label="Filtrar conversas" className="flex gap-1.5 overflow-x-auto px-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {([
                        { id: "all", label: "Todas" },
                        { id: "yourTurn", label: `Sua vez${yourTurnCount ? ` (${yourTurnCount})` : ""}` },
                        { id: "quote", label: `Propostas paradas${parkedCount ? ` (${parkedCount})` : ""}` },
                        { id: "unread", label: `Não lidas${unreadCount ? ` (${unreadCount})` : ""}` },
                    ] as const).map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            aria-pressed={filter === f.id}
                            onClick={() => setFilter(f.id)}
                            className={`inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] ${
                                filter === f.id
                                    ? "bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)]"
                                    : "border border-[var(--ibx-line)] text-[var(--vyz-text-strong)] hover:bg-[var(--ibx-sunken)]"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Slot injetado pelo host (ex: card de conexão WhatsApp no Inbox). */}
            {headerSlot && <div className="vz-evlist-headerslot" style={{ padding: "10px 12px 0" }}>{headerSlot}</div>}

            {/* Lista — overflowX hidden: lista NUNCA rola pro lado */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingBottom: 8 }}>
                {sections.map((section) => (
                    <div key={section.key}>
                        {section.label && section.chats.length > 0 && (
                            <p className="vz-evlist-section">
                                {section.label}
                                <span className="vz-evlist-section-count">
                                    {section.chats.length}
                                </span>
                            </p>
                        )}
                        <ul>
                            {section.chats.map((chat) => (
                                <LeadRow
                                    key={chat.id}
                                    chat={chat}
                                    signal={signals[chat.id]}
                                    isSelected={chat.id === selectedChatId}
                                    onSelect={() => onSelect(chat.id)}
                                    quote={quoteByChat?.get(chat.id)}
                                />
                            ))}
                        </ul>
                    </div>
                ))}

                {active.length === 0 && loading && chats.length === 0 && (
                    <ul aria-label="Carregando conversas" className="px-3 pt-2 space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <li key={i} className="flex items-center gap-3 rounded-[10px] px-2 py-2">
                                <span className="h-9 w-9 shrink-0 rounded-full bg-[var(--ibx-sunken)] animate-pulse motion-reduce:animate-none" />
                                <span className="flex-1 space-y-1.5">
                                    <span className="block h-2.5 w-2/5 rounded bg-[var(--ibx-sunken)] animate-pulse motion-reduce:animate-none" />
                                    <span className="block h-2.5 w-4/5 rounded bg-[var(--ibx-sunken)] animate-pulse motion-reduce:animate-none" />
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {active.length === 0 && !loading && (
                    <div className="px-6 py-10 text-center">
                        <p className="text-[12px] text-[var(--vyz-text-muted)]">
                            {query.trim()
                                ? `Nada encontrado para “${query.trim()}”.`
                                : filter === "unread"
                                ? "Nenhuma conversa não lida."
                                : filter === "quote"
                                ? "Nenhuma proposta parada agora."
                                : filter === "yourTurn"
                                ? "Ninguém esperando resposta sua agora."
                                : emptyMessage}
                        </p>
                        {query.trim() && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="mt-3 inline-flex h-8 items-center rounded-full border border-[var(--ibx-line)] px-3.5 text-[12px] font-medium text-[var(--vyz-text-strong)] hover:bg-[var(--ibx-sunken)] transition-colors duration-150"
                            >
                                Limpar busca
                            </button>
                        )}
                    </div>
                )}

                {/* Grupos: fora do fluxo de venda, recolhidos mas acessíveis */}
                {groups.length > 0 && (
                    <>
                        <button
                            type="button"
                            className="vz-evlist-junk-toggle"
                            onClick={() => setGroupsOpen(!groupsOpen)}
                        >
                            {groupsOpen ? (
                                <ChevronDown style={{ width: 12, height: 12 }} />
                            ) : (
                                <ChevronRight style={{ width: 12, height: 12 }} />
                            )}
                            {groups.length} {groups.length === 1 ? "grupo" : "grupos"}
                        </button>
                        {groupsOpen && (
                            <ul>
                                {groups.map((chat) => (
                                    <li key={chat.id}>
                                        <button
                                            type="button"
                                            className="vz-evlist-junk-row"
                                            onClick={() => onSelect(chat.id)}
                                        >
                                            <span
                                                className="vz-evlist-avatar"
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: 9,
                                                    background: "#CBD5E1",
                                                }}
                                            >
                                                {getInitials(chat.name)}
                                            </span>
                                            <span
                                                style={{
                                                    flex: 1,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    textAlign: "left",
                                                }}
                                            >
                                                {chat.name || "Grupo"}
                                            </span>
                                            {chat.unreadCount > 0 && (
                                                <span className="vz-evlist-unread">
                                                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}

                {/* O lixo: contatos sem conversa, recolhidos, fora do caminho */}
                {junk.length > 0 && (
                    <>
                        <button
                            type="button"
                            className="vz-evlist-junk-toggle"
                            onClick={() => setJunkOpen(!junkOpen)}
                        >
                            {junkOpen ? (
                                <ChevronDown style={{ width: 12, height: 12 }} />
                            ) : (
                                <ChevronRight style={{ width: 12, height: 12 }} />
                            )}
                            {junk.length}{" "}
                            {junk.length === 1
                                ? "contato sem conversa ativa"
                                : "contatos sem conversa ativa"}
                        </button>
                        {junkOpen && (
                            <ul>
                                {junk.map((chat) => (
                                    <li key={chat.id}>
                                        <button
                                            type="button"
                                            className="vz-evlist-junk-row"
                                            onClick={() => onSelect(chat.id)}
                                        >
                                            <span
                                                className="vz-evlist-avatar"
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: 9,
                                                    background: "#CBD5E1",
                                                }}
                                            >
                                                {getInitials(chat.name)}
                                            </span>
                                            <span
                                                style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {chat.name || chat.phone || "Sem nome"}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Linha ──────────────────────────────────────────────────────────────────

function LeadRow({
    chat,
    signal,
    isSelected,
    onSelect,
    quote,
}: {
    quote?: QuoteItem;
    chat: Chat;
    signal?: InboxLeadSignal;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const priority = signal?.priority;
    const unread = chat.unreadCount;
    const q = quote ? quoteShort(quote) : null;

    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={`vz-evlist-row ${isSelected ? "vz-evlist-row--selected" : ""}`}
            >
                {priority && <span className={`vz-evlist-bar vz-evlist-bar--${priority}`} />}

                <span className={`vz-evlist-avatar ${priority ? `vz-evlist-avatar--${priority}` : ""}`}>
                    {getInitials(chat.name)}
                </span>

                <span style={{ flex: 1, minWidth: 0, display: "block" }}>
                    {/* Linha 1: nome + horário */}
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="vz-evlist-name" style={{ flex: 1 }}>
                            {chat.name || chat.phone || "Sem nome"}
                        </span>
                        <span className="vz-evlist-time">
                            {formatTimeAgo(chat.lastMessage?.time)}
                        </span>
                    </span>

                    {/* Linha 2: prévia (1 linha, truncada) */}
                    <span className="vz-evlist-preview" style={{ display: "block" }}>
                        {chat.lastMessage?.isMe ? "Você: " : ""}
                        {chat.lastMessage?.text}
                    </span>

                    {/* Linha 3: a proposta (valor e situação) quando existe; senão a
                        leitura da EVA. À direita, quanto tempo o cliente espera você. */}
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            marginTop: 4,
                        }}
                    >
                        {quote && q ? (
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[10.5px]">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: QUOTE_TONE[q.tone] }} aria-hidden />
                                <span className="font-semibold tabular-nums text-[var(--vyz-text-primary)]">
                                    {quote.amount > 0 ? brl(quote.amount) : "Proposta"}
                                </span>
                                <span className="truncate font-medium" style={{ color: QUOTE_TONE[q.tone] }}>
                                    {q.text}
                                </span>
                            </span>
                        ) : priority ? (
                            <span className={`vz-evlist-tag vz-evlist-tag--${priority}`}>
                                <span className="vz-evlist-tag-text">
                                    {PRIORITY_LABEL[priority]}{signal?.reason ? ` · ${signal.reason}` : ""}
                                </span>
                            </span>
                        ) : (
                            <span aria-hidden />
                        )}
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                justifyContent: "flex-end",
                                minWidth: 0,
                            }}
                        >
                            {signal?.waitingMinutes != null && (
                                <span className="vz-evlist-wait">{formatWaiting(signal.waitingMinutes)}</span>
                            )}
                            {unread > 0 && (
                                <span className="vz-evlist-unread">
                                    {unread > 99 ? "99+" : unread} {unread === 1 ? "não lida" : "não lidas"}
                                </span>
                            )}
                        </span>
                    </span>
                </span>
            </button>
        </li>
    );
}
