import { useState, useEffect } from "react";
import { Home, Trophy, PlusCircle, Target, PhoneCall, Shield, LogOut, User, Calendar, Kanban, Upload, Settings, ChevronRight, Sparkles, HelpCircle } from "lucide-react";
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
  { title: "WhatsApp", url: "/whatsapp", icon: WhatsAppIcon },
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

  const activeClass = "bg-emerald-500/10 text-emerald-400 font-medium dark:bg-emerald-500/10 dark:text-emerald-400";
  const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors";

  const renderNavItem = (item: { title: string; url: string; icon: React.ComponentType<any> }, showBadge = false) => {
    const isActive = location.pathname === item.url || (item.url !== "/dashboard" && location.pathname.startsWith(item.url));

    const linkContent = (
      <NavLink
        to={item.url}
        end={item.url === "/dashboard"}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${inactiveClass}`}
        activeClassName={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${activeClass}`}
      >
        <span className="relative shrink-0">
          <AnimatedIcon icon={item.icon} isActive={isActive} />
          {showBadge && rottingDealsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none">
              {rottingDealsCount > 99 ? "99+" : rottingDealsCount}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {showBadge && rottingDealsCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold">
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
      <Sidebar collapsible="offcanvas" className="border-r border-border/50 bg-sidebar text-sidebar-foreground">
        <SidebarContent className="gap-0">
          {/* Logo */}
          <div className="px-4 pt-5 pb-4">
            <div className="flex items-center justify-center">
              <ThemeLogo className={collapsed ? "h-8 w-auto" : "h-10 w-auto"} />
            </div>
          </div>

          {/* CTA - Registrar Venda */}
          <div className="px-3 pb-3" data-tour="register-sale-btn">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsNovaVendaOpen(true)}
                    className="w-full flex items-center justify-center h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold">
                  Registrar Venda
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => setIsNovaVendaOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Registrar Venda</span>
              </button>
            )}
          </div>

          {/* Reminder Bell */}
          <div className="px-3 pb-2 flex items-center justify-center">
            <ReminderBell />
          </div>

          {/* Separator */}
          <div className="mx-3 h-px bg-border/50 mb-2" />

          {/* Visão Geral */}
          <SidebarGroup className="py-1 px-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase text-muted-foreground/50 font-semibold tracking-widest px-3 mb-1">
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
            <SidebarGroup className="py-1 px-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[11px] uppercase text-muted-foreground/50 font-semibold tracking-widest px-3 mb-1">
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
            <SidebarGroup className="py-1 px-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[11px] uppercase text-muted-foreground/50 font-semibold tracking-widest px-3 mb-1">
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
        <SidebarFooter className="border-t border-border/50 mt-auto p-0">
          {/* Profile Card */}
          {!collapsed ? (
            <div className="p-3">
              {/* User info card */}
              <button
                onClick={() => navigate("/profile")}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isProfileActive
                    ? "bg-emerald-500/10"
                    : "hover:bg-muted/50"
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-border/50">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                  <AvatarFallback className="bg-emerald-500/15 text-emerald-400 text-sm font-semibold">
                    {profile?.nome ? getInitials(profile.nome) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate w-full">
                    {profile?.nome || "Usuário"}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate w-full">
                    {user?.email || ""}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </button>

              {/* Role & Plan badges */}
              <div className="flex items-center gap-2 px-3 mt-2">
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Admin</span>
                  </div>
                )}
                {planInfo && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    currentPlan === 'pro' ? 'bg-emerald-500/15 text-emerald-400' :
                    currentPlan === 'plus' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-zinc-500/15 text-zinc-400'
                  }`}>
                    <Sparkles className="h-2.5 w-2.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{planInfo.label}</span>
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-1 mt-3 px-1">
                <a
                  href="https://wa.me/5548991696887?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20Vyzon."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>Suporte</span>
                </a>
                <ThemeToggle />
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 flex flex-col items-center gap-1">
              {/* Collapsed: avatar → profile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate("/profile")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isProfileActive ? "bg-emerald-500/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                      <AvatarFallback className="bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
                        {profile?.nome ? getInitials(profile.nome) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {profile?.nome || "Perfil"}
                </TooltipContent>
              </Tooltip>

              {/* Collapsed: support */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://wa.me/5548991696887?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20Vyzon."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Suporte
                </TooltipContent>
              </Tooltip>

              {/* Collapsed: theme toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div><ThemeToggle collapsed /></div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Alternar tema
                </TooltipContent>
              </Tooltip>

              {/* Collapsed: logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="flex items-center justify-center p-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
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
