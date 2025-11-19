import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import logo from "@/assets/logo.png";
import { Mail, Lock, ArrowRight } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128, "Senha muito longa"),
});

const Auth = () => {
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center">
            <img src={logo} alt="Rota de Negócios" className="h-16 w-16 object-contain" />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground text-base">
              Insira suas credenciais para acessar o painel administrativo.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background border-border/50 focus:border-primary"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-background border-border/50 focus:border-primary"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
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
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black shadow-lg hover:shadow-xl transition-all"
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
          </form>

          {/* Footer Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Sistema de uso restrito. Acesso apenas para colaboradores autorizados.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-cyan-500 opacity-90" />
        
        {/* Overlay Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-lg space-y-8 text-center">
            <div className="space-y-4">
              <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <img src={logo} alt="Rota de Negócios" className="h-24 w-24 object-contain" />
              </div>
              <h2 className="text-4xl font-bold">
                Gestão Inteligente de Vendas
              </h2>
              <p className="text-lg text-white/80">
                Controle completo das suas operações comerciais em uma única plataforma.
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="space-y-1">
                <div className="text-3xl font-bold">+50k</div>
                <div className="text-sm text-white/70">Vendas Registradas</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm text-white/70">Satisfação</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm text-white/70">Disponibilidade</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
