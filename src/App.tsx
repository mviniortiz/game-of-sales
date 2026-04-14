import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

// Lazy-loaded routes — everything except landing (entry point) and 404
const Auth = lazy(() => import("./pages/Auth"));
const Register = lazy(() => import("./pages/Register"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ranking = lazy(() => import("./pages/Ranking"));
const NovaVenda = lazy(() => import("./pages/NovaVenda"));
const Calls = lazy(() => import("./pages/Calls"));
const Metas = lazy(() => import("./pages/Metas"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminCompaniesPage = lazy(() => import("./pages/AdminCompaniesPage"));
const AdminCompanyDetail = lazy(() => import("./pages/AdminCompanyDetail"));
const Integracoes = lazy(() => import("./pages/Integracoes"));
const Calendario = lazy(() => import("./pages/Calendario"));
const CRM = lazy(() => import("./pages/CRM"));
const DealCommandCenter = lazy(() => import("./pages/DealCommandCenter"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const SalesPerformanceCenter = lazy(() => import("./pages/SalesPerformanceCenter"));
const ImportarDados = lazy(() => import("./pages/ImportarDados"));
const AgenteRelatorios = lazy(() => import("./pages/AgenteRelatorios"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const Docs = lazy(() => import("./pages/Docs"));
const Suporte = lazy(() => import("./pages/admin/Suporte"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const TermosServico = lazy(() => import("./pages/TermosServico"));
const LogoPreview = lazy(() => import("./pages/LogoPreview"));

// Redirect /checkout?plan=X to /onboarding?plan=X&step=5
const CheckoutRedirect = () => {
  const [params] = useSearchParams();
  const plan = params.get("plan") || "plus";
  return <Navigate to={`/onboarding?plan=${plan}&step=5`} replace />;
};

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
  </div>
);

// Pre-prod gate: renders children only for super admins, otherwise redirects
const PreProdRoute = ({ children, fallback = "/dashboard" }: { children: React.ReactNode; fallback?: string }) => {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to={fallback} replace />;
  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Analytics />
            <Suspense fallback={<LazyFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/checkout" element={<CheckoutRedirect />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/logo-preview" element={<LogoPreview />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ranking"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Ranking />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nova-venda"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <NovaVenda />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calls"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Calls />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/metas"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Metas />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agente"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <AgenteRelatorios />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <Admin />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/suporte"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <Suporte />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/companies"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <AdminCompaniesPage />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/companies/:companyId"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <AdminCompanyDetail />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integracoes"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <Integracoes />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/whatsapp"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <WhatsApp />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendario"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Calendario />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crm"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CRM />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deals/:id"
                element={
                  <ProtectedRoute>
                    <DealCommandCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upgrade"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Upgrade />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docs"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Docs />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/performance"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SalesPerformanceCenter />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importar"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <ImportarDados />
                      </AppLayout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/termos-de-servico" element={<TermosServico />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </TooltipProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
