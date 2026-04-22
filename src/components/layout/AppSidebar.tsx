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

  const activeClass = "bg-muted text-foreground font-medium";
  const inactiveClass = "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors";

  const renderNavItem = (item: { title: string; url: string; icon: React.ComponentType<any> }, showBadge = false) => {
    const isActive = location.pathname === item.url || (item.url !== "/dashboard" && location.pathname.startsWith(item.url));

    const linkContent = (
      <NavLink
        to={item.url}
        end={item.url === "/dashboard"}
        className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] ${inactiveClass}`}
        activeClassName={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] ${activeClass}`}
      >
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r-full bg-emerald-500" />}
        <span className="relative shrink-0">
          <AnimatedIcon icon={item.icon} isActive={isActive} />
          {showBadge && rottingDealsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-semibold leading-none">
              {rottingDealsCount > 99 ? "99+" : rottingDealsCount}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate tracking-tight">{item.title}</span>
            {showBadge && rottingDealsCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-4 px-1 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400">
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
      <Sidebar collapsible="offcanvas" className="border-r border-border bg-sidebar text-sidebar-foreground">
        <SidebarContent className="gap-0">
          {/* Logo */}
          <div className="px-4 pt-5 pb-4">
            <div className="flex items-center justify-center">
              <ThemeLogo className={collapsed ? "h-7 w-auto" : "h-9 w-auto"} />
            </div>
          </div>

          {/* CTA - Registrar Venda */}
          <div className="px-3 pb-2.5" data-tour="register-sale-btn">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsNovaVendaOpen(true)}
                    className="w-full flex items-center justify-center h-8 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
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
                className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-[12.5px] font-medium transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Registrar Venda</span>
              </button>
            )}
          </div>

          {/* Reminder Bell */}
          <div className="px-3 pb-2 flex items-center justify-center">
            <ReminderBell />
          </div>

          {/* Separator */}
          <div className="mx-3 h-px bg-border mb-2" />

          {/* Visão Geral */}
          <SidebarGroup className="py-1 px-1.5">
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

          {/* Gestão */}
          {filteredGestaoItems.length > 0 && (
            <SidebarGroup className="py-1 px-1.5">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground/50 font-medium tracking-wider px-2.5 mb-1">
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

          {/* Configurações */}
          {filteredConfigItems.length > 0 && (
            <SidebarGroup className="py-1 px-1.5">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase text-muted-foreground/50 font-medium tracking-wider px-2.5 mb-1">
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
        <SidebarFooter className="border-t border-border mt-auto p-0">
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
