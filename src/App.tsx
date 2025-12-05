import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import DealDetails from "./pages/DealDetails";
import RecuperarSenha from "./pages/RecuperarSenha";
import Profile from "./pages/Profile";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route
          path="/"
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
                  <AppLayout>
                    <Admin />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AdminCompaniesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies/:companyId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AdminCompanyDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/integracoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Integracoes />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendario"
              element={
                <ProtectedRoute>
                  <Calendario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRM />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals/:id"
              element={
                <ProtectedRoute>
                  <DealDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </TooltipProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
