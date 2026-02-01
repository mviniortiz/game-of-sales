import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TrialBanner } from "./TrialBanner";
import { useTrial } from "@/hooks/useTrial";
import UpgradeLock from "@/pages/admin/UpgradeLock";

const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/crm")) return "CRM";
  if (pathname.startsWith("/calls")) return "Performance de Calls";
  if (pathname.startsWith("/calendario")) return "Calendário";
  if (pathname.startsWith("/metas")) return "Metas";
  if (pathname.startsWith("/ranking")) return "Ranking";
  if (pathname.startsWith("/integracoes")) return "Integrações";
  if (pathname.startsWith("/nova-venda")) return "Nova Venda";
  if (pathname.startsWith("/deal")) return "Detalhes do Deal";
  if (pathname.startsWith("/admin")) return "Administração";
  if (pathname.startsWith("/profile")) return "Perfil";
  return "Game Sales";
};

// Pages that should remain accessible even with expired trial
const ALLOWED_EXPIRED_PATHS = [
  "/admin/upgrade",
  "/admin/settings/billing",
  "/checkout"
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isExpired, isTrialActive } = useTrial();

  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = `Game Sales | ${title}`;
  }, [location.pathname]);

  // Check if current path is allowed for expired trial
  const isPathAllowed = ALLOWED_EXPIRED_PATHS.some(path =>
    location.pathname.startsWith(path)
  );

  // If trial expired and path is not allowed, show upgrade lock
  if (isExpired && !isPathAllowed) {
    return <UpgradeLock />;
  }

  return (
    <SidebarProvider>
      {/* Trial Banner - only shows during active trial */}
      {isTrialActive && <TrialBanner />}

      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card text-foreground flex items-center justify-between px-4 shadow-sm">
            <SidebarTrigger />
            <ThemeToggle />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
