import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CalendarDays,
    Check,
    Loader2,
    RefreshCw,
    AlertCircle,
    X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleCalendarConfigModalProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export const GoogleCalendarConfigModal = ({ open, onClose, onSaved }: GoogleCalendarConfigModalProps) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [tokenExpired, setTokenExpired] = useState(false);

    useEffect(() => {
        if (open && user) {
            checkConnection();
        }
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
                // Check if token is expired
                const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : null;
                const now = new Date();

                if (expiresAt && expiresAt < now) {
                    setTokenExpired(true);
                    setIsConnected(false);
                } else {
                    setIsConnected(true);
                    setTokenExpired(false);
                }
            } else {
                setIsConnected(false);
                setTokenExpired(false);
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
            toast.loading("Iniciando conexão com Google Calendar...", { id: "google-connect" });

            const response = await supabase.functions.invoke("google-oauth-init", {
                body: { userId: user!.id },
            });

            if (response.error) throw response.error;

            toast.loading("Redirecionando para autenticação do Google...", { id: "google-connect" });
            window.location.href = response.data.authUrl;
        } catch (error) {
            console.error("Error initiating Google OAuth:", error);
            toast.error("Erro ao iniciar conexão com Google Calendar", { id: "google-connect" });
            setConnecting(false);
        }
    };

    const syncAllEvents = async () => {
        try {
            setSyncing(true);
            toast.loading("Sincronizando eventos do Google Calendar...", { id: "google-sync" });

            const response = await supabase.functions.invoke("google-calendar-sync", {
                body: {
                    action: "sync_all",
                    userId: user!.id,
                },
            });

            if (response.error) throw response.error;

            toast.success(
                `${response.data?.synced || 0} eventos sincronizados!`,
                { id: "google-sync" }
            );
        } catch (error) {
            console.error("Error syncing events:", error);
            toast.error("Erro ao sincronizar eventos", { id: "google-sync" });
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setDisconnecting(true);
            toast.loading("Desconectando do Google Calendar...", { id: "google-disconnect" });

            await supabase
                .from("profiles")
                .update({
                    google_access_token: null,
                    google_refresh_token: null,
                    google_token_expires_at: null,
                    google_calendar_id: null,
                })
                .eq("id", user!.id);

            setIsConnected(false);
            setTokenExpired(false);
            toast.success("Desconectado do Google Calendar", { id: "google-disconnect" });
            onSaved?.();
        } catch (error) {
            console.error("Error disconnecting:", error);
            toast.error("Erro ao desconectar", { id: "google-disconnect" });
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                            <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        Gerenciar Google Calendar
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Configure a integração com o Google Calendar
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Connection Status */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                {isConnected ? (
                                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                ) : tokenExpired ? (
                                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-500/20">
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                ) : (
                                    <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                                        <X className="w-4 h-4 text-slate-500" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {isConnected ? "Conectado" : tokenExpired ? "Token Expirado" : "Não Conectado"}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {isConnected
                                            ? "Sincronização automática a cada 15 minutos"
                                            : tokenExpired
                                                ? "Reconecte para continuar sincronizando"
                                                : "Conecte para sincronizar seus agendamentos"}
                                    </p>
                                </div>
                            </div>
                            {isConnected && (
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" />
                                    Auto-Sync
                                </Badge>
                            )}
                        </div>

                        {/* Actions */}
                        {isConnected ? (
                            <div className="space-y-3">
                                <Button
                                    onClick={syncAllEvents}
                                    variant="outline"
                                    className="w-full gap-2"
                                    disabled={syncing}
                                >
                                    {syncing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Sincronizando...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4" />
                                            Sincronizar Agora
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleDisconnect}
                                    variant="destructive"
                                    className="w-full gap-2"
                                    disabled={disconnecting}
                                >
                                    {disconnecting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Desconectando...
                                        </>
                                    ) : (
                                        "Desconectar"
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={handleConnect}
                                className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-white"
                                disabled={connecting}
                            >
                                {connecting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <CalendarDays className="h-4 w-4" />
                                        {tokenExpired ? "Reconectar" : "Conectar Google Calendar"}
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Instructions */}
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 text-sm">
                                Como funciona
                            </h4>
                            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                                <li>Seus agendamentos são sincronizados automaticamente</li>
                                <li>Eventos criados no Game Sales aparecem no seu Google Calendar</li>
                                <li>Sincronização a cada 15 minutos</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
