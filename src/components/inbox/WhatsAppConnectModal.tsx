// ─────────────────────────────────────────────────────────────────────────────
// F4W.7.2 (2026-05-26) — WhatsAppConnectModal
//
// Fluxo de conexão WhatsApp via QR Code (Inbox, Raio-X e primeiros passos). Real:
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
import { Loader2, AlertCircle, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { EvaBot } from "@/components/eva/EvaBot";

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
    const [qrAt, setQrAt] = useState(0);
    const [agora, setAgora] = useState(() => Date.now());
    // No celular, o código precisa ser lido por OUTRO aparelho: avisa antes.
    const [noCelular] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);

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

    // Invoke com timeout — o servidor Evolution pode estar lento/fora; sem isto o
    // modal fica "Gerando QR Code…" pra sempre, sem dizer o que houve.
    const invokeWA = useCallback(async (action: string, ms: number) => {
        return (await Promise.race([
            supabase.functions.invoke("evolution-whatsapp", {
                body: { action, companyId: effectiveCompanyId },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("__timeout__")), ms)),
        ])) as Awaited<ReturnType<typeof supabase.functions.invoke>>;
    }, [effectiveCompanyId]);

    const callConnect = useCallback(async () => {
        setState("loading");
        setErrorMsg("");
        try {
            const { data, error } = await invokeWA("connect", 20000);
            if (error) throw error;
            const payload = data as { connected?: boolean; qrCodeBase64?: string | null } | null;
            if (payload?.connected) {
                markConnected();
                return;
            }
            const raw = payload?.qrCodeBase64 || null;
            if (raw) {
                setQr(raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`);
                setQrAt(Date.now());
                setState("qr");
            } else {
                setErrorMsg("Não consegui gerar o QR Code agora. Tente novamente.");
                setState("error");
            }
        } catch (err) {
            const timedOut = err instanceof Error && err.message === "__timeout__";
            setErrorMsg(
                timedOut
                    ? "Não conseguimos falar com o servidor do WhatsApp agora. Tente de novo em alguns minutos."
                    : err instanceof Error ? err.message : "Falha ao iniciar a conexão.",
            );
            setState("error");
        }
    }, [invokeWA, markConnected]);

    const checkStatus = useCallback(async () => {
        try {
            const { data, error } = await invokeWA("status", 10000);
            if (error) return;
            if ((data as { connected?: boolean } | null)?.connected) markConnected();
        } catch {
            /* silencioso — segue tentando no próximo tick */
        }
    }, [invokeWA, markConnected]);

    // F4W.7.2 — reset: logout limpa a sessão Baileys travada (ex.: instância
    // que ficou "presa" após linkar em outro lugar) e então gera um QR fresco.
    // Resolve o "Can't link devices right now" causado por sessão suja.
    const resetConnection = useCallback(async () => {
        clearTimers();
        setState("loading");
        setErrorMsg("");
        try {
            await invokeWA("logout", 8000);
        } catch {
            /* best-effort — segue pro connect mesmo se o logout falhar */
        }
        await callConnect();
    }, [invokeWA, callConnect, clearTimers]);

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

    // Contagem até o código renovar sozinho.
    useEffect(() => {
        if (state !== "qr") return;
        const t = window.setInterval(() => setAgora(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, [state]);
    const renovaEm = Math.max(0, Math.ceil((qrAt + QR_REFRESH_MS - agora) / 1000));

    const handleClose = () => {
        clearTimers();
        setState("loading");
        setQr(null);
        setErrorMsg("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
            <DialogContent className="max-h-[92dvh] w-[95vw] max-w-[760px] gap-0 overflow-y-auto rounded-[20px] border border-[#E6EDF5] bg-white p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_32px_80px_-24px_rgba(15,23,42,0.35)]">
                <DialogHeader className="px-6 pb-4 pt-6 text-left sm:px-8 sm:pt-7">
                    <DialogTitle className="flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.02em] text-[#0B1220]">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366]/10">
                            <WhatsAppIcon className="h-4 w-4 text-[#128C4B]" />
                        </span>
                        Conectar seu WhatsApp
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-[14px] leading-relaxed text-[#64748B]">
                        O mesmo número que você usa com os clientes. Nada muda no seu celular.
                    </DialogDescription>
                </DialogHeader>

                {state === "connected" ? (
                    <div className="flex flex-col items-center gap-4 px-6 pb-8 pt-4 text-center sm:px-8">
                        <EvaBot size={72} state="happy" />
                        <div>
                            <h3 className="text-[18px] font-semibold text-[#0B1220]">Conectado</h3>
                            <p className="mt-1 text-[14px] text-[#64748B]">Agora eu leio suas conversas e acho as propostas.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-11 items-center rounded-full bg-[#0B1220] px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-[#1F2A3B] active:scale-[0.97] motion-reduce:active:scale-100"
                        >
                            Continuar
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-[1fr_auto] md:gap-8">
                        {noCelular && (
                            <p className="order-0 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] leading-snug text-[#92400E] md:col-span-2">
                                Está no celular? O código precisa ser lido por outro aparelho. Abra vyzon.com.br no computador e leia o código com este celular.
                            </p>
                        )}
                        <div className="order-2 md:order-1">
                            <ol className="flex flex-col gap-4">
                                {[
                                    "Abra o WhatsApp no celular.",
                                    "Toque em Mais opções (⋮) no Android ou em Configurações no iPhone, e depois em Aparelhos conectados.",
                                    "Toque em Conectar um aparelho e aponte a câmera para o código.",
                                ].map((t, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0B1220] text-[12px] font-semibold text-white">{i + 1}</span>
                                        <span className="text-[14px] leading-snug text-[#1F2A3B]">{t}</span>
                                    </li>
                                ))}
                            </ol>
                            <ul className="mt-6 flex flex-col gap-2 border-t border-[#EEF2F7] pt-5">
                                {["Seu número continua o mesmo", "Nada sai para cliente sem você aprovar", "Dá para desconectar quando quiser, em Aparelhos conectados"].map((t) => (
                                    <li key={t} className="flex items-center gap-2 text-[13px] text-[#64748B]">
                                        <Check className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" strokeWidth={2.5} aria-hidden />
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="order-1 flex flex-col items-center md:order-2">
                            <div className="relative grid h-[248px] w-[248px] place-items-center rounded-2xl border border-[#E6EDF5] bg-white">
                                {/* cantos de leitor, na cor da marca */}
                                {["left-2 top-2 border-l-2 border-t-2 rounded-tl-lg", "right-2 top-2 border-r-2 border-t-2 rounded-tr-lg", "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg", "bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg"].map((c) => (
                                    <span key={c} aria-hidden className={`absolute h-6 w-6 border-[#2563EB] ${c}`} />
                                ))}
                                {state === "qr" && qr ? (
                                    <img src={qr} alt="Código para conectar o WhatsApp" width={208} height={208} className="block rounded-md" />
                                ) : state === "error" ? (
                                    <div className="flex flex-col items-center gap-2 px-6 text-center">
                                        <AlertCircle className="h-7 w-7 text-[#DC2626]" aria-hidden />
                                        <p className="text-[13px] leading-snug text-[#475569]">{errorMsg}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-7 w-7 animate-spin text-[#2563EB] motion-reduce:animate-none" aria-hidden />
                                        <p className="text-[13px] text-[#64748B]">Gerando o código…</p>
                                    </div>
                                )}
                            </div>

                            {state === "qr" && (
                                <>
                                    <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[#0B1220]" role="status">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-60 motion-reduce:animate-none" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
                                        </span>
                                        Esperando você ler o código
                                    </p>
                                    <p className="mt-1 text-[12px] tabular-nums text-[#94A3B8]">
                                        {renovaEm > 0 ? `Código novo em ${renovaEm} s` : "Renovando o código…"}
                                    </p>
                                </>
                            )}

                            {(state === "qr" || state === "error") && (
                                <div className="mt-3 flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => void callConnect()}
                                        className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                        {state === "error" ? "Tentar de novo" : "Gerar outro código"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void resetConnection()}
                                        className="rounded-full text-[13px] font-medium text-[#94A3B8] hover:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                                        title="Limpa a sessão atual e gera um código do zero"
                                    >
                                        Resetar conexão
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
