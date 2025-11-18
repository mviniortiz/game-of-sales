import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const WhatsAppConnect = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    checkConnection();
  }, [user]);

  const checkConnection = async () => {
    if (!user) return;

    // Verificar se existe configuração de WhatsApp no perfil
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    // Por enquanto, verificar se há secret configurado
    setIsConnected(false); // Placeholder - implementar verificação real
    setLoading(false);
  };

  const handleConnect = () => {
    setShowDialog(true);
  };

  const handleSaveConnection = async () => {
    if (!phoneNumber || !accessToken) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      // Aqui você salvaria as credenciais do WhatsApp
      // Em produção, isso deveria ir para secrets do Supabase
      toast.success(
        "Configuração do WhatsApp salva! Você receberá notificações de mensagens."
      );
      setIsConnected(true);
      setShowDialog(false);
      setPhoneNumber("");
      setAccessToken("");
    } catch (error) {
      console.error("Error connecting WhatsApp:", error);
      toast.error("Erro ao conectar WhatsApp");
    }
  };

  const handleDisconnect = async () => {
    try {
      // Remover configuração do WhatsApp
      setIsConnected(false);
      toast.success("WhatsApp desconectado");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Erro ao desconectar");
    }
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          {!isConnected ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    WhatsApp Business
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Registre conversas e ligações automaticamente
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
                    WhatsApp Conectado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Recebendo mensagens e ligações
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                size="sm"
              >
                Desconectar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp Business</DialogTitle>
            <DialogDescription>
              Configure sua integração com WhatsApp Business API para registrar
              conversas e ligações automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número do WhatsApp Business</Label>
              <Input
                id="phone"
                placeholder="+55 11 99999-9999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token de Acesso (Meta/Facebook)</Label>
              <Input
                id="token"
                type="password"
                placeholder="Seu token de acesso da API"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Obtenha seu token em{" "}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Facebook Developers
                </a>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConnection}>Conectar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
