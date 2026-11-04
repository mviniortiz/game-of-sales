import { useSearchParams } from "react-router-dom";

// Só em dev: ?preview=1 abre as abas de Configurações sem login (ver AppShell).
// No build de produção import.meta.env.DEV é false e isto sempre devolve false.
export function usePreviewConfig(): boolean {
  const [params] = useSearchParams();
  return import.meta.env.DEV && !!params.get("preview");
}
