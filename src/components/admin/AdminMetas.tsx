import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  Target,
  TrendingUp,
  Zap,
  Calendar,
  DollarSign,
  Sparkles,
  Users,
  Trophy,
  Flame,
  CheckCircle,
  Crown,
  Rocket,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export const AdminMetas = () => {
  const queryClient = useQueryClient();
  const { activeCompanyId, isSuperAdmin } = useTenant();
  const { user } = useAuth();

  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Estados para Meta Individual
  const [userId, setUserId] = useState("");
  const [mesReferencia, setMesReferencia] = useState(mesAtual);
  const [valorMeta, setValorMeta] = useState("");
  const [valorMetaFormatado, setValorMetaFormatado] = useState("");

  // Estados para Meta Consolidada
  const [mesReferenciaConsolidada, setMesReferenciaConsolidada] = useState(mesAtual);
  const [valorMetaConsolidada, setValorMetaConsolidada] = useState("");
  const [valorMetaConsolidadaFormatado, setValorMetaConsolidadaFormatado] = useState("");
  const [descricaoConsolidada, setDescricaoConsolidada] = useState("");
  const [produtoAlvo, setProdutoAlvo] = useState("");

  useEffect(() => {
    setUserId("");
  }, [activeCompanyId]);

  const formatarMoeda = (value: string, setValor: (v: string) => void, setFormatado: (v: string) => void) => {
    const numero = value.replace(/\D/g, "");
    if (!numero) {
      setValor("");
      setFormatado("");
      return;
    }
    const valorNumerico = parseFloat(numero) / 100;
    setValor(valorNumerico.toString());
    setFormatado(valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  };

  const applyCompanyFilter = (query: any) => {
    if (!activeCompanyId) {
      return query.eq("company_id", "00000000-0000-0000-0000-000000000000");
    }
    return query.eq("company_id", activeCompanyId);
  };

  // Fetch vendedores
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("profiles")
          .select("id, nome, email, avatar_url, is_super_admin, company_id")
          .order("nome")
      );
      if (error) throw error;
      return (data || []).filter((profile: any) => {
        if (!profile?.id || !profile?.nome) return false;
        if (profile.company_id && activeCompanyId && profile.company_id !== activeCompanyId) return false;
        if (profile.is_super_admin && profile.id !== user?.id) return false;
        return true;
      });
    },
    enabled: !!activeCompanyId || isSuperAdmin,
  });

  // Fetch metas individuais
  const { data: metas } = useQuery({
    queryKey: ["admin-metas", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("metas")
          .select("*, profiles:user_id(id, nome, avatar_url, is_super_admin, company_id)")
          .order("mes_referencia", { ascending: false })
      );
      if (error) throw error;
      return (data || []).filter((meta: any) => {
        const profile = meta?.profiles;
        if (!profile?.id || !profile?.nome) return false;
        if (!(Number(meta?.valor_meta) > 0)) return false;
        if (activeCompanyId && profile.company_id && profile.company_id !== activeCompanyId) return false;
        if (profile.is_super_admin && meta.user_id !== user?.id) return false;
        return true;
      });
    },
    enabled: !!activeCompanyId || isSuperAdmin,
  });

  // Fetch ALL vendas to calculate real progress
  const { data: todasVendas = [] } = useQuery({
    queryKey: ["admin-todas-vendas", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("vendas")
          .select("user_id, valor, data_venda, status, company_id")
          .eq("status", "Aprovado")
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId || isSuperAdmin,
  });

  // Fetch metas consolidadas
  const { data: metasConsolidadas } = useQuery({
    queryKey: ["admin-metas-consolidadas", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("metas_consolidadas")
          .select("*")
          .order("mes_referencia", { ascending: false })
      );
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId || isSuperAdmin,
  });

  const calculateMetaProgress = (meta: any) => {
    const mesRef = meta.mes_referencia;
    const [year, month] = mesRef.split('-');
    const inicioMes = `${year}-${month}-01`;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
    const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

    const vendasDoMes = todasVendas.filter((v: any) => {
      const dataVenda = v.data_venda?.split('T')[0] || v.data_venda;
      return v.user_id === meta.user_id && dataVenda >= inicioMes && dataVenda <= fimMes;
    });
    return vendasDoMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
  };

  const calculateConsolidadaProgress = (meta: any) => {
    const mesRef = meta.mes_referencia;
    const [year, month] = mesRef.split('-');
    const inicioMes = `${year}-${month}-01`;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
    const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

    const vendasDoMes = todasVendas.filter((v: any) => {
      const dataVenda = v.data_venda?.split('T')[0] || v.data_venda;
      return dataVenda >= inicioMes && dataVenda <= fimMes;
    });
    return vendasDoMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
  };

  // Performance Insight - 3-month average for selected seller
  const { data: performanceInsight } = useQuery({
    queryKey: ["seller-performance", userId, activeCompanyId],
    queryFn: async () => {
      if (!userId) return null;
      const threeMonthsAgo = subMonths(new Date(), 3);
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("vendas")
          .select("valor")
          .eq("user_id", userId)
          .eq("status", "Aprovado")
          .gte("data_venda", threeMonthsAgo.toISOString().split("T")[0])
      );
      if (error) throw error;
      const total = data?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      return { total, average: total / 3, count: data?.length || 0 };
    },
    enabled: !!userId && (!!activeCompanyId || isSuperAdmin),
  });

  const checkExistingMeta = async (userId: string, mesRef: string) => {
    const [year, month] = mesRef.split("-");
    const dataReferencia = `${year}-${month}-01`;
    const { data } = await supabase
      .from("metas")
      .select("id")
      .eq("user_id", userId)
      .eq("mes_referencia", dataReferencia)
      .eq("company_id", activeCompanyId)
      .maybeSingle();
    return data;
  };

  const invalidateAllMetas = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-metas", activeCompanyId] });
    queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
    queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
    queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
    queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
    queryClient.invalidateQueries({ queryKey: ["metas-consolidadas", activeCompanyId] });
    queryClient.invalidateQueries({ queryKey: ["metas-individuais-full"] });
    queryClient.invalidateQueries({ queryKey: ["admin-metas-consolidadas", activeCompanyId] });
  };

  const createMeta = useMutation({
    mutationFn: async () => {
      const [year, month] = mesReferencia.split("-");
      const dataReferencia = `${year}-${month}-01`;

      if (!vendedores?.some((v: any) => v.id === userId)) {
        throw new Error("Selecione um vendedor válido da empresa atual");
      }

      const existingMeta = await checkExistingMeta(userId, mesReferencia);

      if (existingMeta) {
        const { error } = await supabase
          .from("metas")
          .update({ valor_meta: parseFloat(valorMeta) })
          .eq("id", existingMeta.id);
        if (error) throw error;
        return { updated: true };
      } else {
        const { error } = await supabase.from("metas").insert({
          user_id: userId,
          mes_referencia: dataReferencia,
          valor_meta: parseFloat(valorMeta),
          company_id: activeCompanyId,
        });
        if (error) throw error;
        return { updated: false };
      }
    },
    onSuccess: (result) => {
      invalidateAllMetas();
      toast.success(result?.updated ? "Meta atualizada com sucesso!" : "Meta individual definida com sucesso!");
      setUserId("");
      setMesReferencia(mesAtual);
      setValorMeta("");
      setValorMetaFormatado("");
    },
    onError: (error: any) => toast.error(`Erro ao definir meta: ${error.message}`),
  });

  const createMetaConsolidada = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) {
        throw new Error("company_id não está definido. Faça login novamente.");
      }

      const [year, month] = mesReferenciaConsolidada.split("-");
      const dataReferencia = `${year}-${month}-01`;

      const { data: existingMeta, error: selectError } = await supabase
        .from("metas_consolidadas")
        .select("id")
        .eq("mes_referencia", dataReferencia)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existingMeta) {
        const { error } = await supabase
          .from("metas_consolidadas")
          .update({
            valor_meta: parseFloat(valorMetaConsolidada),
            descricao: descricaoConsolidada || null,
            produto_alvo: produtoAlvo || null,
          })
          .eq("id", existingMeta.id);
        if (error) throw error;
        return { updated: true };
      } else {
        const { error } = await supabase
          .from("metas_consolidadas")
          .insert({
            mes_referencia: dataReferencia,
            valor_meta: parseFloat(valorMetaConsolidada),
            descricao: descricaoConsolidada || null,
            produto_alvo: produtoAlvo || null,
            company_id: activeCompanyId,
          });
        if (error) throw error;
        return { updated: false };
      }
    },
    onSuccess: (result) => {
      invalidateAllMetas();
      toast.success(result?.updated ? "Meta consolidada atualizada!" : "Meta consolidada definida com sucesso!");
      setMesReferenciaConsolidada(mesAtual);
      setValorMetaConsolidada("");
      setValorMetaConsolidadaFormatado("");
      setDescricaoConsolidada("");
      setProdutoAlvo("");
    },
    onError: (error: any) => toast.error(`Erro ao definir meta consolidada: ${error.message}`),
  });

  const deleteMeta = useMutation({
    mutationFn: async (metaId: string) => {
      const { error } = await supabase.from("metas").delete().eq("id", metaId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllMetas();
      toast.success("Meta removida com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao remover meta: ${error.message}`),
  });

  const deleteMetaConsolidada = useMutation({
    mutationFn: async (metaId: string) => {
      const { error } = await supabase.from("metas_consolidadas").delete().eq("id", metaId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllMetas();
      toast.success("Meta consolidada removida com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro ao remover meta consolidada: ${error.message}`),
  });

  const handleSubmitMetaIndividual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !mesReferencia || !valorMeta) {
      toast.error("Preencha todos os campos");
      return;
    }
    createMeta.mutate();
  };

  const handleSubmitMetaConsolidada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesReferenciaConsolidada || !valorMetaConsolidada) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createMetaConsolidada.mutate();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return formatCurrency(value);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 150) return "bg-amber-500";
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 50) return "bg-cyan-500";
    return "bg-emerald-500";
  };

  const getStatusInfo = (percent: number, falta: number) => {
    if (percent >= 150) return { text: "GOD MODE!", color: "text-amber-400", icon: <Flame className="h-4 w-4 text-amber-400" /> };
    if (percent >= 100) return { text: "Meta Batida!", color: "text-emerald-400", icon: <CheckCircle className="h-4 w-4 text-emerald-400" /> };
    return { text: `Falta ${formatCurrencyCompact(falta)}`, color: "text-muted-foreground", icon: null };
  };

  // Team health stats
  const teamHealthStats = useMemo(() => {
    if (!metas || metas.length === 0) return { totalTarget: 0, totalRealized: 0, sellersOnTarget: 0, totalSellers: 0, teamProgress: 0 };

    let totalTarget = 0;
    let totalRealized = 0;
    let sellersOnTarget = 0;

    metas.forEach((meta: any) => {
      const vm = Number(meta.valor_meta) || 0;
      const realizado = calculateMetaProgress(meta);
      totalTarget += vm;
      totalRealized += realizado;
      if (vm > 0 && (realizado / vm) >= 1) sellersOnTarget++;
    });

    return {
      totalTarget,
      totalRealized,
      sellersOnTarget,
      totalSellers: metas.length,
      teamProgress: totalTarget > 0 ? (totalRealized / totalTarget) * 100 : 0,
    };
  }, [metas, todasVendas]);

  // ─── Shared form components ───────────────────────────────────────

  const MonthPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between bg-transparent border-border/50 text-foreground"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {value
                ? format(new Date(`${value}-01T12:00:00`), "MMMM yyyy", { locale: ptBR })
                : "Selecione o mês"}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 bg-card border-border" align="start">
        <CalendarPicker
          mode="single"
          selected={value ? new Date(`${value}-01T12:00:00`) : undefined}
          onSelect={(date) => {
            if (!date) return;
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            onChange(`${y}-${m}`);
          }}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  const CurrencyInput = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (raw: string) => void;
  }) => (
    <div className="relative">
      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="R$ 0,00"
        className="pl-10 bg-transparent border-border/50"
        required
      />
    </div>
  );

  // ─── Meta card (individual) ──────────────────────────────────────

  const MetaCard = ({ meta }: { meta: any }) => {
    const realizado = calculateMetaProgress(meta);
    const vm = Number(meta.valor_meta) || 1;
    const exactProgress = (realizado / vm) * 100;
    const visualProgress = Math.min(exactProgress, 100);
    const falta = Math.max(vm - realizado, 0);
    const status = getStatusInfo(exactProgress, falta);
    const isGod = exactProgress >= 150;
    const isBeat = exactProgress >= 100;

    return (
      <div
        className={`relative rounded-xl border bg-card p-4 space-y-4 group transition-colors ${
          isGod
            ? "border-amber-500/40"
            : isBeat
              ? "border-emerald-500/30"
              : "border-border/50"
        }`}
      >
        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-7 w-7 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Excluir meta</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Tem certeza que deseja remover a meta de <span className="font-semibold text-foreground">{meta.profiles?.nome}</span>? Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMeta.mutate(meta.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {meta.profiles?.avatar_url && <AvatarImage src={meta.profiles.avatar_url} />}
            <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
              {getInitials(meta.profiles?.nome || "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{meta.profiles?.nome}</p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(meta.mes_referencia + "T12:00:00"), "MMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Value + Status */}
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrencyCompact(vm)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {status.icon}
            {isGod && <Crown className="h-3.5 w-3.5 text-amber-400" />}
            <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Realizado: <span className="text-emerald-400 font-medium">{formatCurrency(realizado)}</span>
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className={`font-bold ${isGod ? "text-amber-400" : isBeat ? "text-emerald-400" : "text-foreground"}`}>
              {exactProgress.toFixed(0)}%
            </span>
          </div>
          <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(exactProgress)} rounded-full transition-all duration-500`}
              style={{ width: `${visualProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ─── Consolidated meta card ──────────────────────────────────────

  const ConsolidadaCard = ({ meta }: { meta: any }) => {
    const realizado = calculateConsolidadaProgress(meta);
    const vm = Number(meta.valor_meta) || 1;
    const exactProgress = (realizado / vm) * 100;
    const visualProgress = Math.min(exactProgress, 100);
    const falta = Math.max(vm - realizado, 0);
    const isGod = exactProgress >= 120;
    const isBeat = exactProgress >= 100;

    // Top 3 contributors
    const mesRef = meta.mes_referencia;
    const [year, month] = mesRef.split('-');
    const inicioMes = `${year}-${month}-01`;
    const ultimoDia = new Date(parseInt(year), parseInt(month), 0).getDate();
    const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

    const contributorMap = new Map<string, { nome: string; avatarUrl?: string; total: number }>();
    todasVendas.forEach((v: any) => {
      const dataVenda = v.data_venda?.split('T')[0] || v.data_venda;
      if (dataVenda >= inicioMes && dataVenda <= fimMes) {
        const seller = vendedores?.find((s: any) => s.id === v.user_id);
        if (seller) {
          const existing = contributorMap.get(seller.id) || { nome: seller.nome, avatarUrl: seller.avatar_url, total: 0 };
          existing.total += Number(v.valor);
          contributorMap.set(seller.id, existing);
        }
      }
    });
    const topContributors = Array.from(contributorMap.values()).sort((a, b) => b.total - a.total).slice(0, 3);

    const progressColor = isGod
      ? "bg-amber-500"
      : isBeat
        ? "bg-emerald-500"
        : "bg-cyan-500";

    return (
      <div
        className={`relative rounded-xl border bg-card p-5 space-y-4 group transition-colors ${
          isGod
            ? "border-amber-500/40"
            : isBeat
              ? "border-emerald-500/30"
              : "border-border/50"
        }`}
      >
        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-7 w-7 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 z-20"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Excluir meta consolidada</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Tem certeza que deseja remover esta meta consolidada? Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMetaConsolidada.mutate(meta.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-foreground">
              {meta.descricao || "Meta Consolidada"}
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-muted/50 border-border/50 text-muted-foreground text-[10px]">
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(meta.mes_referencia + "T12:00:00"), "MMMM yyyy", { locale: ptBR })}
            </Badge>
            {meta.produto_alvo && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                Foco: {meta.produto_alvo}
              </Badge>
            )}
          </div>
        </div>

        {/* Top 3 Contributors */}
        {topContributors.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Top:</span>
            <TooltipProvider>
              <div className="flex -space-x-1.5">
                {topContributors.map((contributor, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <Avatar className={`h-6 w-6 border-2 border-card ${idx === 0 ? 'ring-1 ring-amber-400/60' : ''}`}>
                        <AvatarImage src={contributor.avatarUrl || ''} />
                        <AvatarFallback className="bg-muted text-foreground text-[9px] font-semibold">
                          {contributor.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card text-foreground text-xs border-border">
                      <p>{contributor.nome}</p>
                      <p className="text-emerald-400">{formatCurrencyCompact(contributor.total)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Value + Status */}
        <div>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {formatCurrencyCompact(vm)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {isGod && <Flame className="h-4 w-4 text-amber-400" />}
            {isBeat && !isGod && <CheckCircle className="h-4 w-4 text-emerald-400" />}
            <span className={`text-sm font-semibold ${isGod ? 'text-amber-400' : isBeat ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              {isGod ? 'SUPER META!' : isBeat ? 'Meta Batida!' : `Falta ${formatCurrencyCompact(falta)}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Realizado: <span className="text-emerald-400 font-medium">{formatCurrency(realizado)}</span>
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Progresso da Equipe</span>
            <div className="flex items-center gap-1">
              {isGod && <Crown className="h-3 w-3 text-amber-400" />}
              <span className={`font-bold ${isGod ? 'text-amber-400' : isBeat ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {exactProgress.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} rounded-full transition-all duration-500`}
              style={{ width: `${visualProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="individual" className="w-full">
      <TabsList className="grid w-full max-w-full sm:max-w-sm mx-auto grid-cols-2 bg-muted/30 border border-border/50 gap-1 p-1 h-auto rounded-xl">
        <TabsTrigger
          value="individual"
          className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none"
        >
          <Target className="h-3.5 w-3.5" />
          <span className="sm:hidden">Individuais</span>
          <span className="hidden sm:inline">Metas Individuais</span>
        </TabsTrigger>
        <TabsTrigger
          value="consolidada"
          className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:shadow-none"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="sm:hidden">Consolidada</span>
          <span className="hidden sm:inline">Meta Consolidada</span>
        </TabsTrigger>
      </TabsList>

      {/* ==================== METAS INDIVIDUAIS ==================== */}
      <TabsContent value="individual" className="mt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          {/* LEFT COLUMN - Form (Sticky) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-4 space-y-4">
              <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10">
                    <Target className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Definir Meta Individual</h3>
                    <p className="text-[11px] text-muted-foreground">Configure metas por vendedor</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitMetaIndividual} className="space-y-4">
                  {/* Vendedor */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Vendedor</Label>
                    <Select value={userId} onValueChange={setUserId}>
                      <SelectTrigger className="bg-transparent border-border/50">
                        <SelectValue placeholder="Selecione um vendedor" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {vendedores?.map((vendedor: any) => (
                          <SelectItem key={vendedor.id} value={vendedor.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                {vendedor.avatar_url && <AvatarImage src={vendedor.avatar_url} />}
                                <AvatarFallback className="text-[9px] bg-muted text-foreground">
                                  {getInitials(vendedor.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{vendedor.nome}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Performance Insight */}
                  {userId && performanceInsight && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                          Performance Insight
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        Média 3 meses:{" "}
                        <span className="font-bold text-emerald-400">
                          {formatCurrencyCompact(performanceInsight.average)}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {performanceInsight.count} vendas no período
                      </p>
                    </div>
                  )}

                  {/* Month */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Mês/Ano</Label>
                    <MonthPicker value={mesReferencia} onChange={setMesReferencia} />
                  </div>

                  {/* Value */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Valor da Meta</Label>
                    <CurrencyInput
                      value={valorMetaFormatado}
                      onChange={(v) => formatarMoeda(v, setValorMeta, setValorMetaFormatado)}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={createMeta.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {createMeta.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    {createMeta.isPending ? "Definindo..." : "Definir Meta"}
                  </Button>
                </form>
              </div>

              {/* Quick Stats */}
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Metas Ativas</span>
                  </div>
                  <span className="text-lg font-bold text-foreground tabular-nums">{metas?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Meta cards */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Metas Ativas</h4>
                <p className="text-[11px] text-muted-foreground">{metas?.length || 0} metas individuais</p>
              </div>
            </div>

            {/* Team Health */}
            {metas && metas.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-foreground">Saúde do Time</h4>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso do Time</span>
                    <span className={`font-bold ${teamHealthStats.teamProgress >= 100 ? 'text-emerald-400' : 'text-foreground'}`}>
                      {teamHealthStats.teamProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(teamHealthStats.teamProgress)} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min(teamHealthStats.teamProgress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2.5 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {teamHealthStats.sellersOnTarget}/{teamHealthStats.totalSellers}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Na Meta</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-emerald-400 tabular-nums">
                      {formatCurrencyCompact(teamHealthStats.totalRealized)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Realizado</p>
                  </div>
                </div>
              </div>
            )}

            {metas?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mb-4">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhuma meta individual definida</p>
                <p className="text-xs text-muted-foreground mt-1">Use o formulário ao lado para criar uma nova meta</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metas?.map((meta: any) => (
                  <MetaCard key={meta.id} meta={meta} />
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ==================== META CONSOLIDADA ==================== */}
      <TabsContent value="consolidada" className="mt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          {/* LEFT COLUMN - Form (Sticky) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-4 space-y-4">
              <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10">
                    <Zap className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Definir Meta Consolidada</h3>
                    <p className="text-[11px] text-muted-foreground">Meta global da equipe</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitMetaConsolidada} className="space-y-4">
                  {/* Month */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Mês/Ano *</Label>
                    <MonthPicker value={mesReferenciaConsolidada} onChange={setMesReferenciaConsolidada} />
                  </div>

                  {/* Value */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Valor da Meta *</Label>
                    <CurrencyInput
                      value={valorMetaConsolidadaFormatado}
                      onChange={(v) => formatarMoeda(v, setValorMetaConsolidada, setValorMetaConsolidadaFormatado)}
                    />
                    {metas && metas.length > 0 && (
                      <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Soma individuais: <span className="font-semibold">{formatCurrencyCompact(teamHealthStats?.totalTarget || 0)}</span>
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Descrição (Opcional)</Label>
                    <Textarea
                      value={descricaoConsolidada}
                      onChange={(e) => setDescricaoConsolidada(e.target.value)}
                      placeholder="Ex: Meta Black Friday..."
                      className="bg-transparent border-border/50 min-h-[72px]"
                    />
                  </div>

                  {/* Product Target */}
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Produto Alvo (Opcional)</Label>
                    <Input
                      value={produtoAlvo}
                      onChange={(e) => setProdutoAlvo(e.target.value)}
                      placeholder="Ex: Plano Premium..."
                      className="bg-transparent border-border/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={createMetaConsolidada.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {createMetaConsolidada.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    {createMetaConsolidada.isPending ? "Definindo..." : "Definir Meta Consolidada"}
                  </Button>
                </form>
              </div>

              {/* Quick Stats */}
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Campanhas Ativas</span>
                  </div>
                  <span className="text-lg font-bold text-foreground tabular-nums">{metasConsolidadas?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Consolidated cards */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Campanhas Ativas</h4>
                <p className="text-[11px] text-muted-foreground">{metasConsolidadas?.length || 0} campanhas</p>
              </div>
            </div>

            {metasConsolidadas?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mb-4">
                  <Rocket className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhuma campanha definida</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Use o formulário ao lado para criar uma meta consolidada para a equipe
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metasConsolidadas?.map((meta: any) => (
                  <ConsolidadaCard key={meta.id} meta={meta} />
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};
