// F4W.7.1 — Card de status da conexão WhatsApp, no topo da lista do Inbox
// (headerSlot do InboxPriorityList).
import { useState } from "react";
import { WifiOff, QrCode, AlertCircle, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoSession } from "@/lib/analytics";
import type { InboxConnectionStatus } from "@/hooks/useInboxConnectionStatus";

/** Sem mensagem de cliente há mais que isso, a régua avisa: sessão caída costuma aparecer assim. */
const INBOUND_STALE_HOURS = 48;

function timeAgo(date: Date): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "ontem" : `há ${days} dias`;
}

export interface ConnectionStatusCardProps {
    status: InboxConnectionStatus;
    onConnectClick?: () => void;
    /** API oficial via Kapso (beta, só super_admin por enquanto). */
    onOfficialConnectClick?: () => void;
    /** Refaz o check ao vivo quando ele falhou. */
    onRetryCheck?: () => void;
    onSyncHistory?: () => void;
    historySyncing?: boolean;
    adminScopeLabel?: string;
    onResyncWebhook?: () => void;
    onDisconnect?: () => void;
    resyncing?: boolean;
    disconnecting?: boolean;
}

const SMALL_BTN =
    "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]";
const BTN_SOLID = `${SMALL_BTN} bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:opacity-90`;
const BTN_OUTLINE = `${SMALL_BTN} border border-[var(--vyz-border-strong)] text-[var(--vyz-text-strong)] hover:bg-[var(--vyz-surface-2)]`;

export function ConnectionStatusCard({
    status,
    onConnectClick,
    onOfficialConnectClick,
    onRetryCheck,
    onSyncHistory,
    historySyncing,
    adminScopeLabel,
    onResyncWebhook,
    onDisconnect,
    resyncing,
    disconnecting,
}: ConnectionStatusCardProps) {
    // Antes de qualquer return: hook depois de return condicional quebra o React
    // quando o status muda na mesma sessão.
    const [expanded, setExpanded] = useState(false);

    // Na demo embutida da landing a conta nunca tem Evolution viva: o card de
    // conexão viraria "produto quebrado" pro visitante.
    if (isDemoSession() && status.status !== "connected") return null;

    const showSync = status.status === "connected" && status.provider === "evolution" && !!onSyncHistory;
    const hasManageActions = showSync || !!onResyncWebhook || !!onDisconnect;
    const inbound = status.lastInboundAt;
    const inboundStale = !!inbound && Date.now() - inbound.getTime() > INBOUND_STALE_HOURS * 3_600_000;

    if (status.status === "checking") {
        return (
            <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-2)] px-3 py-2" role="status">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--vyz-text-muted)] motion-reduce:animate-none" aria-hidden />
                <span className="text-[12px] font-medium text-[var(--vyz-text-strong)]">{status.connectionLabel}</span>
            </div>
        );
    }

    // Conexão saudável não merece um card permanente: régua fina com o número e
    // a última mensagem recebida; as ações de gestão abrem sob demanda.
    if (status.status === "connected") {
        return (
            <div className="mb-2 overflow-hidden rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
                <button
                    type="button"
                    onClick={() => hasManageActions && setExpanded((v) => !v)}
                    aria-expanded={hasManageActions ? expanded : undefined}
                    className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--vyz-accent)]",
                        hasManageActions && "cursor-pointer hover:bg-[var(--vyz-surface-2)]",
                    )}
                >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--vyz-success)]" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[12px] font-semibold text-[var(--vyz-text-primary)]">
                            {status.connectionLabel}
                        </span>
                        <span
                            className={cn(
                                "text-[10.5px] leading-snug",
                                inboundStale ? "font-medium text-[var(--vyz-warning)]" : "text-[var(--vyz-text-muted)]",
                            )}
                        >
                            {inbound
                                ? inboundStale
                                    ? `Nenhuma mensagem de cliente ${timeAgo(inbound)}. Se estranhar, reconecte.`
                                    : `Última mensagem de cliente ${timeAgo(inbound)}`
                                : "Nenhuma mensagem de cliente ainda"}
                        </span>
                    </span>
                    {hasManageActions && (
                        <ChevronDown
                            className={cn(
                                "h-3.5 w-3.5 shrink-0 text-[var(--vyz-text-soft)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                                expanded && "rotate-180",
                            )}
                            aria-hidden
                        />
                    )}
                </button>

                {expanded && hasManageActions && (
                    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 pt-0.5">
                        {status.displayPhone && (
                            <p className="mb-1 w-full text-[10.5px] tabular-nums text-[var(--vyz-text-muted)]">
                                Número conectado: {status.displayPhone}
                            </p>
                        )}
                        {showSync && (
                            <button type="button" onClick={onSyncHistory} disabled={historySyncing} className={BTN_OUTLINE}>
                                {historySyncing ? (
                                    <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
                                ) : (
                                    <RefreshCw className="h-3 w-3" aria-hidden />
                                )}
                                {historySyncing ? "Puxando conversas…" : "Puxar conversas recentes"}
                            </button>
                        )}
                        {onResyncWebhook && (
                            <button
                                type="button"
                                onClick={onResyncWebhook}
                                disabled={resyncing}
                                title="Religa os avisos de entregue e lido sem precisar reconectar"
                                className={BTN_OUTLINE}
                            >
                                {resyncing ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden /> : <RefreshCw className="h-3 w-3" aria-hidden />}
                                Religar confirmação de leitura
                            </button>
                        )}
                        {onDisconnect && (
                            <button
                                type="button"
                                onClick={onDisconnect}
                                disabled={disconnecting}
                                className={`${SMALL_BTN} text-[var(--vyz-danger)] hover:bg-[var(--vyz-danger-bg)]`}
                            >
                                {disconnecting ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden /> : <WifiOff className="h-3 w-3" aria-hidden />}
                                Desconectar
                            </button>
                        )}
                        {adminScopeLabel && (
                            <p className="mt-1 w-full text-[10px] text-[var(--vyz-text-soft)]">{adminScopeLabel}</p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const isPending = status.status === "pending";
    const Icon = isPending ? QrCode : status.status === "unknown" ? AlertCircle : WifiOff;
    const subtitle = isPending
        ? "Leia o QR Code para conectar."
        : status.status === "unknown"
        ? "A verificação não respondeu agora."
        : status.isHistoryOnly
        ? "Você está vendo só o histórico salvo. Mensagens novas não chegam até reconectar."
        : "Conecte o WhatsApp da empresa para as conversas aparecerem aqui.";
    const showCta = status.canConnect || status.canReconnect;

    return (
        <div
            className={cn(
                "mb-2 rounded-[10px] border px-3 py-2.5",
                isPending
                    ? "border-[color-mix(in_srgb,var(--vyz-warning)_30%,transparent)] bg-[var(--vyz-warning-bg)]"
                    : "border-[var(--vyz-border)] bg-[var(--vyz-surface-2)]",
            )}
            role="status"
        >
            <div className="flex items-start gap-2">
                <Icon
                    className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isPending ? "text-[var(--vyz-warning)]" : "text-[var(--vyz-text-muted)]")}
                    aria-hidden
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[var(--vyz-text-primary)]">{status.connectionLabel}</p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-[var(--vyz-text-muted)]">{subtitle}</p>
                    {(showCta || (status.status === "unknown" && onRetryCheck)) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {status.status === "unknown" && onRetryCheck && (
                                <button type="button" onClick={onRetryCheck} className={BTN_OUTLINE}>
                                    Verificar de novo
                                </button>
                            )}
                            {showCta && onConnectClick && (
                                <button type="button" onClick={onConnectClick} className={BTN_SOLID}>
                                    {status.canReconnect ? "Reconectar" : "Conectar WhatsApp"}
                                </button>
                            )}
                            {showCta && onOfficialConnectClick && (
                                <button type="button" onClick={onOfficialConnectClick} className={BTN_OUTLINE}>
                                    API oficial (beta)
                                </button>
                            )}
                        </div>
                    )}
                    {adminScopeLabel && (
                        <p className="mt-1.5 text-[10px] text-[var(--vyz-text-soft)]">{adminScopeLabel}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
