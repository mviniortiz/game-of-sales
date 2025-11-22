import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, Loader2, RefreshCw } from "lucide-react";

export const GoogleCalendarConnect = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    checkUrlParams();
  }, [user]);

  const checkUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "true") {
      toast.success("Google Calendar conectado com sucesso!");
      // Limpar parâmetros da URL
      window.history.replaceState({}, "", window.location.pathname);
      checkConnection();
    } else if (error) {
      const errorMessages: Record<string, string> = {
        auth_failed: "Autorização cancelada",
        connection_failed: "Erro ao conectar ao Google Calendar",
      };
      toast.error(errorMessages[error] || "Erro na conexão");
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const checkConnection = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("google_access_token")
      .eq("id", user.id)
      .single();

    setIsConnected(!!data?.google_access_token);
    setLoading(false);
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      toast.loading("Iniciando conexão com Google Calendar...", { id: "google-connect" });
      
      // Chamar edge function para obter URL de autorização
      const response = await supabase.functions.invoke("google-oauth-init", {
        body: { userId: user!.id },
      });

      if (response.error) throw response.error;

      toast.loading("Redirecionando para autenticação do Google...", { id: "google-connect" });
      
      // Redirecionar para autorização do Google
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
      
      const response = await supabase.functions.invoke(
        "google-calendar-sync",
        {
          body: {
            action: "sync_all",
            userId: user!.id,
          },
        }
      );

      if (response.error) throw response.error;
      
      toast.success(
        `${response.data.synced} eventos sincronizados do Google Calendar!`,
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
      toast.success("Desconectado do Google Calendar", { id: "google-disconnect" });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Erro ao desconectar", { id: "google-disconnect" });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verificando conexão...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        {!isConnected ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarDays className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Google Calendar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sincronize seus agendamentos automaticamente
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              variant="outline"
              size="sm"
              disabled={connecting}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Conectar"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Conectado ao Google Calendar
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Auto-Sync 15min
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sincronização automática a cada 15 minutos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={syncAllEvents}
                variant="outline"
                size="sm"
                disabled={syncing || disconnecting}
                className="flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  "Sincronizar Agora"
                )}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
                disabled={syncing || disconnecting}
                className="flex items-center gap-2"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
