import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TrialBanner } from "./TrialBanner";
import { useTrial } from "@/hooks/useTrial";

// Lazy: UpgradeLock só renderiza quando trial expirou.
const UpgradeLock = lazy(() => import("@/pages/admin/UpgradeLock"));

// Page titles alinhados com nova nomenclatura visual da nav (F3 2026-05-19).
// Rotas novas (/inicio, /inbox, etc) são as principais; antigas redirect silencioso.
const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "Início";
  if (pathname.startsWith("/inicio") || pathname.startsWith("/dashboard")) return "Início";
  if (pathname.startsWith("/inbox") || pathname.startsWith("/pulse") || pathname.startsWith("/whatsapp")) return "Inbox";
  if (pathname.startsWith("/pipeline") || pathname.startsWith("/crm")) return "Pipeline";
  if (pathname.startsWith("/agenda") || pathname.startsWith("/calendario")) return "Agenda";
  if (pathname.startsWith("/eva") || pathname.startsWith("/agente")) return "EVA";
  if (pathname.startsWith("/performance")) return "Performance";
  if (pathname.startsWith("/calls")) return "Performance · Calls";
  if (pathname.startsWith("/metas")) return "Performance · Metas";
  if (pathname.startsWith("/ranking")) return "Performance · Ranking";
  if (pathname.startsWith("/integracoes")) return "Integrações";
  if (pathname.startsWith("/nova-venda")) return "Novo lead";
  if (pathname.startsWith("/deal")) return "Detalhes do Deal";
  if (pathname.startsWith("/admin/suporte")) return "Suporte";
  if (pathname.startsWith("/admin")) return "Gestão";
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/profile")) return "Perfil";
  if (pathname.startsWith("/docs")) return "Central de Ajuda";
  return "Vyzon";
};

// Pages that should remain accessible even with expired trial
const ALLOWED_EXPIRED_PATHS = [
  "/upgrade",
  "/admin/upgrade",
  "/admin/settings/billing",
  "/checkout"
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isExpired, isTrialActive } = useTrial();

  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = `Vyzon | ${title}`;
  }, [location.pathname]);

  // Check if current path is allowed for expired trial
  const isPathAllowed = ALLOWED_EXPIRED_PATHS.some(path =>
    location.pathname.startsWith(path)
  );

  // If trial expired and path is not allowed, show upgrade lock
  if (isExpired && !isPathAllowed) {
    return (
      <Suspense fallback={null}>
        <UpgradeLock />
      </Suspense>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full text-[#0B1220]" style={{ background: "#F3F6FA" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Trial Banner — faixa horizontal no topo da área de conteúdo (não como coluna) */}
          {isTrialActive && <TrialBanner />}
          <header
            className="h-14 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 relative"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(12px) saturate(180%)",
              WebkitBackdropFilter: "blur(12px) saturate(180%)",
              borderBottom: "1px solid #E6EDF5",
            }}
          >
            <SidebarTrigger />
            <span className="text-xs sm:text-sm font-medium text-[#64748B] truncate">{getPageTitle(location.pathname)}</span>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto" style={{ background: "#F3F6FA" }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
