import { lazy, Suspense } from "react";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CanonicalManager } from "@/components/CanonicalManager";
import LandingPage from "./pages/LandingPage";

const AppShell = lazy(() => import("./AppShell"));
// Personas /para-* DESPUBLICADAS: /para-infoprodutores + /para-saas-b2b removidas
// (2026-06-16, foco único na home/agências); /para-agencias já estava off.
// Todas 301 → home no vercel.json.
const PublicReport = lazy(() => import("./pages/PublicReport"));

// SEO landings /crm-* DESPUBLICADAS (2026-06-10): posicionamento antigo
// ("CRM gamificado/ranking"), conflita com o foco atual em agências/conversa.
// Rotas viram 301 → home no vercel.json. Componentes/configs em src/pages/seo/
// preservados pra eventual republicação. Reativar = descomentar import + rota
// + remover redirect + readicionar ao sitemap e à allowlist do CanonicalManager.
// const CrmGamificado = lazy(() => import("./pages/seo/CrmGamificado"));
// const CrmComRanking = lazy(() => import("./pages/seo/CrmComRanking"));
// const CrmParaTimes = lazy(() => import("./pages/seo/CrmParaTimes"));

// Página temporária de calibração da EvaEntity (remover depois de plugar à lógica).
const EvaEntityTest = lazy(() => import("./pages/EvaEntityTest"));

// Página temporária de validação da nova lateral da EVA na Inbox (remover após integrar).
const EvaAssistPreview = lazy(() => import("./pages/EvaAssistPreview"));

// Página temporária de validação da nova lista de conversas do Inbox (remover após integrar).
const InboxListPreview = lazy(() => import("./pages/InboxListPreview"));

// Página temporária de validação do novo EVA Studio, frente a frente (remover após integrar).
const EvaStudioPreview = lazy(() => import("./pages/EvaStudioPreview"));
const EvaNudgePreview = lazy(() => import("./pages/EvaNudgePreview"));
const UpgradeLockPreview = lazy(() => import("./pages/admin/UpgradeLock"));

const LazyFallback = () => <BrandedLoader />;

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <CanonicalManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        {/* Personas /para-* despublicadas 2026-06-16 — 301 → home no vercel.json. */}
        {/* /alternativa-* e /alternativas despublicadas 2026-06-16 — 301 → home no vercel.json.
            O posicionamento atual (Central Comercial com EVA p/ agências) não se compara a CRMs. */}
        <Route
          path="/r/:token"
          element={
            <Suspense fallback={<LazyFallback />}>
              <PublicReport />
            </Suspense>
          }
        />
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
          path="/inbox-list-preview"
          element={
            <Suspense fallback={<LazyFallback />}>
              <InboxListPreview />
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
