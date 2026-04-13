import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  Users,
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  Target,
  Building2,
  Activity,
  UserCog,
  TrendingUp,
  DollarSign,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminVendedores } from "@/components/admin/AdminVendedores";
import { AdminVendas } from "@/components/admin/AdminVendas";
import { AdminRelatorios } from "@/components/admin/AdminRelatorios";
import { AdminMetas } from "@/components/admin/AdminMetas";
import { AdminManagement } from "@/components/profile/AdminManagement";
import { AdminCompanies } from "@/components/admin/AdminCompanies";
import { EvolutionMonitor } from "@/components/admin/EvolutionMonitor";
import { AdminProdutos } from "@/components/admin/AdminProdutos";
import { AdminFormasPagamento } from "@/components/admin/AdminFormasPagamento";

type AdminSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  superAdminOnly?: boolean;
};

const sections: AdminSection[] = [
  { id: "vendedores", label: "Vendedores", icon: Users, group: "Equipe" },
  { id: "usuarios", label: "Usuários", icon: UserCog, group: "Equipe" },
  { id: "vendas", label: "Vendas", icon: ShoppingCart, group: "Comercial" },
  { id: "produtos", label: "Produtos", icon: Package, group: "Comercial" },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard, group: "Comercial" },
  { id: "relatorios", label: "Relatórios", icon: BarChart3, group: "Performance" },
  { id: "metas", label: "Metas", icon: Target, group: "Performance" },
  { id: "empresas", label: "Empresas", icon: Building2, group: "Sistema", superAdminOnly: true },
  { id: "monitor", label: "Monitor", icon: Activity, group: "Sistema", superAdminOnly: true },
];

const sectionComponents: Record<string, React.ComponentType> = {
  vendedores: AdminVendedores,
  vendas: AdminVendas,
  produtos: AdminProdutos,
  pagamentos: AdminFormasPagamento,
  relatorios: AdminRelatorios,
  metas: AdminMetas,
  empresas: AdminCompanies,
  monitor: EvolutionMonitor,
  usuarios: AdminManagement,
};

type KpiData = {
  totalSellers: number;
  totalSalesMonth: number;
  revenueMonth: number;
  avgTicket: number;
};

const Admin = () => {
  const { isAdmin, isSuperAdmin, loading, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("vendedores");
  const [kpis, setKpis] = useState<KpiData>({ totalSellers: 0, totalSalesMonth: 0, revenueMonth: 0, avgTicket: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  // Fetch KPIs
  useEffect(() => {
    if (!effectiveCompanyId) return;

    const fetchKpis = async () => {
      setKpiLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [sellersRes, salesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", effectiveCompanyId),
        supabase
          .from("vendas")
          .select("valor")
          .eq("company_id", effectiveCompanyId)
          .gte("data_venda", startOfMonth),
      ]);

      const totalSellers = sellersRes.count ?? 0;
      const salesData = salesRes.data ?? [];
      const totalSalesMonth = salesData.length;
      const revenueMonth = salesData.reduce((sum, s) => sum + (Number(s.valor) || 0), 0);
      const avgTicket = totalSalesMonth > 0 ? revenueMonth / totalSalesMonth : 0;

      setKpis({ totalSellers, totalSalesMonth, revenueMonth, avgTicket });
      setKpiLoading(false);
    };

    fetchKpis();
  }, [effectiveCompanyId]);

  const visibleSections = useMemo(() => {
    return sections.filter(s => !s.superAdminOnly || isSuperAdmin);
  }, [isSuperAdmin]);

  const grouped = useMemo(() => {
    const groups: Record<string, AdminSection[]> = {};
    visibleSections.forEach(s => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    });
    return groups;
  }, [visibleSections]);

  const ActiveComponent = sectionComponents[activeSection];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const kpiCards = [
    { label: "Vendedores", value: kpis.totalSellers, icon: UserCheck, format: "number" as const },
    { label: "Vendas (mês)", value: kpis.totalSalesMonth, icon: TrendingUp, format: "number" as const },
    { label: "Faturamento", value: kpis.revenueMonth, icon: DollarSign, format: "currency" as const },
    { label: "Ticket Médio", value: kpis.avgTicket, icon: BarChart3, format: "currency" as const },
  ];

  const formatValue = (value: number, format: "number" | "currency") => {
    if (format === "currency") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return value.toLocaleString("pt-BR");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/10">
          <Shield className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Administração</h1>
          <p className="text-sm text-muted-foreground">Painel de controle do sistema</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card"
          >
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted shrink-0">
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider truncate">{kpi.label}</p>
              {kpiLoading ? (
                <div className="h-6 w-16 rounded bg-muted animate-pulse mt-0.5" />
              ) : (
                <p className="text-lg font-bold text-foreground truncate">{formatValue(kpi.value, kpi.format)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Nav */}
        <nav className="lg:w-56 shrink-0">
          {/* Mobile: horizontal scroll */}
          <div className="lg:hidden overflow-x-auto -mx-1 px-1 pb-2">
            <div className="flex gap-1">
              {visibleSections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: vertical grouped nav */}
          <div className="hidden lg:flex flex-col gap-4 sticky top-6">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] uppercase text-muted-foreground/50 font-semibold tracking-widest px-3 mb-1.5">
                  {group}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left w-full ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <section.icon className="h-4 w-4 shrink-0" />
                        <span>{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
