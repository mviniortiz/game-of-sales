import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import brandLogo from "@/assets/logo-full.png";
import { Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import DataFlowBackground from "@/components/auth/DataFlowBackground";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128, "Senha muito longa"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Validate inputs
    const validationResult = authSchema.safeParse({
      email,
      password,
    });

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
    } catch (error: any) {
      toast.error("Erro ao processar sua solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o site
          </Button>

          {/* Logo */}
          <div className="flex items-center animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <img src={brandLogo} alt="Game Sales" className="h-28 w-auto object-contain" />
          </div>

          {/* Header */}
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <h1 className="text-4xl font-bold text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground text-base">
              Insira suas credenciais para acessar o painel administrativo.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-indigo-500/20"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-indigo-500/20"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
              >
                Lembrar de mim
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all animate-fade-in"
              style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
            >
              {loading ? (
                "Entrando..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>

            {/* Register Link */}
            <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
              Não tem uma conta?{" "}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Criar conta
              </Link>
            </p>
          </form>
        </div>

        {/* Footer Note - Fixed at Bottom */}
        <div className="absolute bottom-8 left-0 right-0 text-center px-8 animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
          <p className="text-xs text-gray-600">
            Sistema de uso restrito. Acesso apenas para colaboradores autorizados.
          </p>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-slate-950">
        {/* Dynamic Data Flow Background */}
        <DataFlowBackground />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-lg space-y-6 text-center">
            <h2 className="text-4xl font-bold">
              Inteligência de Vendas em Tempo Real
            </h2>
            <p className="text-lg text-white/80">
              Metas, pipeline, calls e receita em um único painel — com alertas, filtros multiempresa e automações para acelerar decisões.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
