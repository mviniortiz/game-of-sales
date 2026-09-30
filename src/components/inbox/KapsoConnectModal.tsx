// Link de conexão da API oficial do WhatsApp (Kapso, coexistência). Quem abre
// o link é o dono do número: entra com o Facebook, continua usando o WhatsApp
// Business no celular e aceita compartilhar o histórico. A conexão chega pelo
// kapso-webhook. Por enquanto só super_admin gera o link, para mandar ao cliente.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

interface KapsoConnectModalProps {
    open: boolean;
    onClose: () => void;
}

type LinkState = { status: "loading" } | { status: "ready"; url: string; expiresAt: string | null } | { status: "error"; message: string };

export function KapsoConnectModal({ open, onClose }: KapsoConnectModalProps) {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;
    const [state, setState] = useState<LinkState>({ status: "loading" });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open || !effectiveCompanyId) return;
        let cancelled = false;
        setState({ status: "loading" });
        setCopied(false);
        (async () => {
            const { data, error } = await supabase.functions.invoke("kapso-whatsapp", {
                body: { action: "connect", companyId: effectiveCompanyId },
            });
            // Resposta não-2xx chega como error; o motivo real está no corpo (error.context).
            let detail = (data as { error?: string } | null)?.error;
            if (error && !detail) {
                const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
                detail = (await ctx?.json?.().catch(() => null))?.error || error.message;
            }
            if (cancelled) return;
            const url = (data as { url?: string } | null)?.url;
            if (error || !url) {
                setState({ status: "error", message: detail || "Não foi possível gerar o link." });
                return;
            }
            setState({ status: "ready", url, expiresAt: (data as { expiresAt?: string | null }).expiresAt ?? null });
        })();
        return () => {
            cancelled = true;
        };
    }, [open, effectiveCompanyId]);

    const copy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const expires = state.status === "ready" && state.expiresAt ? new Date(state.expiresAt).toLocaleDateString("pt-BR") : null;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="w-[95vw] max-w-[440px] bg-white border border-[#D9E2EC] p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-3" style={{ borderBottom: "1px solid #EAF0F6" }}>
                    <DialogTitle className="text-[17px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.018em" }}>
                        WhatsApp pela API oficial
                    </DialogTitle>
                    <DialogDescription className="text-[12.5px] mt-1 leading-snug" style={{ color: "#64748B" }}>
                        Mande este link para o dono do número. Ele entra com o Facebook, continua usando o WhatsApp
                        Business no celular e aceita compartilhar o histórico das conversas.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-6 min-h-[150px] flex flex-col justify-center">
                    {state.status === "loading" && (
                        <div className="flex items-center justify-center gap-2 text-[13px]" style={{ color: "#475569" }}>
                            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#2563EB" }} />
                            Gerando link
                        </div>
                    )}

                    {state.status === "error" && (
                        <div className="flex items-start gap-2 text-[12.5px]" role="alert" style={{ color: "#B42318" }}>
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="break-words">{state.message}</span>
                        </div>
                    )}

                    {state.status === "ready" && (
                        <div className="flex flex-col gap-3">
                            <input
                                readOnly
                                value={state.url}
                                onFocus={(e) => e.currentTarget.select()}
                                aria-label="Link de conexão"
                                className="h-10 w-full rounded-lg border px-3 text-[13px]"
                                style={{ borderColor: "#D9E2EC", color: "#0B1220", background: "#F8FAFC" }}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void copy(state.url)}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110"
                                    style={{ background: "#0B1220" }}
                                >
                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? "Copiado" : "Copiar link"}
                                </button>
                                <a
                                    href={state.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold transition-colors hover:bg-[#F1F5F9]"
                                    style={{ color: "#475569", border: "1px solid #D9E2EC" }}
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Abrir
                                </a>
                            </div>
                            {expires && (
                                <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                                    Vale até {expires}.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
