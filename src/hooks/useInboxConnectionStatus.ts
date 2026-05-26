// ─────────────────────────────────────────────────────────────────────────────
// F4W.7.1 (2026-05-26) — useInboxConnectionStatus
//
// Deriva o estado da conexão WhatsApp pra exibir na Inbox, SEM mudar a
// arquitetura DB-first. Hook PURO: combina a connection row (channel_connections,
// resolvida e exposta por useChannelInbox) com o status AO VIVO da Evolution
// (useEvolutionSender) + presença de histórico salvo.
//
// Não chama edge function. Não faz query. Não toca em envio. Só deriva.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";

export type ConnectionStatusValue = "connected" | "disconnected" | "pending" | "unknown";
export type ConnectionProvider = "evolution" | "meta_cloud" | "unknown";

/** Shape mínimo da channel_connections (compatível com useChannelInbox). */
export interface InboxConnectionRow {
    id: string;
    provider: string;
    channel_type: string;
    external_id: string;
    status: string;
    last_seen_at: string | null;
    metadata?: Record<string, unknown> | null;
}

export interface InboxConnectionStatus {
    status: ConnectionStatusValue;
    provider: ConnectionProvider;
    displayPhone: string | null;
    lastUpdatedAt: Date | null;
    connectionLabel: string;
    isHistoryOnly: boolean;
    canConnect: boolean;
    canReconnect: boolean;
    connectionId: string | null;
}

interface UseInboxConnectionStatusArgs {
    /** Connection row resolvida pelo useChannelInbox (null = nenhuma). */
    connection: InboxConnectionRow | null;
    /** channelInbox.error (ex: no_connection_for_company / multiple_…). */
    connectionError: string | null;
    /** Status AO VIVO da Evolution (useEvolutionSender.connected). */
    liveConnected: boolean;
    /** Quando o status ao vivo foi verificado (null = ainda incerto). */
    lastStatusCheckedAt: Date | null;
    /** Há conversas salvas no banco? (histórico) */
    hasMessages: boolean;
    /** Última carga de chats do banco (pra "atualizado há X"). */
    lastChatsLoadedAt: Date | null;
}

function normalizeProvider(p?: string | null): ConnectionProvider {
    const v = (p || "").toLowerCase();
    if (v === "evolution") return "evolution";
    if (v === "meta_cloud" || v === "meta" || v === "cloud" || v === "whatsapp_cloud") return "meta_cloud";
    return "unknown";
}

function normalizeDbStatus(s?: string | null): ConnectionStatusValue {
    const v = (s || "").toLowerCase();
    if (["active", "connected", "open", "online"].includes(v)) return "connected";
    if (["pending", "qr", "qrcode", "pairing", "connecting"].includes(v)) return "pending";
    if (["disconnected", "closed", "inactive", "offline"].includes(v)) return "disconnected";
    return "unknown";
}

function asPhone(raw: unknown): string | null {
    if (typeof raw !== "string" && typeof raw !== "number") return null;
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length < 10) return null;
    return `+${digits}`;
}

function pickPhone(meta?: Record<string, unknown> | null): string | null {
    if (!meta) return null;
    for (const k of ["phone", "number", "phone_number", "wa_number", "msisdn", "owner_jid", "owner"]) {
        const p = asPhone(meta[k]);
        if (p) return p;
    }
    return null;
}

export function useInboxConnectionStatus(
    args: UseInboxConnectionStatusArgs,
): InboxConnectionStatus {
    const {
        connection,
        connectionError,
        liveConnected,
        lastStatusCheckedAt,
        hasMessages,
        lastChatsLoadedAt,
    } = args;

    return useMemo(() => {
        const provider = connection ? normalizeProvider(connection.provider) : "unknown";
        const connectionId = connection?.id ?? null;
        const dbStatus = connection ? normalizeDbStatus(connection.status) : "disconnected";

        let status: ConnectionStatusValue;
        if (liveConnected) {
            // Check AO VIVO da Evolution é autoritativo: instância aberta = conectado,
            // mesmo que a connection row ainda não tenha sido (re)resolvida no banco
            // (ex.: logo após conectar via QR pela primeira vez).
            status = "connected";
        } else if (!connection) {
            // Sem conexão resolvida. "multiple_…" é ambíguo → unknown; senão disconnected.
            status = connectionError === "multiple_connections_no_user_match" ? "unknown" : "disconnected";
        } else if (dbStatus === "pending") {
            status = "pending";
        } else if (lastStatusCheckedAt) {
            // Conexão existe no banco, mas o check ao vivo confirmou que NÃO está aberta.
            status = dbStatus === "unknown" ? "unknown" : "disconnected";
        } else {
            // Sem check ao vivo conclusivo ainda: confia no que o banco diz.
            status = dbStatus;
        }

        const hasConnection = !!connection;
        const isHistoryOnly = status !== "connected" && hasMessages;
        const actionable = status === "disconnected" || status === "unknown";
        const canConnect = actionable && !hasConnection;
        const canReconnect = actionable && hasConnection;

        const providerLabel = provider === "meta_cloud" ? "WhatsApp (Meta Cloud)" : "WhatsApp";
        const connectionLabel =
            status === "connected"
                ? `${providerLabel} conectado`
                : status === "pending"
                ? "Aguardando conexão"
                : status === "unknown"
                ? "Status do WhatsApp indisponível"
                : "WhatsApp desconectado";

        const lastUpdatedAt =
            lastChatsLoadedAt ??
            (connection?.last_seen_at ? new Date(connection.last_seen_at) : null) ??
            lastStatusCheckedAt;

        return {
            status,
            provider,
            displayPhone: pickPhone(connection?.metadata),
            lastUpdatedAt,
            connectionLabel,
            isHistoryOnly,
            canConnect,
            canReconnect,
            connectionId,
        };
    }, [connection, connectionError, liveConnected, lastStatusCheckedAt, hasMessages, lastChatsLoadedAt]);
}
