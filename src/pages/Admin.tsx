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
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { AdminVendedores } from "@/components/admin/AdminVendedores";
import { AdminVendas } from "@/components/admin/AdminVendas";
import { AdminRelatorios } from "@/components/admin/AdminRelatorios";
import { AdminMetas } from "@/components/admin/AdminMetas";
import { AdminCompanies } from "@/components/admin/AdminCompanies";
import { EvolutionMonitor } from "@/components/admin/EvolutionMonitor";
import { AdminProdutos } from "@/components/admin/AdminProdutos";
import { AdminFormasPagamento } from "@/components/admin/AdminFormasPagamento";
import Contratos from "@/pages/configuracoes/Contratos";

type AdminSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  superAdminOnly?: boolean;
};

const sections: AdminSection[] = [
  { id: "vendedores", label: "Equipe", icon: Users, group: "Equipe" },
  { id: "vendas", label: "Vendas", icon: ShoppingCart, group: "Comercial" },
  { id: "produtos", label: "Produtos", icon: Package, group: "Comercial" },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard, group: "Comercial" },
  { id: "contratos", label: "Contratos", icon: FileText, group: "Comercial" },
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
  contratos: Contratos,
  relatorios: AdminRelatorios,
  metas: AdminMetas,
  empresas: AdminCompanies,
  monitor: EvolutionMonitor,
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
    { label: "Vendedores", value: kpis.totalSellers, color: "#2563EB", format: "number" as const },
    { label: "Vendas no mês", value: kpis.totalSalesMonth, color: "#2563EB", format: "number" as const },
    { label: "Faturamento", value: kpis.revenueMonth, color: "#16A34A", format: "currency" as const },
    { label: "Ticket médio", value: kpis.avgTicket, color: "#64748B", format: "currency" as const },
  ];

  const formatValue = (value: number, format: "number" | "currency") => {
    if (format === "currency") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return value.toLocaleString("pt-BR");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
          Gestão
        </h1>
        <p className="text-[13px] sm:text-sm" style={{ color: "#64748B" }}>
          Equipe, comercial e performance da sua operação
        </p>
      </div>

      {/* KPI cards — padrão premium (Início/Metas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
            style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: kpi.color }} />
              <p className="text-[11px] font-semibold uppercase truncate" style={{ color: "#64748B", letterSpacing: "0.04em" }}>
                {kpi.label}
              </p>
            </div>
            {kpiLoading ? (
              <div className="h-7 w-20 rounded-md animate-pulse" style={{ background: "#EEF2F7" }} />
            ) : (
              <p className="text-[24px] sm:text-[28px] font-bold tabular-nums leading-none" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                {formatValue(kpi.value, kpi.format)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Layout: nav + conteúdo */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Nav */}
        <nav className="lg:w-56 shrink-0">
          {/* Mobile: scroll horizontal */}
          <div className="lg:hidden overflow-x-auto -mx-1 px-1 pb-2">
            <div className="flex gap-1.5">
              {visibleSections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors"
                    style={isActive
                      ? { background: "rgba(37,99,235,0.10)", color: "#2563EB" }
                      : { color: "#64748B" }}
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: nav agrupada */}
          <div className="hidden lg:flex flex-col gap-5 sticky top-5">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="text-[11px] uppercase font-semibold px-3 mb-1.5" style={{ color: "#94A3B8", letterSpacing: "0.08em" }}>
                  {group}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors text-left w-full hover:bg-[#F1F5F9]"
                        style={isActive
                          ? { background: "rgba(37,99,235,0.10)", color: "#2563EB", fontWeight: 600 }
                          : { color: "#475569" }}
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

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-2xl p-4 sm:p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04), 0 12px 32px -16px rgba(11,18,32,0.08)" }}
          >
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
