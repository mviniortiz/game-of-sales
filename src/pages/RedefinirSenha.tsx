import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha muito longa"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const inputClasses =
  "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.25)] focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/40 hover:border-[rgba(255,255,255,0.15)] h-12 text-base rounded-xl transition-all duration-200";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sets the session automatically from the recovery link hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });

    // Also check if there's already a session (link might have already been processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const msg = result.error.errors[0]?.message || "Dados inválidos";
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        if (error.message.includes("same_password")) {
          toast.error("A nova senha deve ser diferente da anterior.");
        } else {
          toast.error(error.message || "Erro ao redefinir senha.");
        }
      } else {
        setSuccess(true);
        toast.success("Senha redefinida com sucesso!");
      }
    } catch {
      toast.error("Erro ao processar sua solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative selection:bg-emerald-500/30" style={{ background: "var(--vyz-bg)" }}>
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(0,227,122,0.06) 0%, transparent 60%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6">
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

          {success ? (
            /* Success state */
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </motion.div>

              <div>
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
                >
                  Senha redefinida!
                </h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
                  Sua senha foi alterada com sucesso. Agora você pode fazer login.
                </p>
              </div>

              <motion.button
                onClick={() => navigate("/auth")}
                className="w-full h-12 rounded-xl text-white font-bold text-[15px] relative overflow-hidden group"
                style={{
                  background: "linear-gradient(135deg, #00E37A, #00B289)",
                  boxShadow: "0 0 0 1px rgba(0,227,122,0.3), 0 4px 20px rgba(0,227,122,0.25)",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative flex items-center justify-center gap-2">
                  Ir para o Login
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            </div>
          ) : !sessionReady ? (
            /* Loading / waiting for session */
            <div className="text-center space-y-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
              <div>
                <h1
                  className="text-xl font-bold mb-2"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  Verificando...
                </h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
                  Aguarde enquanto validamos seu link de recuperação.
                </p>
              </div>

              <button
                onClick={() => navigate("/recuperar-senha")}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors mt-4"
              >
                Link expirou? Solicitar novo
              </button>
            </div>
          ) : (
            /* Reset form */
            <>
              <div className="text-center mb-8">
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
                >
                  Redefinir senha
                </h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
                  Digite sua nova senha abaixo.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div className="space-y-1.5">
                  <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClasses} pl-10 pr-10`}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                    Confirmar nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${inputClasses} pl-10`}
                      required
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-rose-400 mt-1">As senhas não coincidem</p>
                  )}
                </div>

                {/* Submit */}
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
                  {loading ? (
                    <span className="relative flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redefinindo...
                    </span>
                  ) : (
                    <span className="relative flex items-center justify-center gap-2">
                      Redefinir senha
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </motion.button>
              </form>
            </>
          )}
        </motion.div>

        <p className="text-center mt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
          © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default RedefinirSenha;
