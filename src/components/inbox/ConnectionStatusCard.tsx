// F4W.7.1 — Card de status da conexão WhatsApp.
// Extraído de InboxList.tsx (EVA.INBOX, 2026-06-25) pra ser reaproveitado como
// headerSlot do InboxPriorityList quando o Inbox passou a usar a lista
// priorizada pela EVA. InboxList continua importando daqui (sem duplicar).
import { useState } from "react";
import { Wifi, WifiOff, QrCode, AlertCircle, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxConnectionStatus } from "@/hooks/useInboxConnectionStatus";

function formatTimeAgo(timeStr: string): string {
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

export interface ConnectionStatusCardProps {
    status: InboxConnectionStatus;
    onConnectClick?: () => void;
    onSyncHistory?: () => void;
    historySyncing?: boolean;
    adminScopeLabel?: string;
    onResyncWebhook?: () => void;
    onDisconnect?: () => void;
    resyncing?: boolean;
    disconnecting?: boolean;
}

export function ConnectionStatusCard({
    status,
    onConnectClick,
    onSyncHistory,
    historySyncing,
    adminScopeLabel,
    onResyncWebhook,
    onDisconnect,
    resyncing,
    disconnecting,
}: ConnectionStatusCardProps) {
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

    // Conexão saudável não merece um card permanente ocupando o topo da lista:
    // colapsa numa régua fina (dot + número) e revela as ações de gestão
    // (sincronizar histórico, re-sincronizar webhook, desconectar) sob demanda.
    // Estados de problema (pending/unknown/disconnected) seguem no card cheio,
    // que carrega o CTA e a explicação — aí o espaço se justifica.
    const [expanded, setExpanded] = useState(false);
    const hasManageActions = showSync || !!onResyncWebhook || !!onDisconnect;

    if (status.status === "connected") {
        return (
            <div
                className="rounded-lg mb-2 overflow-hidden"
                style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
            >
                <button
                    type="button"
                    onClick={() => hasManageActions && setExpanded((v) => !v)}
                    aria-expanded={hasManageActions ? expanded : undefined}
                    className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                        hasManageActions && "hover:bg-[rgba(16,185,129,0.06)] cursor-pointer",
                    )}
                >
                    <span
                        className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                        style={{ background: tone.dot }}
                    />
                    <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                        <span className="text-[12px] font-semibold truncate" style={{ color: "#0B1220" }}>
                            {status.connectionLabel}
                        </span>
                        {status.displayPhone && (
                            <span className="text-[10.5px] tabular-nums truncate" style={{ color: "#64748B" }}>
                                {status.displayPhone}
                            </span>
                        )}
                    </span>
                    {hasManageActions && (
                        <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                            style={{
                                color: "#94A3B8",
                                transform: expanded ? "rotate(180deg)" : "none",
                                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                            }}
                        />
                    )}
                </button>

                {expanded && hasManageActions && (
                    <div className="px-3 pb-2.5 pt-0.5">
                        <p className="text-[10.5px] leading-snug mb-2" style={{ color: "#64748B" }}>
                            {subtitle}
                        </p>
                        {showSync && (
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
                        )}
                        {(onResyncWebhook || onDisconnect) && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {onResyncWebhook && (
                                    <button
                                        type="button"
                                        onClick={onResyncWebhook}
                                        disabled={resyncing}
                                        title="Re-aplica a configuração do webhook (ativa os checks de entrega/leitura sem reconectar)"
                                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ background: "rgba(37,99,235,0.06)", color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.18)" }}
                                    >
                                        {resyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                        Re-sincronizar webhook
                                    </button>
                                )}
                                {onDisconnect && (
                                    <button
                                        type="button"
                                        onClick={onDisconnect}
                                        disabled={disconnecting}
                                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ background: "rgba(244,63,94,0.06)", color: "#BE123C", border: "1px solid rgba(244,63,94,0.20)" }}
                                    >
                                        {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <WifiOff className="h-3 w-3" />}
                                        Desconectar
                                    </button>
                                )}
                            </div>
                        )}
                        {adminScopeLabel && (
                            <p className="text-[10px] mt-2" style={{ color: "#94A3B8" }}>
                                {adminScopeLabel}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }

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
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: tone.dot }}
                        />
                        <span className="text-[12px] font-semibold truncate" style={{ color: "#0B1220" }}>
                            {status.connectionLabel}
                        </span>
                    </div>
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
                    {/* Ações de gestão (sincronizar/resync/desconectar) vivem só no
                        estado conectado — tratado no early-return colapsável acima. */}
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
