import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ORIGIN = "https://vyzon.com.br";

// Rotas públicas que devem ter canonical próprio (self-canonical).
// MANTER SINCRONIZADO com as rotas SEO de App.tsx ao adicionar/remover landings.
// Qualquer rota fora desta lista (home, /landing, app interno, /auth, previews,
// /r/:token) cai no canonical da home.
const SELF_CANONICAL = new Set<string>([
  // /alternativa-*, /para-* e /crm-* despublicadas (301 → home no vercel.json).
  "/changelog",
  "/politica-privacidade",
  "/termos-de-servico",
  "/blog",
]);

// Rotas com slug dinâmico que devem ter canonical próprio (a URL real da página).
// Ex.: /blog/<slug> dos posts. Os posts são prerenderizados (canonical já correto
// no HTML cru); reforçar no client cobre a navegação client-side sem vazar a home.
const SELF_CANONICAL_PREFIXES = ["/blog/"];

/**
 * Mantém <link rel="canonical">, og:url e twitter:url coerentes com a rota.
 *
 * Por que existe: a SPA serve o index.html da home (canonical = "/") em todas
 * as rotas pelo rewrite do Vercel. Sem corrigir no client, o Googlebot (que
 * renderiza JS) vê as landings client-only — /para-* — com
 * canonical apontando para a home e pode tratá-las como duplicatas, deixando
 * de indexá-las. As /crm-* já são prerenderizadas (canonical correto no HTML),
 * mas reforçar aqui com o mesmo valor é inofensivo.
 *
 * Reseta para a home em qualquer rota fora da allowlist, então a navegação
 * client-side de uma landing para a home não vaza o canonical anterior.
 */
export function CanonicalManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isSelf =
      SELF_CANONICAL.has(pathname) ||
      SELF_CANONICAL_PREFIXES.some((p) => pathname.startsWith(p));
    const url = isSelf ? `${ORIGIN}${pathname}` : `${ORIGIN}/`;

    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (link) link.href = url;

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = url;

    const twUrl = document.querySelector<HTMLMetaElement>('meta[name="twitter:url"]');
    if (twUrl) twUrl.content = url;
  }, [pathname]);

  return null;
}
