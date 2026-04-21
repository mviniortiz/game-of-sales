import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CalendarDays,
    Loader2,
    RefreshCw,
    AlertCircle,
    Unlink,
    ExternalLink,
    Sparkles,
    Wifi,
    Clock,
    Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatError } from "@/lib/utils";
import googleCalendarLogo from "@/assets/integrations/google-calendar.webp";

interface GoogleCalendarConfigModalProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

type ConnState = "connected" | "expired" | "disconnected";

export const GoogleCalendarConfigModal = ({ open, onClose, onSaved }: GoogleCalendarConfigModalProps) => {
    const { user } = useAuth();
    const [state, setState] = useState<ConnState>("disconnected");
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    useEffect(() => {
        if (open && user) checkConnection();
    }, [open, user]);

    const checkConnection = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from("profiles")
                .select("google_access_token, google_token_expires_at")
                .eq("id", user.id)
                .single();

            if (data?.google_access_token) {
                const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : null;
                setState(expiresAt && expiresAt < new Date() ? "expired" : "connected");
            } else {
                setState("disconnected");
            }
        } catch (error) {
            console.error("Error checking connection:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            toast.loading("Iniciando conexão...", { id: "google-connect" });
            const response = await supabase.functions.invoke("google-oauth-init", {
                body: { userId: user!.id },
            });
            if (response.error) throw response.error;
            toast.loading("Redirecionando para o Google...", { id: "google-connect" });
            window.location.href = response.data.authUrl;
        } catch (error) {
            console.error("[GoogleCalendarConfigModal] connect error:", error);
            toast.error(`Erro ao conectar: ${formatError(error)}`, { id: "google-connect" });
            setConnecting(false);
        }
    };

    const syncAllEvents = async () => {
        try {
            setSyncing(true);
            toast.loading("Sincronizando eventos...", { id: "google-sync" });
            const response = await supabase.functions.invoke("google-calendar-sync", {
                body: { action: "sync_all", userId: user!.id },
            });
            if (response.error) throw response.error;
            setLastSync(new Date().toISOString());
            toast.success(`${response.data?.synced || 0} eventos sincronizados`, { id: "google-sync" });
        } catch (error) {
            console.error("[GoogleCalendarConfigModal] sync error:", error);
            toast.error(`Erro ao sincronizar: ${formatError(error)}`, { id: "google-sync" });
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setDisconnecting(true);
            toast.loading("Desconectando...", { id: "google-disconnect" });
            const { error } = await supabase
                .from("profiles")
                .update({
                    google_access_token: null,
                    google_refresh_token: null,
                    google_token_expires_at: null,
                    google_calendar_id: null,
                })
                .eq("id", user!.id);
            if (error) throw error;
            setState("disconnected");
            toast.success("Desconectado do Google Calendar", { id: "google-disconnect" });
            onSaved?.();
        } catch (error) {
            console.error("[GoogleCalendarConfigModal] disconnect error:", error);
            toast.error(`Erro ao desconectar: ${formatError(error)}`, { id: "google-disconnect" });
        } finally {
            setDisconnecting(false);
        }
    };

    const isConnected = state === "connected";
    const isExpired = state === "expired";

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] sm:max-w-[520px] p-0 gap-0 bg-card border-border overflow-hidden">
                {/* ── Hero ─────────────────────────────────────── */}
                <div className="relative px-6 pt-6 pb-5 border-b border-border/60 bg-gradient-to-br from-card via-card to-emerald-950/10">
                    {isConnected && (
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                    )}
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white p-2 ring-1 ring-border/80 shadow-sm flex items-center justify-center shrink-0">
                            <img src={googleCalendarLogo} alt="Google Calendar" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                                    Google Calendar
                                </h2>
                                {isConnected && (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-[9px] px-1.5 py-0 font-bold tracking-wider">
                                        <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                                        ATIVO
                                    </Badge>
                                )}
                                {isExpired && (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/25 text-[9px] px-1.5 py-0 font-bold tracking-wider">
                                        EXPIRADO
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                Sincronização bidirecional de agendamentos e calls de vendas
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        {/* ── Status card ─────────────────────────── */}
                        <div className={`
                            rounded-xl border p-4
                            ${isConnected ? "bg-emerald-500/[0.03] border-emerald-500/20" : ""}
                            ${isExpired ? "bg-amber-500/[0.03] border-amber-500/20" : ""}
                            ${state === "disconnected" ? "bg-muted/20 border-border" : ""}
                        `}>
                            <div className="flex items-center gap-3">
                                <div className={`
                                    relative flex items-center justify-center w-10 h-10 rounded-lg shrink-0
                                    ${isConnected ? "bg-emerald-500/10 border border-emerald-500/25" : ""}
                                    ${isExpired ? "bg-amber-500/10 border border-amber-500/25" : ""}
                                    ${state === "disconnected" ? "bg-muted border border-border" : ""}
                                `}>
                                    {isConnected && <Wifi className="w-4 h-4 text-emerald-400" />}
                                    {isExpired && <AlertCircle className="w-4 h-4 text-amber-400" />}
                                    {state === "disconnected" && <CalendarDays className="w-4 h-4 text-muted-foreground" />}
                                    {isConnected && (
                                        <span className="absolute -top-0.5 -right-0.5 flex w-2 h-2">
                                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                                            <span className="relative rounded-full w-2 h-2 bg-emerald-400" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                        {isConnected && "Conectado e sincronizando"}
                                        {isExpired && "Token expirado"}
                                        {state === "disconnected" && "Pronto para conectar"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                        {isConnected && (
                                            <>
                                                <Clock className="w-3 h-3" />
                                                Auto-sync a cada 15 minutos
                                            </>
                                        )}
                                        {isExpired && "Reconecte para continuar sincronizando"}
                                        {state === "disconnected" && "Autorize uma vez e deixe rodando no piloto automático"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Actions ─────────────────────────────── */}
                        {isConnected ? (
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={syncAllEvents}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 h-9 bg-background/60"
                                    disabled={syncing}
                                >
                                    {syncing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Sincronizando
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Sincronizar agora
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleDisconnect}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 h-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 border-rose-500/20 hover:border-rose-500/30"
                                    disabled={disconnecting}
                                >
                                    {disconnecting ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Desconectando
                                        </>
                                    ) : (
                                        <>
                                            <Unlink className="h-3.5 w-3.5" />
                                            Desconectar
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={handleConnect}
                                size="sm"
                                className="w-full gap-2 h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
                                disabled={connecting}
                            >
                                {connecting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <img src={googleCalendarLogo} alt="" className="h-4 w-4" />
                                        {isExpired ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                    </>
                                )}
                            </Button>
                        )}

                        {/* ── How it works ─────────────────────────── */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Como funciona
                                </h4>
                            </div>
                            <div className="space-y-2">
                                <StepRow
                                    n={1}
                                    text="Agendamentos do Vyzon aparecem no seu Google Calendar"
                                />
                                <StepRow
                                    n={2}
                                    text="Eventos criados no Google são importados para o CRM"
                                />
                                <StepRow
                                    n={3}
                                    text="Sync automático a cada 15 minutos, sem intervenção manual"
                                />
                            </div>
                        </div>

                        {/* ── Footer ─────────────────────────────── */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/60">
                            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                                <Shield className="h-3 w-3" />
                                OAuth 2.0 · Token criptografado
                            </span>
                            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
                                Fechar
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

function StepRow({ n, text }: { n: number; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="shrink-0 w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-emerald-400 tabular-nums">{n}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{text}</p>
        </div>
    );
}
