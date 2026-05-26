// ─────────────────────────────────────────────────────────────────────────────
// F4W.7.2 (2026-05-26) — WhatsAppConnectModal
//
// Fluxo de conexão WhatsApp via QR Code, direto na Inbox. Real (não mock):
//   - action "connect" → cria/conecta instância Evolution, retorna qrCodeBase64
//   - poll action "status" a cada 3s → quando connected=true, fecha o ciclo
//   - QR renova a cada ~50s (expira ~60s no WhatsApp)
//
// Não muda a fonte de dados da Inbox (DB-first). Não envia mensagem. A única
// escrita é no provider (Evolution) ao criar/conectar a instância do usuário.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type ConnectState = "loading" | "qr" | "connected" | "error";

interface WhatsAppConnectModalProps {
    open: boolean;
    onClose: () => void;
    /** Chamado quando a conexão fica "open" — Inbox refetcha status + chats. */
    onConnected?: () => void;
}

const POLL_MS = 3_000;        // checa status a cada 3s enquanto mostra o QR
const QR_REFRESH_MS = 50_000; // QR expira ~60s; renova antes

export function WhatsAppConnectModal({ open, onClose, onConnected }: WhatsAppConnectModalProps) {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const [state, setState] = useState<ConnectState>("loading");
    const [qr, setQr] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const pollRef = useRef<number | null>(null);
    const qrRefreshRef = useRef<number | null>(null);
    const onConnectedRef = useRef(onConnected);
    onConnectedRef.current = onConnected;

    const clearTimers = useCallback(() => {
        if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        if (qrRefreshRef.current) { window.clearInterval(qrRefreshRef.current); qrRefreshRef.current = null; }
    }, []);

    const markConnected = useCallback(() => {
        clearTimers();
        setState("connected");
        onConnectedRef.current?.();
    }, [clearTimers]);

    const callConnect = useCallback(async () => {
        setState("loading");
        setErrorMsg("");
        try {
            const { data, error } = await supabase.functions.invoke("evolution-whatsapp", {
                body: { action: "connect", companyId: effectiveCompanyId },
            });
            if (error) throw error;
            const payload = data as { connected?: boolean; qrCodeBase64?: string | null } | null;
            if (payload?.connected) {
                markConnected();
                return;
            }
            const raw = payload?.qrCodeBase64 || null;
            if (raw) {
                setQr(raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`);
                setState("qr");
            } else {
                setErrorMsg("Não consegui gerar o QR Code agora. Tente novamente.");
                setState("error");
            }
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Falha ao iniciar a conexão.");
            setState("error");
        }
    }, [effectiveCompanyId, markConnected]);

    const checkStatus = useCallback(async () => {
        try {
            const { data, error } = await supabase.functions.invoke("evolution-whatsapp", {
                body: { action: "status", companyId: effectiveCompanyId },
            });
            if (error) return;
            if ((data as { connected?: boolean } | null)?.connected) markConnected();
        } catch {
            /* silencioso — segue tentando no próximo tick */
        }
    }, [effectiveCompanyId, markConnected]);

    // F4W.7.2 — reset: logout limpa a sessão Baileys travada (ex.: instância
    // que ficou "presa" após linkar em outro lugar) e então gera um QR fresco.
    // Resolve o "Can't link devices right now" causado por sessão suja.
    const resetConnection = useCallback(async () => {
        clearTimers();
        setState("loading");
        setErrorMsg("");
        try {
            await supabase.functions.invoke("evolution-whatsapp", {
                body: { action: "logout", companyId: effectiveCompanyId },
            });
        } catch {
            /* best-effort — segue pro connect mesmo se o logout falhar */
        }
        await callConnect();
    }, [effectiveCompanyId, callConnect, clearTimers]);

    // Abre → inicia conexão. Fecha → limpa timers.
    useEffect(() => {
        if (!open) return;
        void callConnect();
        return () => clearTimers();
    }, [open, callConnect, clearTimers]);

    // Enquanto mostra QR: poll status + renova QR
    useEffect(() => {
        clearTimers();
        if (state !== "qr") return;
        pollRef.current = window.setInterval(() => void checkStatus(), POLL_MS);
        qrRefreshRef.current = window.setInterval(() => void callConnect(), QR_REFRESH_MS);
        return () => clearTimers();
    }, [state, checkStatus, callConnect, clearTimers]);

    const handleClose = () => {
        clearTimers();
        setState("loading");
        setQr(null);
        setErrorMsg("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="w-[95vw] max-w-[420px] bg-white border border-[#D9E2EC] p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-3" style={{ borderBottom: "1px solid #EAF0F6" }}>
                    <DialogTitle className="flex items-center gap-3 text-[18px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.018em" }}>
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)" }}>
                            <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        Conectar WhatsApp
                    </DialogTitle>
                    <DialogDescription className="text-[12.5px] mt-1" style={{ color: "#64748B" }}>
                        Escaneie o QR Code com o WhatsApp do seu celular para conectar à Inbox.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-6 flex flex-col items-center justify-center min-h-[300px]">
                    {state === "loading" && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#2563EB" }} />
                            <p className="text-[13px] font-medium" style={{ color: "#475569" }}>
                                Gerando QR Code seguro…
                            </p>
                        </div>
                    )}

                    {state === "qr" && qr && (
                        <div className="flex flex-col items-center gap-5 w-full">
                            <div className="p-3 bg-white rounded-2xl" style={{ border: "1px solid #D9E2EC", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
                                <img src={qr} alt="QR Code do WhatsApp" width={208} height={208} className="block rounded-lg" />
                            </div>
                            <div className="w-full text-center rounded-lg px-3 py-2.5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <p className="text-[12.5px] font-semibold inline-flex items-center gap-1.5" style={{ color: "#047857" }}>
                                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#10B981" }} />
                                    Aguardando leitura do QR Code…
                                </p>
                                <p className="text-[11px] mt-1 leading-snug" style={{ color: "#64748B" }}>
                                    WhatsApp → Aparelhos conectados → Conectar um aparelho
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => void callConnect()}
                                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:text-[#1D4ED8]"
                                    style={{ color: "#2563EB" }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Gerar novo QR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void resetConnection()}
                                    className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:text-[#475569]"
                                    style={{ color: "#94A3B8" }}
                                    title="Limpa a sessão atual e gera um QR do zero"
                                >
                                    Resetar conexão
                                </button>
                            </div>
                        </div>
                    )}

                    {state === "connected" && (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.10)", border: "4px solid rgba(16,185,129,0.18)" }}>
                                <CheckCircle2 className="w-10 h-10" style={{ color: "#10B981" }} />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold" style={{ color: "#0B1220" }}>WhatsApp conectado!</h3>
                                <p className="text-[12.5px] mt-1" style={{ color: "#64748B" }}>
                                    Suas conversas vão aparecer na Inbox.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="inline-flex items-center h-9 px-5 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-110"
                                style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                            >
                                Concluir
                            </button>
                        </div>
                    )}

                    {state === "error" && (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,0.08)" }}>
                                <AlertCircle className="w-6 h-6" style={{ color: "#DC2626" }} />
                            </div>
                            <p className="text-[12.5px] max-w-[280px]" style={{ color: "#64748B" }}>{errorMsg}</p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void callConnect()}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold transition-colors"
                                    style={{ background: "rgba(37,99,235,0.08)", color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.20)" }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Tentar novamente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void resetConnection()}
                                    className="inline-flex items-center h-9 px-4 rounded-lg text-[12.5px] font-semibold transition-colors hover:bg-[#F1F5F9]"
                                    style={{ color: "#475569", border: "1px solid #D9E2EC" }}
                                >
                                    Resetar conexão
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {state !== "connected" && (
                    <div className="px-6 py-3 flex items-center gap-2 justify-center" style={{ borderTop: "1px solid #EAF0F6", background: "#F8FAFC" }}>
                        <Smartphone className="h-3.5 w-3.5" style={{ color: "#94A3B8" }} />
                        <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                            Mantenha o celular conectado à internet durante a leitura.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
