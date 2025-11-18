import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Check } from "lucide-react";

export const GoogleCalendarConnect = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      
      // Chamar edge function para obter URL de autorização
      const response = await supabase.functions.invoke("google-oauth-init", {
        body: { userId: user!.id },
      });

      if (response.error) throw response.error;

      // Redirecionar para autorização do Google
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      toast.error("Erro ao iniciar conexão com Google Calendar");
      setLoading(false);
    }
  };

  const syncAllEvents = async () => {
    try {
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
        `${response.data.synced} eventos sincronizados do Google Calendar!`
      );
    } catch (error) {
      console.error("Error syncing events:", error);
      toast.error("Erro ao sincronizar eventos");
    }
  };

  const handleDisconnect = async () => {
    try {
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
      toast.success("Desconectado do Google Calendar");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Erro ao desconectar");
    }
  };

  if (loading) {
    return null;
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
            <Button onClick={handleConnect} variant="outline" size="sm">
              Conectar
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
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sincronização automática ativa
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={syncAllEvents}
                variant="outline"
                size="sm"
              >
                Sincronizar
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
              >
                Desconectar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
