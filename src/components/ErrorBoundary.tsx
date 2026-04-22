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
        <div className="min-h-screen flex items-center justify-center bg-[#0D1421] px-4 py-6 relative overflow-hidden">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.04] blur-3xl" />
          </div>

          <div className="relative w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8 text-center">
              {/* Icon */}
              <div className="mx-auto mb-5 w-12 h-12 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-400" strokeWidth={2} />
              </div>

              {/* Title + description */}
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-2">
                Algo deu errado
              </h1>
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar a página.
              </p>

              {/* Dev error details */}
              {isDev && errorMessage && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3 py-2 text-left">
                  <p className="text-[10px] uppercase tracking-wider text-red-400/80 font-medium mb-1">
                    Detalhes (dev)
                  </p>
                  <p className="text-[11px] text-red-300/90 font-mono break-words">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors flex-1"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={this.handleReload}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Recarregar
                </button>
              </div>
            </div>

            {/* Support hint */}
            <p className="mt-4 text-center text-[11px] text-white/40">
              Se o problema persistir, contate o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
