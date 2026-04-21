import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/utils/logger";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-64 h-64 sm:w-80 sm:h-80 -mb-4">
          <DotLottieReact
            src="/animations/404-cat.lottie"
            loop
            autoplay
          />
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-emerald-200/70 dark:ring-emerald-500/20 mb-3">
          Erro 404
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Essa página se perdeu
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          A rota <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">{location.pathname}</code> não existe ou foi movida.
        </p>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-1.5" />
              Ir pro dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
