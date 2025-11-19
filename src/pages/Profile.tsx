import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AdminManagement } from "@/components/profile/AdminManagement";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

export default function Profile() {
  const { user, isAdmin, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("nome, email, avatar_url")
      .eq("id", user.id)
      .single();

    if (error) {
      toast.error("Erro ao carregar perfil");
      return;
    }

    if (data) {
      setNome(data.nome);
      setEmail(data.email);
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        toast.error("Erro ao fazer upload da imagem");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        toast.error("Erro ao atualizar avatar");
      } else {
        setAvatarUrl(publicUrl);
        await refreshProfile();
        toast.success("Avatar atualizado com sucesso!");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ nome })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao atualizar perfil");
    } else {
      await refreshProfile();
      toast.success("Perfil atualizado com sucesso!");
    }

    setLoading(false);
  };

  const getUserInitials = () => {
    if (nome) {
      return nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações de perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                userInitials={getUserInitials()}
                onUpload={handleAvatarUpload}
                uploading={uploading}
              />

              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <Button onClick={handleUpdateProfile} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {isAdmin && <AdminManagement />}
        </div>
      </div>
    </AppLayout>
  );
}
