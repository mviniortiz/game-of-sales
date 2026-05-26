import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, MessageCircle, Sparkle, BarChart3 } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128, "Senha muito longa"),
});

// Light premium input — usa tokens semânticos (shadcn/Tailwind).
// Tudo legível em fundo claro (#F3F6FA) e mantém ring azul Vyzon no focus.
const inputClasses =
  "bg-white border-[#E6EDF5] text-[#0B1220] placeholder:text-[#94A3B8] focus-visible:ring-1 focus-visible:ring-[#2563EB]/40 focus-visible:border-[#2563EB]/40 hover:border-[#CBD5E1] h-12 text-base rounded-xl transition-all duration-200";

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        toast.error("Não foi possível entrar com Google: " + error.message);
        setLoading(false);
      }
      // Se OK, redirect acontece pelo Supabase; não volta pra cá
    } catch (err: any) {
      toast.error("Erro no login com Google: " + (err?.message ?? String(err)));
      setLoading(false);
    }
  };

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
    <div className="min-h-screen grid lg:grid-cols-2 relative selection:bg-[#2563EB]/20" style={{ background: "#F3F6FA" }}>
      {/* LEFT PANEL — Brand + Lottie (desktop only) */}
      <div className="hidden lg:flex relative flex-col items-center justify-center overflow-hidden p-12 border-r border-[#E6EDF5]">
        {/* Ambient background — azul sutil em vez de emerald */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.08) 0%, transparent 60%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(11,18,32,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(11,18,32,0.08) 1px, transparent 1px)",
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

          {/* Tagline F2.8: posicionamento novo — EVA + WhatsApp + pipeline + performance */}
          <div className="text-center">
            <h2
              className="font-satoshi text-[26px] sm:text-[28px] font-bold mb-3 leading-[1.08]"
              style={{ color: "#0B1220", letterSpacing: "-0.022em" }}
            >
              Sua operação comercial,<br />organizada pela EVA.
            </h2>
            <p className="text-[14px] max-w-[400px] mx-auto leading-relaxed" style={{ color: "#475569" }}>
              Leads, conversas, pipeline e performance em uma central feita
              para agências que vendem pelo WhatsApp.
            </p>

            {/* 3 bullets discretos */}
            <ul className="mt-6 space-y-2.5 max-w-[340px] mx-auto text-left">
              {[
                { icon: MessageCircle, label: "Leads do WhatsApp organizados" },
                { icon: Sparkle, label: "EVA sugerindo próximos passos" },
                { icon: BarChart3, label: "Pipeline e performance em tempo real" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-[12.5px]"
                  style={{ color: "#475569" }}
                >
                  <span
                    className="inline-flex items-center justify-center h-6 w-6 rounded-md shrink-0"
                    style={{
                      background: "rgba(37,99,235,0.08)",
                      border: "1px solid rgba(37,99,235,0.16)",
                    }}
                  >
                    <Icon className="h-3 w-3" strokeWidth={2.2} style={{ color: "#2563EB" }} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="relative flex items-center justify-center">
        {/* Mobile-only ambient bg */}
        <div className="absolute inset-0 lg:hidden pointer-events-none">
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.06) 0%, transparent 60%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(11,18,32,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11,18,32,0.06) 1px, transparent 1px)",
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
            style={{ color: "#64748B" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0B1220")}
            onMouseLeave={e => (e.currentTarget.style.color = "#64748B")}
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
            background: "#FFFFFF",
            boxShadow: "0 0 0 1px rgba(11,18,32,0.06), 0 1px 3px rgba(11,18,32,0.04), 0 24px 64px -16px rgba(37,99,235,0.10)",
          }}
        >
          {/* Top accent line — azul Vyzon */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.4) 50%, transparent)" }}
          />

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <ThemeLogo className="h-10" />
          </div>

          {/* Header (F2.8: Satoshi) */}
          <div className="text-center mb-8">
            <h1
              className="font-satoshi text-[24px] sm:text-[26px] font-bold mb-2 leading-tight"
              style={{ color: "#0B1220", letterSpacing: "-0.022em" }}
            >
              Bem-vindo de volta
            </h1>
            <p style={{ color: "#64748B", fontSize: "0.875rem" }}>
              Entre na sua conta para acessar o painel.
            </p>
          </div>

          {/* SSO Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || authLoading}
            className="w-full h-12 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2.5 mb-5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E6EDF5",
              color: "#0B1220",
              boxShadow: "0 1px 2px rgba(11,18,32,0.04)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "#E6EDF5" }} />
            <span className="text-[11px]" style={{ color: "#94A3B8" }}>ou com email</span>
            <div className="flex-1 h-px" style={{ background: "#E6EDF5" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-[#334155] text-sm font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94A3B8" }} />
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
                <Label className="text-[#334155] text-sm font-medium">
                  Senha
                </Label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94A3B8" }} />
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
                  style={{ color: "#94A3B8" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#64748B")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
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
                background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                boxShadow: "0 0 0 1px rgba(37,99,235,0.3), 0 4px 20px rgba(37,99,235,0.25)",
              }}
              whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 0 1px rgba(37,99,235,0.4), 0 8px 32px rgba(37,99,235,0.35)" } : undefined}
              whileTap={!loading ? { scale: 0.98 } : undefined}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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
            <div className="flex-1 h-px" style={{ background: "#E6EDF5" }} />
            <span className="text-[11px]" style={{ color: "#94A3B8" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "#E6EDF5" }} />
          </div>

          {/* Register link */}
          <p className="text-center text-sm" style={{ color: "#64748B" }}>
            Não tem uma conta?{" "}
            <Link
              to="/onboarding"
              className="text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
            >
              Criar conta grátis
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <p className="text-center mt-6 text-[11px]" style={{ color: "#CBD5E1" }}>
          © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
        </p>
      </div>
      </div>
    </div>
  );
};

export default Auth;
