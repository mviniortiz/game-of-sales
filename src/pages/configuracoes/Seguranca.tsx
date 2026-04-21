import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { formatError } from "@/lib/utils";

export default function Seguranca() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) toast.error(formatError(error));
      else {
        toast.success("Senha alterada");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (e) {
      toast.error(`Erro ao alterar senha: ${formatError(e)}`);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Alterar senha</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Confirmar</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChange} disabled={changing || !newPassword || !confirmPassword} size="sm">
              {changing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Alterar senha
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Sessões</h2>
        </div>
        <div className="px-5 py-5">
          <p className="text-xs text-muted-foreground">
            Você está conectado neste dispositivo. Em breve, gerencie sessões ativas por aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
