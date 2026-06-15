import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
// NÃO importe @/lib/sentry estaticamente — puxa Sentry SDK (~150kB gzip) pro critical path da landing.
// captureException é resolvido dinâmico dentro de componentDidCatch.

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);

    // Auto-reload on stale chunk errors (happens after new deploys)
    const msg = error.message || "";
    if (
      msg.includes("dynamically imported module") ||
      msg.includes("Failed to fetch") ||
      msg.includes("Loading chunk") ||
      msg.includes("Loading CSS chunk")
    ) {
      const reloadKey = "chunk_reload_ts";
      const lastReload = Number(sessionStorage.getItem(reloadKey) || "0");
      // Only auto-reload once per 30s to avoid infinite loops
      if (Date.now() - lastReload > 30000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        window.location.reload();
        return;
      }
    }

    import("@/lib/sentry").then(({ captureException }) => {
      captureException(error, { componentStack: errorInfo.componentStack });
    }).catch(() => {});
  }

  handleReload = () => {
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ background: "#F8FAFC" }}>
          <div className="w-full max-w-md">
            <div
              className="rounded-2xl bg-white p-6 sm:p-8 text-center"
              style={{ boxShadow: "0 0 0 1px #E6EDF5, 0 18px 48px -24px rgba(15,23,42,0.3)" }}
            >
              {/* Icon */}
              <div
                className="mx-auto mb-5 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.1)" }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: "#D97706" }} strokeWidth={2} />
              </div>

              {/* Title + description */}
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ color: "#0B1220" }}>
                Algo deu errado
              </h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#64748B" }}>
                Ocorreu um erro inesperado. Você pode tentar de novo ou recarregar a página.
              </p>

              {/* Dev error details */}
              {isDev && errorMessage && (
                <div
                  className="mb-6 rounded-lg px-3 py-2 text-left"
                  style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.18)" }}
                >
                  <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#B91C1C" }}>
                    Detalhes (dev)
                  </p>
                  <p className="text-[11px] font-mono break-words" style={{ color: "#B91C1C" }}>
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold flex-1 transition-colors hover:brightness-95"
                  style={{ background: "#F1F5F9", color: "#475569" }}
                >
                  Tentar novamente
                </button>
                <button
                  onClick={this.handleReload}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white flex-1 transition-transform hover:-translate-y-px"
                  style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", boxShadow: "0 4px 20px -6px rgba(37,99,235,0.5)" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Recarregar
                </button>
              </div>
            </div>

            {/* Support hint */}
            <p className="mt-4 text-center text-[11px]" style={{ color: "#94A3B8" }}>
              Se o problema persistir, fale com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
