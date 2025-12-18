import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import brandLogo from "@/assets/logo-full.png";
import { MouseEffect } from "@/components/auth/MouseEffect";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const emailSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
});

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
      const redirectUrl = `${window.location.origin}/auth`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        validationResult.data.email,
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        toast.error("Erro ao enviar email de recuperação");
      } else {
        setEmailEnviado(true);
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      }
    } catch (error: any) {
      toast.error("Erro ao processar sua solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4 relative overflow-hidden">
      <MouseEffect />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-8 animate-fade-in">
            <img src={brandLogo} alt="Game Sales" className="h-28 w-auto object-contain hover-scale" />
          </div>
        </div>

        <Card className="border-border/50 shadow-card backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle>Recuperar Senha</CardTitle>
            <CardDescription>
              {emailEnviado
                ? "Email enviado! Verifique sua caixa de entrada e spam."
                : "Digite seu email para receber as instruções de recuperação"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailEnviado ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    maxLength={255}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Email de Recuperação"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para o Login
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Não recebeu o email? Verifique sua pasta de spam ou tente novamente.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailEnviado(false)}
                >
                  Enviar Novamente
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para o Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecuperarSenha;
