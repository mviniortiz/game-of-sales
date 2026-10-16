import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { logger } from "@/utils/logger";
import { APP_HOME } from "@/config/routes";
import { useAuth } from "@/contexts/AuthContext";
import { EvaBot } from "@/components/eva/EvaBot";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

const PRESS = "transition-[opacity,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ibx-paper)]";

// A mesma página serve o site e o app: quem está logado volta para o app,
// quem chegou de fora volta para o site e o Raio-X grátis.
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logado = !!user;

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const atalhos = logado
    ? [{ to: "/inbox", label: "Inbox" }, { to: "/pipeline", label: "Pipeline" }]
    : [{ to: "/#raio-x", label: "Raio-X grátis" }, { to: "/blog", label: "Blog" }];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ibx-paper)] text-[var(--vyz-text-primary)]">
      <header className="px-5 sm:px-8 pt-5">
        <Link to={logado ? APP_HOME : "/"} aria-label="Vyzon" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]">
          <ThemeLogo className="h-7 w-auto" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[440px] text-center">
          <div className="mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-[28px] border border-[var(--ibx-line)] bg-[var(--ibx-card)] shadow-[0_1px_2px_rgba(28,25,23,0.05),0_18px_40px_-22px_rgba(28,25,23,0.28)]">
            <EvaBot state="pondering" size={76} />
          </div>

          <p className="mt-7 text-[12px] font-medium tabular-nums text-[var(--vyz-text-muted)]">Erro 404</p>
          <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-semibold leading-[1.1] tracking-[-0.03em]">
            Essa página não existe.
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--vyz-text-muted)]">
            O endereço{" "}
            <code className="rounded-md bg-[var(--ibx-sunken)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--vyz-text-strong)] break-all">{location.pathname}</code>{" "}
            pode ter mudado ou estar escrito errado.
          </p>

          <div className="mt-7 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(logado ? APP_HOME : "/"))}
              className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--ibx-line)] bg-[var(--ibx-card)] px-5 text-[14px] font-semibold text-[var(--vyz-text-primary)] hover:border-[var(--ibx-line-strong)] hover:bg-[var(--ibx-paper)] ${PRESS}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Voltar
            </button>
            <Link
              to={logado ? APP_HOME : "/"}
              className={`inline-flex h-11 items-center justify-center rounded-full bg-[var(--vyz-btn-solid)] px-5 text-[14px] font-semibold text-[var(--vyz-btn-on)] hover:opacity-90 ${PRESS}`}
            >
              {logado ? "Abrir o Vyzon" : "Ir para o site"}
            </Link>
          </div>

          <nav aria-label="Atalhos" className="mt-8 flex items-center justify-center gap-1 text-[13px]">
            <span className="text-[var(--vyz-text-muted)]">Ou vá direto para</span>
            {atalhos.map((a, i) => (
              <span key={a.to} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-[var(--vyz-text-muted)]">ou</span>}
                <Link to={a.to} className="font-medium text-[var(--vyz-accent)] hover:underline focus-visible:outline-none focus-visible:underline">
                  {a.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
