import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
  Star
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
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
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";

export const AdminMetas = () => {
  const queryClient = useQueryClient();
  const { activeCompanyId, isSuperAdmin } = useTenant();

  // Mês atual formatado para input type="month" (YYYY-MM)
  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Estados para Meta Individual
  const [userId, setUserId] = useState("");
  const [mesReferencia, setMesReferencia] = useState(mesAtual); // Padrão: mês atual
  const [valorMeta, setValorMeta] = useState(""); // Valor numérico real
  const [valorMetaFormatado, setValorMetaFormatado] = useState(""); // Valor formatado para exibição

  // Estados para Meta Consolidada
  const [mesReferenciaConsolidada, setMesReferenciaConsolidada] = useState(mesAtual); // Padrão: mês atual
  const [valorMetaConsolidada, setValorMetaConsolidada] = useState(""); // Valor numérico real
  const [valorMetaConsolidadaFormatado, setValorMetaConsolidadaFormatado] = useState(""); // Valor formatado
  const [descricaoConsolidada, setDescricaoConsolidada] = useState("");
  const [produtoAlvo, setProdutoAlvo] = useState("");

  // Função para formatar valor como moeda brasileira
  const formatarMoeda = (value: string, setValor: (v: string) => void, setFormatado: (v: string) => void) => {
    // Remove tudo que não é número
    const numero = value.replace(/\D/g, "");

    if (!numero) {
      setValor("");
      setFormatado("");
      return;
    }

    // Converte para número com centavos
    const valorNumerico = parseFloat(numero) / 100;
    setValor(valorNumerico.toString());

    // Formata como moeda brasileira
    const valorFormatadoBR = valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setFormatado(valorFormatadoBR);
  };

  const applyCompanyFilter = (query: any) => {
    return activeCompanyId ? query.eq("company_id", activeCompanyId) : query;
  };

  // Fetch vendedores with avatar
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await applyCompanyFilter(
        supabase.from("profiles").select("id, nome, email, avatar_url, is_super_admin").order("nome")
      );

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId || isSuperAdmin, // allow super-admin to see even if null
  });

  // Fetch metas individuais
  const { data: metas } = useQuery({
    queryKey: ["admin-metas", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("metas")
          .select("*, profiles:user_id(nome, avatar_url, is_super_admin)")
          .order("mes_referencia", { ascending: false })
      );

      if (error) throw error;
      return data || [];
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

  // Calculate real values for each meta based on actual sales
  const calculateMetaProgress = (meta: any) => {
    const mesRef = meta.mes_referencia;
    const [year, month] = mesRef.split('-');
    const inicioMes = `${year}-${month}-01`;

    // Calcular fim do mês sem problemas de timezone
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
    const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

    // Filter vendas for this user and month
    const vendasDoMes = todasVendas.filter((v: any) => {
      const dataVenda = v.data_venda?.split('T')[0] || v.data_venda;
      return v.user_id === meta.user_id &&
        dataVenda >= inicioMes &&
        dataVenda <= fimMes;
    });

    const totalRealizado = vendasDoMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
    return totalRealizado;
  };

  // Calculate real values for consolidated meta
  const calculateConsolidadaProgress = (meta: any) => {
    const mesRef = meta.mes_referencia;
    const [year, month] = mesRef.split('-');
    const inicioMes = `${year}-${month}-01`;

    // Calcular fim do mês sem problemas de timezone
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
    const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

    // Filter vendas for this month (all users)
    const vendasDoMes = todasVendas.filter((v: any) => {
      const dataVenda = v.data_venda?.split('T')[0] || v.data_venda;
      return dataVenda >= inicioMes && dataVenda <= fimMes;
    });

    const totalRealizado = vendasDoMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
    return totalRealizado;
  };

  // Performance Insight - Fetch 3-month average for selected seller
  const { data: performanceInsight } = useQuery({
    queryKey: ["seller-performance", userId, activeCompanyId],
    queryFn: async () => {
      if (!userId) return null;

      const threeMonthsAgo = subMonths(new Date(), 3);
      const { data, error } = await applyCompanyFilter(
        applyCompanyFilter(
          supabase
            .from("vendas")
            .select("valor")
            .eq("user_id", userId)
            .eq("status", "Aprovado")
            .gte("data_venda", threeMonthsAgo.toISOString().split("T")[0])
        )
      );

      if (error) throw error;

      const total = data?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const average = total / 3;

      return {
        total,
        average,
        count: data?.length || 0,
      };
    },
    enabled: !!userId && (!!activeCompanyId || isSuperAdmin),
  });

  // Check if meta already exists for user/month
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

  const createMeta = useMutation({
    mutationFn: async () => {
      const [year, month] = mesReferencia.split("-");
      const dataReferencia = `${year}-${month}-01`;

      // Check if meta already exists
      const existingMeta = await checkExistingMeta(userId, mesReferencia);

      if (existingMeta) {
        // Update existing meta instead of creating new one
        const { error } = await supabase
          .from("metas")
          .update({ valor_meta: parseFloat(valorMeta) })
          .eq("id", existingMeta.id);

        if (error) throw error;
        return { updated: true };
      } else {
        // Create new meta
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
      queryClient.invalidateQueries({ queryKey: ["admin-metas", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-individuais-full"] });

      if (result?.updated) {
        toast.success("Meta atualizada com sucesso!");
      } else {
        toast.success("Meta individual definida com sucesso!");
      }
      setUserId("");
      setMesReferencia(mesAtual);
      setValorMeta("");
      setValorMetaFormatado("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir meta: ${error.message}`);
    },
  });

  const createMetaConsolidada = useMutation({
    mutationFn: async () => {
      const [year, month] = mesReferenciaConsolidada.split("-");
      const dataReferencia = `${year}-${month}-01`;

      // Check if consolidated meta already exists for this month
      const { data: existingMeta } = await supabase
        .from("metas_consolidadas")
        .select("id")
        .eq("mes_referencia", dataReferencia)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (existingMeta) {
        // Update existing
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
        // Create new
        const { error } = await supabase.from("metas_consolidadas").insert({
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
      queryClient.invalidateQueries({ queryKey: ["admin-metas-consolidadas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });

      if (result?.updated) {
        toast.success("Meta consolidada atualizada!");
      } else {
        toast.success("Meta consolidada definida com sucesso!");
      }
      setMesReferenciaConsolidada(mesAtual);
      setValorMetaConsolidada("");
      setValorMetaConsolidadaFormatado("");
      setDescricaoConsolidada("");
      setProdutoAlvo("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir meta consolidada: ${error.message}`);
    },
  });

  const deleteMeta = useMutation({
    mutationFn: async (metaId: string) => {
      const { error } = await supabase
        .from("metas")
        .delete()
        .eq("id", metaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-metas", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-individuais-full"] });
      toast.success("Meta removida com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover meta: ${error.message}`);
    },
  });

  const deleteMetaConsolidada = useMutation({
    mutationFn: async (metaId: string) => {
      console.log("[AdminMetas] Tentando excluir meta consolidada:", metaId);

      const { error, data } = await supabase
        .from("metas_consolidadas")
        .delete()
        .eq("id", metaId)
        .select();

      console.log("[AdminMetas] Resultado da exclusão:", { error, data });

      if (error) {
        console.error("[AdminMetas] Erro ao excluir:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log("[AdminMetas] Meta excluída com sucesso:", data);
      queryClient.invalidateQueries({ queryKey: ["admin-metas-consolidadas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
      toast.success("Meta consolidada removida com sucesso!");
    },
    onError: (error: any) => {
      console.error("[AdminMetas] Erro na mutation:", error);
      toast.error(`Erro ao remover meta consolidada: ${error.message}`);
    },
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return formatCurrency(value);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 150) return "bg-gradient-to-r from-amber-500 to-yellow-400"; // God Mode
    if (percent >= 100) return "bg-gradient-to-r from-emerald-500 to-emerald-400";
    if (percent >= 50) return "bg-gradient-to-r from-cyan-500 to-cyan-400";
    return "bg-gradient-to-r from-indigo-500 to-indigo-400";
  };

  const getCardBorderClass = (percent: number) => {
    if (percent >= 150) return "ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20"; // God Mode glow
    if (percent >= 100) return "ring-2 ring-emerald-400/30";
    return "";
  };

  const getStatusText = (percent: number, falta: number) => {
    if (percent >= 150) return { text: "🔥 GOD MODE!", color: "text-amber-500 dark:text-amber-400" };
    if (percent >= 100) return { text: "✅ Meta Batida!", color: "text-emerald-600 dark:text-emerald-400" };
    return { text: `Falta ${formatCurrencyCompact(falta)}`, color: "text-indigo-600 dark:text-indigo-300" };
  };

  // Calculate team health stats
  const teamHealthStats = useMemo(() => {
    if (!metas || metas.length === 0) return { totalTarget: 0, totalRealized: 0, sellersOnTarget: 0, totalSellers: 0 };

    let totalTarget = 0;
    let totalRealized = 0;
    let sellersOnTarget = 0;

    metas.forEach(meta => {
      const valorMeta = Number(meta.valor_meta) || 0;
      const realizado = calculateMetaProgress(meta);
      totalTarget += valorMeta;
      totalRealized += realizado;
      if (valorMeta > 0 && (realizado / valorMeta) >= 1) {
        sellersOnTarget++;
      }
    });

    return {
      totalTarget,
      totalRealized,
      sellersOnTarget,
      totalSellers: metas.length,
      teamProgress: totalTarget > 0 ? (totalRealized / totalTarget) * 100 : 0
    };
  }, [metas, todasVendas]);

  return (
    <Tabs defaultValue="individual" className="w-full">
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-card border border-border shadow-sm">
        <TabsTrigger
          value="individual"
          className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
        >
          <Target className="h-4 w-4" />
          Metas Individuais
        </TabsTrigger>
        <TabsTrigger
          value="consolidada"
          className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
        >
          <TrendingUp className="h-4 w-4" />
          Meta Consolidada
        </TabsTrigger>
      </TabsList>

      {/* ==================== METAS INDIVIDUAIS ==================== */}
      <TabsContent value="individual" className="mt-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN - The Controller (Sticky) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-4 space-y-4">
              <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Definir Meta Individual</h3>
                      <p className="text-xs text-muted-foreground">Configure metas por vendedor</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitMetaIndividual} className="space-y-5">
                    {/* Vendedor Select */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Vendedor</Label>
                      <Select value={userId} onValueChange={setUserId}>
                        <SelectTrigger className="bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground focus:ring-indigo-500">
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {vendedores?.map((vendedor) => (
                            <SelectItem
                              key={vendedor.id}
                              value={vendedor.id}
                              className="data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700 dark:data-[state=checked]:bg-indigo-500/20 dark:data-[state=checked]:text-white"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5 ring-2 ring-indigo-100 dark:ring-indigo-500/30">
                                  {vendedor.avatar_url && <AvatarImage src={vendedor.avatar_url} />}
                                  <AvatarFallback className="text-[10px] bg-muted text-foreground">
                                    {getInitials(vendedor.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-foreground">{vendedor.nome}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Performance Insight Box */}
                    {userId && (
                      <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4" />
                          <span className="text-xs font-medium uppercase tracking-wider">
                            Performance Insight
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-foreground">
                            Média de Vendas (3 meses):{" "}
                            <span className="font-bold">
                              {performanceInsight
                                ? formatCurrencyCompact(performanceInsight.average)
                                : "—"
                              }
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {performanceInsight?.count || 0} vendas no período
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Month Input */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Mês/Ano</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {mesReferencia
                                  ? format(new Date(`${mesReferencia}-01T12:00:00`), "MMMM yyyy", { locale: ptBR })
                                  : "Selecione o mês"}
                              </span>
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 bg-card border-border shadow-lg" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={mesReferencia ? new Date(`${mesReferencia}-01T12:00:00`) : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              setMesReferencia(`${y}-${m}`);
                            }}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Value Input - Formatado como moeda */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Valor da Meta</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={valorMetaFormatado}
                          onChange={(e) => formatarMoeda(e.target.value, setValorMeta, setValorMetaFormatado)}
                          placeholder="R$ 0,00"
                          className="pl-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={createMeta.isPending}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-transform"
                    >
                      {createMeta.isPending ? "Definindo..." : "Definir Meta"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Metas Ativas</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{metas?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN - The Context */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-slate-800 dark:text-amber-200">
                <Trophy className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-foreground">Metas Ativas</h3>
              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                {metas?.length || 0} metas
              </Badge>
            </div>

            {/* Team Health Summary */}
            {metas && metas.length > 0 && (
              <Card className="mb-6 border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Saúde do Time</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Performance consolidada</p>
                    </div>
                  </div>

                  {/* Team Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Progresso do Time</span>
                      <span className={`font-bold ${teamHealthStats.teamProgress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {teamHealthStats.teamProgress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(teamHealthStats.teamProgress)} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(teamHealthStats.teamProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {teamHealthStats.sellersOnTarget}/{teamHealthStats.totalSellers}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Na Meta
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyCompact(teamHealthStats.totalRealized)}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Realizado
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {metas?.length === 0 ? (
              <Card className="border-dashed border-border bg-card">
                <CardContent className="py-12 text-center space-y-1">
                  <Target className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma meta individual definida</p>
                  <p className="text-sm text-muted-foreground">
                    Use o formulário ao lado para criar uma nova meta
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metas?.map((meta) => {
                  // Calculate real progress from actual sales (uncapped)
                  const realizado = calculateMetaProgress(meta);
                  const valorMeta = Number(meta.valor_meta) || 1;
                  const exactProgress = (realizado / valorMeta) * 100;
                  const visualProgress = Math.min(exactProgress, 100);
                  const falta = Math.max(valorMeta - realizado, 0);
                  const status = getStatusText(exactProgress, falta);

                  return (
                    <Card
                      key={meta.id}
                      className={`relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all group ${getCardBorderClass(exactProgress)}`}
                    >
                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border shadow-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Tem certeza que deseja remover a meta de {meta.profiles?.nome}? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/80">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMeta.mutate(meta.id)}
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <CardContent className="p-4 space-y-4">
                        {/* Header: Avatar + Name + Month */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-indigo-100 dark:ring-indigo-500/30">
                            {meta.profiles?.avatar_url && (
                              <AvatarImage src={meta.profiles.avatar_url} />
                            )}
                            <AvatarFallback className="bg-muted text-foreground font-bold">
                              {getInitials(meta.profiles?.nome || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">
                              {meta.profiles?.nome}
                            </h4>
                            <Badge variant="outline" className="bg-muted border-border text-muted-foreground text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(meta.mes_referencia + "T12:00:00"), "MMM yyyy", { locale: ptBR })}
                            </Badge>
                          </div>
                        </div>

                        {/* Body: Huge Value + Status */}
                        <div className="py-2">
                          <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                            {formatCurrencyCompact(valorMeta)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {exactProgress >= 150 && <Flame className="h-4 w-4 text-amber-500 animate-pulse" />}
                            {exactProgress >= 100 && exactProgress < 150 && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                            <span className={`text-sm font-semibold ${status.color}`}>
                              {status.text}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Realizado: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(realizado)}</span>
                          </p>
                        </div>

                        {/* Footer: Progress Bar - Thicker with exact % */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Progresso</span>
                            <div className="flex items-center gap-1">
                              {exactProgress >= 150 && <Crown className="h-3 w-3 text-amber-500" />}
                              <span className={`font-bold text-sm ${exactProgress >= 150 ? "text-amber-500" :
                                exactProgress >= 100 ? "text-emerald-600 dark:text-emerald-400" :
                                  "text-indigo-600 dark:text-indigo-400"
                                }`}>
                                {exactProgress.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="relative h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(exactProgress)} rounded-full transition-all duration-500`}
                              style={{ width: `${visualProgress}%` }}
                            >
                              {exactProgress >= 50 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ==================== META CONSOLIDADA ==================== */}
      <TabsContent value="consolidada" className="mt-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN - The Controller (Sticky) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-4 space-y-4">
              <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Definir Meta Consolidada</h3>
                      <p className="text-xs text-muted-foreground">Meta global da equipe</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitMetaConsolidada} className="space-y-5">
                    {/* Month Input */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Mês/Ano *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {mesReferenciaConsolidada
                                  ? format(new Date(`${mesReferenciaConsolidada}-01T12:00:00`), "MMMM yyyy", { locale: ptBR })
                                  : "Selecione o mês"}
                              </span>
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 bg-card border-border shadow-lg" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={mesReferenciaConsolidada ? new Date(`${mesReferenciaConsolidada}-01T12:00:00`) : undefined}
                            onSelect={(date) => {
                              if (!date) return;
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, "0");
                              setMesReferenciaConsolidada(`${y}-${m}`);
                            }}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Value Input - Formatado como moeda */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Valor da Meta *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={valorMetaConsolidadaFormatado}
                          onChange={(e) => formatarMoeda(e.target.value, setValorMetaConsolidada, setValorMetaConsolidadaFormatado)}
                          placeholder="R$ 0,00"
                          className="pl-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground focus:ring-indigo-500"
                          required
                        />
                      </div>
                      {/* Helper: Sum of individual metas */}
                      {metas && metas.length > 0 && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Soma das Metas Individuais: <span className="font-semibold">{formatCurrencyCompact(teamHealthStats?.totalTarget || 0)}</span>
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Descrição (Opcional)</Label>
                      <Textarea
                        value={descricaoConsolidada}
                        onChange={(e) => setDescricaoConsolidada(e.target.value)}
                        placeholder="Ex: Meta Black Friday..."
                        className="bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground focus:ring-indigo-500 min-h-[80px]"
                      />
                    </div>

                    {/* Product Target */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Produto Alvo (Opcional)</Label>
                      <Input
                        value={produtoAlvo}
                        onChange={(e) => setProdutoAlvo(e.target.value)}
                        placeholder="Ex: Plano Premium..."
                        className="bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground focus:ring-indigo-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={createMetaConsolidada.isPending}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-transform"
                    >
                      {createMetaConsolidada.isPending ? "Definindo..." : "Definir Meta Consolidada"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Campanhas Ativas</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{metasConsolidadas?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN - The Context */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-cyan-50 text-cyan-700 dark:bg-slate-800 dark:text-cyan-200">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-foreground">Campanhas Ativas</h3>
              <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
                {metasConsolidadas?.length || 0} campanhas
              </Badge>
            </div>

            {metasConsolidadas?.length === 0 ? (
              <Card className="border-dashed border-gray-300 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <CardContent className="py-16 text-center space-y-3">
                  <div className="relative inline-block">
                    <Rocket className="h-16 w-16 mx-auto text-indigo-400 dark:text-indigo-500" />
                    <Star className="h-6 w-6 absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Nenhuma missão definida
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    O time ainda não tem uma meta consolidada para este mês. Crie uma campanha para motivar a equipe!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metasConsolidadas?.map((meta) => {
                  // Calculate real progress from actual sales (uncapped for display)
                  const realizado = calculateConsolidadaProgress(meta);
                  const valorMeta = Number(meta.valor_meta) || 1;
                  const exactProgress = (realizado / valorMeta) * 100;
                  const visualProgress = Math.min(exactProgress, 100);
                  const falta = Math.max(valorMeta - realizado, 0);

                  // Get top 3 contributors for this month
                  const mesRef = meta.mes_referencia;
                  const [year, month] = mesRef.split('-');
                  const inicioMes = `${year}-${month}-01`;
                  const yearNum = parseInt(year);
                  const monthNum = parseInt(month);
                  const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
                  const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

                  // Calculate contributions per seller
                  const contributorMap = new Map<string, { nome: string; avatarUrl?: string; total: number }>();
                  todasVendas.forEach((v: any) => {
                    const dataVenda = v.data_venda?.split('T')[0] || v.data_venda;
                    if (dataVenda >= inicioMes && dataVenda <= fimMes) {
                      const seller = vendedores?.find(s => s.id === v.user_id);
                      if (seller) {
                        const existing = contributorMap.get(seller.id) || { nome: seller.nome, avatarUrl: seller.avatar_url, total: 0 };
                        existing.total += Number(v.valor);
                        contributorMap.set(seller.id, existing);
                      }
                    }
                  });

                  const topContributors = Array.from(contributorMap.values())
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 3);

                  // Super Goal styling
                  const isGodMode = exactProgress >= 120;
                  const isCompleted = exactProgress >= 100;
                  const cardBorderClass = isGodMode
                    ? "ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20"
                    : isCompleted
                      ? "ring-2 ring-emerald-400/30"
                      : "";

                  const progressBarColor = isGodMode
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : isCompleted
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-cyan-500 to-cyan-400";

                  return (
                    <Card
                      key={meta.id}
                      className={`relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all group ${cardBorderClass}`}
                    >

                      {/* Delete Button - Always visible */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 z-20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border shadow-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Tem certeza que deseja remover esta meta consolidada? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/80">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMetaConsolidada.mutate(meta.id)}
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <CardContent className="relative z-10 p-5 space-y-4">
                        {/* Header: Title + Month */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                            <h4 className="font-semibold text-foreground">
                              {meta.descricao || "Meta Consolidada"}
                            </h4>
                          </div>
                          <Badge variant="outline" className="bg-muted border-border text-muted-foreground text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(meta.mes_referencia + "T12:00:00"), "MMMM yyyy", { locale: ptBR })}
                          </Badge>
                          {meta.produto_alvo && (
                            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-xs ml-2">
                              🎯 Foco: {meta.produto_alvo}
                            </Badge>
                          )}
                        </div>

                        {/* Top 3 Contributors */}
                        {topContributors.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Top:</span>
                            <TooltipProvider>
                              <div className="flex -space-x-2">
                                {topContributors.map((contributor, idx) => (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger asChild>
                                      <Avatar className={`h-7 w-7 border-2 border-white dark:border-gray-900 ${idx === 0 ? 'ring-2 ring-amber-400' : ''}`}>
                                        <AvatarImage src={contributor.avatarUrl || ''} />
                                        <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 text-[10px] font-semibold">
                                          {contributor.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-900 text-white text-xs">
                                      <p>{contributor.nome}</p>
                                      <p className="text-emerald-400">{formatCurrencyCompact(contributor.total)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            </TooltipProvider>
                          </div>
                        )}

                        {/* Body: Huge Value + Status */}
                        <div className="py-2">
                          <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
                            {formatCurrencyCompact(valorMeta)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {isGodMode && <Flame className="h-4 w-4 text-amber-500 animate-pulse" />}
                            {isCompleted && !isGodMode && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                            <span className={`text-sm font-semibold ${isGodMode ? 'text-amber-500' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                              }`}>
                              {isGodMode ? '🔥 SUPER META!' : isCompleted ? '✅ Meta Batida!' : `Falta ${formatCurrencyCompact(falta)}`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Realizado: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(realizado)}</span>
                          </p>
                        </div>

                        {/* Footer: Progress Bar - Thicker with exact % */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Progresso da Equipe</span>
                            <div className="flex items-center gap-1">
                              {isGodMode && <Crown className="h-3 w-3 text-amber-500" />}
                              <span className={`font-bold text-sm ${isGodMode ? 'text-amber-500' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'
                                }`}>
                                {exactProgress.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="relative h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${progressBarColor} rounded-full transition-all duration-500`}
                              style={{ width: `${visualProgress}%` }}
                            >
                              {exactProgress >= 50 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs >
  );
};
