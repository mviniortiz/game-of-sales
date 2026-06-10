import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import NotFound from "./pages/NotFound";

const Auth = lazy(() => import("./pages/Auth"));
const Register = lazy(() => import("./pages/Register"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Ranking = lazy(() => import("./pages/Ranking"));
const NovaVenda = lazy(() => import("./pages/NovaVenda"));
const Calls = lazy(() => import("./pages/Calls"));
const Metas = lazy(() => import("./pages/Metas"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminCompaniesPage = lazy(() => import("./pages/AdminCompaniesPage"));
const AdminCompanyDetail = lazy(() => import("./pages/AdminCompanyDetail"));
const ConfiguracoesLayout = lazy(() => import("./components/configuracoes/ConfiguracoesLayout"));
const ConfPerfil = lazy(() => import("./pages/configuracoes/Perfil"));
const ConfSeguranca = lazy(() => import("./pages/configuracoes/Seguranca"));
const ConfOrganizacao = lazy(() => import("./pages/configuracoes/Organizacao"));
const ConfTime = lazy(() => import("./pages/configuracoes/Time"));
const ConfFaturamento = lazy(() => import("./pages/configuracoes/Faturamento"));
const ConfIntegracoes = lazy(() => import("./pages/configuracoes/Integracoes"));
const ConfTags = lazy(() => import("./pages/configuracoes/Tags"));
const ConfImportar = lazy(() => import("./pages/configuracoes/Importar"));
const ConfRelatoriosPublicos = lazy(() => import("./pages/configuracoes/RelatoriosPublicos"));
const ConfEvaContexto = lazy(() => import("./pages/configuracoes/EvaContexto"));
const Calendario = lazy(() => import("./pages/Calendario"));
const CRM = lazy(() => import("./pages/CRM"));
const DealCommandCenter = lazy(() => import("./pages/DealCommandCenter"));
const Pulse = lazy(() => import("./pages/Pulse"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const SalesPerformanceCenter = lazy(() => import("./pages/SalesPerformanceCenter"));
const AgenteRelatorios = lazy(() => import("./pages/AgenteRelatorios"));
const EvaStudio = lazy(() => import("./pages/EvaStudio"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const Docs = lazy(() => import("./pages/Docs"));
const Suporte = lazy(() => import("./pages/admin/Suporte"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const TermosServico = lazy(() => import("./pages/TermosServico"));
const LogoPreview = lazy(() => import("./pages/LogoPreview"));
const ScenePreview = lazy(() => import("./pages/ScenePreview"));
const Changelog = lazy(() => import("./pages/Changelog"));

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

const AppShell = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Analytics />
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/checkout" element={<CheckoutRedirect />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/logo-preview" element={<LogoPreview />} />
              <Route path="/scene-preview" element={<ScenePreview />} />
              <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/termos-de-servico" element={<TermosServico />} />
              <Route path="/changelog" element={<Changelog />} />

              {/* F4A 2026-05-19: /inicio renderiza Inicio (Central da Operação).
                  /dashboard antigo continua acessível como fallback (não removido em F4A,
                  só não está no menu). F3 fez redirect /dashboard → /inicio que segue válido. */}
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Inicio />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
              <Route
                path="/dashboard-legacy"
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
              {/* F3 2026-05-19: /eva é a rota principal, /agente redirect silencioso */}
              <Route
                path="/eva"
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
              <Route path="/agente" element={<Navigate to="/eva" replace />} />
              {/* EVA.STUDIO.1 — EVA Studio (dark isolado). Dentro do AppLayout, admin-only. */}
              <Route
                path="/eva-studio"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <AppLayout>
                        <EvaStudio />
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
                path="/configuracoes"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ConfiguracoesLayout />
                    </AppLayout>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/configuracoes/perfil" replace />} />
                <Route path="perfil" element={<ConfPerfil />} />
                <Route path="seguranca" element={<ConfSeguranca />} />
                <Route
                  path="organizacao"
                  element={
                    <AdminRoute>
                      <ConfOrganizacao />
                    </AdminRoute>
                  }
                />
                <Route
                  path="time"
                  element={
                    <AdminRoute>
                      <ConfTime />
                    </AdminRoute>
                  }
                />
                <Route
                  path="faturamento"
                  element={
                    <AdminRoute>
                      <ConfFaturamento />
                    </AdminRoute>
                  }
                />
                <Route
                  path="integracoes"
                  element={
                    <AdminRoute>
                      <ConfIntegracoes />
                    </AdminRoute>
                  }
                />
                <Route
                  path="tags"
                  element={
                    <AdminRoute>
                      <ConfTags />
                    </AdminRoute>
                  }
                />
                <Route
                  path="importar"
                  element={
                    <AdminRoute>
                      <ConfImportar />
                    </AdminRoute>
                  }
                />
                <Route
                  path="relatorios-publicos"
                  element={
                    <AdminRoute>
                      <ConfRelatoriosPublicos />
                    </AdminRoute>
                  }
                />
                {/* Contratos virou seção da Gestão; Webhooks de leads foi consolidado em Integrações */}
                <Route path="contratos" element={<Navigate to="/admin" replace />} />
                <Route path="webhooks-leads" element={<Navigate to="/configuracoes/integracoes" replace />} />
                {/* F4E.2 2026-05-19: Contexto da Agência (membros leem, admin edita).
                    UI não usa AdminRoute pra permitir leitura — RLS é a defesa real. */}
                <Route path="eva" element={<ConfEvaContexto />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/profile" element={<Navigate to="/configuracoes/perfil" replace />} />
              <Route path="/integracoes" element={<Navigate to="/configuracoes/integracoes" replace />} />
              <Route path="/importar" element={<Navigate to="/configuracoes/importar" replace />} />
              {/* F4C.1 2026-05-19: /inbox renderiza Inbox Comercial nova. Pulse antigo
                  fica acessível em /inbox-legacy (fora do menu) pra rollback emergencial.
                  /pulse e /whatsapp redirect silencioso pra /inbox. */}
              <Route
                path="/inbox"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Inbox />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inbox-legacy"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Pulse />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/pulse" element={<Navigate to="/inbox" replace />} />
              <Route path="/whatsapp" element={<Navigate to="/inbox" replace />} />
              {/* F3 2026-05-19: /agenda é a rota principal, /calendario redirect silencioso */}
              <Route
                path="/agenda"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Calendario />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/calendario" element={<Navigate to="/agenda" replace />} />
              {/* F3 2026-05-19: /pipeline é a rota principal, /crm redirect silencioso */}
              <Route
                path="/pipeline"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CRM />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/crm" element={<Navigate to="/pipeline" replace />} />
              <Route
                path="/deals/:id"
                element={
                  <ProtectedRoute>
                    <DealCommandCenter />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AppShell;
