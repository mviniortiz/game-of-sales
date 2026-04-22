import { lazy, Suspense, useState, useEffect } from "react";
import { Home, Trophy, PlusCircle, Target, PhoneCall, Shield, LogOut, Calendar, Kanban, Settings, ChevronsUpDown, Sparkles, HelpCircle, Inbox, UserCog, Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeToggle";
import { EvaIcon } from "@/components/icons/EvaAvatar";
import { ReminderBell } from "@/components/crm/ReminderBell";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import logoIcon from "@/assets/logo-icon.png";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
// Lazy: só carrega ao clicar em "Nova venda"
const NovaVendaModal = lazy(() => import("@/components/vendas/NovaVendaModal").then((m) => ({ default: m.NovaVendaModal })));
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

const visaoGeralItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Pulse", url: "/pulse", icon: WhatsAppIcon },
  { title: "CRM Pipeline", url: "/crm", icon: Kanban },
  { title: "Calls", url: "/calls", icon: PhoneCall },
  { title: "Calendário", url: "/calendario", icon: Calendar },
];

const gestaoItems = [
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Eva", url: "/agente", icon: EvaIcon, adminOnly: true, feature: "eva" as const },
];

const configItems = [
  { title: "Gestão", url: "/admin", icon: Shield },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Suporte", url: "/admin/suporte", icon: Inbox },
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
      className={`p-1 rounded-md transition-colors ${
        isProfileActive ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <Avatar className="h-7 w-7 rounded-md">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
        <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold rounded-md">
          {profile?.nome ? getInitials(profile.nome) : "U"}
        </AvatarFallback>
      </Avatar>
    </button>
  ) : (
    <button
      className={`w-full flex items-center gap-2.5 p-2 rounded-md transition-colors ${
        isProfileActive ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <Avatar className="h-8 w-8 shrink-0 rounded-md">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
        <AvatarFallback className="bg-muted text-muted-foreground text-[11px] font-semibold rounded-md">
          {profile?.nome ? getInitials(profile.nome) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start text-left flex-1 min-w-0 leading-tight">
        <span className="text-[12.5px] font-semibold text-foreground truncate w-full tracking-tight">
          {profile?.nome || "Usuário"}
        </span>
        <span className="text-[10.5px] text-muted-foreground/60 truncate w-full mt-0.5">
          {user?.email || ""}
        </span>
      </div>
      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "start" : "center"}
        sideOffset={8}
        className="w-56 bg-card border-border"
      >
        <DropdownMenuItem onClick={() => navigate("/configuracoes/perfil")} className="text-[12.5px]">
          <UserCog className="h-3.5 w-3.5 mr-2 text-muted-foreground/70" />
          Minha conta
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleTheme} className="text-[12.5px]">
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5 mr-2 text-amber-400" />
          ) : (
            <Moon className="h-3.5 w-3.5 mr-2 text-emerald-400" />
          )}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/docs")} className="text-[12.5px]">
          <HelpCircle className="h-3.5 w-3.5 mr-2 text-muted-foreground/70" />
          Ajuda & docs
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={signOut}
          className="text-[12.5px] text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
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

  // Command Palette → "Registrar nova venda" dispara este evento.
  useEffect(() => {
    const open = () => setIsNovaVendaOpen(true);
    window.addEventListener("vyzon:open-nova-venda", open);
    return () => window.removeEventListener("vyzon:open-nova-venda", open);
  }, []);

  const filteredVisaoGeralItems = visaoGeralItems.filter(item => {
    if (item.url === '/calls') return hasFeature('calls');
    return true;
  });

  const filteredGestaoItems = gestaoItems.filter(item => {
    if (item.url === '/metas') return hasFeature('metas');
    if (item.url === '/ranking') return hasFeature('gamification');
    // Eva: show for all admins (paywall is on the page itself)
    if ('adminOnly' in item && item.adminOnly) return isAdmin;
    return true;
  });

  const filteredConfigItems = configItems.filter(item => {
    if (item.url === '/configuracoes') return true;
    if (item.url === '/admin') return isAdmin;
    if (item.url === '/admin/suporte') return isSuperAdmin;
    return true;
  });

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map(n => n.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Estilo novo: active = pill glass emerald + dot indicator (sem bg-muted chato)
  const baseItem = "relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors duration-150";
  const inactiveClass = `${baseItem} text-muted-foreground/75 hover:text-foreground hover:bg-white/[0.035]`;
  const activeClass = `${baseItem} text-emerald-400 font-medium`;

  const renderNavItem = (item: { title: string; url: string; icon: React.ComponentType<{ isActive?: boolean; className?: string }> }, showBadge = false) => {
    const isActive = location.pathname === item.url || (item.url !== "/dashboard" && location.pathname.startsWith(item.url));

    const linkContent = (
      <NavLink
        to={item.url}
        end={item.url === "/dashboard"}
        className={inactiveClass}
        activeClassName={activeClass}
      >
        {isActive && (
          <>
            {/* Pill glass emerald de fundo */}
            <span
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: "linear-gradient(90deg, rgba(0,227,122,0.12) 0%, rgba(0,227,122,0.04) 100%)",
                border: "1px solid rgba(0,227,122,0.18)",
              }}
              aria-hidden
            />
            {/* Dot indicator à esquerda (substitui barrinha retangular) */}
            <span
              className="absolute left-[-6px] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400 pointer-events-none"
              style={{ boxShadow: "0 0 8px rgba(0,227,122,0.6)" }}
              aria-hidden
            />
          </>
        )}
        <span className="relative shrink-0">
          <AnimatedIcon icon={item.icon} isActive={isActive} />
          {showBadge && rottingDealsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-semibold leading-none shadow-[0_0_6px_rgba(244,63,94,0.45)]">
              {rottingDealsCount > 99 ? "99+" : rottingDealsCount}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className="relative flex-1 truncate tracking-tight">{item.title}</span>
            {showBadge && rottingDealsCount > 0 && (
              <span className="relative flex items-center justify-center min-w-[18px] h-4 px-1 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400">
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
        className="text-sidebar-foreground"
        style={{
          background: "linear-gradient(180deg, rgba(8,10,13,0.98) 0%, rgba(6,8,10,0.98) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <SidebarContent className="gap-0">
          {/* Logo + Reminder Bell na mesma linha (mais enxuto) */}
          <div className={`pt-4 pb-3 ${collapsed ? "px-2" : "px-4"} flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
            {collapsed ? (
              <img src={logoIcon} alt="Vyzon" className="h-7 w-7 object-contain" />
            ) : (
              <ThemeLogo className="h-8 w-auto" />
            )}
            {!collapsed && <ReminderBell />}
          </div>

          {/* CTA - Registrar Venda com glow emerald */}
          <div className="px-3 pb-3" data-tour="register-sale-btn">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsNovaVendaOpen(true)}
                    className="relative w-full flex items-center justify-center h-9 rounded-lg text-white transition-all duration-200 active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(135deg, #00E37A 0%, #00B289 100%)",
                      boxShadow: "0 4px 16px rgba(0,227,122,0.28), 0 1px 0 rgba(255,255,255,0.15) inset",
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">
                  Registrar Venda
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => setIsNovaVendaOpen(true)}
                className="relative w-full flex items-center justify-center gap-1.5 h-9 rounded-lg text-white text-[12.5px] font-semibold tracking-tight transition-all duration-200 active:scale-[0.98] hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #00E37A 0%, #00B289 100%)",
                  boxShadow: "0 4px 16px rgba(0,227,122,0.28), 0 1px 0 rgba(255,255,255,0.15) inset",
                }}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Registrar Venda</span>
              </button>
            )}
          </div>

          {/* Reminder Bell (standalone só quando collapsed — quando expandido já está no header) */}
          {collapsed && (
            <div className="px-3 pb-2 flex items-center justify-center">
              <ReminderBell />
            </div>
          )}

          {/* Separator com fade gradient */}
          <div
            className="mx-3 h-px mb-3"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            }}
          />

          {/* Visão Geral */}
          <SidebarGroup className="py-0.5 px-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground/50 font-medium tracking-wider px-2.5 mb-1">
                Visão Geral
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {filteredVisaoGeralItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {renderNavItem(item, item.url === "/crm")}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Subtle spacer entre grupos */}
          {filteredGestaoItems.length > 0 && !collapsed && <div className="h-2" />}

          {/* Gestão */}
          {filteredGestaoItems.length > 0 && (
            <SidebarGroup className="py-0.5 px-2">
              {!collapsed && (
                <SidebarGroupLabel className="text-[9.5px] uppercase text-muted-foreground/35 font-semibold tracking-[0.14em] px-2.5 mb-1.5 mt-1">
                  Gestão
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {filteredGestaoItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {renderNavItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Subtle spacer entre grupos */}
          {filteredConfigItems.length > 0 && !collapsed && <div className="h-2" />}

          {/* Configurações */}
          {filteredConfigItems.length > 0 && (
            <SidebarGroup className="py-0.5 px-2">
              {!collapsed && (
                <SidebarGroupLabel className="text-[9.5px] uppercase text-muted-foreground/35 font-semibold tracking-[0.14em] px-2.5 mb-1.5 mt-1">
                  Configurações
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {filteredConfigItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {renderNavItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer — Profile dropdown + fixed plan badges */}
        <SidebarFooter
          className="mt-auto p-0"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.025) 100%)",
          }}
        >
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
            {!collapsed && (isAdmin || planInfo) && (
              <div className="flex items-center gap-1.5 px-2">
                {isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400/90">
                    <Shield className="h-2.5 w-2.5" />
                    Admin
                  </span>
                )}
                {planInfo && (
                  <button
                    onClick={() => navigate("/configuracoes/faturamento")}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors hover:brightness-110 ${
                      currentPlan === 'pro' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15' :
                      currentPlan === 'plus' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/15' :
                      'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                    title="Ver faturamento"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
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
    </TooltipProvider>
  );
}
