import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage";

const AppShell = lazy(() => import("./AppShell"));
const ForInfoprodutores = lazy(() => import("./pages/personas/ForInfoprodutores"));
const ForAgencias = lazy(() => import("./pages/personas/ForAgencias"));
const PublicReport = lazy(() => import("./pages/PublicReport"));

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
