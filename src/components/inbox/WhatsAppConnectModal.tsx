// ─────────────────────────────────────────────────────────────────────────────
// F4W.7.2 (2026-05-26) — WhatsAppConnectModal
//
// Conexão do WhatsApp (Inbox, Raio-X e primeiros passos). Dois modos:
//   - QR Code: action "connect" devolve qrCodeBase64; renova a cada ~50s.
//   - Código no celular (08/10/2026): action "connect" com number devolve o
//     código de 8 letras que a pessoa digita em "Conectar com número de
//     telefone". É o caminho de quem abre no celular e não consegue ler o
//     próprio QR. Nesse modo NADA pede QR de novo: a Whatsmiau reinicia a
//     tentativa quando o método muda, e o código digitado deixaria de valer.
// Nos dois, poll de "status" a cada 3s; connected=true fecha o ciclo.
// Não envia mensagem. A única escrita é na instância do usuário no servidor.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle, RefreshCw, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { EvaBot } from "@/components/eva/EvaBot";

type ConnectState = "loading" | "qr" | "numero" | "codigo" | "connected" | "error";
type Modo = "qr" | "codigo";

interface WhatsAppConnectModalProps {
    open: boolean;
    onClose: () => void;
    /** Chamado quando a conexão fica "open" — Inbox refetcha status + chats. */
    onConnected?: () => void;
}

const POLL_MS = 3_000;        // checa status a cada 3s enquanto espera a leitura
const QR_REFRESH_MS = 50_000; // QR expira ~60s; renova antes
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const ERRO_CODIGO: Record<string, string> = {
    invalid_number: "Esse número não parece válido. Use o DDD e o número, como 48 99999-9999.",
    unavailable: "O WhatsApp não liberou o código agora. Tente de novo em instantes ou use o QR Code.",
};

const PASSOS: Record<Modo, string[]> = {
    qr: [
        "Abra o WhatsApp no celular.",
        "Toque em Mais opções (⋮) no Android ou em Configurações no iPhone, e depois em Aparelhos conectados.",
        "Toque em Conectar um aparelho e aponte a câmera para o código.",
    ],
    codigo: [
        "Abra o WhatsApp no celular deste número.",
        "Toque em Mais opções (⋮) no Android ou em Configurações no iPhone, depois em Aparelhos conectados e Conectar um aparelho.",
        "Toque em Conectar com número de telefone e digite o código.",
    ],
};

export function WhatsAppConnectModal({ open, onClose, onConnected }: WhatsAppConnectModalProps) {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    // No celular não dá para ler o próprio QR: abre direto no código.
    const [noCelular] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
    const [modo, setModo] = useState<Modo>(noCelular ? "codigo" : "qr");
    const [state, setState] = useState<ConnectState>("loading");
    const [qr, setQr] = useState<string | null>(null);
    const [numero, setNumero] = useState("");
    const [codigo, setCodigo] = useState<string | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [qrAt, setQrAt] = useState(0);
    const [agora, setAgora] = useState(() => Date.now());

    // O WhatsApp informado no cadastro já entra no campo do código.
    useEffect(() => {
        if (!open || !effectiveCompanyId) return;
        let vivo = true;
        supabase.from("companies").select("phone").eq("id", effectiveCompanyId).maybeSingle().then(({ data }) => {
            const phone = (data as { phone?: string | null } | null)?.phone;
            if (vivo && phone) setNumero((n) => n || phone.replace(/^55/, ""));
        });
        return () => { vivo = false; };
    }, [open, effectiveCompanyId]);

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

    // Invoke com timeout — o servidor pode estar lento/fora; sem isto a janela
    // fica "Gerando…" pra sempre, sem dizer o que houve.
    const invokeWA = useCallback(async (action: string, ms: number, extra: Record<string, unknown> = {}) => {
        return (await Promise.race([
            supabase.functions.invoke("evolution-whatsapp", {
                body: { action, companyId: effectiveCompanyId, ...extra },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("__timeout__")), ms)),
        ])) as Awaited<ReturnType<typeof supabase.functions.invoke>>;
    }, [effectiveCompanyId]);

    const falhou = useCallback((err: unknown) => {
        const timedOut = err instanceof Error && err.message === "__timeout__";
        setErrorMsg(
            timedOut
                ? "Não conseguimos falar com o servidor do WhatsApp agora. Tente de novo em alguns minutos."
                : err instanceof Error ? err.message : "Falha ao iniciar a conexão.",
        );
        setState("error");
    }, []);

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
            falhou(err);
        }
    }, [invokeWA, markConnected, falhou]);

    // O código pode demorar uns segundos para sair do WhatsApp: pede de novo,
    // sempre com o mesmo número, até vir (ou até 6 tentativas).
    const pedirCodigo = useCallback(async (num: string) => {
        setState("loading");
        setErrorMsg("");
        setCodigo(null);
        try {
            for (let tentativa = 0; tentativa < 6; tentativa++) {
                const { data, error } = await invokeWA("connect", 20000, { number: num });
                if (error) throw error;
                const payload = data as { connected?: boolean; pairingCode?: string | null; pairingError?: string | null } | null;
                if (payload?.connected) {
                    markConnected();
                    return;
                }
                if (payload?.pairingError) {
                    setErrorMsg(ERRO_CODIGO[payload.pairingError] ?? ERRO_CODIGO.unavailable);
                    setState(payload.pairingError === "invalid_number" ? "numero" : "error");
                    return;
                }
                if (payload?.pairingCode) {
                    setCodigo(payload.pairingCode);
                    setState("codigo");
                    return;
                }
                await new Promise((r) => setTimeout(r, 2500));
            }
            setErrorMsg(ERRO_CODIGO.unavailable);
            setState("error");
        } catch (err) {
            falhou(err);
        }
    }, [invokeWA, markConnected, falhou]);

    const checkStatus = useCallback(async () => {
        try {
            const { data, error } = await invokeWA("status", 10000);
            if (error) return;
            if ((data as { connected?: boolean } | null)?.connected) markConnected();
        } catch {
            /* silencioso — segue tentando no próximo tick */
        }
    }, [invokeWA, markConnected]);

    // F4W.7.2 — reset: logout limpa a sessão travada (ex.: instância que ficou
    // "presa" após linkar em outro lugar) e começa do zero no modo atual.
    // Resolve o "Can't link devices right now" causado por sessão suja.
    const resetConnection = useCallback(async () => {
        clearTimers();
        setState("loading");
        setErrorMsg("");
        try {
            await invokeWA("logout", 8000);
        } catch {
            /* best-effort — segue mesmo se o logout falhar */
        }
        if (modo === "codigo" && numero) await pedirCodigo(numero);
        else await callConnect();
    }, [invokeWA, callConnect, pedirCodigo, clearTimers, modo, numero]);

    // Abre → começa no modo escolhido. Fecha → limpa timers.
    useEffect(() => {
        if (!open) return;
        if (modo === "qr") void callConnect();
        else setState("numero");
        return () => clearTimers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Esperando a leitura: poll de status; no QR, também renova o código.
    useEffect(() => {
        clearTimers();
        if (state !== "qr" && state !== "codigo") return;
        pollRef.current = window.setInterval(() => void checkStatus(), POLL_MS);
        if (state === "qr") qrRefreshRef.current = window.setInterval(() => void callConnect(), QR_REFRESH_MS);
        return () => clearTimers();
    }, [state, checkStatus, callConnect, clearTimers]);

    // Contagem até o QR renovar sozinho.
    useEffect(() => {
        if (state !== "qr") return;
        const t = window.setInterval(() => setAgora(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, [state]);
    const renovaEm = Math.max(0, Math.ceil((qrAt + QR_REFRESH_MS - agora) / 1000));

    const trocarModo = (m: Modo) => {
        if (m === modo) return;
        clearTimers();
        setModo(m);
        setErrorMsg("");
        if (m === "qr") void callConnect();
        else setState("numero");
    };

    const enviarNumero = (e: FormEvent) => {
        e.preventDefault();
        const digitos = numero.replace(/\D/g, "");
        if (digitos.length < 10) {
            setErrorMsg(ERRO_CODIGO.invalid_number);
            return;
        }
        void pedirCodigo(numero);
    };

    const copiar = async () => {
        if (!codigo) return;
        try {
            await navigator.clipboard.writeText(codigo.replace(/-/g, ""));
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1600);
        } catch {
            /* sem área de transferência */
        }
    };

    const handleClose = () => {
        clearTimers();
        setState("loading");
        setQr(null);
        setCodigo(null);
        setErrorMsg("");
        onClose();
    };

    const linkBtn = "inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]";
    const linkMudo = "rounded-full text-[13px] font-medium text-[#94A3B8] hover:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]";

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
                    {state !== "connected" && (
                        <div role="radiogroup" aria-label="Como conectar" className="mt-4 inline-flex self-start rounded-full border border-[#E6EDF5] bg-[#F8FAFC] p-1">
                            {([["codigo", "Código no celular"], ["qr", "QR Code"]] as const).map(([m, rotulo]) => (
                                <button
                                    key={m}
                                    type="button"
                                    role="radio"
                                    aria-checked={modo === m}
                                    onClick={() => trocarModo(m)}
                                    className={`h-8 rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ${EASE} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${modo === m ? "bg-[#0B1220] text-white" : "text-[#475569] hover:text-[#0B1220]"}`}
                                >
                                    {rotulo}
                                </button>
                            ))}
                        </div>
                    )}
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
                        {noCelular && modo === "qr" && (
                            <p className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[13px] leading-snug text-[#92400E] md:col-span-2">
                                Está no celular? O QR precisa ser lido por outro aparelho.{" "}
                                <button type="button" onClick={() => trocarModo("codigo")} className="font-semibold underline underline-offset-2">
                                    Use o código no celular
                                </button>
                                .
                            </p>
                        )}
                        <div className="order-2 md:order-1">
                            <ol className="flex flex-col gap-4">
                                {PASSOS[modo].map((t, i) => (
                                    <li key={t} className="flex gap-3">
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
                            <div className="relative grid min-h-[248px] w-full max-w-[300px] place-items-center rounded-2xl border border-[#E6EDF5] bg-white p-5 md:w-[300px]">
                                {modo === "qr" && ["left-2 top-2 border-l-2 border-t-2 rounded-tl-lg", "right-2 top-2 border-r-2 border-t-2 rounded-tr-lg", "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg", "bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg"].map((c) => (
                                    <span key={c} aria-hidden className={`absolute h-6 w-6 border-[#2563EB] ${c}`} />
                                ))}

                                {state === "qr" && qr ? (
                                    <img src={qr} alt="Código para conectar o WhatsApp" width={208} height={208} className="block rounded-md" />
                                ) : state === "numero" ? (
                                    <form onSubmit={enviarNumero} className="flex w-full flex-col gap-3" noValidate>
                                        <label htmlFor="wa-numero" className="text-[13px] font-semibold text-[#1F2A3B]">
                                            Número deste WhatsApp, com DDD
                                        </label>
                                        <input
                                            id="wa-numero"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            autoFocus
                                            placeholder="48 99999-9999"
                                            value={numero}
                                            onChange={(e) => { setNumero(e.target.value); if (errorMsg) setErrorMsg(""); }}
                                            aria-invalid={errorMsg ? true : undefined}
                                            aria-describedby={errorMsg ? "wa-numero-erro" : undefined}
                                            className="h-12 w-full rounded-xl border border-[#D7DEE9] bg-white px-4 text-[16px] tabular-nums text-[#0B1220] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                                        />
                                        {errorMsg && (
                                            <p id="wa-numero-erro" role="alert" className="text-[13px] leading-snug text-[#BE123C]">{errorMsg}</p>
                                        )}
                                        <button
                                            type="submit"
                                            className="inline-flex h-11 items-center justify-center rounded-full bg-[#0B1220] px-5 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-[#1F2A3B] active:scale-[0.97] motion-reduce:active:scale-100"
                                        >
                                            Gerar código
                                        </button>
                                    </form>
                                ) : state === "codigo" && codigo ? (
                                    <div className="flex w-full flex-col items-center gap-3 text-center">
                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]">Seu código</p>
                                        <p className="font-mono text-[32px] font-bold tracking-[0.12em] text-[#0B1220]" aria-live="polite">{codigo}</p>
                                        <button
                                            type="button"
                                            onClick={() => void copiar()}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#D7DEE9] px-4 text-[13px] font-semibold text-[#1F2A3B] transition-colors hover:bg-[#F1F5F9]"
                                        >
                                            {copiado ? <Check className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                                            {copiado ? "Copiado" : "Copiar código"}
                                        </button>
                                    </div>
                                ) : state === "error" ? (
                                    <div className="flex flex-col items-center gap-2 px-2 text-center">
                                        <AlertCircle className="h-7 w-7 text-[#DC2626]" aria-hidden />
                                        <p className="text-[13px] leading-snug text-[#475569]">{errorMsg}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-7 w-7 animate-spin text-[#2563EB] motion-reduce:animate-none" aria-hidden />
                                        <p className="text-[13px] text-[#64748B]">{modo === "qr" ? "Gerando o QR Code…" : "Pedindo o código ao WhatsApp…"}</p>
                                    </div>
                                )}
                            </div>

                            {(state === "qr" || state === "codigo") && (
                                <>
                                    <p className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[#0B1220]" role="status">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-60 motion-reduce:animate-none" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
                                        </span>
                                        {state === "qr" ? "Esperando você ler o código" : "Esperando você digitar o código"}
                                    </p>
                                    {state === "qr" && (
                                        <p className="mt-1 text-[12px] tabular-nums text-[#94A3B8]">
                                            {renovaEm > 0 ? `Código novo em ${renovaEm} s` : "Renovando o código…"}
                                        </p>
                                    )}
                                </>
                            )}

                            {(state === "qr" || state === "codigo" || state === "error") && (
                                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                                    <button
                                        type="button"
                                        onClick={() => void (modo === "qr" ? callConnect() : state === "error" ? pedirCodigo(numero) : resetConnection())}
                                        className={linkBtn}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                        {state === "error" ? "Tentar de novo" : "Gerar outro código"}
                                    </button>
                                    {modo === "codigo" ? (
                                        <button type="button" onClick={() => { clearTimers(); setState("numero"); }} className={linkMudo}>
                                            Trocar número
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => void resetConnection()} className={linkMudo} title="Limpa a sessão atual e gera um código do zero">
                                            Resetar conexão
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
