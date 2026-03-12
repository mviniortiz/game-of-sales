import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Ranking from "./pages/Ranking";
import NovaVenda from "./pages/NovaVenda";
import Calls from "./pages/Calls";
import Metas from "./pages/Metas";
import Admin from "./pages/Admin";
import AdminCompaniesPage from "./pages/AdminCompaniesPage";
import AdminCompanyDetail from "./pages/AdminCompanyDetail";
import Integracoes from "./pages/Integracoes";
import Calendario from "./pages/Calendario";
import CRM from "./pages/CRM";
import DealCommandCenter from "./pages/DealCommandCenter";
import RecuperarSenha from "./pages/RecuperarSenha";
import Profile from "./pages/Profile";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import SalesPerformanceCenter from "./pages/SalesPerformanceCenter";
import LogoPreview from "./pages/LogoPreview";
import WhatsApp from "./pages/WhatsApp";
import TermosServico from "./pages/TermosServico";
import ImportarDados from "./pages/ImportarDados";
import { PRODUCT_FEATURES } from "@/config/features";
import { useAuth } from "@/contexts/AuthContext";

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
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
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
          </TooltipProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
