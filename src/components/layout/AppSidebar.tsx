import { useState, useEffect } from "react";
import { Home, Trophy, PlusCircle, Target, PhoneCall, Shield, LogOut, User, Calendar, Kanban, Upload, Settings, ChevronRight, Sparkles, HelpCircle, Inbox } from "lucide-react";
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
import { NovaVendaModal } from "@/components/vendas/NovaVendaModal";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  { title: "Integrações", url: "/integracoes", icon: Settings },
  { title: "Importar Dados", url: "/importar", icon: Upload },
  { title: "Administração", url: "/admin", icon: Shield },
  { title: "Suporte", url: "/admin/suporte", icon: Inbox },
];

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
    if (item.url === '/ranking') return hasFeature('ranking');
    // Eva: show for all admins (paywall is on the page itself)
    if ('adminOnly' in item && item.adminOnly) return isAdmin;
    return true;
  });

  const filteredConfigItems = configItems.filter(item => {
    if (item.url === '/integracoes') return isAdmin && hasFeature('integrations');
    if (item.url === '/importar') return isAdmin;
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

  const activeClass = "bg-white/[0.04] text-foreground font-medium";
  const inactiveClass = "text-muted-foreground/80 hover:text-foreground hover:bg-white/[0.02] transition-colors";

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

  const isProfileActive = location.pathname === "/profile";

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

        {/* Footer — Profile + Theme + Logout */}
        <SidebarFooter className="border-t border-border mt-auto p-0">
          {/* Profile Card */}
          {!collapsed ? (
            <div className="p-2.5">
              {/* User info card */}
              <button
                onClick={() => navigate("/profile")}
                className={`w-full flex items-center gap-2.5 p-2 rounded-md transition-colors ${
                  isProfileActive
                    ? "bg-white/[0.04]"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0 rounded-md">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
                  <AvatarFallback className="bg-white/[0.04] text-muted-foreground text-[11px] font-semibold rounded-md">
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
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              </button>

              {/* Role & Plan badges */}
              {(isAdmin || planInfo) && (
                <div className="flex items-center gap-1.5 px-2 mt-1.5">
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400/90">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  )}
                  {planInfo && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      currentPlan === 'pro' ? 'bg-emerald-500/10 text-emerald-400' :
                      currentPlan === 'plus' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-white/[0.04] text-muted-foreground'
                    }`}>
                      <Sparkles className="h-2.5 w-2.5" />
                      {planInfo.label}
                    </span>
                  )}
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center justify-between mt-2 px-0.5">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => navigate("/docs")}
                    className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                      location.pathname === "/docs"
                        ? "text-foreground bg-white/[0.04]"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.02]"
                    }`}
                    title="Ajuda"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                  <ThemeToggle />
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors text-muted-foreground/70 hover:text-rose-400 hover:bg-rose-500/[0.06]"
                >
                  <LogOut className="h-3 w-3 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 flex flex-col items-center gap-0.5">
              {/* Collapsed: avatar → profile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate("/profile")}
                    className={`p-1 rounded-md transition-colors ${
                      isProfileActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <Avatar className="h-7 w-7 rounded-md">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" className="rounded-md" />}
                      <AvatarFallback className="bg-white/[0.04] text-muted-foreground text-[10px] font-semibold rounded-md">
                        {profile?.nome ? getInitials(profile.nome) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">
                  {profile?.nome || "Perfil"}
                </TooltipContent>
              </Tooltip>

              {/* Collapsed: help */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate("/docs")}
                    className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                      location.pathname === "/docs"
                        ? "text-foreground bg-white/[0.04]"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.02]"
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">
                  Ajuda
                </TooltipContent>
              </Tooltip>

              {/* Collapsed: theme toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div><ThemeToggle collapsed /></div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">
                  Alternar tema
                </TooltipContent>
              </Tooltip>

              {/* Collapsed: logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground/70 hover:text-rose-400 hover:bg-rose-500/[0.06] transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">
                  Sair
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <NovaVendaModal
        open={isNovaVendaOpen}
        onClose={() => setIsNovaVendaOpen(false)}
      />
    </TooltipProvider>
  );
}
