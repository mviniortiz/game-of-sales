import { useMemo, useState } from "react";
import { Search, MessageCircle, Users, Loader2, RefreshCw, Wifi, WifiOff, QrCode, AlertCircle } from "lucide-react";
import { InboxListSkeleton } from "@/components/ui/skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
}: InboxListProps) {
    const [query, setQuery] = useState("");

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
                        className="w-full h-9 pl-9 pr-3 rounded-lg text-[12.5px] outline-none transition-colors"
                        style={{
                            background: "#F4F7FB",
                            border: "1px solid #D9E2EC",
                            color: "#0B1220",
                        }}
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
                    <ul className="px-2 py-2 flex flex-col gap-0.5">
                        {filtered.map((chat) => (
                            <LeadCard
                                key={chat.id}
                                chat={chat}
                                isSelected={chat.id === selectedChatId}
                                onSelect={() => onSelect(chat.id)}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ─── F4W.7.1 — Card de status da conexão WhatsApp ─────────────────────────

function ConnectionStatusCard({
    status,
    onConnectClick,
    onSyncHistory,
    historySyncing,
    adminScopeLabel,
}: {
    status: InboxConnectionStatus;
    onConnectClick?: () => void;
    onSyncHistory?: () => void;
    historySyncing?: boolean;
    adminScopeLabel?: string;
}) {
    const showSync = status.status === "connected" && status.provider === "evolution" && !!onSyncHistory;
    const tone =
        status.status === "connected"
            ? { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.22)", dot: "#10B981", text: "#047857", Icon: Wifi }
            : status.status === "pending"
            ? { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.24)", dot: "#F59E0B", text: "#B45309", Icon: QrCode }
            : status.status === "unknown"
            ? { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.28)", dot: "#94A3B8", text: "#64748B", Icon: AlertCircle }
            : { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.28)", dot: "#94A3B8", text: "#64748B", Icon: WifiOff };

    const agoStr = status.lastUpdatedAt ? formatTimeAgo(status.lastUpdatedAt.toISOString()) : null;

    let subtitle: string;
    if (status.status === "connected") {
        subtitle = agoStr ? `Histórico salvo · atualizado ${agoStr}` : "Histórico salvo.";
    } else if (status.status === "pending") {
        subtitle = "Leia o QR Code para conectar.";
    } else if (status.status === "unknown") {
        subtitle = "Atualize ou verifique a conexão.";
    } else {
        subtitle = status.isHistoryOnly
            ? "Você está vendo apenas o histórico salvo."
            : "Conecte o WhatsApp para começar.";
    }

    const showCta = status.canConnect || status.canReconnect;
    const ctaLabel = status.canReconnect ? "Reconectar" : "Conectar WhatsApp";
    const Icon = tone.Icon;

    return (
        <div
            className="rounded-lg px-3 py-2.5 mb-2"
            style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
        >
            <div className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: tone.text }} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={cn("h-1.5 w-1.5 rounded-full shrink-0", status.status === "connected" && "animate-pulse")}
                            style={{ background: tone.dot }}
                        />
                        <span className="text-[12px] font-semibold truncate" style={{ color: "#0B1220" }}>
                            {status.connectionLabel}
                        </span>
                    </div>
                    {status.displayPhone && status.status === "connected" && (
                        <p className="text-[11px] tabular-nums mt-0.5" style={{ color: "#475569" }}>
                            {status.displayPhone}
                        </p>
                    )}
                    <p className="text-[10.5px] mt-0.5 leading-snug" style={{ color: "#64748B" }}>
                        {subtitle}
                    </p>
                    {showCta && onConnectClick && (
                        <button
                            type="button"
                            onClick={onConnectClick}
                            className="inline-flex items-center h-7 px-2.5 mt-2 rounded-md text-[11px] font-semibold text-white transition-all hover:brightness-110"
                            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                        >
                            {ctaLabel}
                        </button>
                    )}
                    {showSync && (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={onSyncHistory}
                                disabled={historySyncing}
                                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ background: "rgba(37,99,235,0.08)", color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.20)" }}
                            >
                                {historySyncing ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Sincronizando histórico…
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3 w-3" />
                                        Sincronizar histórico
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] mt-1.5 leading-snug" style={{ color: "#94A3B8" }}>
                                A Inbox usa histórico salvo. Sincronize para importar conversas recentes do WhatsApp.
                            </p>
                        </div>
                    )}
                    {adminScopeLabel && (
                        <p className="text-[10px] mt-1.5" style={{ color: "#94A3B8" }}>
                            {adminScopeLabel}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── LeadCard ────────────────────────────────────────────────────────────

interface LeadCardProps {
    chat: Chat;
    isSelected: boolean;
    onSelect: () => void;
}

function LeadCard({ chat, isSelected, onSelect }: LeadCardProps) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    "w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors",
                    isSelected ? "bg-[#EEF4FF]" : "hover:bg-[#F4F7FB]"
                )}
                style={
                    isSelected
                        ? {
                              boxShadow: "inset 2px 0 0 #2563EB",
                          }
                        : undefined
                }
            >
                <Avatar className="h-10 w-10 shrink-0 rounded-full">
                    {chat.profilePicUrl && (
                        <AvatarImage src={chat.profilePicUrl} alt={chat.name} className="rounded-full" />
                    )}
                    <AvatarFallback
                        className="text-[12px] font-semibold rounded-full text-white"
                        style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                    >
                        {getInitials(chat.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Linha 1: nome + tempo */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                            className="text-[13px] font-semibold truncate"
                            style={{ color: "#0B1220" }}
                        >
                            {chat.name || chat.phone || "Sem nome"}
                        </span>
                        <span
                            className="text-[10.5px] tabular-nums shrink-0"
                            style={{ color: "#94A3B8" }}
                        >
                            {chat.lastMessage?.time ? formatTimeAgo(chat.lastMessage.time) : ""}
                        </span>
                    </div>

                    {/* V1.0.1 — Linha 2: snippet + badge WhatsApp + unread */}
                    <div className="flex items-end justify-between gap-2">
                        <p
                            className="text-[11.5px] leading-snug truncate flex-1"
                            style={{ color: "#64748B" }}
                        >
                            {chat.lastMessage?.isMe ? "Você: " : ""}
                            {chat.lastMessage?.text || (
                                <span style={{ color: "#94A3B8", fontStyle: "italic" }}>
                                    sem mensagens ainda
                                </span>
                            )}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span
                                className="inline-flex items-center text-[10px]"
                                style={{ color: "#94A3B8" }}
                            >
                                <span
                                    className="h-1.5 w-1.5 rounded-full mr-1"
                                    style={{ background: "#10B981" }}
                                />
                                WhatsApp
                            </span>
                            {chat.unreadCount > 0 && (
                                <span
                                    className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] text-white tabular-nums leading-none"
                                    style={{
                                        background: "#2563EB",
                                        fontWeight: 700,
                                    }}
                                >
                                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                </span>
                            )}
                        </div>
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
