import { useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Plug,
  Upload,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  pending?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    label: "Conta",
    items: [
      { id: "perfil", label: "Perfil", path: "/configuracoes/perfil", icon: User },
      { id: "seguranca", label: "Segurança", path: "/configuracoes/seguranca", icon: ShieldCheck },
    ],
  },
  {
    label: "Empresa",
    items: [
      { id: "organizacao", label: "Organização", path: "/configuracoes/organizacao", icon: Building2, adminOnly: true },
      { id: "time", label: "Acesso", path: "/configuracoes/time", icon: Users, adminOnly: true },
      { id: "faturamento", label: "Faturamento", path: "/configuracoes/faturamento", icon: CreditCard, adminOnly: true },
    ],
  },
  {
    label: "Dados",
    items: [
      { id: "integracoes", label: "Integrações", path: "/configuracoes/integracoes", icon: Plug, adminOnly: true },
      { id: "importar", label: "Importar", path: "/configuracoes/importar", icon: Upload, adminOnly: true },
    ],
  },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  perfil: { title: "Perfil", subtitle: "Sua identidade dentro do Vyzon" },
  seguranca: { title: "Segurança", subtitle: "Senha, sessões e acessos" },
  organizacao: { title: "Organização", subtitle: "Dados da empresa" },
  time: { title: "Acesso", subtitle: "Quem pode entrar e em qual nível" },
  faturamento: { title: "Faturamento", subtitle: "Plano, uso e histórico" },
  integracoes: { title: "Integrações", subtitle: "Checkouts, webhooks e automações" },
  importar: { title: "Importar", subtitle: "Traga deals e vendas de fora" },
};

export default function ConfiguracoesLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const currentSection = useMemo(() => {
    const seg = location.pathname.split("/")[2] || "perfil";
    return seg;
  }, [location.pathname]);

  const header = TITLES[currentSection] || TITLES.perfil;

  const visibleGroups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => !it.adminOnly || isAdmin),
      })).filter((g) => g.items.length > 0),
    [isAdmin],
  );

  return (
    <div className="-m-3 sm:-m-4 md:-m-6">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="px-4 sm:px-6 lg:px-10 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 mb-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-foreground transition-colors"
            >
              Vyzon
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/80">Configurações</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-emerald-400">{header.title}</span>
          </nav>
          <h1
            className="text-2xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}
          >
            {header.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{header.subtitle}</p>
        </div>
      </div>

      {/* Body: sidebar + outlet */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 bg-background min-h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
          {/* Sidebar nav */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            {/* Mobile: horizontal scroll pill nav */}
            <nav className="lg:hidden flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
              {visibleGroups.flatMap((g) => g.items).map((item) => {
                const active = currentSection === item.id;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors",
                      active
                        ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                    style={{ fontWeight: 500 }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.pending && (
                      <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Desktop: grouped vertical nav */}
            <div className="hidden lg:block space-y-6">
              {visibleGroups.map((group) => (
                <div key={group.label}>
                  <p
                    className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-2 px-2.5"
                  >
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = currentSection === item.id;
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <NavLink
                            to={item.path}
                            className={cn(
                              "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all",
                              active
                                ? "text-foreground bg-muted/40"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
                            )}
                            style={{ fontWeight: active ? 600 : 500 }}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 transition-colors",
                                active ? "text-emerald-400" : "text-muted-foreground/60 group-hover:text-foreground/70",
                              )}
                            />
                            <span className="flex-1">{item.label}</span>
                            {item.pending && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {isAdmin && (
                <div className="pt-5 border-t border-border">
                  <button
                    onClick={() => navigate("/admin")}
                    className="group w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <span className="flex-1 text-left">Ir para Gestão</span>
                    <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
