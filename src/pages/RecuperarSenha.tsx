import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const emailSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
});

const inputClasses =
  "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.25)] focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/40 hover:border-[rgba(255,255,255,0.15)] h-12 text-base rounded-xl transition-all duration-200";

const RecuperarSenha = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Preencha o campo de email");
      return;
    }

    const validationResult = emailSchema.safeParse({ email });
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/redefinir-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        validationResult.data.email,
        { redirectTo: redirectUrl }
      );

      if (error) {
        toast.error("Erro ao enviar email de recuperação");
      } else {
        setEmailEnviado(true);
        toast.success("Email enviado! Verifique sua caixa de entrada.");
      }
    } catch {
      toast.error("Erro ao processar sua solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative selection:bg-emerald-500/30" style={{ background: "var(--vyz-bg)" }}>
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(0,227,122,0.06) 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 py-12">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-1.5 text-sm transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px -12px rgba(0,0,0,0.5)",
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,227,122,0.3) 50%, transparent)" }}
          />

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <ThemeLogo className="h-10" />
          </div>

          {!emailEnviado ? (
            <>
              <div className="text-center mb-8">
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
                >
                  Recuperar senha
                </h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
                  Digite seu email para receber as instruções.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                    <Input
                      type="email"
                      placeholder="voce@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${inputClasses} pl-10`}
                      required
                      autoComplete="email"
                      autoFocus
                      disabled={loading}
                      maxLength={255}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-bold text-[15px] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #00E37A, #00B289)",
                    boxShadow: "0 0 0 1px rgba(0,227,122,0.3), 0 4px 20px rgba(0,227,122,0.25)",
                  }}
                  whileHover={!loading ? { scale: 1.02 } : undefined}
                  whileTap={!loading ? { scale: 0.98 } : undefined}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {loading ? (
                    <span className="relative flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="relative flex items-center justify-center gap-2">
                      Enviar link de recuperação
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </motion.button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center"
              >
                <MailCheck className="h-8 w-8 text-emerald-400" />
              </motion.div>

              <div>
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
                >
                  Email enviado
                </h1>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem" }}>
                  Se o email estiver cadastrado, você receberá um link pra redefinir sua senha em instantes. Verifique a caixa de entrada e o spam.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setEmailEnviado(false)}
                  className="w-full h-11 rounded-xl text-sm transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Enviar novamente
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/auth")}
                  className="text-sm transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                >
                  Voltar para o login
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <p className="text-center mt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
          © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default RecuperarSenha;
