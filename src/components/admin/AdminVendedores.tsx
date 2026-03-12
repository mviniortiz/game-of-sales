import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  ShoppingBag,
  DollarSign,
  Crown,
  Filter,
  BarChart2,
  Target,
  Trophy,
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTenant } from "@/contexts/TenantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Level thresholds for progress calculation
const LEVEL_THRESHOLDS = {
  Bronze: { current: 0, next: 1000, nextLevel: "Prata" },
  Prata: { current: 1000, next: 5000, nextLevel: "Ouro" },
  Ouro: { current: 5000, next: 15000, nextLevel: "Platina" },
  Platina: { current: 15000, next: 50000, nextLevel: "Diamante" },
  Diamante: { current: 50000, next: 100000, nextLevel: "Lenda" },
};

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualification: "Qualificação",
  proposal: "Proposta",
  negotiation: "Negociação",
  closed_won: "Ganho",
  closed_lost: "Perdido",
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
}

const KPICard = ({ title, value, icon: Icon, iconColor, iconBg, subtitle }: KPICardProps) => (
  <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group">
    <CardContent className="p-4">
      <div className="flex items-center gap-4">
        <div className={`relative p-3 rounded-xl ${iconBg} ring-1 ring-opacity-20 group-hover:scale-110 transition-transform`}>
          <div className={`absolute inset-0 ${iconBg} rounded-xl blur-lg opacity-40`} />
          <Icon className={`h-6 w-6 ${iconColor} relative z-10`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Top Performer Card Component
interface TopPerformerCardProps {
  vendedor: {
    nome: string;
    avatar_url?: string;
    faturamentoMes: number;
  } | null;
}

const TopPerformerCard = ({ vendedor }: TopPerformerCardProps) => {
  const getInitials = (nome: string) => {
    return nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border border-border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-amber-400 dark:ring-amber-500">
              <AvatarImage src={vendedor?.avatar_url || ""} />
              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200 font-semibold">
                {vendedor ? getInitials(vendedor.nome) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 bg-amber-400 dark:bg-amber-500 rounded-full p-1 shadow-lg">
              <Crown className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Top Performer
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {vendedor ? `Líder: ${vendedor.nome.split(" ")[0]}` : "Sem dados"}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {vendedor ? formatCurrency(vendedor.faturamentoMes) : "-"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminVendedores = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [sendPassword, setSendPassword] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { isSuperAdmin, activeCompanyId } = useTenant();

  // Transfer company states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; nome: string; company_id?: string } | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  // Delete seller states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<{ id: string; nome: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter states
  const [filterLevels, setFilterLevels] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Stats modal
  const [statsVendedor, setStatsVendedor] = useState<any | null>(null);

  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["admin-vendedores", activeCompanyId],
    queryFn: async () => {
      // SECURITY: Don't fetch if no company context
      if (!activeCompanyId) return [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          vendas:vendas(id, valor, data_venda, created_at),
          companies:company_id(id, name)
        `)
        .eq("company_id", activeCompanyId); // CRITICAL: Filter by company!

      if (error) throw error;

      return profiles?.map((profile) => {
        const vendasMes = profile.vendas?.filter((v: any) => {
          const dataVenda = new Date(v.data_venda || v.created_at);
          return dataVenda >= startOfMonth;
        }) || [];

        const faturamentoMes = vendasMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);

        // Simulate online status based on last_sign_in_at or random
        const isOnline = profile.last_sign_in_at
          ? new Date(profile.last_sign_in_at) > new Date(Date.now() - 30 * 60 * 1000) // Online if signed in last 30 min
          : Math.random() > 0.5; // Random for demo

        // Simulate trend (random for demo)
        const trend = Math.round((Math.random() * 40) - 10); // -10% to +30%

        return {
          ...profile,
          totalVendasMes: vendasMes.length,
          faturamentoMes,
          isOnline,
          trend,
          companyName: (profile as any).companies?.name || null,
        };
      }) || [];
    },
    enabled: !!activeCompanyId,
  });

  // Calculate KPI summaries
  const kpiData = useMemo(() => {
    if (!vendedores) return { total: 0, vendasMes: 0, faturamentoMes: 0, topPerformer: null };

    const total = vendedores.length;
    const vendasMes = vendedores.reduce((acc, v) => acc + (v.totalVendasMes || 0), 0);
    const faturamentoMes = vendedores.reduce((acc, v) => acc + (v.faturamentoMes || 0), 0);
    const topPerformer = vendedores.reduce((top, v) => {
      if (!top || v.faturamentoMes > top.faturamentoMes) return v;
      return top;
    }, null as typeof vendedores[0] | null);

    return { total, vendasMes, faturamentoMes, topPerformer };
  }, [vendedores]);

  // Seller stats data
  const { data: sellerStats } = useQuery({
    queryKey: ["seller-stats", statsVendedor?.id],
    queryFn: async () => {
      if (!statsVendedor?.id) return null;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch deals for this seller
      const { data: deals } = await supabase
        .from("deals")
        .select("id, title, value, stage, probability, created_at, is_hot")
        .eq("user_id", statsVendedor.id)
        .eq("company_id", activeCompanyId!);

      // Fetch all sales (not just this month) for history
      const allVendas = statsVendedor.vendas || [];

      // Group sales by month (last 6 months)
      const monthlyData: { month: string; vendas: number; faturamento: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthSales = allVendas.filter((v: any) => {
          const dt = new Date(v.data_venda || v.created_at);
          return dt >= d && dt <= end;
        });
        monthlyData.push({
          month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          vendas: monthSales.length,
          faturamento: monthSales.reduce((a: number, v: any) => a + Number(v.valor), 0),
        });
      }

      const totalDeals = deals?.length || 0;
      const activeDeals = deals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || [];
      const wonDeals = deals?.filter(d => d.stage === "closed_won") || [];
      const lostDeals = deals?.filter(d => d.stage === "closed_lost") || [];
      const pipelineValue = activeDeals.reduce((a, d) => a + (d.value || 0), 0);
      const conversionRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;

      const vendasMes = allVendas.filter((v: any) => new Date(v.data_venda || v.created_at) >= startOfMonth);
      const faturamentoMes = vendasMes.reduce((a: number, v: any) => a + Number(v.valor), 0);

      // Previous month for comparison
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const vendasPrev = allVendas.filter((v: any) => {
        const dt = new Date(v.data_venda || v.created_at);
        return dt >= prevStart && dt <= prevEnd;
      });
      const faturamentoPrev = vendasPrev.reduce((a: number, v: any) => a + Number(v.valor), 0);
      const growthRate = faturamentoPrev > 0 ? Math.round(((faturamentoMes - faturamentoPrev) / faturamentoPrev) * 100) : 0;

      return {
        vendasMes: vendasMes.length,
        faturamentoMes,
        vendasTotal: allVendas.length,
        faturamentoTotal: allVendas.reduce((a: number, v: any) => a + Number(v.valor), 0),
        totalDeals,
        activeDeals: activeDeals.length,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        pipelineValue,
        conversionRate,
        growthRate,
        monthlyData,
        topDeals: (deals || [])
          .filter(d => !["closed_lost"].includes(d.stage))
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 5),
      };
    },
    enabled: !!statsVendedor?.id && !!activeCompanyId,
  });

  // Filter vendedores
  const filteredVendedores = useMemo(() => {
    if (!vendedores) return [];

    return vendedores.filter((v) => {
      // Search filter
      const matchesSearch = v.nome.toLowerCase().includes(searchTerm.toLowerCase());

      // Level filter
      const matchesLevel = filterLevels.length === 0 || filterLevels.includes(v.nivel);

      // Status filter
      const matchesStatus = filterStatus.length === 0 ||
        (filterStatus.includes("online") && v.isOnline) ||
        (filterStatus.includes("offline") && !v.isOnline);

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [vendedores, searchTerm, filterLevels, filterStatus]);

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getNivelBadgeClass = (nivel: string) => {
    switch (nivel) {
      case "Bronze":
        return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-800";
      case "Prata":
        return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-500/50 dark:text-gray-200 dark:border-gray-600";
      case "Ouro":
        return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-600/50 dark:text-yellow-200 dark:border-yellow-700";
      case "Platina":
        return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/50 dark:text-emerald-200 dark:border-emerald-600";
      case "Diamante":
        return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/50 dark:text-blue-200 dark:border-blue-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getLevelProgress = (nivel: string, pontos: number) => {
    const threshold = LEVEL_THRESHOLDS[nivel as keyof typeof LEVEL_THRESHOLDS];
    if (!threshold) return { progress: 0, nextLevel: "" };

    const pointsInLevel = pontos - threshold.current;
    const levelRange = threshold.next - threshold.current;
    const progress = Math.min(100, Math.max(0, (pointsInLevel / levelRange) * 100));

    return { progress, nextLevel: threshold.nextLevel };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleCreateSeller = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }

    setSubmitting(true);
    setGeneratedPassword(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-seller", {
        body: { nome, email, sendPassword, companyId: activeCompanyId },
      });

      if (error) throw error;

      if (data?.password && sendPassword) {
        setGeneratedPassword(data.password);
      }

      if (data?.emailSent) {
        toast.success("Vendedor criado e e-mail enviado com sucesso!");
        setShowAdd(false);
      } else if (data?.password) {
        const reason = data?.emailError || "verifique a configuração do Resend";
        toast.warning(`Vendedor criado, mas o e-mail não foi enviado (${reason}). Copie a senha abaixo.`);
      } else {
        toast.success("Vendedor criado com sucesso!");
        setShowAdd(false);
      }
      setNome("");
      setEmail("");
      setSendPassword(true);
      queryClient.invalidateQueries({ queryKey: ["admin-vendedores"] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Não foi possível criar o vendedor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSeller = async () => {
    if (!sellerToDelete) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-seller", {
        body: { sellerId: sellerToDelete.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${sellerToDelete.nome} foi removido(a) com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["admin-vendedores"] });
      setShowDeleteConfirm(false);
      setSellerToDelete(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao remover vendedor");
    } finally {
      setDeleting(false);
    }
  };

  const toggleLevelFilter = (level: string) => {
    setFilterLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setFilterStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Query all companies (super-admin only)
  const { data: companies = [] } = useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Handle company transfer
  const handleTransferCompany = async () => {
    if (!selectedUser || !targetCompanyId) {
      toast.error("Selecione uma empresa de destino");
      return;
    }

    setTransferring(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: targetCompanyId })
        .eq("id", selectedUser.id);

      if (error) throw error;

      const targetCompany = companies.find(c => c.id === targetCompanyId);
      toast.success(`${selectedUser.nome} transferido para ${targetCompany?.name || 'nova empresa'}`);

      queryClient.invalidateQueries({ queryKey: ["admin-vendedores"] });
      setShowTransferModal(false);
      setSelectedUser(null);
      setTargetCompanyId("");
    } catch (error: any) {
      console.error("Error transferring user:", error);
      toast.error("Erro ao transferir usuário: " + error.message);
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = (vendedor: any) => {
    setSelectedUser({ id: vendedor.id, nome: vendedor.nome, company_id: vendedor.company_id });
    setTargetCompanyId("");
    setShowTransferModal(true);
  };

  const hasActiveFilters = filterLevels.length > 0 || filterStatus.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Carregando vendedores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Gestão de Vendedores
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Command Center • {vendedores?.length || 0} vendedores ativos
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Vendedores"
          value={kpiData.total}
          icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          subtitle="Cadastrados"
        />
        <KPICard
          title="Vendas (Mês)"
          value={kpiData.vendasMes}
          icon={ShoppingBag}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          subtitle="Este mês"
        />
        <KPICard
          title="Faturamento"
          value={formatCurrency(kpiData.faturamentoMes)}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          subtitle="Receita do mês"
        />
        <TopPerformerCard vendedor={kpiData.topPerformer} />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`gap-2 ${hasActiveFilters ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                <Filter className="h-4 w-4" />
                Filtrar
                {hasActiveFilters && (
                  <span className="ml-1 bg-emerald-100 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs px-1.5 py-0.5 rounded-full">
                    {filterLevels.length + filterStatus.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <div className="space-y-4">
                {/* Level Filters */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Nível</h4>
                  <div className="space-y-2">
                    {["Bronze", "Prata", "Ouro", "Platina", "Diamante"].map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox
                          id={`level-${level}`}
                          checked={filterLevels.includes(level)}
                          onCheckedChange={() => toggleLevelFilter(level)}
                        />
                        <Label
                          htmlFor={`level-${level}`}
                          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          {level}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Filters */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="status-online"
                        checked={filterStatus.includes("online")}
                        onCheckedChange={() => toggleStatusFilter("online")}
                      />
                      <Label htmlFor="status-online" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        Online
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="status-offline"
                        checked={filterStatus.includes("offline")}
                        onCheckedChange={() => toggleStatusFilter("offline")}
                      />
                      <Label htmlFor="status-offline" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full" />
                        Offline
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => {
                      setFilterLevels([]);
                      setFilterStatus([]);
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Add Button */}
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Vendedor
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold">Vendedor</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold">Empresa</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold">Nível</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold">Pontos</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold text-right">Vendas</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold text-right">Faturamento</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold">Último Login</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-400 font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendedores?.map((vendedor) => {
              const { progress, nextLevel } = getLevelProgress(vendedor.nivel, vendedor.pontos);

              return (
                <TableRow
                  key={vendedor.id}
                  className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-gray-100 dark:border-gray-800"
                >
                  {/* User Column */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-gray-100 dark:ring-gray-800">
                          <AvatarImage src={vendedor.avatar_url || ""} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200 font-semibold">
                            {getInitials(vendedor.nome)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online/Offline Status Dot */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${vendedor.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{vendedor.nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{vendedor.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Company Column */}
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {vendedor.companyName || "—"}
                    </span>
                  </TableCell>

                  {/* Level Column with Progress */}
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="outline" className={getNivelBadgeClass(vendedor.nivel)}>
                        {vendedor.nivel}
                      </Badge>
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5 w-20" />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          {progress.toFixed(0)}% → {nextLevel}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Points */}
                  <TableCell>
                    <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                      {vendedor.pontos.toLocaleString("pt-BR")}
                    </span>
                  </TableCell>

                  {/* Sales - Right Aligned */}
                  <TableCell className="text-right">
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                      {vendedor.totalVendasMes}
                    </span>
                  </TableCell>

                  {/* Revenue - Right Aligned with Trend */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(vendedor.faturamentoMes)}
                      </span>
                      {vendedor.trend !== 0 && (
                        <span className={`flex items-center text-xs font-medium ${vendedor.trend > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {vendedor.trend > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-0.5" />
                          )}
                          {Math.abs(vendedor.trend)}%
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Last Login */}
                  <TableCell>
                    {vendedor.last_sign_in_at ? (
                      <div className="space-y-0.5">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date(vendedor.last_sign_in_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(vendedor.last_sign_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          {(() => {
                            const diff = Date.now() - new Date(vendedor.last_sign_in_at).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 60) return `${mins}min atrás`;
                            const hours = Math.floor(mins / 60);
                            if (hours < 24) return `${hours}h atrás`;
                            const days = Math.floor(hours / 24);
                            return `${days}d atrás`;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Nunca</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick Actions - Show on Hover */}
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        className="hidden group-hover:flex items-center gap-1"
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                          aria-label="Estatísticas"
                          onClick={() => setStatsVendedor(vendedor)}
                        >
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Mais opções">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                          <DropdownMenuItem
                            onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                            className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {isSuperAdmin && (
                            <DropdownMenuItem
                              onClick={() => openTransferModal(vendedor)}
                              className="cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Transferir Empresa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSellerToDelete({ id: vendedor.id, nome: vendedor.nome });
                              setShowDeleteConfirm(true);
                            }}
                            className="cursor-pointer text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredVendedores?.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Nenhum vendedor encontrado.
          </div>
        )}
      </div>

      {/* Add Seller Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Adicionar Vendedor</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Crie um acesso para um novo vendedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-password"
                checked={sendPassword}
                onCheckedChange={(v) => setSendPassword(Boolean(v))}
              />
              <Label htmlFor="send-password" className="text-gray-700 dark:text-gray-300">
                Enviar senha aleatória por e-mail
              </Label>
            </div>

            {generatedPassword && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
                <p className="text-gray-500 dark:text-gray-400 mb-1">Senha gerada:</p>
                <p className="font-mono text-base text-gray-900 dark:text-white">{generatedPassword}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAdd(false)}
                disabled={submitting}
                className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateSeller}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Company Modal (Super-Admin Only) */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Transferir Empresa
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Mover <span className="font-semibold text-gray-900 dark:text-white">{selectedUser?.nome}</span> para outra empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Empresa de Destino</Label>
              <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {companies
                    .filter(c => c.id !== selectedUser?.company_id)
                    .map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {selectedUser?.company_id && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Empresa atual: <span className="font-medium">{companies.find(c => c.id === selectedUser.company_id)?.name || 'Desconhecida'}</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTransferModal(false)}
              disabled={transferring}
              className="border-gray-200 dark:border-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransferCompany}
              disabled={transferring || !targetCompanyId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {transferring ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Remover Vendedor
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Tem certeza que deseja remover <span className="font-semibold text-gray-900 dark:text-white">{sellerToDelete?.nome}</span>?
              Esta acao e irreversivel e remove a conta, perfil e dados do usuario.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm text-rose-700 dark:text-rose-300">
            Os deals e vendas do vendedor serao mantidos no sistema, mas nao terao mais dono associado.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setShowDeleteConfirm(false); setSellerToDelete(null); }}
              disabled={deleting}
              className="border-gray-200 dark:border-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteSeller}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "Removendo..." : "Sim, Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Seller Stats Modal ─── */}
      <Dialog open={!!statsVendedor} onOpenChange={(open) => { if (!open) setStatsVendedor(null); }}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-gray-100 dark:ring-gray-800">
                <AvatarImage src={statsVendedor?.avatar_url || ""} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200 font-semibold">
                  {getInitials(statsVendedor?.nome || "")}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  {statsVendedor?.nome}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {statsVendedor?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {sellerStats ? (
            <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Faturamento</span>
                  </div>
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(sellerStats.faturamentoMes)}
                  </p>
                  <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-0.5">este mês</p>
                </div>

                <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Vendas</span>
                  </div>
                  <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">
                    {sellerStats.vendasMes}
                  </p>
                  <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 mt-0.5">
                    {sellerStats.vendasTotal} total
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase">Pipeline</span>
                  </div>
                  <p className="text-lg font-extrabold text-violet-700 dark:text-violet-300">
                    {sellerStats.activeDeals}
                  </p>
                  <p className="text-[10px] text-violet-600/60 dark:text-violet-400/60 mt-0.5">
                    {formatCurrency(sellerStats.pipelineValue)}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Conversão</span>
                  </div>
                  <p className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
                    {sellerStats.conversionRate}%
                  </p>
                  <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-0.5">
                    {sellerStats.wonDeals}W / {sellerStats.lostDeals}L
                  </p>
                </div>
              </div>

              {/* Growth indicator */}
              {sellerStats.growthRate !== 0 && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  sellerStats.growthRate > 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                }`}>
                  {sellerStats.growthRate > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {sellerStats.growthRate > 0 ? "+" : ""}{sellerStats.growthRate}% vs mês anterior
                </div>
              )}

              {/* Monthly Chart (simple bar chart) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Faturamento Mensal
                </h4>
                <div className="flex items-end gap-1.5 h-28 px-1">
                  {sellerStats.monthlyData.map((m: any, i: number) => {
                    const max = Math.max(...sellerStats.monthlyData.map((d: any) => d.faturamento), 1);
                    const height = Math.max((m.faturamento / max) * 100, 4);
                    const isCurrentMonth = i === sellerStats.monthlyData.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                          {m.vendas > 0 ? m.vendas : ""}
                        </span>
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            isCurrentMonth
                              ? "bg-emerald-500 dark:bg-emerald-400"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                          style={{ height: `${height}%` }}
                          title={`${m.month}: ${formatCurrency(m.faturamento)} (${m.vendas} vendas)`}
                        />
                        <span className={`text-[9px] font-medium ${
                          isCurrentMonth
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-gray-400 dark:text-gray-500"
                        }`}>
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Deals */}
              {sellerStats.topDeals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Top Deals no Pipeline
                  </h4>
                  <div className="space-y-1.5">
                    {sellerStats.topDeals.map((deal: any) => {
                      const stage = PIPELINE_STAGE_LABELS[deal.stage] || deal.stage;
                      return (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {deal.is_hot && <span className="text-orange-400 shrink-0">🔥</span>}
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{deal.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[9px] h-5 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                              {stage}
                            </Badge>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(deal.value || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary row */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Total: {sellerStats.totalDeals} deals · {sellerStats.vendasTotal} vendas · {formatCurrency(sellerStats.faturamentoTotal)} faturado
                </span>
                <Badge variant="outline" className={getNivelBadgeClass(statsVendedor?.nivel || "Bronze")}>
                  {statsVendedor?.nivel}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};