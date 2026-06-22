import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { InboxList, type SyncStatus, type SyncTone } from "@/components/inbox/InboxList";
import { InboxConversation } from "@/components/inbox/InboxConversation";
import { EvaPanel } from "@/components/inbox/EvaPanel";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useEvolutionSender } from "@/hooks/useEvolutionSender";
import { useWhatsAppInboxDb } from "@/hooks/useWhatsAppInboxDb";
import { useChannelInbox } from "@/hooks/useChannelInbox";
import { useInboxConnectionStatus } from "@/hooks/useInboxConnectionStatus";
import { useProspectingMode, PROSPECTING_OBJECTIVE } from "@/hooks/useProspectingMode";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Inbox Comercial — F4W.4 (2026-05-20)
//
// Source primária: useChannelInbox (channel_connections/conversations/messages)
// Fallback: useWhatsAppInboxDb (whatsapp_messages legado)
//
// Decisão da source:
//   - channel é "ready" quando chatsLoadedOnce && !error
//   - se channel readyou está OK ou ainda carregando, usa channel
//   - se channel error OR (channel vazio E legacy tem dados) → legacy
//
// Envio continua via useEvolutionSender. selectedChat.chatJid carrega o
// external_contact_id no channel ou o chat_jid no legacy, então o callback
// não muda.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FRESH_WINDOW_MS = 5 * 60 * 1000;

// Traduz o erro cru do envio (vindo da edge evolution-whatsapp) numa mensagem
// clara pro usuário. Mantém uma pista da causa real pra diagnóstico.
function describeSendError(raw: string): string {
    const m = (raw || "").toLowerCase();
    if (m.includes("rate_limited") || m.includes("sequência") || m.includes("muitas mensagens"))
        return "Muitas mensagens em sequência neste número. Aguarde alguns segundos e tente de novo.";
    if (m.includes("tempo esgotado") || m.includes("timeout"))
        return "O WhatsApp demorou a responder. Verifique a conexão do número e tente de novo.";
    if (m.includes("not configured") || m.includes("não configurad") || m.includes("evolution_api"))
        return "O WhatsApp não está configurado no servidor. Fale com o suporte.";
    if (m.includes("not found") || m.includes("does not exist") || m.includes("404") || m.includes("instance"))
        return "A sessão do WhatsApp não foi encontrada. Reconecte o número em Configurações e tente de novo.";
    if (m.includes("not connected") || m.includes("closed") || m.includes("connecting") || m.includes("disconnected") || m.includes("state"))
        return "O WhatsApp não está conectado. Reconecte o número em Configurações e tente de novo.";
    if (m.includes("no company"))
        return "Não consegui identificar a sua conta. Recarregue a página e tente de novo.";
    return raw ? `Não consegui enviar a mensagem: ${raw}` : "Não consegui enviar a mensagem. Verifique a conexão do WhatsApp.";
}

function formatTimeAgo(date: Date | null): string {
    if (!date) return "";
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return "agora";
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 15) return "agora";
    if (seconds < 60) return `há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
}

const Inbox = () => {
    const { isAdmin, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const [connectModalOpen, setConnectModalOpen] = useState(false);
    const [evaMobileOpen, setEvaMobileOpen] = useState(false);
    // Texto que a EVA mandou pro composer ("Usar resposta"). InboxConversation
    // consome e zera. Permite o humano revisar antes de enviar (assistido).
    const [composerInject, setComposerInject] = useState<string | null>(null);
    const [historySyncing, setHistorySyncing] = useState(false);
    // PROSPECT.1 — quando o número está em modo prospecção, o EvaPanel ganha
    // "aprovar-e-enviar" e a EVA mira em marcar demo.
    const prospectingMode = useProspectingMode();

    // ── Sources: channel (primário) + legacy (fallback DEFERRED) ──────────
    const channelInbox = useChannelInbox();

    // F4W.4.1 — Legacy só monta de verdade quando o channel sinaliza erro
    // ou retorna vazio. Antes disso, fica inerte (enabled=false) → zero
    // queries / zero realtime / zero GC.
    const [legacyEnabled, setLegacyEnabled] = useState(false);
    const legacyInbox = useWhatsAppInboxDb({ enabled: legacyEnabled });

    useEffect(() => {
        if (legacyEnabled) return; // já ativado, não reverter
        // Só decidimos depois do primeiro tentativa do channel
        if (!channelInbox.chatsLoadedOnce && !channelInbox.error) return;
        if (channelInbox.error) {
            setLegacyEnabled(true);
            return;
        }
        // Channel rodou sem erro mas veio vazio → liga o legacy pra confirmar
        if (channelInbox.isEmpty) {
            setLegacyEnabled(true);
        }
    }, [channelInbox.chatsLoadedOnce, channelInbox.error, channelInbox.isEmpty, legacyEnabled]);

    const {
        connected,
        lastStatusCheckedAt,
        sendMessage,
        sendAudioMessage,
        sendMediaMessage,
        getAudioMedia,
        refreshStatus,
        disconnect,
        resyncWebhook,
    } = useEvolutionSender();
    const [resyncing, setResyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    // INBOX.STATUS — re-aplica o webhook (liga os checks de entrega/leitura sem reconectar).
    const handleResyncWebhook = async () => {
        if (resyncing) return;
        setResyncing(true);
        try {
            await resyncWebhook();
            toast.success("Webhook re-sincronizado. Os checks de entrega/leitura já valem nas próximas mensagens.");
        } catch {
            toast.error("Não foi possível re-sincronizar o webhook agora.");
        } finally {
            setResyncing(false);
        }
    };

    // INBOX.STATUS — desconecta o número (logout). Pede confirmação.
    const handleDisconnect = async () => {
        if (disconnecting) return;
        if (!confirm("Desconectar o WhatsApp? Você precisará ler o QR Code de novo pra reconectar.")) return;
        setDisconnecting(true);
        try {
            await disconnect();
            toast.success("WhatsApp desconectado.");
        } catch {
            toast.error("Não foi possível desconectar agora.");
        } finally {
            setDisconnecting(false);
        }
    };

    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [, setTick] = useState(0);
    const isMobile = useIsMobile();

    // F5C.2 — deep link `?conversationId=<uuid>` vindo da Central de Comando.
    // Aplica uma única vez por valor de param + uma vez por load do active
    // inbox: quando o id bater com algum chat da lista atual, seleciona.
    // Se não bater, mantém estado default (sem quebrar).
    const [searchParams, setSearchParams] = useSearchParams();
    const deepLinkConvId = searchParams.get("conversationId");
    const [appliedDeepLinkFor, setAppliedDeepLinkFor] = useState<string | null>(null);

    // ── Decide source ativa ───────────────────────────────────────────────
    // Channel "fica" como primária a partir do momento que ele responde com
    // dados — depois disso não troca pra legacy mesmo se houver flicker.
    // Só vai pra legacy se channel deu erro fatal OU veio vazio E legacy
    // tem dados.
    const useLegacy = useMemo(() => {
        if (!channelInbox.chatsLoadedOnce && !channelInbox.error) return false;
        if (channelInbox.error) return legacyEnabled && legacyInbox.chatsLoadedOnce;
        if (channelInbox.isEmpty && legacyEnabled && legacyInbox.chats.length > 0) return true;
        return false;
    }, [
        channelInbox.chatsLoadedOnce,
        channelInbox.error,
        channelInbox.isEmpty,
        legacyEnabled,
        legacyInbox.chatsLoadedOnce,
        legacyInbox.chats.length,
    ]);

    const activeInbox = useLegacy ? legacyInbox : channelInbox;
    const activeSourceLabel = useLegacy ? "legacy-fallback" : "channel";

    useEffect(() => {
        if (import.meta.env.DEV) {
            console.log(
                `[Inbox] active_source=${activeSourceLabel} ` +
                `channel_chats=${channelInbox.chats.length} ` +
                `legacy_chats=${legacyInbox.chats.length} ` +
                `channel_error=${channelInbox.error || "none"}`,
            );
        }
    }, [activeSourceLabel, channelInbox.chats.length, channelInbox.error, legacyInbox.chats.length]);

    const chats = activeInbox.chats;
    const selectedChatMessages = activeInbox.selectedChatMessages;
    const isLoadingChats = activeInbox.isLoadingChats;
    const isLoadingMessages = activeInbox.isLoadingMessages;

    const selectedChat = chats.find((c) => c.id === selectedChatId);

    // F4W.7.1 — estado da conexão WhatsApp (connection row + status ao vivo).
    const connectionStatus = useInboxConnectionStatus({
        connection: channelInbox.connection,
        connectionError: channelInbox.error,
        liveConnected: connected,
        lastStatusCheckedAt,
        hasMessages: chats.length > 0,
        lastChatsLoadedAt: activeInbox.lastChatsLoadedAt,
    });

    // F5C.2 — Aplica deep link `?conversationId=` quando chats carregam
    useEffect(() => {
        if (!deepLinkConvId) return;
        if (appliedDeepLinkFor === deepLinkConvId) return;
        // Espera chats reais (não aplica em vazio nem antes do primeiro fetch)
        if (!activeInbox.chatsLoadedOnce || chats.length === 0) return;
        const found = chats.find((c) => c.id === deepLinkConvId);
        if (found) {
            setSelectedChatId(found.id);
        }
        setAppliedDeepLinkFor(deepLinkConvId);
        // Limpa o param da URL — evita reaplicar se o user trocar de chat
        const sp = new URLSearchParams(searchParams);
        sp.delete("conversationId");
        setSearchParams(sp, { replace: true });
    }, [
        deepLinkConvId,
        appliedDeepLinkFor,
        activeInbox.chatsLoadedOnce,
        chats,
        searchParams,
        setSearchParams,
    ]);

    // FIO 1 — deep link `?connect=1` (vindo do fim do onboarding) abre direto
    // o modal de conexão do WhatsApp. Limpa o param pra não reabrir ao navegar.
    useEffect(() => {
        if (searchParams.get("connect") !== "1") return;
        setConnectModalOpen(true);
        const sp = new URLSearchParams(searchParams);
        sp.delete("connect");
        setSearchParams(sp, { replace: true });
    }, [searchParams, setSearchParams]);

    // F4W.4.3 — Sincroniza o ref do hook ANTES de qualquer fetch.
    // Garante que Realtime sempre veja o id correto, sem race condition.
    useEffect(() => {
        activeInbox.setSelectedConversationId(selectedChatId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChatId, useLegacy]);

    // Trocar de chat → fetchMessages + (se channel) zera unread_count
    useEffect(() => {
        if (!selectedChatId) return;
        void activeInbox.fetchMessages(selectedChatId);
        if (!useLegacy) {
            void channelInbox.markConversationAsRead(selectedChatId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChatId, useLegacy]);

    // F4W.4.3 — Quando a source troca (channel → legacy), o id selecionado
    // de uma source não existe na outra. Limpa pra evitar UI vazia ou
    // mistura. Usa ref pra detectar transição sem disparar no mount.
    const prevUseLegacyRef = useRef<boolean | null>(null);
    useEffect(() => {
        if (prevUseLegacyRef.current !== null && prevUseLegacyRef.current !== useLegacy) {
            setSelectedChatId(null);
        }
        prevUseLegacyRef.current = useLegacy;
    }, [useLegacy]);

    // Tick 60s pra labels relativas
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 60_000);
        return () => clearInterval(interval);
    }, []);

    // Resync de fallback (rede de segurança): a cada 20s, com a aba visível,
    // refaz a carga do Inbox a partir do banco. O Inbox só tinha carga inicial
    // + Realtime, sem fallback — se o Realtime perde um evento (ou o webhook
    // grava sem notificar), a mensagem só aparecia no refresh manual. O Pulse
    // já tinha um resync; o Inbox não. Lê do Supabase (barato), NÃO martela o
    // Evolution. Refs evitam recriar o timer a cada troca de chat/source.
    const resyncRef = useRef<{
        refreshAll: (conversationId?: string | null) => Promise<void>;
        selectedChatId: string | null;
    }>({ refreshAll: activeInbox.refreshAll, selectedChatId });
    resyncRef.current = { refreshAll: activeInbox.refreshAll, selectedChatId };
    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.hidden) return;
            void resyncRef.current.refreshAll(resyncRef.current.selectedChatId);
        }, 20_000);
        return () => clearInterval(interval);
    }, []);

    // Mobile
    const showListOnMobile = isMobile && !selectedChatId;
    const showDetailOnMobile = isMobile && selectedChatId;

    // ── Estado compound de sincronização ──────────────────────────────────
    const syncStatus = useMemo<SyncStatus>(() => {
        const dbHasData = chats.length > 0;
        const statusIsFresh =
            !!lastStatusCheckedAt &&
            Date.now() - lastStatusCheckedAt.getTime() < STATUS_FRESH_WINDOW_MS;
        const lastLoadedLabel = formatTimeAgo(activeInbox.lastChatsLoadedAt);

        let tone: SyncTone;
        let badge: string;
        let detail: string | undefined;

        if (lastStatusCheckedAt === null) {
            tone = dbHasData ? "offline-with-history" : "unknown";
            badge = dbHasData ? "Histórico salvo" : "Verificando…";
            detail = dbHasData ? `Histórico atualizado ${lastLoadedLabel}` : undefined;
        } else if (connected && statusIsFresh) {
            tone = "live";
            badge = "Live";
            detail = `Atualizado ${lastLoadedLabel}`;
        } else if (connected && !statusIsFresh) {
            tone = "stale";
            badge = "Status não verificado";
            detail = `Atualizado ${lastLoadedLabel} · clique em atualizar`;
        } else if (!connected && dbHasData) {
            tone = "offline-with-history";
            badge = "Histórico salvo";
            detail = `WhatsApp desconectado · exibindo histórico (${lastLoadedLabel})`;
        } else {
            tone = "offline";
            badge = "WhatsApp desconectado";
            detail = undefined;
        }

        return { tone, badge, detail };
    }, [chats.length, connected, lastStatusCheckedAt, activeInbox.lastChatsLoadedAt]);

    // ── Refresh manual ────────────────────────────────────────────────────
    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await Promise.all([
                activeInbox.refreshAll(selectedChatId),
                refreshStatus(),
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    // F4W.7.3 — import sob demanda do histórico recente (Evolution → channel_*)
    const handleSyncHistory = async () => {
        if (historySyncing) return;
        setHistorySyncing(true);
        try {
            const { data, error } = await supabase.functions.invoke("evolution-whatsapp", {
                body: { action: "import_history", companyId: activeCompanyId || companyId },
            });
            if (error) throw error;
            const r = data as { importedChats?: number; importedMessages?: number } | null;
            const chatsN = r?.importedChats ?? 0;
            const msgsN = r?.importedMessages ?? 0;
            toast.success(
                `Histórico atualizado: ${chatsN} ${chatsN === 1 ? "conversa" : "conversas"}, ` +
                `${msgsN} ${msgsN === 1 ? "mensagem" : "mensagens"}`,
            );
            await handleRefresh();
        } catch {
            toast.error("Não foi possível sincronizar agora. Tente de novo em instantes.");
        } finally {
            setHistorySyncing(false);
        }
    };

    // ── Envio: precisa do chatJid (não do conversationId) pro Evolution ──
    // Em legacy chat.chatJid === chat.id. Em channel chat.chatJid é o
    // external_contact_id (JID do WhatsApp). Sender usa esse pra falar com a
    // Evolution.
    const handleSendText = async (chatIdFromCallback: string, text: string) => {
        const target = chats.find((c) => c.id === chatIdFromCallback) || selectedChat;
        const jid = target?.chatJid;
        if (!jid) {
            console.warn("[Inbox] handleSendText: missing chatJid for", chatIdFromCallback);
            toast.error("Não consegui identificar o contato desta conversa. Atualize a página e tente de novo.");
            throw new Error("missing_chatjid");
        }
        // Pending no active inbox (key é o id da seleção, não o JID)
        activeInbox.appendPendingMessage(target!.id, text);
        try {
            await sendMessage(jid, text);
            // F4W.4.3 — fetch imediato + segundo fetch atrasado pra cobrir
            // webhook lento (Evolution insere em whatsapp_messages +
            // dual-write em channel_messages com latência típica 1-3s).
            void activeInbox.fetchMessages(target!.id);
            window.setTimeout(() => {
                if (target?.id) void activeInbox.fetchMessages(target.id);
            }, 1500);
        } catch (err) {
            // Antes a falha era 100% silenciosa: a mensagem sumia e o usuário não
            // sabia que não enviou. Agora mostramos a causa real (ajuda a diagnosticar
            // sessão morta / não conectado / rate limit / instância inexistente).
            const raw = err instanceof Error ? err.message : "";
            const friendly = describeSendError(raw);
            // Persistente + causa técnica crua na descrição: o envio falha por algo
            // do servidor Evolution (auth/sessão); o usuário precisa CONSEGUIR LER o
            // motivo (some rápido demais antes). Fica até ser dispensado.
            toast.error(friendly, {
                duration: Infinity,
                description: raw && raw !== friendly ? `Detalhe técnico: ${raw}` : undefined,
            });
            void activeInbox.fetchMessages(target!.id);
            throw err;
        }
    };

    const handleSendAudio = async (chatIdFromCallback: string, base64: string) => {
        const target = chats.find((c) => c.id === chatIdFromCallback) || selectedChat;
        const jid = target?.chatJid;
        if (!jid) {
            console.warn("[Inbox] handleSendAudio: missing chatJid for", chatIdFromCallback);
            return;
        }
        await sendAudioMessage(jid, base64);
        void activeInbox.fetchMessages(target!.id);
        // F4W.4.3 — também atrasado pra áudio (webhook costuma ser ainda mais lento)
        window.setTimeout(() => {
            if (target?.id) void activeInbox.fetchMessages(target.id);
        }, 2000);
    };

    // INBOX.MEDIA — envio de imagem/vídeo/documento. Mesmo padrão do áudio:
    // envia via Evolution e refaz fetch (imediato + atrasado) pra trazer a row
    // persistida com a mídia. base64 é puro (sem prefixo data:), preparado no composer.
    const handleSendMedia = async (
        chatIdFromCallback: string,
        base64: string,
        mimetype: string,
        opts?: { caption?: string; fileName?: string },
        progress?: { onProgress?: (pct: number) => void; signal?: AbortSignal },
    ) => {
        const target = chats.find((c) => c.id === chatIdFromCallback) || selectedChat;
        const jid = target?.chatJid;
        if (!jid) {
            console.warn("[Inbox] handleSendMedia: missing chatJid for", chatIdFromCallback);
            return;
        }
        await sendMediaMessage(jid, base64, mimetype, opts, progress);
        void activeInbox.fetchMessages(target!.id);
        window.setTimeout(() => {
            if (target?.id) void activeInbox.fetchMessages(target.id);
        }, 2000);
    };

    return (
        <div
            className="flex w-full overflow-hidden -mx-3 -my-3 sm:-mx-4 sm:-my-4 md:-mx-6 md:-my-6"
            style={{
                height: "calc(100vh - 3.5rem)",
                background: "#F6F4EF",
            }}
        >
            {/* Coluna esquerda — lista */}
            <aside
                className={
                    isMobile
                        ? showListOnMobile
                            ? "w-full flex flex-col"
                            : "hidden"
                        : "w-[340px] xl:w-[380px] shrink-0 flex flex-col border-r border-[#D9E2EC] bg-white"
                }
            >
                <InboxList
                    chats={chats}
                    selectedChatId={selectedChatId}
                    onSelect={setSelectedChatId}
                    isLoading={isLoadingChats}
                    connected={connected}
                    syncStatus={syncStatus}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    connectionStatus={connectionStatus}
                    onConnectClick={() => setConnectModalOpen(true)}
                    onSyncHistory={handleSyncHistory}
                    historySyncing={historySyncing}
                    adminScopeLabel={isAdmin ? "Minhas conversas" : undefined}
                    onResyncWebhook={handleResyncWebhook}
                    resyncing={resyncing}
                    onDisconnect={handleDisconnect}
                    disconnecting={disconnecting}
                />
            </aside>

            {/* Coluna central — conversa */}
            <main
                className={
                    isMobile
                        ? showDetailOnMobile
                            ? "flex-1 flex flex-col bg-white"
                            : "hidden"
                        : "flex-1 flex flex-col bg-white"
                }
            >
                <InboxConversation
                    chat={selectedChat || null}
                    messages={selectedChatMessages}
                    onSendText={handleSendText}
                    onSendAudio={handleSendAudio}
                    onSendMedia={handleSendMedia}
                    getAudioMedia={getAudioMedia}
                    isLoading={isLoadingMessages}
                    onBack={isMobile ? () => setSelectedChatId(null) : undefined}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    connected={connected}
                    statusChecked={lastStatusCheckedAt != null}
                    onReconnect={() => setConnectModalOpen(true)}
                    onOpenEva={isMobile ? () => setEvaMobileOpen(true) : undefined}
                    injectText={composerInject}
                    onInjectConsumed={() => setComposerInject(null)}
                    hasMoreMessages={!useLegacy ? channelInbox.messagesHasMore : false}
                    loadingOlder={!useLegacy ? channelInbox.loadingOlder : false}
                    onLoadOlder={!useLegacy ? channelInbox.loadOlderMessages : undefined}
                    typing={!useLegacy && !!selectedChat?.chatJid && channelInbox.typingJid === selectedChat.chatJid}
                />
            </main>

            {/* Coluna direita — EvaPanel (desktop) */}
            {!isMobile && (
                <aside
                    className="w-[340px] xl:w-[380px] shrink-0 flex flex-col bg-white"
                    style={{ borderLeft: "1px solid #D9E2EC" }}
                >
                    <EvaPanel
                        chat={selectedChat || null}
                        messages={selectedChatMessages}
                        onDealLinked={() => {
                            // V1.1 — vínculo só ocorre no modo channel; refetcha pra
                            // refletir o novo deal_id em chat.dealId.
                            if (!useLegacy && selectedChatId) {
                                void channelInbox.refreshAll(selectedChatId);
                            }
                        }}
                        onSendReply={prospectingMode && selectedChatId
                            ? (text) => handleSendText(selectedChatId, text)
                            : undefined}
                        objective={prospectingMode ? PROSPECTING_OBJECTIVE : undefined}
                        onUseReply={(t) => setComposerInject(t)}
                    />
                </aside>
            )}

            {/* EVA no MOBILE — bottom sheet com o painel completo (no desktop a EVA
                é a coluna direita). Mesmo EvaPanel, mesmos props. */}
            {isMobile && (
                <Drawer open={evaMobileOpen} onOpenChange={setEvaMobileOpen}>
                    <DrawerContent className="h-[88vh]">
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            <EvaPanel
                                chat={selectedChat || null}
                                messages={selectedChatMessages}
                                onDealLinked={() => {
                                    if (!useLegacy && selectedChatId) {
                                        void channelInbox.refreshAll(selectedChatId);
                                    }
                                }}
                                onSendReply={prospectingMode && selectedChatId
                                    ? (text) => handleSendText(selectedChatId, text)
                                    : undefined}
                                objective={prospectingMode ? PROSPECTING_OBJECTIVE : undefined}
                                onUseReply={(t) => { setComposerInject(t); setEvaMobileOpen(false); }}
                            />
                        </div>
                    </DrawerContent>
                </Drawer>
            )}

            {/* F4W.7.2 — QR Code direto na Inbox */}
            <WhatsAppConnectModal
                open={connectModalOpen}
                onClose={() => setConnectModalOpen(false)}
                onConnected={() => { void handleRefresh(); }}
            />
        </div>
    );
};

export default Inbox;
