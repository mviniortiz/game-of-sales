import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface Step {
  title: string;
  description: string;
  target?: string; // data-tour attribute
  position?: "top" | "bottom" | "left" | "right";
  route?: string; // route to navigate to
}

const steps: Step[] = [
  {
    title: "Bem-vindo ao Game Sales! 🎉",
    description: "Vamos configurar sua máquina de vendas. Este tour rápido vai te mostrar os recursos principais.",
  },
  {
    title: "Seus Números em Tempo Real 📊",
    description: "Aqui você acompanha seu faturamento, ticket médio e total de transações. Seus KPIs sempre à vista!",
    target: "dashboard-stats",
    position: "bottom",
    route: "/",
  },
  {
    title: "Registre Suas Vendas 💰",
    description: "A ação mais importante! Clique aqui para adicionar vendas e ganhar pontos. Cada R$ 1,00 = 1 ponto.",
    target: "register-sale-btn",
    position: "right",
    route: "/",
  },
  {
    title: "Compete com o Time 🏆",
    description: "Acompanhe sua posição no ranking. Quanto mais vendas, mais pontos, maior seu nível!",
    target: "ranking-section",
    position: "top",
    route: "/ranking",
  },
  {
    title: "Pronto para Decolar! 🚀",
    description: "Você está preparado! Comece registrando sua primeira venda e suba de nível. Boa sorte!",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    // Navigate to the route if specified
    if (step.route) {
      navigate(step.route);
    }
  }, [currentStep, step.route, navigate]);

  useEffect(() => {
    if (step.target) {
      // Wait a bit for navigation and render to complete
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-tour="${step.target}"]`);
        if (element) {
          const rect = element.getBoundingClientRect();
          setSpotlightRect(rect);
          
          // Calculate tooltip position based on preferred position
          const positionTimer = setTimeout(() => {
            if (tooltipRef.current) {
              const tooltipRect = tooltipRef.current.getBoundingClientRect();
              let top = 0;
              let left = 0;

              switch (step.position) {
                case "right":
                  top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                  left = rect.right + 20;
                  break;
                case "left":
                  top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                  left = rect.left - tooltipRect.width - 20;
                  break;
                case "top":
                  top = rect.top - tooltipRect.height - 20;
                  left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                  break;
                case "bottom":
                default:
                  top = rect.bottom + 20;
                  left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                  break;
              }

              // Ensure tooltip stays within viewport
              const padding = 20;
              if (left < padding) left = padding;
              if (left + tooltipRect.width > window.innerWidth - padding) {
                left = window.innerWidth - tooltipRect.width - padding;
              }
              if (top < padding) top = padding;
              if (top + tooltipRect.height > window.innerHeight - padding) {
                top = window.innerHeight - tooltipRect.height - padding;
              }

              setTooltipPosition({ top, left });
            }
          }, 100);

          // Scroll element into view
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          
          return () => clearTimeout(positionTimer);
        } else {
          console.warn(`[Tour] Element not found: ${step.target}`);
          // Se o elemento não for encontrado, apenas centraliza o tooltip
          setSpotlightRect(null);
        }
      }, 500); // Increased delay to ensure page is fully loaded

      return () => clearTimeout(timer);
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep, step]);

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

  return (
    <>
      {/* Dark Overlay with Spotlight */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="hsl(var(--background))"
            fillOpacity="0.85"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight Border - Neon Cyan */}
        {spotlightRect && (
          <div
            className="absolute border-2 border-indigo-500 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-pulse pointer-events-none transition-all duration-300"
            style={{
              top: spotlightRect.top - 8,
              left: spotlightRect.left - 8,
              width: spotlightRect.width + 16,
              height: spotlightRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Tooltip Card */}
      <Card
        ref={tooltipRef}
        className={`fixed z-[9999] w-full max-w-md shadow-2xl border-2 border-indigo-500/50 bg-card/95 backdrop-blur-sm animate-scale-in pointer-events-auto ${
          !step.target ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
        }`}
        style={
          step.target
            ? {
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
              }
            : undefined
        }
      >
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-1">{step.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="h-8 w-8 -mr-2 -mt-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-3 h-1.5 bg-muted" />
        </CardHeader>

        <CardContent className="py-3">
          <p className="text-sm leading-relaxed text-foreground/90">{step.description}</p>
        </CardContent>

        <CardFooter className="flex justify-between gap-2 pt-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentStep < steps.length - 1 && (
              <Button variant="ghost" onClick={onSkip} size="sm">
                Pular
              </Button>
            )}
            <Button onClick={handleNext} className="gap-2" size="sm">
              {currentStep === steps.length - 1 ? "Começar! 🚀" : "Próximo"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
};
