import { Home, Trophy, PlusCircle, Target, PhoneCall, Shield, LogOut, User, Settings, Calendar } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const baseMenuItems = [
  { title: "Dashboard", url: "/", icon: Home, highlight: false },
  { title: "Performance de Calls", url: "/calls", icon: PhoneCall, highlight: false },
  { title: "Calendário", url: "/calendario", icon: Calendar, highlight: false },
  { title: "Ranking", url: "/ranking", icon: Trophy, highlight: false },
  { title: "Registrar Venda", url: "/nova-venda", icon: PlusCircle, highlight: true },
  { title: "Metas", url: "/metas", icon: Target, highlight: false },
  { title: "Integrações", url: "/integracoes", icon: Settings, highlight: false },
];

const adminMenuItem = { title: "Administração", url: "/admin", icon: Shield, highlight: false };

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const menuItems = isAdmin ? [...baseMenuItems, adminMenuItem] : baseMenuItems;

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map(n => n.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarContent>
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

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={`flex items-center gap-3 hover:bg-accent/50 transition-colors ${
                        item.highlight ? "relative" : ""
                      }`}
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.title}</span>
                          {item.highlight && (
                            <Badge variant="default" className="ml-2 bg-primary">
                              ⭐
                            </Badge>
                          )}
                        </div>
                      )}
                      {collapsed && item.highlight && (
                        <div className="absolute -top-1 -right-1">
                          <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                            ⭐
                          </Badge>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
                {user?.user_metadata?.avatar_url ? (
                  <Avatar className="h-8 w-8">
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="text-sm font-medium">{user?.user_metadata?.nome || "Usuário"}</span>
                  {isAdmin && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      👑 Admin
                    </Badge>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
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
              <Button variant="ghost" size="icon" className="mx-auto">
                {user?.user_metadata?.avatar_url ? (
                  <Avatar className="h-8 w-8">
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.user_metadata?.nome ? getInitials(user.user_metadata.nome) : "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
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
                    <Badge variant="secondary" className="text-xs mt-1 w-fit">
                      👑 Admin
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
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
  );
}
