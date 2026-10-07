import { lazy, Suspense } from "react";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CanonicalManager } from "@/components/CanonicalManager";

const AppShell = lazy(() => import("./AppShell"));
// Personas /para-* DESPUBLICADAS: /para-infoprodutores + /para-saas-b2b removidas
// (2026-06-16, foco único na home/agências); /para-agencias já estava off.
// Todas 301 → home no vercel.json.

// SEO landings /crm-* DESPUBLICADAS (2026-06-10): posicionamento antigo
// ("CRM gamificado/ranking"), conflita com o foco atual em agências/conversa.
// Rotas viram 301 → home no vercel.json. Componentes/configs em src/pages/seo/
// preservados pra eventual republicação. Reativar = descomentar import + rota
// + remover redirect + readicionar ao sitemap e à allowlist do CanonicalManager.
// const CrmGamificado = lazy(() => import("./pages/seo/CrmGamificado"));
// const CrmComRanking = lazy(() => import("./pages/seo/CrmComRanking"));
// const CrmParaTimes = lazy(() => import("./pages/seo/CrmParaTimes"));

// Home = integradores de energia solar (Raio-X grátis). A landing de agência
// (LandingV2) vive em /agencias; /landing e /orcamento são 301 no vercel.json.
// O login v2 virou a página de /auth (dentro do AppShell, com AuthProvider).
const SolarLanding = lazy(() => import("./pages/SolarLanding"));
const LandingV2 = lazy(() => import("./pages/LandingV2"));
const RaioXReport = lazy(() => import("./pages/RaioXReport"));

// Página por ângulo de anúncio; ângulo desconhecido cai na home.
const SolarAngleRoute = () => {
  const { angulo } = useParams();
  if (angulo !== "parado" && angulo !== "vou-pensar") return <Navigate to="/" replace />;
  return <Suspense fallback={<LazyFallback />}><SolarLanding angle={angulo} /></Suspense>;
};
const BlogV2 = lazy(() => import("./pages/BlogV2"));
const BlogPostV2 = lazy(() => import("./pages/BlogPostV2"));
const Alternativas = lazy(() => import("./pages/Alternativas"));
const EvaVoz = lazy(() => import("./pages/EvaVoz"));

// Página temporária de calibração da EvaEntity (remover depois de plugar à lógica).
const EvaEntityTest = lazy(() => import("./pages/EvaEntityTest"));

// Página temporária de validação da nova lateral da EVA na Inbox (remover após integrar).
const EvaAssistPreview = lazy(() => import("./pages/EvaAssistPreview"));

// Página temporária de validação da nova lista de conversas do Inbox (remover após integrar).

// Página temporária de validação do novo EVA Studio, frente a frente (remover após integrar).
const EvaStudioPreview = lazy(() => import("./pages/EvaStudioPreview"));
const EvaNudgePreview = lazy(() => import("./pages/EvaNudgePreview"));
const EvaSuggestionPreview = lazy(() => import("./pages/EvaSuggestionPreview"));
const UpgradeLockPreview = lazy(() => import("./pages/admin/UpgradeLock"));

const LazyFallback = () => <BrandedLoader />;

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <CanonicalManager />
      <Routes>
        <Route path="/" element={<Suspense fallback={<LazyFallback />}><SolarLanding /></Suspense>} />
        <Route path="/raio-x/:angulo" element={<SolarAngleRoute />} />
        <Route path="/relatorio/:token" element={<Suspense fallback={<LazyFallback />}><RaioXReport /></Suspense>} />
        <Route path="/agencias" element={<Suspense fallback={<LazyFallback />}><LandingV2 /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={<LazyFallback />}><BlogV2 /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={<LazyFallback />}><BlogPostV2 /></Suspense>} />
        <Route path="/alternativas" element={<Suspense fallback={<LazyFallback />}><Alternativas /></Suspense>} />
        <Route path="/eva-voz" element={<Suspense fallback={<LazyFallback />}><EvaVoz /></Suspense>} />
        {/* Personas /para-* despublicadas 2026-06-16 — 301 → home no vercel.json. */}
        {/* /alternativa-* individuais → /alternativas (hub republicado 2026-07-22). */}
        {/* Rotas /crm-* despublicadas 2026-06-10 — 301 → home no vercel.json. */}
        <Route
          path="/eva-entity-test"
          element={
            <Suspense fallback={<LazyFallback />}>
              <EvaEntityTest />
            </Suspense>
          }
        />
        <Route
          path="/eva-assist-preview"
          element={
            <Suspense fallback={<LazyFallback />}>
              <EvaAssistPreview />
            </Suspense>
          }
        />
        <Route
          path="/eva-studio-preview"
          element={
            <Suspense fallback={<LazyFallback />}>
              <EvaStudioPreview />
            </Suspense>
          }
        />
        <Route
          path="/eva-nudge-preview"
          element={
            <Suspense fallback={<LazyFallback />}>
              <EvaNudgePreview />
            </Suspense>
          }
        />
        <Route
          path="/eva-suggestion-preview"
          element={
            <Suspense fallback={<LazyFallback />}>
              <EvaSuggestionPreview />
            </Suspense>
          }
        />
        <Route
          path="/upgrade-lock-preview"
          element={
            <Suspense fallback={<LazyFallback />}>
              <UpgradeLockPreview />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<LazyFallback />}>
              <AppShell />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
