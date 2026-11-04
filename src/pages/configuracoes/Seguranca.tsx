import { useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";
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
    <div className="vp-pilha">
      <section className="vp-cartao" aria-labelledby="seg-senha">
        <h2 id="seg-senha" className="vp-rotulo">Alterar senha</h2>
        <p className="vp-sub">Mínimo de 8 caracteres.</p>
        <div className="mt-5 grid gap-x-4 sm:grid-cols-2">
          <SenhaCampo
            label="Nova senha"
            placeholder="Mínimo 8 caracteres"
            value={newPassword}
            onChange={setNewPassword}
            visivel={showNew}
            onAlternar={() => setShowNew(!showNew)}
          />
          <SenhaCampo
            label="Confirmar"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visivel={showConfirm}
            onAlternar={() => setShowConfirm(!showConfirm)}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="vp-botao"
            onClick={handleChange}
            disabled={changing || !newPassword || !confirmPassword}
          >
            {changing && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
            Alterar senha
          </button>
        </div>
      </section>

      <section className="vp-cartao" aria-labelledby="seg-sessoes">
        <h2 id="seg-sessoes" className="vp-rotulo">Sessões</h2>
        <p className="vp-sub">
          Você está conectado neste dispositivo. Em breve, gerencie sessões ativas por aqui.
        </p>
      </section>
    </div>
  );
}

function SenhaCampo({
  label,
  placeholder,
  value,
  onChange,
  visivel,
  onAlternar,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  visivel: boolean;
  onAlternar: () => void;
}) {
  const id = useId();
  return (
    <div className="vp-campo">
      <label className="vp-rotulo" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={onAlternar}
          aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="vp-icone vp-icone--chico absolute right-1 top-1/2 -translate-y-1/2"
        >
          {visivel ? <EyeSlash size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
