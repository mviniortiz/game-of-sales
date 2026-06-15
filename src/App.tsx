import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CanonicalManager } from "@/components/CanonicalManager";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage";

const AppShell = lazy(() => import("./AppShell"));
const ForInfoprodutores = lazy(() => import("./pages/personas/ForInfoprodutores"));
// ForAgencias: despublicada temporariamente (sem redirect), features multi-tenant
// prometidas não estão implementadas. Reativar quando implementar
// (tabela clients, role client_user, white-label por client).
// const ForAgencias = lazy(() => import("./pages/personas/ForAgencias"));
const ForSaasB2B = lazy(() => import("./pages/personas/ForSaasB2B"));
const PublicReport = lazy(() => import("./pages/PublicReport"));
const VsHubspot = lazy(() => import("./pages/alternativas/VsHubspot"));
const VsPloomes = lazy(() => import("./pages/alternativas/VsPloomes"));
const VsRDStation = lazy(() => import("./pages/alternativas/VsRDStation"));
const VsKommo = lazy(() => import("./pages/alternativas/VsKommo"));
const VsPipedrive = lazy(() => import("./pages/alternativas/VsPipedrive"));
const VsAgendor = lazy(() => import("./pages/alternativas/VsAgendor"));
const AlternativasHub = lazy(() => import("./pages/alternativas/AlternativasHub"));

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

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <CanonicalManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          path="/para-infoprodutores"
          element={
            <Suspense fallback={<LazyFallback />}>
              <ForInfoprodutores />
            </Suspense>
          }
        />
        {/* /para-agencias despublicada (Opção C) até multi-tenant ser implementado.
            Rota cai no AppShell (404 → LandingPage ou app). */}
        <Route
          path="/para-saas-b2b"
          element={
            <Suspense fallback={<LazyFallback />}>
              <ForSaasB2B />
            </Suspense>
          }
        />
        <Route
          path="/alternativa-hubspot"
          element={
            <Suspense fallback={<LazyFallback />}>
              <VsHubspot />
            </Suspense>
          }
        />
        <Route
          path="/alternativa-ploomes"
          element={
            <Suspense fallback={<LazyFallback />}>
              <VsPloomes />
            </Suspense>
          }
        />
        <Route
          path="/alternativa-rd-station"
          element={
            <Suspense fallback={<LazyFallback />}>
              <VsRDStation />
            </Suspense>
          }
        />
        <Route
          path="/alternativa-kommo"
          element={
            <Suspense fallback={<LazyFallback />}>
              <VsKommo />
            </Suspense>
          }
        />
        <Route
          path="/alternativa-pipedrive"
          element={
            <Suspense fallback={<LazyFallback />}>
              <VsPipedrive />
            </Suspense>
          }
        />
        <Route
          path="/alternativa-agendor"
          element={
            <Suspense fallback={<LazyFallback />}>
              <VsAgendor />
            </Suspense>
          }
        />
        <Route
          path="/alternativas"
          element={
            <Suspense fallback={<LazyFallback />}>
              <AlternativasHub />
            </Suspense>
          }
        />
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
