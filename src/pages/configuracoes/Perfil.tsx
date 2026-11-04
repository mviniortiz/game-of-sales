import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CircleNotch } from "@phosphor-icons/react";
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
    <section className="vp-cartao" aria-labelledby="perfil-dados">
      <h2 id="perfil-dados" className="vp-rotulo">Informações pessoais</h2>
      <p className="vp-sub">Seu nome e sua foto, como aparecem para o seu time.</p>
      <div className="mt-5">
        <AvatarUpload
          currentAvatarUrl={avatarUrl}
          userInitials={nome ? getInitials(nome) : "U"}
          onUpload={handleAvatarUpload}
          uploading={uploading}
        />
      </div>
      <div className="mt-5 grid gap-x-4 sm:grid-cols-2">
        <label className="vp-campo">
          <span className="vp-rotulo">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        </label>
        <label className="vp-campo">
          <span className="vp-rotulo">Email</span>
          <input value={email} disabled />
        </label>
      </div>
      <div className="flex justify-end">
        <button type="button" className="vp-botao" onClick={handleSave} disabled={loading}>
          {loading && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
          Salvar
        </button>
      </div>
    </section>
  );
}
