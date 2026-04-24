import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage";

const AppShell = lazy(() => import("./AppShell"));
const ForInfoprodutores = lazy(() => import("./pages/personas/ForInfoprodutores"));
const ForAgencias = lazy(() => import("./pages/personas/ForAgencias"));
const PublicReport = lazy(() => import("./pages/PublicReport"));
const VsHubspot = lazy(() => import("./pages/alternativas/VsHubspot"));
const VsPloomes = lazy(() => import("./pages/alternativas/VsPloomes"));
const VsRDStation = lazy(() => import("./pages/alternativas/VsRDStation"));
const VsKommo = lazy(() => import("./pages/alternativas/VsKommo"));
const VsPipedrive = lazy(() => import("./pages/alternativas/VsPipedrive"));
const VsAgendor = lazy(() => import("./pages/alternativas/VsAgendor"));
const AlternativasHub = lazy(() => import("./pages/alternativas/AlternativasHub"));

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
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
        <Route
          path="/para-agencias"
          element={
            <Suspense fallback={<LazyFallback />}>
              <ForAgencias />
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
