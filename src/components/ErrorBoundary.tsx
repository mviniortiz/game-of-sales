import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sentry } from "@/lib/sentry";

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

    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReload = () => {
    window.location.href = "/";
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Algo deu errado</h1>
              <p className="text-gray-500 mt-2">
                Ocorreu um erro inesperado. Tente recarregar a pagina.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleRetry}>
                Tentar novamente
              </Button>
              <Button onClick={this.handleReload} className="bg-emerald-600 hover:bg-emerald-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
