import { useMemo, useRef, useState } from "react";
import { Search, MessageCircle, Users, RefreshCw } from "lucide-react";
import { InboxListSkeleton } from "@/components/ui/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProfilePic } from "@/hooks/useProfilePic";
import { ConnectionStatusCard } from "./ConnectionStatusCard";
import type { Chat } from "@/hooks/useEvolutionAPI";
import type { InboxConnectionStatus } from "@/hooks/useInboxConnectionStatus";

// V1.0.1 — Removidos badges/filtros mock determinísticos baseados em hash do
// phone (origin/status/EVA badge). Apareciam como dados reais nos cards
// (Meta Ads/Google Ads/Qualif./Demo marcada) confundindo o usuário e
// poluindo demos. Substituídos por badge único "WhatsApp" estático
// representando o canal real da conversa. Filtros de status removidos até
// existir fonte real (lead_status, qualification_stage, etc).

// ─── Sync status (F4W.0.2) ────────────────────────────────────────────────
// Estados de confiança expostos pelo Inbox.tsx (já calculados lá).
export type SyncTone = "live" | "stale" | "offline-with-history" | "offline" | "unknown";

export interface SyncStatus {
    tone: SyncTone;
    /** Texto curto pro badge (ex: "Live", "Histórico salvo") */
    badge: string;
    /** Linha auxiliar abaixo do header (ex: "Atualizado há 2min") — opcional */
    detail?: string;
}

// Tom → cores do badge
const SYNC_TONE_STYLES: Record<SyncTone, { bg: string; color: string; dot: string; pulse: boolean }> = {
    "live":                   { bg: "rgba(16,185,129,0.10)",  color: "#047857", dot: "#10B981", pulse: true },
    "stale":                  { bg: "rgba(245,158,11,0.10)",  color: "#B45309", dot: "#F59E0B", pulse: false },
    "offline-with-history":   { bg: "rgba(148,163,184,0.15)", color: "#475569", dot: "#94A3B8", pulse: false },
    "offline":                { bg: "rgba(148,163,184,0.15)", color: "#64748B", dot: "#94A3B8", pulse: false },
    "unknown":                { bg: "rgba(148,163,184,0.15)", color: "#64748B", dot: "#94A3B8", pulse: false },
};

// V1.0.1 — getLeadOrigin/getLeadStatus removidos (eram mock determinístico).

function getInitials(name: string) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTimeAgo(timeStr: string): string {
    // lastMessage.time vem como ISO ou string formatada. Trato ambos.
    if (!timeStr) return "";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

interface InboxListProps {
    chats: Chat[];
    selectedChatId: string | null;
    onSelect: (chatId: string) => void;
    isLoading?: boolean;
    connected?: boolean;
    /** F4W.0.2 — estado compound de sincronização */
    syncStatus?: SyncStatus;
    /** F4W.0.2 — handler do botão "Atualizar histórico" */
    onRefresh?: () => void;
    isRefreshing?: boolean;
    /** F4W.7.1 — estado da conexão WhatsApp pro card da sidebar */
    connectionStatus?: InboxConnectionStatus;
    /** F4W.7.1 — CTA conectar/reconectar (nesta fase navega p/ Integrações) */
    onConnectClick?: () => void;
    /** F4W.7.3 — import de histórico recente (só quando conectado) */
    onSyncHistory?: () => void;
    historySyncing?: boolean;
    /** F4W.7.1 — microcopy de escopo pra admin ("Minhas conversas") */
    adminScopeLabel?: string;
    /** INBOX.STATUS — re-aplica o webhook (ativa checks) sem reconectar */
    onResyncWebhook?: () => void;
    resyncing?: boolean;
    /** INBOX.STATUS — desconecta o número (logout da instância) */
    onDisconnect?: () => void;
    disconnecting?: boolean;
}

export function InboxList({
    chats,
    selectedChatId,
    onSelect,
    isLoading,
    connected,
    syncStatus,
    onRefresh,
    isRefreshing,
    connectionStatus,
    onConnectClick,
    onSyncHistory,
    historySyncing,
    adminScopeLabel,
    onResyncWebhook,
    resyncing,
    onDisconnect,
    disconnecting,
}: InboxListProps) {
    const [query, setQuery] = useState("");

    // Proximity hover (Fluid Functionalism): o card mais próximo do cursor
    // acende antes do clique — cobre também o vão entre cards, reduzindo
    // erro de seleção em lista densa. rAF-throttled; -1 = cursor fora.
    const listRef = useRef<HTMLUListElement>(null);
    const rafRef = useRef(0);
    const [nearIdx, setNearIdx] = useState(-1);
    const handleListMouseMove = (e: React.MouseEvent) => {
        const y = e.clientY;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            const items = listRef.current?.querySelectorAll<HTMLElement>("[data-lead-card]");
            if (!items?.length) return;
            let best = -1;
            let bestDist = Infinity;
            items.forEach((el, i) => {
                const r = el.getBoundingClientRect();
                const d = Math.abs(y - (r.top + r.height / 2));
                if (d < bestDist) {
                    bestDist = d;
                    best = i;
                }
            });
            setNearIdx(best);
        });
    };
    const handleListMouseLeave = () => {
        cancelAnimationFrame(rafRef.current);
        setNearIdx(-1);
    };

    // V1.0.1 — só filtra grupos + busca; sem enriquecimento mock
    const visibleChats = useMemo(() => {
        return chats.filter((c) => !c.isGroup);
    }, [chats]);

    const filtered = useMemo(() => {
        if (!query.trim()) return visibleChats;
        const q = query.trim().toLowerCase();
        return visibleChats.filter((chat) =>
            chat.name?.toLowerCase().includes(q) ||
            chat.phone?.toLowerCase().includes(q),
        );
    }, [visibleChats, query]);

    const toneStyles = syncStatus ? SYNC_TONE_STYLES[syncStatus.tone] : null;

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #D9E2EC" }}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <h2
                            className="text-[15px] font-semibold tracking-tight"
                            style={{ color: "#0B1220" }}
                        >
                            Inbox Comercial
                        </h2>
                        {syncStatus && toneStyles ? (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wider truncate"
                                style={{
                                    background: toneStyles.bg,
                                    color: toneStyles.color,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                }}
                                title={syncStatus.detail || syncStatus.badge}
                            >
                                <span
                                    className={cn("h-1 w-1 rounded-full", toneStyles.pulse && "animate-pulse")}
                                    style={{ background: toneStyles.dot }}
                                />
                                {syncStatus.badge}
                            </span>
                        ) : connected !== undefined ? (
                            // Fallback legado caso syncStatus não seja passado
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
                                style={{
                                    background: connected ? "rgba(16,185,129,0.10)" : "rgba(148,163,184,0.15)",
                                    color: connected ? "#047857" : "#64748B",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                <span
                                    className={cn("h-1 w-1 rounded-full", connected && "animate-pulse")}
                                    style={{ background: connected ? "#10B981" : "#94A3B8" }}
                                />
                                {connected ? "Live" : "Offline"}
                            </span>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                            {visibleChats.length} {visibleChats.length === 1 ? "lead" : "leads"}
                        </span>
                        {onRefresh && (
                            <button
                                type="button"
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className={cn(
                                    "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                                    "hover:bg-[#F4F7FB] disabled:opacity-60 disabled:cursor-not-allowed",
                                )}
                                style={{ color: "#475569" }}
                                title="Atualizar histórico"
                                aria-label="Atualizar histórico"
                            >
                                <RefreshCw
                                    className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* F4W.7.1 — card de status da conexão WhatsApp */}
                {connectionStatus && (
                    <ConnectionStatusCard
                        status={connectionStatus}
                        onConnectClick={onConnectClick}
                        onSyncHistory={onSyncHistory}
                        historySyncing={historySyncing}
                        adminScopeLabel={adminScopeLabel}
                        onResyncWebhook={onResyncWebhook}
                        resyncing={resyncing}
                        onDisconnect={onDisconnect}
                        disconnecting={disconnecting}
                    />
                )}

                {/* Linha auxiliar: timestamp da última sync (só sem o card) */}
                {!connectionStatus && syncStatus?.detail && (
                    <div
                        className="text-[10.5px] mb-2 truncate"
                        style={{ color: "#64748B" }}
                        title={syncStatus.detail}
                    >
                        {syncStatus.detail}
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                        style={{ color: "#94A3B8" }}
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar lead ou telefone…"
                        className="w-full h-9 pl-9 pr-3 rounded-xl text-[12.5px] outline-none transition-all bg-[#F4F7FB] border border-[#D9E2EC] text-[#0B1220] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/12"
                    />
                </div>
            </div>

            {/* V1.0.1 — InboxFilters removido (contadores eram mock determinístico) */}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <InboxListSkeleton rows={7} />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        hasAnyChats={visibleChats.length > 0}
                        query={query}
                        connected={connected}
                        syncTone={syncStatus?.tone}
                    />
                ) : (
                    <ul
                        ref={listRef}
                        className="px-2 py-2 flex flex-col gap-0.5"
                        onMouseMove={handleListMouseMove}
                        onMouseLeave={handleListMouseLeave}
                    >
                        {filtered.map((chat, i) => (
                            <LeadCard
                                key={chat.id}
                                chat={chat}
                                isSelected={chat.id === selectedChatId}
                                isNear={i === nearIdx}
                                onSelect={() => onSelect(chat.id)}
                                demoTarget={i === 0}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ─── LeadCard ────────────────────────────────────────────────────────────

interface LeadCardProps {
    chat: Chat;
    isSelected: boolean;
    isNear?: boolean;
    onSelect: () => void;
    demoTarget?: boolean;
}

function LeadCard({ chat, isSelected, isNear, onSelect, demoTarget }: LeadCardProps) {
    const picUrl = useProfilePic(chat.phone, chat.profilePicUrl);
    const isUnread = chat.unreadCount > 0;
    const time = chat.lastMessage?.time ? formatTimeAgo(chat.lastMessage.time) : "";
    return (
        <li data-lead-card {...(demoTarget ? { "data-demo-inbox-item": "" } : {})}>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    "group w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isSelected ? "bg-[#EEF4FF]" : isNear ? "bg-[#F4F7FB]" : "hover:bg-[#F4F7FB]"
                )}
                style={
                    isSelected
                        ? { boxShadow: "inset 2px 0 0 #2563EB, 0 1px 2px rgba(15,23,42,0.05)" }
                        : undefined
                }
            >
                <Avatar
                    className={cn(
                        "h-11 w-11 shrink-0 rounded-full transition-shadow",
                        isUnread && "ring-2 ring-[#2563EB]/20 ring-offset-1 ring-offset-white"
                    )}
                >
                    {picUrl && (
                        <AvatarImage src={picUrl} alt={chat.name} className="rounded-full" />
                    )}
                    <AvatarFallback
                        className="text-[12.5px] font-semibold rounded-full text-white"
                        style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                    >
                        {getInitials(chat.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Linha 1: nome + tempo (não-lida realça nome e hora) */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span
                            className="text-[13.5px] truncate"
                            style={{ color: "#0B1220", fontWeight: isUnread ? 700 : 600, letterSpacing: "-0.01em" }}
                        >
                            {chat.name || chat.phone || "Sem nome"}
                        </span>
                        <span
                            className="text-[10.5px] tabular-nums shrink-0"
                            style={{ color: isUnread ? "#2563EB" : "#94A3B8", fontWeight: isUnread ? 600 : 400 }}
                        >
                            {time}
                        </span>
                    </div>

                    {/* Linha 2: prévia + contador de não-lidas (sem ruído de canal) */}
                    <div className="flex items-center justify-between gap-2">
                        <p
                            className="text-[12px] leading-snug truncate flex-1"
                            style={{ color: isUnread ? "#334155" : "#64748B", fontWeight: isUnread ? 500 : 400 }}
                        >
                            {chat.lastMessage?.isMe && <span style={{ color: "#94A3B8" }}>Você: </span>}
                            {chat.lastMessage?.text || (
                                <span style={{ color: "#94A3B8", fontStyle: "italic" }}>
                                    sem mensagens ainda
                                </span>
                            )}
                        </p>
                        {isUnread && (
                            <span
                                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] text-white tabular-nums leading-none shrink-0"
                                style={{ background: "#2563EB", fontWeight: 700, boxShadow: "0 1px 3px rgba(37,99,235,0.35)" }}
                            >
                                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </li>
    );
}

// ─── EmptyState ──────────────────────────────────────────────────────────

function EmptyState({
    hasAnyChats,
    query,
    connected,
    syncTone,
}: {
    hasAnyChats: boolean;
    query: string;
    connected?: boolean;
    syncTone?: SyncTone;
}) {
    // Query ativa: mensagem genérica de busca, independente de sync
    if (query.trim() && hasAnyChats) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                <p className="text-[12.5px]" style={{ color: "#64748B" }}>
                    Nenhum lead encontrado.
                </p>
            </div>
        );
    }

    // DB vazio + Evolution desconectado/desconhecido
    if (!connected && syncTone !== "offline-with-history") {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: "rgba(148,163,184,0.12)" }}
                >
                    <MessageCircle className="h-5 w-5" style={{ color: "#64748B" }} />
                </div>
                <p className="text-[13px] mb-1" style={{ color: "#0B1220", fontWeight: 600 }}>
                    Conecte o WhatsApp para começar
                </p>
                <p className="text-[11.5px] leading-snug max-w-[260px]" style={{ color: "#64748B" }}>
                    Configure a integração em Configurações &gt; Integrações. Seu histórico salvo aparecerá aqui.
                </p>
            </div>
        );
    }

    // DB vazio + Evolution conectado: aguardando primeira mensagem
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6">
            <div
                className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgba(37,99,235,0.10)" }}
            >
                <Users className="h-5 w-5" style={{ color: "#2563EB" }} />
            </div>
            <p className="text-[13px] mb-1" style={{ color: "#0B1220", fontWeight: 600 }}>
                Ainda não há conversas salvas
            </p>
            <p className="text-[11.5px] leading-snug max-w-[260px]" style={{ color: "#64748B" }}>
                Aguarde uma nova mensagem ou use “Atualizar histórico” para sincronizar.
            </p>
        </div>
    );
}
