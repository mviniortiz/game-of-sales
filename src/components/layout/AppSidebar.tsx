import { Home, TrendingUp, Trophy, PlusCircle, Target, PhoneCall, Shield } from "lucide-react";
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
} from "@/components/ui/sidebar";

const baseMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Performance de Calls", url: "/calls", icon: PhoneCall },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Registrar Venda", url: "/nova-venda", icon: PlusCircle },
  { title: "Metas", url: "/metas", icon: Target },
];

const adminMenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function AppSidebar() {
  const { state } = useSidebar();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const menuItems = isAdmin ? [...baseMenuItems, adminMenuItem] : baseMenuItems;

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarContent>
        <div className="p-6 border-b border-border/50">
          {!collapsed && (
            <div className="flex items-center justify-center">
              <img src={logo} alt="Rota de Negócios" className="w-24 h-24 object-contain" />
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
                      className="flex items-center gap-3 hover:bg-accent/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
