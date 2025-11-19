import { Home, Trophy, PlusCircle, Target, PhoneCall, Shield, LogOut, User, Settings, Calendar } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  { title: "Dashboard", url: "/", icon: Home },
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
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

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
      <Sidebar className="border-r border-border/50">
        <SidebarContent className="gap-0">
          {/* Logo Section */}
          <div className="p-6 border-b border-border/50">
            {!collapsed && (
              <div className="flex items-center justify-center">
                <img src={logo} alt="Rota de Negócios" className="w-40 h-40 object-contain" />
              </div>
            )}
            {collapsed && (
              <img src={logo} alt="Rota de Negócios" className="w-12 h-12 object-contain mx-auto" />
            )}
          </div>

          {/* CTA Button - Registrar Venda */}
          <div className="p-4">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => navigate("/nova-venda")}
                    className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black font-semibold shadow-lg hover:shadow-xl transition-all h-12 gap-2"
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
                onClick={() => navigate("/nova-venda")}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black font-semibold shadow-lg hover:shadow-xl transition-all h-12 gap-2"
              >
                <PlusCircle className="h-5 w-5" />
                <span>Registrar Venda</span>
              </Button>
            )}
          </div>

        {/* Visão Geral Section */}
        <SidebarGroup className="py-2">
          {!collapsed && (
            <SidebarGroupLabel className="text-xs uppercase text-muted-foreground/60 font-semibold tracking-wider px-4">
              Visão Geral
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visaoGeralItems.map((item) => {
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
                              className="flex items-center gap-3 hover:bg-accent/50 transition-all group py-2.5"
                              activeClassName="bg-accent/60 text-primary font-medium border-l-4 border-cyan-500"
                            >
                              <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-cyan-500' : ''}`} />
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
                          className="flex items-center gap-3 hover:bg-accent/50 transition-all group py-2.5"
                          activeClassName="bg-accent/60 text-primary font-medium border-l-4 border-cyan-500"
                        >
                          <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-cyan-500' : ''}`} />
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
            <SidebarGroupLabel className="text-xs uppercase text-muted-foreground/60 font-semibold tracking-wider px-4">
              Gestão
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {gestaoItems.map((item) => {
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
                              className="flex items-center gap-3 hover:bg-accent/50 transition-all group py-2.5"
                              activeClassName="bg-accent/60 text-primary font-medium border-l-4 border-cyan-500"
                            >
                              <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-cyan-500' : ''}`} />
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
                          className="flex items-center gap-3 hover:bg-accent/50 transition-all group py-2.5"
                          activeClassName="bg-accent/60 text-primary font-medium border-l-4 border-cyan-500"
                        >
                          <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-cyan-500' : ''}`} />
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
              <SidebarGroupLabel className="text-xs uppercase text-muted-foreground/60 font-semibold tracking-wider px-4">
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
                            className="flex items-center gap-3 hover:bg-accent/50 transition-all group py-2.5"
                            activeClassName="bg-accent/60 text-primary font-medium border-l-4 border-cyan-500"
                          >
                            <adminMenuItem.icon className={`h-5 w-5 transition-colors ${location.pathname === adminMenuItem.url ? 'text-cyan-500' : ''}`} />
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
                        className="flex items-center gap-3 hover:bg-accent/50 transition-all group py-2.5"
                        activeClassName="bg-accent/60 text-primary font-medium border-l-4 border-cyan-500"
                      >
                        <adminMenuItem.icon className={`h-5 w-5 transition-colors ${location.pathname === adminMenuItem.url ? 'text-cyan-500' : ''}`} />
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
      <SidebarFooter className="border-t-2 border-border/50 p-4 mt-auto bg-muted/20">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-auto py-3 hover:bg-accent/50 rounded-lg transition-all"
              >
                {user?.user_metadata?.avatar_url ? (
                  <Avatar className="h-10 w-10 ring-2 ring-cyan-500/20">
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-10 w-10 ring-2 ring-cyan-500/20">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-semibold">{user?.user_metadata?.nome || "Usuário"}</span>
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
              <Button variant="ghost" size="icon" className="mx-auto hover:bg-accent/50">
                {user?.user_metadata?.avatar_url ? (
                  <Avatar className="h-10 w-10 ring-2 ring-cyan-500/20">
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-10 w-10 ring-2 ring-cyan-500/20">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.user_metadata?.nome || "Usuário"}</span>
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
    </TooltipProvider>
  );
}
