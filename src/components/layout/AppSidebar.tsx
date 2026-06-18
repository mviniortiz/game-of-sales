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
  CalendarBlank,
  Sparkle as SparkleIcon,
  ChartLineUp,
  Target,
  Trophy,
  GearSix,
  ShieldCheck,
  Lifebuoy as LifeBuoyIcon,
  Plus,
  CaretUpDown,
  UserCircleGear,
  Sun as SunIcon,
  Moon as MoonIcon,
  Question,
  SignOut,
  Star,
  type IconProps,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeToggle";
import { ReminderBell } from "@/components/crm/ReminderBell";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import logoIcon from "@/assets/logo-icon.png";
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

// Phosphor icon component type
type PhosphorIcon = ComponentType<IconProps>;

// ─── Nav principal (F3 + F2.6) ──────────────────────────────────────────────
// EVA usa Sparkle (consistente com EvaPhotoAvatar selo Preview). Cor controlada
// pelo render — não força roxo na sidebar pra não criar marca paralela.
type NavItem = {
  title: string;
  url: string;
  icon: PhosphorIcon;
  adminOnly?: boolean;
  feature?: "eva";
  badge?: "rotting";
};

const mainNavItems: NavItem[] = [
  { title: "Início", url: "/inicio", icon: House },
  { title: "Inbox", url: "/inbox", icon: ChatCircleText },
  { title: "Pipeline", url: "/pipeline", icon: KanbanIcon, badge: "rotting" },
  { title: "Agenda", url: "/agenda", icon: CalendarBlank },
  { title: "EVA Studio", url: "/eva-studio", icon: SparkleIcon, adminOnly: true, feature: "eva" },
  { title: "Performance", url: "/performance", icon: ChartLineUp },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Configurações", url: "/configuracoes", icon: GearSix },
];

type FooterItem = {
  title: string;
  url: string;
  icon: PhosphorIcon;
  requires: "admin" | "super_admin";
};

const adminFooterItems: FooterItem[] = [
  { title: "Gestão", url: "/admin", icon: ShieldCheck, requires: "admin" },
  { title: "Suporte", url: "/admin/suporte", icon: LifeBuoyIcon, requires: "super_admin" },
];

interface UserMenuProps {
  collapsed: boolean;
  profile: any;
  user: any;
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
  const { theme, toggle: toggleTheme } = useTheme();

  const trigger = collapsed ? (
    <button
      aria-label="Abrir menu da conta"
      className={`p-1 rounded-md transition-colors ${
        isProfileActive ? "bg-[#F1F5F9]" : "hover:bg-[#F1F5F9]/70"
      }`}
    >
      <Avatar className="h-7 w-7 rounded-md">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
        <AvatarFallback className="bg-[#F1F5F9] text-[#64748B] text-[10px] font-semibold rounded-md">
          {profile?.nome ? getInitials(profile.nome) : "U"}
        </AvatarFallback>
      </Avatar>
    </button>
  ) : (
    <button
      aria-label="Abrir menu da conta"
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
        isProfileActive ? "bg-[#F1F5F9]" : "hover:bg-[#F1F5F9]/70"
      }`}
    >
      <Avatar className="h-7 w-7 shrink-0 rounded-md">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
        <AvatarFallback className="bg-[#F1F5F9] text-[#64748B] text-[10.5px] font-semibold rounded-md">
          {profile?.nome ? getInitials(profile.nome) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start text-left flex-1 min-w-0 leading-tight">
        <span className="text-[12.5px] font-semibold text-[#0B1220] truncate w-full tracking-tight">
          {profile?.nome || "Usuário"}
        </span>
        <span className="text-[10.5px] text-[#94A3B8] truncate w-full mt-0.5">
          {user?.email || ""}
        </span>
      </div>
      <CaretUpDown size={14} weight="bold" className="text-[#CBD5E1] shrink-0" />
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

        <DropdownMenuItem onClick={toggleTheme} className="text-[12.5px]">
          {theme === "dark" ? (
            <SunIcon size={16} weight="duotone" className="mr-2 text-amber-500" />
          ) : (
            <MoonIcon size={16} weight="duotone" className="mr-2 text-[#2563EB]" />
          )}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open("https://docs.vyzon.com.br", "_blank", "noopener,noreferrer")}
          className="text-[12.5px]"
        >
          <Question size={16} weight="duotone" className="mr-2 text-muted-foreground" />
          Guias & docs
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
  const { hasFeature, currentPlan, planInfo } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
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

  const filteredMainItems = mainNavItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.url === "/performance" && !hasFeature("gamification") && !hasFeature("metas")) return false;
    return true;
  });

  const filteredAdminItems = adminFooterItems.filter((item) => {
    if (item.requires === "admin") return isAdmin;
    if (item.requires === "super_admin") return isSuperAdmin;
    return false;
  });

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // ─── F2.6 item style ─────────────────────────────────────────────────
  // Altura 40px, radius 12px, gap-2.5. Ativo: bg azul muito suave +
  // border azul + ícone azul. Hover: bg #F6F4EF. Sem AnimatedIcon — render
  // direto controlando cor via className do ícone.
  const baseItem =
    "relative flex items-center gap-2.5 h-10 px-3 rounded-xl text-[14px] font-medium transition-colors duration-150 outline-none";
  const inactiveClass = `${baseItem} text-[#64748B] hover:text-[#0B1220] hover:bg-[#F6F4EF]`;
  const activeClass = `${baseItem} text-[#0B1220]`;

  const renderNavItem = (item: NavItem | FooterItem, opts?: { footer?: boolean }) => {
    const isFooter = opts?.footer === true;
    const isActive =
      location.pathname === item.url ||
      (item.url !== "/inicio" && location.pathname.startsWith(item.url));
    const showBadge = "badge" in item && item.badge === "rotting";
    const Icon = item.icon;

    // Footer = mais discreto: text menor e cor mais muted, sem ativo cheio
    const itemBase = isFooter
      ? "relative flex items-center gap-2.5 h-9 px-3 rounded-lg text-[12.5px] font-medium text-[#94A3B8] hover:text-[#0B1220] hover:bg-[#F6F4EF] transition-colors outline-none"
      : isActive
      ? activeClass
      : inactiveClass;

    const linkContent = (
      <NavLink
        to={item.url}
        end={item.url === "/inicio"}
        className={itemBase}
        activeClassName=""
        aria-label={item.title}
        data-demo-nav={item.url}
      >
        {/* Pill ativo — só nav principal */}
        {!isFooter && isActive && (
          <>
            <span
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.18)",
              }}
              aria-hidden
            />
            <span
              className="absolute -left-[7px] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full pointer-events-none"
              style={{ background: "#2563EB", boxShadow: "0 0 6px rgba(37,99,235,0.45)" }}
              aria-hidden
            />
          </>
        )}

        <span className="relative shrink-0 inline-flex">
          <Icon
            size={18}
            weight={isActive && !isFooter ? "fill" : "duotone"}
            className={
              isFooter
                ? "text-[#94A3B8] group-hover:text-[#0B1220]"
                : isActive
                ? "text-[#2563EB]"
                : "text-[#94A3B8]"
            }
            aria-hidden
          />
          {/* F2.7: micro dot roxo no item EVA (IA accent sutil), sem dominar */}
          {!isFooter && "feature" in item && item.feature === "eva" && !isActive && (
            <span
              className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full pointer-events-none"
              style={{
                background: "#7C3AED",
                boxShadow: "0 0 4px rgba(124,58,237,0.5)",
              }}
              aria-hidden
            />
          )}
          {/* F2.7: badge rotting em amber (atenção), não rose (emergência) */}
          {showBadge && rottingDealsCount > 0 && collapsed && (
            <span
              className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-white text-[9px] font-semibold leading-none"
              style={{
                background: "#F59E0B",
                boxShadow: "0 0 6px rgba(245,158,11,0.40)",
              }}
            >
              {rottingDealsCount > 99 ? "99+" : rottingDealsCount}
            </span>
          )}
        </span>

        {!collapsed && (
          <>
            <span className="relative flex-1 truncate tracking-tight">{item.title}</span>
            {showBadge && rottingDealsCount > 0 && (
              <span
                className="relative inline-flex items-center justify-center min-w-[22px] h-[20px] px-2 rounded-md text-[10.5px] font-semibold"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  color: "#B45309",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
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
            {showBadge && rottingDealsCount > 0 && ` (${rottingDealsCount} parados)`}
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
        className="text-[#0B1220]"
        style={{
          background: "#FFFFFF",
          borderRight: "1px solid #E6EDF5",
        }}
      >
        <SidebarContent className="gap-0">
          {/* Topo: logo + sino alinhados (F2.7: mais respiro superior) */}
          <div
            className={`pt-5 pb-4 ${collapsed ? "px-2" : "px-4"} flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            } gap-2`}
          >
            {collapsed ? (
              <img src={logoIcon} alt="Vyzon" className="h-7 w-7 object-contain" />
            ) : (
              <ThemeLogo className="h-8 w-auto" />
            )}
            {!collapsed && <ReminderBell />}
          </div>

          {/* CTA Novo lead — premium gradient 40px */}
          <div className="px-3 pb-3" data-tour="register-sale-btn">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsNovaOportunidadeOpen(true)}
                    aria-label="Novo lead"
                    className="relative w-full flex items-center justify-center h-10 rounded-xl text-white transition-all duration-200 active:scale-[0.97] hover:brightness-110"
                    style={{
                      background: "linear-gradient(135deg, #2563EB 0%, #4A8CE8 100%)",
                      boxShadow:
                        "0 6px 20px rgba(37,99,235,0.30), 0 1px 0 rgba(255,255,255,0.20) inset",
                    }}
                  >
                    <Plus size={16} weight="bold" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">
                  Novo lead
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => setIsNovaOportunidadeOpen(true)}
                aria-label="Novo lead"
                className="relative w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-white text-[13px] font-semibold tracking-tight transition-all duration-200 active:scale-[0.98] hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #4A8CE8 100%)",
                  boxShadow:
                    "0 6px 20px rgba(37,99,235,0.30), 0 1px 0 rgba(255,255,255,0.20) inset",
                }}
              >
                <Plus size={15} weight="bold" />
                <span>Novo lead</span>
              </button>
            )}
          </div>

          {/* Sino standalone (collapsed) */}
          {collapsed && (
            <div className="px-3 pb-2 flex items-center justify-center">
              <ReminderBell />
            </div>
          )}

          {/* Separator leve */}
          <div
            className="mx-3 h-px mb-2"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #E6EDF5 50%, transparent 100%)",
            }}
            aria-hidden
          />

          {/* Nav principal */}
          <SidebarGroup className="py-1 px-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {filteredMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderNavItem(item)}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter
          className="mt-auto p-0"
          style={{
            borderTop: "1px solid #E6EDF5",
            background: "#FAFBFC",
          }}
        >
          {/* Gestão/Suporte — discreto, antes do user */}
          {filteredAdminItems.length > 0 && (
            <div className={collapsed ? "p-2" : "px-2.5 pt-2.5 pb-1.5"}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#CBD5E1]">
                  Admin
                </p>
              )}
              <SidebarMenu className="gap-0.5">
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderNavItem(item, { footer: true })}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          )}

          {!collapsed && filteredAdminItems.length > 0 && (
            <div className="mx-3 h-px" style={{ background: "#EAF0F6" }} aria-hidden />
          )}

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
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#94A3B8]"
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
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#94A3B8] hover:text-[#0B1220] transition-colors"
                    title="Ver faturamento"
                  >
                    <Star
                      size={11}
                      weight="fill"
                      className={
                        currentPlan === "pro" || currentPlan === "plus"
                          ? "text-[#2563EB]"
                          : "text-[#94A3B8]"
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
