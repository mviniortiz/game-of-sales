import { useState } from "react";
import { Home, Trophy, PlusCircle, Target, PhoneCall, Shield, LogOut, User, Settings, Calendar, Kanban, Lock } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import brandLogo from "@/assets/logo-full.png";
import brandLogoIcon from "@/assets/logo-icon.png";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { NovaVendaModal } from "@/components/vendas/NovaVendaModal";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Itens agrupados por categoria
const visaoGeralItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "CRM Pipeline", url: "/crm", icon: Kanban },
  { title: "Performance de Calls", url: "/calls", icon: PhoneCall },
  { title: "Calendário", url: "/calendario", icon: Calendar },
];

const gestaoItems = [
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Integrações", url: "/integracoes", icon: Settings },
];

const adminMenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, isAdmin, signOut, profile } = useAuth();
  const { hasFeature } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);

  // Filter menu items based on plan features
  const filteredVisaoGeralItems = visaoGeralItems.filter(item => {
    if (item.url === '/calls') return hasFeature('calls');
    return true;
  });

  const filteredGestaoItems = gestaoItems.filter(item => {
    if (item.url === '/metas') return hasFeature('metas');
    if (item.url === '/integracoes') return hasFeature('integrations');
    if (item.url === '/ranking') return hasFeature('gamification');
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

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarContent className="gap-0">
          {/* Logo Section */}
          <div className="p-4 border-b border-sidebar-border">
            {!collapsed && (
              <div className="flex items-center justify-center">
                <img src={brandLogo} alt="Game Sales" className="h-20 w-auto object-contain" />
              </div>
            )}
            {collapsed && (
              <img src={brandLogoIcon} alt="Game Sales" className="w-12 h-12 object-contain mx-auto" />
            )}
          </div>

          {/* CTA Button - Registrar Venda */}
          <div className="p-4" data-tour="register-sale-btn">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsNovaVendaOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-md hover:shadow-lg transition-all h-12 gap-2"
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold">
                  Registrar Venda
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                onClick={() => setIsNovaVendaOpen(true)}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-md hover:shadow-lg transition-all h-12 gap-2"
              >
                <PlusCircle className="h-5 w-5" />
                <span>Registrar Venda</span>
              </Button>
            )}
          </div>

          {/* Visão Geral Section */}
          <SidebarGroup className="py-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-xs uppercase text-muted-foreground/70 font-semibold tracking-wider px-4">
                Visão Geral
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {filteredVisaoGeralItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className="flex items-center gap-3 hover:bg-sidebar-accent transition-all group py-2.5"
                                activeClassName="bg-emerald-50 text-emerald-600 font-medium border-l-4 border-emerald-500 dark:bg-sidebar-accent dark:text-sidebar-foreground"
                              >
                                <AnimatedIcon icon={item.icon} isActive={isActive} />
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end
                            className="flex items-center gap-3 hover:bg-sidebar-accent transition-all group py-2.5"
                            activeClassName="bg-emerald-50 text-emerald-600 font-medium border-l-4 border-emerald-500 dark:bg-sidebar-accent dark:text-sidebar-foreground"
                          >
                            <AnimatedIcon icon={item.icon} isActive={isActive} />
                            <span className="flex-1">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Gestão Section */}
          <SidebarGroup className="py-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-xs uppercase text-muted-foreground/70 font-semibold tracking-wider px-4">
                Gestão
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {filteredGestaoItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className="flex items-center gap-3 hover:bg-sidebar-accent transition-all group py-2.5"
                                activeClassName="bg-emerald-50 text-emerald-600 font-medium border-l-4 border-emerald-500 dark:bg-sidebar-accent dark:text-sidebar-foreground"
                              >
                                <AnimatedIcon icon={item.icon} isActive={isActive} />
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end
                            className="flex items-center gap-3 hover:bg-sidebar-accent transition-all group py-2.5"
                            activeClassName="bg-emerald-50 text-emerald-600 font-medium border-l-4 border-emerald-500 dark:bg-sidebar-accent dark:text-sidebar-foreground"
                          >
                            <AnimatedIcon icon={item.icon} isActive={isActive} />
                            <span className="flex-1">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Sistema Section - Admin Only */}
          {isAdmin && (
            <SidebarGroup className="py-2">
              {!collapsed && (
                <SidebarGroupLabel className="text-xs uppercase text-muted-foreground/70 font-semibold tracking-wider px-4">
                  Sistema
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <SidebarMenuItem>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={adminMenuItem.url}
                              end
                              className="flex items-center gap-3 hover:bg-sidebar-accent transition-all group py-2.5"
                              activeClassName="bg-emerald-50 text-emerald-600 font-medium border-l-4 border-emerald-500 dark:bg-sidebar-accent dark:text-sidebar-foreground"
                            >
                              <AnimatedIcon icon={adminMenuItem.icon} isActive={location.pathname === adminMenuItem.url} />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {adminMenuItem.title}
                        </TooltipContent>
                      </Tooltip>
                    ) : (

                      <SidebarMenuButton asChild>
                        <NavLink
                          to={adminMenuItem.url}
                          end
                          className="flex items-center gap-3 hover:bg-sidebar-accent transition-all group py-2.5"
                          activeClassName="bg-emerald-50 text-emerald-600 font-medium border-l-4 border-emerald-500 dark:bg-sidebar-accent dark:text-sidebar-foreground"
                        >
                          <AnimatedIcon icon={adminMenuItem.icon} isActive={location.pathname === adminMenuItem.url} />
                          <span className="flex-1">{adminMenuItem.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* User Profile Footer - Enhanced Card Design */}
        <SidebarFooter className="border-t border-sidebar-border p-4 mt-auto bg-secondary">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3 hover:bg-sidebar-accent rounded-lg transition-all"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                      {profile?.nome ? getInitials(profile.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left flex-1">
                    <span className="text-sm font-semibold">{profile?.nome || "Usuário"}</span>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        👑 Admin
                      </Badge>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mx-auto hover:bg-gray-100">
                  <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                      {profile?.nome ? getInitials(profile.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{profile?.nome || "Usuário"}</span>
                    {isAdmin && (
                      <Badge variant="secondary" className="text-xs mt-1 w-fit bg-amber-500/10 text-amber-600 border-amber-500/20">
                        👑 Admin
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Nova Venda Modal */}
      <NovaVendaModal
        open={isNovaVendaOpen}
        onClose={() => setIsNovaVendaOpen(false)}
      />
    </TooltipProvider>
  );
}
