import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TrialBanner } from "./TrialBanner";
import { useTrial } from "@/hooks/useTrial";

// Lazy: UpgradeLock só renderiza quando trial expirou; EvaDock é widget — fora do first paint.
const UpgradeLock = lazy(() => import("@/pages/admin/UpgradeLock"));
const EvaDock = lazy(() => import("@/components/eva/EvaDock").then((m) => ({ default: m.EvaDock })));
const CommandSearch = lazy(() => import("./CommandSearch").then((m) => ({ default: m.CommandSearch })));

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
  if (pathname.startsWith("/agente")) return "Eva";
  if (pathname.startsWith("/admin/suporte")) return "Suporte";
  if (pathname.startsWith("/admin")) return "Administração";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = `Vyzon | ${title}`;
  }, [location.pathname]);

  // Global shortcut: ⌘K / Ctrl+K abre a search em qualquer página.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    const openEvt = () => setSearchOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("vyzon:open-palette", openEvt);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("vyzon:open-palette", openEvt);
    };
  }, []);

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
      {/* Trial Banner - only shows during active trial */}
      {isTrialActive && <TrialBanner />}

      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm text-foreground flex items-center gap-2 sm:gap-4 px-3 sm:px-4 relative">
            <SidebarTrigger />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{getPageTitle(location.pathname)}</span>

            {/* Search bar inline — expande suavemente no focus */}
            <div ref={searchWrapRef} className="ml-auto relative">
              <motion.button
                onClick={() => setSearchOpen(true)}
                animate={{ opacity: searchOpen ? 0 : 1 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-2 h-8 rounded-lg text-[12px] transition-colors"
                style={{
                  width: "clamp(180px, 24vw, 280px)",
                  paddingLeft: "10px",
                  paddingRight: "10px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.6)",
                  pointerEvents: searchOpen ? "none" : "auto",
                  willChange: "opacity",
                }}
                aria-label="Buscar (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 group-hover:text-emerald-400/80 transition-colors" />
                <span className="hidden sm:inline flex-1 text-left text-muted-foreground/55 truncate">
                  Buscar deals, páginas, ações…
                </span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-muted-foreground/55 leading-none">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </motion.button>

              <Suspense fallback={null}>
                <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
              </Suspense>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <Suspense fallback={null}>
        <EvaDock />
      </Suspense>
    </SidebarProvider>
  );
};
