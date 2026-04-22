import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128, "Senha muito longa"),
});

const inputClasses =
  "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.25)] focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/40 hover:border-[rgba(255,255,255,0.15)] h-12 text-base rounded-xl transition-all duration-200";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, isSuperAdmin, companyId, loading: authLoading } = useAuth();

  useEffect(() => {
    const hasValidAccessContext = !!profile && (profile.is_super_admin || isSuperAdmin || !!companyId);
    if (!authLoading && user && hasValidAccessContext) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, profile, isSuperAdmin, companyId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    const validationResult = authSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(validationResult.data.email, validationResult.data.password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha inválidos");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } catch {
      toast.error("Erro ao processar sua solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative selection:bg-emerald-500/30" style={{ background: "#06080a" }}>
      {/* LEFT PANEL — Brand + Lottie (desktop only) */}
      <div className="hidden lg:flex relative flex-col items-center justify-center overflow-hidden p-12 border-r border-white/5">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(0,227,122,0.10) 0%, transparent 60%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-lg"
        >
          {/* Lottie scene */}
          <div className="w-full aspect-square max-w-[480px] mx-auto mb-8">
            <DotLottieReact
              src="/animations/login-scene.lottie"
              loop
              autoplay
            />
          </div>

          {/* Tagline */}
          <div className="text-center">
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
            >
              Sua operação de vendas,<br />jogada como um campeonato.
            </h2>
            <p className="text-sm max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Ranking, metas, calls e pipeline num único lugar — com a Eva AI lendo seus dados pra você.
            </p>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="relative flex items-center justify-center">
        {/* Mobile-only ambient bg */}
        <div className="absolute inset-0 lg:hidden pointer-events-none">
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
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </motion.div>

        {/* Card */}
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

          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
            >
              Bem-vindo de volta
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
              Entre na sua conta para acessar o painel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                  Senha
                </Label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClasses} pl-10 pr-10`}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || authLoading}
              className="w-full h-12 rounded-xl text-white font-bold text-[15px] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #00E37A, #00B289)",
                boxShadow: "0 0 0 1px rgba(0,227,122,0.3), 0 4px 20px rgba(0,227,122,0.25)",
              }}
              whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 0 1px rgba(0,227,122,0.4), 0 8px 32px rgba(0,227,122,0.35)" } : undefined}
              whileTap={!loading ? { scale: 0.98 } : undefined}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading || authLoading ? (
                <span className="relative flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  Entrar
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Register link */}
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Não tem uma conta?{" "}
            <Link
              to="/onboarding"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Criar conta grátis
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <p className="text-center mt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
          © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
        </p>
      </div>
      </div>
    </div>
  );
};

export default Auth;
