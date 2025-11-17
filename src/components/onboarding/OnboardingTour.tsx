import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: string;
  route?: string;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const steps: Step[] = [
  {
    title: "Bem-vindo à Rota de Negócios! 🎉",
    description: "Vamos fazer um tour rápido pelas principais funcionalidades do sistema. Este tutorial levará apenas 2 minutos.",
    icon: "👋",
    position: "center"
  },
  {
    title: "Dashboard - Seu Centro de Controle 📊",
    description: "Aqui você acompanha suas métricas em tempo real: vendas do mês, pontos acumulados, nível atual e progresso para o próximo nível. É sua visão geral de desempenho!",
    icon: "📊",
    route: "/",
    position: "center"
  },
  {
    title: "Registrar Nova Venda 💰",
    description: "A forma mais rápida de adicionar suas vendas! Preencha os dados do cliente, produto, valor e forma de pagamento. Cada venda te dá pontos: R$ 1,00 = 1 ponto!",
    icon: "💰",
    route: "/nova-venda",
    position: "center"
  },
  {
    title: "Ranking - Compete com a Equipe 🏆",
    description: "Veja sua posição em relação aos outros vendedores. Quanto mais vendas, mais pontos, maior seu nível e melhor sua posição no ranking!",
    icon: "🏆",
    route: "/ranking",
    position: "center"
  },
  {
    title: "Metas - Acompanhe seu Progresso 🎯",
    description: "Defina e acompanhe suas metas mensais. Veja seu progresso em tempo real e mantenha-se motivado para alcançar seus objetivos!",
    icon: "🎯",
    route: "/metas",
    position: "center"
  },
  {
    title: "Pronto para Começar! 🚀",
    description: "Agora você conhece o básico! Comece registrando sua primeira venda e suba de nível. Boa sorte e boas vendas!",
    icon: "🚀",
    route: "/nova-venda",
    position: "center"
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const step = steps[currentStep];
    if (step.route && currentStep > 0) {
      navigate(step.route);
    }
  }, [currentStep, navigate]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  const getPositionClasses = () => {
    switch (step.position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      default:
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in" />

      {/* Tour Card */}
      <Card 
        className={`fixed ${getPositionClasses()} w-full max-w-lg z-50 shadow-2xl border-2 border-primary/20 animate-scale-in`}
      >
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{step.icon}</span>
              <div>
                <CardTitle className="text-xl">{step.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Passo {currentStep + 1} de {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>

        <CardContent>
          <p className="text-base leading-relaxed">{step.description}</p>
        </CardContent>

        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentStep < steps.length - 1 && (
              <Button variant="ghost" onClick={handleSkip}>
                Pular Tutorial
              </Button>
            )}
            <Button onClick={handleNext} className="gap-2">
              {currentStep === steps.length - 1 ? "Começar" : "Próximo"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
};
