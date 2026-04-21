import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { formatError } from "@/lib/utils";

export default function Perfil() {
  const { user, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("nome, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return;
    if (data) {
      setNome(data.nome);
      setEmail(data.email);
      setAvatarUrl(data.avatar_url);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const filePath = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) {
        toast.error(`Erro ao fazer upload: ${formatError(uploadError)}`);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (error) {
        toast.error(`Erro ao atualizar avatar: ${formatError(error)}`);
      } else {
        setAvatarUrl(publicUrl);
        await refreshProfile();
        toast.success("Avatar atualizado");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ nome }).eq("id", user.id);
    if (error) toast.error(`Erro ao atualizar perfil: ${formatError(error)}`);
    else {
      await refreshProfile();
      toast.success("Perfil atualizado");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <User className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Informações pessoais</h2>
        </div>
        <div className="px-5 py-5 space-y-5">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            userInitials={nome ? getInitials(nome) : "U"}
            onUpload={handleAvatarUpload}
            uploading={uploading}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={email} disabled className="h-9 text-sm bg-muted/50" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} size="sm">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
