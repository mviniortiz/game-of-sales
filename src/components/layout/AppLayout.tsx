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

      <div className="min-h-screen flex w-full text-[#0B1220]" style={{ background: "#F3F6FA" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col">
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

            {/* Search bar inline — expande suavemente no focus */}
            <div ref={searchWrapRef} className="ml-auto relative">
              <motion.button
                onClick={() => setSearchOpen(true)}
                animate={{ opacity: searchOpen ? 0 : 1 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-2 h-8 rounded-lg text-[12px] transition-colors hover:bg-[#F1F5F9]"
                style={{
                  width: "clamp(180px, 24vw, 280px)",
                  paddingLeft: "10px",
                  paddingRight: "10px",
                  background: "#FFFFFF",
                  border: "1px solid #E6EDF5",
                  color: "#64748B",
                  pointerEvents: searchOpen ? "none" : "auto",
                  willChange: "opacity",
                }}
                aria-label="Buscar (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                <span className="hidden sm:inline flex-1 text-left text-[#94A3B8] truncate">
                  Buscar deals, páginas, ações…
                </span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[#E6EDF5] text-[10px] font-mono text-[#94A3B8] leading-none">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </motion.button>

              <Suspense fallback={null}>
                <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
              </Suspense>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto" style={{ background: "#F3F6FA" }}>
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
