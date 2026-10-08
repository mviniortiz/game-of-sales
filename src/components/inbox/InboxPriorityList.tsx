// ─────────────────────────────────────────────────────────────────────────────
// InboxPriorityList (EVA.INBOX.3, 2026-06-06) — lista de conversas reordenada
// pela EVA, que MOSTRA O PORQUÊ. Ordenar por horário (igual WhatsApp) não
// prioriza; a etiqueta-motivo é o que torna a reordenação confiável em vez
// de assustadora.
//
// DOIS ESTADOS, honestos como a lateral direita:
//   A (Studio configurado) → seções "Responda agora" / "Depois", etiqueta de
//     valor por linha, barra de risco na cor da prioridade.
//   B (Studio vazio) → a EVA SE CALA sobre valor. Ordena pelo único sinal
//     real: tempo esperando resposta SUA. Sinal neutro de tempo no lugar das
//     etiquetas + ponte pro /eva-studio no topo.
//
// CONTROLE DO HUMANO: a ordem da EVA é o padrão, mas o botão "Por horário"
// volta pro cronológico. A EVA propõe, o humano pode revogar.
//
// PRESENTATIONAL: score/temperatura são MOCK — chegam prontos via `signals`
// (placeholder). O cálculo real (EVA Studio) entra depois trocando só a
// origem das props; este componente NÃO calcula prioridade.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Clock3, ListOrdered, Search, X } from "lucide-react";
import type { QuoteItem } from "@/hooks/useQuoteBoard";
import type { Chat } from "@/hooks/useEvolutionAPI";
import { EvaBot } from "@/components/eva/EvaBot";

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
    /** chatId → sinal. Linha sem sinal cai em "Depois" (estado A). */
    signals: Record<string, InboxLeadSignal>;
    /** true = estado A (prioriza por valor); false = estado B (fallback por espera). */
    studioConfigured: boolean;
    selectedChatId: string | null;
    onSelect: (chatId: string) => void;
    /** Ponte do estado B → /eva-studio. */
    onOpenStudio: () => void;
    /** Conteúdo injetado abaixo do header/busca (ex: card de conexão WhatsApp no Inbox). */
    headerSlot?: ReactNode;
    /** Primeira carga ainda não voltou: mostra esqueleto, não "nenhuma conversa". */
    loading?: boolean;
    /** Texto da lista vazia, dito pelo host conforme o motivo (sem WhatsApp, sem conversa). */
    emptyMessage?: string;
    /** Orçamento aberto de cada conversa (placar), por id da conversa. */
    quoteByChat?: Map<string, QuoteItem>;
}

type ListFilter = "all" | "unread" | "quote";
const isParkedQuote = (q?: QuoteItem) => !!q && (q.state === "no_reply" || q.state === "went_quiet");
const QUOTE_ROW_LABEL: Partial<Record<QuoteItem["state"], string>> = {
    no_reply: "Orçamento sem resposta",
    went_quiet: "Sumiu depois do orçamento",
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
    studioConfigured,
    selectedChatId,
    onSelect,
    onOpenStudio,
    headerSlot,
    loading = false,
    emptyMessage = "Nenhuma conversa ainda.",
    quoteByChat,
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
            .filter((c) =>
                filter === "unread" ? c.unreadCount > 0 : filter === "quote" ? isParkedQuote(quoteByChat?.get(c.id)) : true,
            );
        return {
            active: visible.filter(hasConversation),
            junk: visible.filter((c) => !hasConversation(c)),
            // Grupos fora do fluxo de venda (EVA não analisa), mas acessíveis
            groups: matched
                .filter((c) => c.isGroup)
                .sort((a, b) => lastTime(b) - lastTime(a)),
        };
    }, [chats, query, filter, quoteByChat]);

    const unreadCount = chats.filter((c) => !c.isGroup && c.unreadCount > 0).length;
    const parkedCount = chats.filter((c) => !c.isGroup && isParkedQuote(quoteByChat?.get(c.id))).length;

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
        if (!studioConfigured) {
            // Estado B: sem valor pra priorizar — só o sinal real de espera.
            return [{ key: "wait", label: null, chats: [...active].sort(byWaiting) }];
        }
        // Estado A: quentes + esfriando no topo, frios/aguardando depois.
        const now = active
            .filter((c) => {
                const p = signals[c.id]?.priority;
                return p === "quente" || p === "esfriando";
            })
            .sort((a, b) => {
                const pa = PRIORITY_RANK[signals[a.id]?.priority ?? "frio"];
                const pb = PRIORITY_RANK[signals[b.id]?.priority ?? "frio"];
                if (pa !== pb) return pa - pb;
                return byWaiting(a, b);
            });
        const later = active
            .filter((c) => {
                const p = signals[c.id]?.priority;
                return p !== "quente" && p !== "esfriando";
            })
            .sort(byWaiting);
        return [
            { key: "now", label: "Responda agora", chats: now },
            { key: "later", label: "Depois", chats: later },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, order, studioConfigured, signals]);

    return (
        <div className="vz-evlist">
            {/* Header — a entidade sinaliza o modo: roxo priorizando, slate sem base */}
            <div className="vz-evlist-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <EvaBot state={studioConfigured ? "idle" : "thinking"} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="vz-evlist-title">Conversas</p>
                        <p className="vz-evlist-subtitle">
                            {order === "time"
                                ? "Ordem cronológica"
                                : studioConfigured
                                ? "Ordenada pela EVA por prioridade"
                                : "Por tempo de espera · sem leitura de valor"}
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
                <div role="group" aria-label="Filtrar conversas" className="flex flex-wrap gap-1.5 px-3 pt-2">
                    {([
                        { id: "all", label: "Todas" },
                        { id: "unread", label: `Não lidas${unreadCount ? ` (${unreadCount})` : ""}` },
                        { id: "quote", label: `Orçamento parado${parkedCount ? ` (${parkedCount})` : ""}` },
                    ] as const).map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            aria-pressed={filter === f.id}
                            onClick={() => setFilter(f.id)}
                            className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] ${
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

            {/* Estado B — ponte com presença, não erro. O fallback funciona,
                mas o valor de verdade está trancado atrás do Studio. */}
            {!studioConfigured && order === "eva" && chats.length > 0 && (
                <button type="button" className="vz-evlist-bridge" onClick={onOpenStudio}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="vz-evlist-bridge-title">
                            Lista por tempo de espera
                        </span>
                        <span className="vz-evlist-bridge-sub">
                            Para a EVA ordenar por valor, configure o EVA Studio
                        </span>
                    </span>
                    <ArrowRight style={{ width: 14, height: 14, flexShrink: 0, color: "var(--vyz-text-muted)" }} />
                </button>
            )}

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
                                    showValue={studioConfigured}
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
                                ? "Nenhum orçamento parado agora."
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
    showValue,
    isSelected,
    onSelect,
    quote,
}: {
    quote?: QuoteItem;
    chat: Chat;
    signal?: InboxLeadSignal;
    /** false = estado B: nada de etiqueta/cor de valor, só o sinal de tempo. */
    showValue: boolean;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const priority = showValue ? signal?.priority : undefined;
    const unread = chat.unreadCount;

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

                    {/* Linha 3 — estado A: etiqueta-motivo; estado B: o SLOT da
                        etiqueta aparece trancado (a ausência visível vende o
                        Studio) e o sinal de tempo justifica a ordem à direita. */}
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            marginTop: 4,
                        }}
                    >
                        {showValue ? (
                            signal?.priority ? (
                                <span className={`vz-evlist-tag vz-evlist-tag--${signal.priority}`}>
                                    <span className="vz-evlist-tag-text">
                                        {PRIORITY_LABEL[signal.priority]}{signal.reason ? ` · ${signal.reason}` : ""}
                                    </span>
                                </span>
                            ) : (
                                <span className="vz-evlist-wait">sem leitura ainda</span>
                            )
                        ) : quote && QUOTE_ROW_LABEL[quote.state] ? (
                            <span className="inline-flex min-w-0 items-center gap-1 truncate text-[10.5px] font-medium text-[var(--vyz-warning)]">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--vyz-warning)]" aria-hidden />
                                {QUOTE_ROW_LABEL[quote.state]}
                            </span>
                        ) : (
                            // Sem Studio, a faixa do topo já explica; a linha não repete o aviso.
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
                            {!showValue && (
                                <span className="vz-evlist-wait">
                                    {signal?.waitingMinutes != null
                                        ? formatWaiting(signal.waitingMinutes)
                                        : "bola com o lead"}
                                </span>
                            )}
                            {unread > 0 && (
                                <span className="vz-evlist-unread">
                                    {!showValue && "· "}
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
