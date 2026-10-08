// ─────────────────────────────────────────────────────────────────────────────
// F2.6 (2026-05-19) — Sidebar visual polish
//
// Mudanças vs F2.5:
//   - Ícones: Phosphor weight="duotone" (mais presença que Lucide stroke)
//   - Drop do AnimatedIcon (estava com glow emerald fora do brand)
//   - Item ativo: pill azul + ícone azul Vyzon
//   - CTA "Novo lead": 40px, radius 12px, gradient + sombra
//   - Footer: avatar menor, Admin badge ámbar discreto, Pro badge azul
//   - Gestão fica no footer, sem ficar parecendo nav principal
//
// Sem mudança de: rotas, auth, RLS, lógica de roles/feature flags.
// ─────────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useState, useEffect } from "react";
import type { ComponentType } from "react";
import {
  House,
  ChatCircleText,
  Kanban as KanbanIcon,
  GearSix,
  ShieldCheck,
  ChartLineUp,
  Lifebuoy as LifeBuoyIcon,
  Plus,
  CaretUpDown,
  UserCircleGear,
  Question,
  SignOut,
  Star,
  Receipt,
  type IconProps,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReminderBell } from "@/components/crm/ReminderBell";
import { NavLink } from "@/components/NavLink";
import { trackBehavior, claritySet, clarityUpgrade, isDemoSession, DEMO_EVENTS } from "@/lib/analytics";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { CONTACT, whatsappUrl } from "@/config/contact";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
const NovaVendaModal = lazy(() => import("@/components/vendas/NovaVendaModal").then((m) => ({ default: m.NovaVendaModal })));
// F4G 2026-05-19: modal "Criar oportunidade" separado, grava em deals
const NovaOportunidadeModal = lazy(() => import("@/components/deals/NovaOportunidadeModal").then((m) => ({ default: m.NovaOportunidadeModal })));
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, useReducedMotion } from "framer-motion";

// Phosphor icon component type
type PhosphorIcon = ComponentType<IconProps>;

// ─── Menu ────────────────────────────────────────────────────────────────────
// Operação em cima (Orçamentos, Início, Inbox, Pipeline); empresa e conta num
// grupo próprio no rodapé. Agenda, EVA Studio e Performance seguem na busca
// (Ctrl+K) e nos links contextuais, fora do menu.
type NavItem = {
  title: string;
  url: string;
  icon: PhosphorIcon;
  badge?: "rotting";
  requires?: "admin" | "super_admin";
};

const mainNavItems: NavItem[] = [
  { title: "Orçamentos", url: "/orcamentos", icon: Receipt },
  { title: "Início", url: "/inicio", icon: House },
  { title: "Inbox", url: "/inbox", icon: ChatCircleText },
  { title: "Pipeline", url: "/pipeline", icon: KanbanIcon, badge: "rotting" },
];

const accountNavItems: NavItem[] = [
  { title: "Gestão", url: "/admin", icon: ChartLineUp, requires: "admin" },
  { title: "Configurações", url: "/configuracoes", icon: GearSix },
  { title: "Suporte", url: "/admin/suporte", icon: LifeBuoyIcon, requires: "super_admin" },
];

function SidebarCta({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label="Novo lead"
      className={`relative w-full flex items-center justify-center gap-1.5 h-9 rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] text-[13px] font-semibold tracking-[-0.01em] transition-[transform,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)] shadow-[0_1px_2px_rgba(8,8,8,0.16),0_6px_16px_-8px_rgba(8,8,8,0.4)]`}
    >
      <Plus size={15} weight="bold" aria-hidden />
      {!collapsed && <span>Novo lead</span>}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="text-[11px]">Novo lead</TooltipContent>
    </Tooltip>
  );
}

interface UserMenuProps {
  collapsed: boolean;
  profile: { nome?: string | null; avatar_url?: string | null } | null;
  user: { email?: string | null } | null;
  isAdmin: boolean;
  isProfileActive: boolean;
  navigate: (path: string) => void;
  signOut: () => void;
  getInitials: (nome: string) => string;
}

function UserMenu({
  collapsed, profile, user, isProfileActive,
  navigate, signOut, getInitials,
}: UserMenuProps) {

  const trigger = collapsed ? (
    <button
      aria-label="Abrir menu da conta"
      className={`p-1 rounded-md transition-colors ${
        isProfileActive ? "bg-[var(--vyz-surface-2)]" : "hover:bg-[var(--vyz-surface-2)]"
      }`}
    >
      <Avatar className="h-7 w-7 rounded-md">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
        <AvatarFallback className="bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)] text-[10px] font-semibold rounded-md">
          {profile?.nome ? getInitials(profile.nome) : "U"}
        </AvatarFallback>
      </Avatar>
    </button>
  ) : (
    <button
      aria-label="Abrir menu da conta"
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
        isProfileActive ? "bg-[var(--vyz-surface-2)]" : "hover:bg-[var(--vyz-surface-2)]"
      }`}
    >
      <Avatar className="h-7 w-7 shrink-0 rounded-md">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
        <AvatarFallback className="bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)] text-[10.5px] font-semibold rounded-md">
          {profile?.nome ? getInitials(profile.nome) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start text-left flex-1 min-w-0 leading-tight">
        <span className="text-[12.5px] font-semibold text-[var(--vyz-text-primary)] truncate w-full tracking-tight">
          {profile?.nome || "Usuário"}
        </span>
        <span className="text-[10.5px] text-[var(--vyz-text-muted)] truncate w-full mt-0.5">
          {user?.email || ""}
        </span>
      </div>
      <CaretUpDown size={14} weight="bold" className="text-[var(--vyz-text-soft)] shrink-0" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "start" : "center"}
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuItem onClick={() => navigate("/configuracoes/perfil")} className="text-[12.5px]">
          <UserCircleGear size={16} weight="duotone" className="mr-2 text-muted-foreground" />
          Minha conta
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => window.open(whatsappUrl(CONTACT.defaultMessage), "_blank", "noopener,noreferrer")}
          className="text-[12.5px]"
        >
          <Question size={16} weight="duotone" className="mr-2 text-muted-foreground" />
          Ajuda & suporte
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={signOut}
          className="text-[12.5px] text-rose-600 focus:text-rose-700 focus:bg-rose-50"
        >
          <SignOut size={16} weight="duotone" className="mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, isAdmin, isSuperAdmin, signOut, profile, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const { currentPlan, planInfo } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const reduceMotion = useReducedMotion();
  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);
  // F4G: estado separado pro modal de oportunidade (event diferente)
  const [isNovaOportunidadeOpen, setIsNovaOportunidadeOpen] = useState(false);
  const [rottingDealsCount, setRottingDealsCount] = useState(0);

  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  useEffect(() => {
    if (!effectiveCompanyId) {
      setRottingDealsCount(0);
      return;
    }

    const fetchRottingCount = async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const cutoff = threeDaysAgo.toISOString();

      const { count, error } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", effectiveCompanyId)
        .lt("updated_at", cutoff)
        .not("stage", "in", "(closed_won,closed_lost)");

      if (!error && count !== null) {
        setRottingDealsCount(count);
      }
    };

    fetchRottingCount();
    const interval = setInterval(fetchRottingCount, 60000);
    return () => clearInterval(interval);
  }, [effectiveCompanyId]);

  // F4G: dois eventos separados. 'open-nova-venda' (legado) abre o modal que
  // grava em vendas/metas/performance. 'open-nova-oportunidade' abre o modal
  // novo que grava em deals/pipeline.
  useEffect(() => {
    const openVenda = () => setIsNovaVendaOpen(true);
    const openOportunidade = () => setIsNovaOportunidadeOpen(true);
    window.addEventListener("vyzon:open-nova-venda", openVenda);
    window.addEventListener("vyzon:open-nova-oportunidade", openOportunidade);
    return () => {
      window.removeEventListener("vyzon:open-nova-venda", openVenda);
      window.removeEventListener("vyzon:open-nova-oportunidade", openOportunidade);
    };
  }, []);

  const filteredAccountItems = accountNavItems.filter((item) => {
    if (item.requires === "admin") return isAdmin;
    if (item.requires === "super_admin") return isSuperAdmin;
    return true;
  });

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Item no padrão de sidebar da Apple: ícone em contorno parado, preenchido
  // e azul quando ativo; o realce ativo desliza entre itens (layoutId).
  const itemClass =
    "group relative flex items-center gap-3 h-9 px-2.5 rounded-[10px] text-[13.5px] font-medium tracking-[-0.01em] outline-none transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)]";

  // Analytics: clique manual em aba. Na demo a EVA navega por postMessage, então
  // qualquer clique na sidebar = a pessoa saindo do roteiro guiado (nav_off_flow).
  const handleNavClick = (item: NavItem) => {
    trackBehavior(DEMO_EVENTS.NAV_TAB_CLICK, { tab: item.url, title: item.title, from: location.pathname });
    claritySet("last_tab", item.title);
    if (isDemoSession()) {
      claritySet("demo", "embed");
      trackBehavior(DEMO_EVENTS.NAV_OFF_FLOW, { tab: item.url, title: item.title });
      clarityUpgrade("nav_off_flow");
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive =
      location.pathname === item.url ||
      (item.url !== "/inicio" && location.pathname.startsWith(item.url + "/")) ||
      (item.url === "/admin" && location.pathname === "/admin");
    const showBadge = item.badge === "rotting" && rottingDealsCount > 0;
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={item.url}
        end={item.url === "/inicio" || item.url === "/admin"}
        className={`${itemClass} ${
          isActive
            ? "text-[var(--vyz-text-primary)]"
            : "text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)] hover:bg-[var(--vyz-surface-2)]"
        } ${collapsed ? "justify-center px-0" : ""}`}
        activeClassName=""
        aria-label={item.title}
        aria-current={isActive ? "page" : undefined}
        data-demo-nav={item.url}
        onClick={() => handleNavClick(item)}
      >
        {isActive &&
          (reduceMotion ? (
            <span className="absolute inset-0 rounded-[10px] pointer-events-none bg-[var(--vyz-accent-soft-10)]" aria-hidden />
          ) : (
            <motion.span
              layoutId="sidebar-active-pill"
              transition={{ type: "spring", stiffness: 460, damping: 38 }}
              className="absolute inset-0 rounded-[10px] pointer-events-none bg-[var(--vyz-accent-soft-10)]"
              aria-hidden
            />
          ))}

        <span className="relative shrink-0 inline-flex">
          <Icon
            size={19}
            weight={isActive ? "fill" : "regular"}
            className={isActive ? "text-[var(--vyz-accent)]" : "text-[var(--vyz-text-muted)] group-hover:text-[var(--vyz-text-primary)]"}
            aria-hidden
          />
          {showBadge && collapsed && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-[#D97706] text-white text-[9px] font-semibold leading-none ring-2 ring-[var(--vyz-surface-1)]">
              {rottingDealsCount > 99 ? "99+" : rottingDealsCount}
            </span>
          )}
        </span>

        {!collapsed && (
          <>
            <span className="relative flex-1 truncate">{item.title}</span>
            {showBadge && (
              <span
                className="relative inline-flex items-center justify-center min-w-[22px] h-[19px] px-1.5 rounded-full text-[11px] font-semibold tabular-nums bg-[rgba(217,119,6,0.12)] text-[#B45309]"
                title={`${rottingDealsCount} oportunidades paradas`}
              >
                {rottingDealsCount}
              </span>
            )}
          </>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild>{linkContent}</SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
            {showBadge && ` (${rottingDealsCount} parados)`}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <SidebarMenuButton asChild>{linkContent}</SidebarMenuButton>;
  };

  const isProfileActive = location.pathname.startsWith("/configuracoes");

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar
        collapsible="icon"
        className="text-[var(--vyz-text-primary)]"
        style={{ background: "var(--vyz-surface-1)", borderRight: "1px solid var(--vyz-border)" }}
      >
        <SidebarContent className="gap-0">
          <div className={`pt-5 pb-4 ${collapsed ? "px-2 justify-center" : "pl-4 pr-3 justify-between"} flex items-center gap-2`}>
            {collapsed ? <ThemeLogo iconOnly className="h-7 w-7" /> : <ThemeLogo className="h-[22px] w-auto" />}
            {!collapsed && <ReminderBell />}
          </div>

          <div className="px-3 pb-3">
            <SidebarCta collapsed={collapsed} onClick={() => setIsNovaOportunidadeOpen(true)} />
          </div>

          {collapsed && (
            <div className="px-3 pb-2 flex items-center justify-center">
              <ReminderBell />
            </div>
          )}

          <SidebarGroup className="py-1 px-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>{renderNavItem(item)}</SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mt-auto p-0" style={{ borderTop: "1px solid var(--vyz-border)" }}>
          <div className={collapsed ? "p-2" : "px-2 pt-2"}>
            <SidebarMenu className="gap-px">
              {filteredAccountItems.map((item) => (
                <SidebarMenuItem key={item.title}>{renderNavItem(item)}</SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>

          {/* User menu + plan badges */}
          <div className={collapsed ? "p-2 flex justify-center" : "p-2.5 space-y-1.5"}>
            <UserMenu
              collapsed={collapsed}
              profile={profile}
              user={user}
              isAdmin={isAdmin}
              isProfileActive={isProfileActive}
              navigate={navigate}
              signOut={signOut}
              getInitials={getInitials}
            />
            {/* F2.7: badges mais discretos — sem bg colorido berrante, só
                texto + ícone com cor sutil. Plano vira link com underline-hover. */}
            {!collapsed && (isAdmin || planInfo) && (
              <div className="flex items-center gap-3 px-2 pt-0.5">
                {isAdmin && (
                  <span
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--vyz-text-muted)]"
                    aria-label="Você é admin"
                  >
                    <ShieldCheck size={11} weight="duotone" className="text-[#B45309]/80" />
                    Admin
                  </span>
                )}
                {planInfo && (
                  <button
                    onClick={() => navigate("/configuracoes/faturamento")}
                    aria-label={`Plano ${planInfo.label} — abrir faturamento`}
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)] transition-colors"
                    title="Ver faturamento"
                  >
                    <Star
                      size={11}
                      weight="fill"
                      className={
                        currentPlan !== "free"
                          ? "text-[var(--vyz-accent)]"
                          : "text-[var(--vyz-text-soft)]"
                      }
                    />
                    {planInfo.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      {isNovaVendaOpen && (
        <Suspense fallback={null}>
          <NovaVendaModal
            open={isNovaVendaOpen}
            onClose={() => setIsNovaVendaOpen(false)}
          />
        </Suspense>
      )}

      {/* F4G: modal nova oportunidade (grava em deals/pipeline) */}
      {isNovaOportunidadeOpen && (
        <Suspense fallback={null}>
          <NovaOportunidadeModal
            open={isNovaOportunidadeOpen}
            onClose={() => setIsNovaOportunidadeOpen(false)}
          />
        </Suspense>
      )}
    </TooltipProvider>
  );
}
