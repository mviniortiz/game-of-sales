import { useState, useEffect } from "react";
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
  Trophy
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

export const AdminMetas = () => {
  const queryClient = useQueryClient();
  
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

  // Fetch vendedores with avatar
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, avatar_url")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch metas individuais
  const { data: metas } = useQuery({
    queryKey: ["admin-metas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas")
        .select("*, profiles:user_id(nome, avatar_url)")
        .order("mes_referencia", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL vendas to calculate real progress
  const { data: todasVendas = [] } = useQuery({
    queryKey: ["admin-todas-vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("user_id, valor, data_venda, status")
        .eq("status", "Aprovado");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch metas consolidadas
  const { data: metasConsolidadas } = useQuery({
    queryKey: ["admin-metas-consolidadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_consolidadas")
        .select("*")
        .order("mes_referencia", { ascending: false });
      
      if (error) throw error;
      return data;
    },
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
    queryKey: ["seller-performance", userId],
    queryFn: async () => {
      if (!userId) return null;

      const threeMonthsAgo = subMonths(new Date(), 3);
      const { data, error } = await supabase
        .from("vendas")
        .select("valor")
        .eq("user_id", userId)
        .eq("status", "Aprovado")
        .gte("data_venda", threeMonthsAgo.toISOString().split("T")[0]);

      if (error) throw error;

      const total = data?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const average = total / 3;

      return {
        total,
        average,
        count: data?.length || 0,
      };
    },
    enabled: !!userId,
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
        });
        
        if (error) throw error;
        return { updated: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-metas"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-metas"] });
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
    if (percent >= 100) return "bg-gradient-to-r from-emerald-500 to-emerald-400";
    if (percent >= 50) return "bg-gradient-to-r from-cyan-500 to-cyan-400";
    return "bg-gradient-to-r from-indigo-500 to-indigo-400";
  };

  return (
    <Tabs defaultValue="individual" className="w-full">
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-900/50 border border-white/10">
        <TabsTrigger 
          value="individual" 
          className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
        >
          <Target className="h-4 w-4" />
          Metas Individuais
        </TabsTrigger>
        <TabsTrigger 
          value="consolidada" 
          className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
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
              <Card className="border-indigo-500/30 bg-slate-900 shadow-xl shadow-indigo-500/5">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-indigo-500/20">
                      <Target className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Definir Meta Individual</h3>
                      <p className="text-xs text-slate-500">Configure metas por vendedor</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitMetaIndividual} className="space-y-5">
                    {/* Vendedor Select */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Vendedor</Label>
                      <Select value={userId} onValueChange={setUserId}>
                        <SelectTrigger className="bg-slate-800 border-white/10 text-white focus:ring-indigo-500">
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {vendedores?.map((vendedor) => (
                            <SelectItem key={vendedor.id} value={vendedor.id} className="text-white">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  {vendedor.avatar_url && <AvatarImage src={vendedor.avatar_url} />}
                                  <AvatarFallback className="text-[10px] bg-indigo-500/20 text-indigo-400">
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

                    {/* Performance Insight Box */}
                    {userId && (
                      <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-indigo-400" />
                          <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">
                            Performance Insight
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-300">
                            Média de Vendas (3 meses):{" "}
                            <span className="font-bold text-white">
                              {performanceInsight 
                                ? formatCurrencyCompact(performanceInsight.average)
                                : "—"
                              }
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {performanceInsight?.count || 0} vendas no período
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Month Input */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Mês/Ano</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="month"
                          value={mesReferencia}
                          onChange={(e) => setMesReferencia(e.target.value)}
                          className="pl-10 bg-slate-800 border-white/10 text-white focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Value Input - Formatado como moeda */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Valor da Meta</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={valorMetaFormatado}
                          onChange={(e) => formatarMoeda(e.target.value, setValorMeta, setValorMetaFormatado)}
                          placeholder="R$ 0,00"
                          className="pl-10 bg-slate-800 border-white/10 text-white focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={createMeta.isPending}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      {createMeta.isPending ? "Definindo..." : "Definir Meta"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border-white/5 bg-slate-900/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-400">Metas Ativas</span>
                    </div>
                    <span className="text-lg font-bold text-white">{metas?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN - The Context */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-slate-800">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="font-semibold text-white">Metas Ativas</h3>
              <Badge variant="outline" className="bg-slate-800 border-white/10 text-slate-400">
                {metas?.length || 0} metas
              </Badge>
            </div>

            {metas?.length === 0 ? (
              <Card className="border-dashed border-white/10 bg-slate-900/30">
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Nenhuma meta individual definida</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Use o formulário ao lado para criar uma nova meta
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metas?.map((meta) => {
                  // Calculate real progress from actual sales
                  const realizado = calculateMetaProgress(meta);
                  const valorMeta = Number(meta.valor_meta) || 1;
                  const progress = Math.min((realizado / valorMeta) * 100, 100);

                  return (
                    <Card 
                      key={meta.id} 
                      className="relative overflow-hidden border-white/5 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all group"
                    >
                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              Tem certeza que deseja remover a meta de {meta.profiles?.nome}? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-white/10 text-white hover:bg-slate-700">
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
                          <Avatar className="h-10 w-10 ring-2 ring-indigo-500/30">
                            {meta.profiles?.avatar_url && (
                              <AvatarImage src={meta.profiles.avatar_url} />
                            )}
                            <AvatarFallback className="bg-indigo-500/20 text-indigo-400 font-bold">
                              {getInitials(meta.profiles?.nome || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">
                              {meta.profiles?.nome}
                            </h4>
                            <Badge variant="outline" className="bg-slate-800/50 border-white/10 text-slate-400 text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(meta.mes_referencia + "T12:00:00"), "MMM yyyy", { locale: ptBR })}
                            </Badge>
                          </div>
                        </div>

                        {/* Body: Huge Value */}
                        <div className="py-2">
                          <p className="text-3xl font-bold text-white tabular-nums">
                            {formatCurrencyCompact(valorMeta)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Realizado: <span className="text-emerald-400 font-medium">{formatCurrency(realizado)}</span>
                          </p>
                        </div>

                        {/* Footer: Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Progresso</span>
                            <span className={`font-medium ${
                              progress >= 100 ? "text-emerald-400" : "text-indigo-400"
                            }`}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(progress)} rounded-full transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            />
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
              <Card className="border-indigo-500/30 bg-slate-900 shadow-xl shadow-indigo-500/5">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-indigo-500/20">
                      <Zap className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Definir Meta Consolidada</h3>
                      <p className="text-xs text-slate-500">Meta global da equipe</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitMetaConsolidada} className="space-y-5">
                    {/* Month Input */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Mês/Ano *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="month"
                          value={mesReferenciaConsolidada}
                          onChange={(e) => setMesReferenciaConsolidada(e.target.value)}
                          className="pl-10 bg-slate-800 border-white/10 text-white focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Value Input - Formatado como moeda */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Valor da Meta *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={valorMetaConsolidadaFormatado}
                          onChange={(e) => formatarMoeda(e.target.value, setValorMetaConsolidada, setValorMetaConsolidadaFormatado)}
                          placeholder="R$ 0,00"
                          className="pl-10 bg-slate-800 border-white/10 text-white focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Descrição (Opcional)</Label>
                      <Textarea
                        value={descricaoConsolidada}
                        onChange={(e) => setDescricaoConsolidada(e.target.value)}
                        placeholder="Ex: Meta Black Friday..."
                        className="bg-slate-800 border-white/10 text-white focus:ring-indigo-500 min-h-[80px]"
                      />
                    </div>

                    {/* Product Target */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Produto Alvo (Opcional)</Label>
                      <Input
                        value={produtoAlvo}
                        onChange={(e) => setProdutoAlvo(e.target.value)}
                        placeholder="Ex: Plano Premium..."
                        className="bg-slate-800 border-white/10 text-white focus:ring-indigo-500"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={createMetaConsolidada.isPending}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      {createMetaConsolidada.isPending ? "Definindo..." : "Definir Meta Consolidada"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border-white/5 bg-slate-900/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-400">Campanhas Ativas</span>
                    </div>
                    <span className="text-lg font-bold text-white">{metasConsolidadas?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN - The Context */}
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-slate-800">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white">Campanhas Ativas</h3>
              <Badge variant="outline" className="bg-slate-800 border-white/10 text-slate-400">
                {metasConsolidadas?.length || 0} campanhas
              </Badge>
            </div>

            {metasConsolidadas?.length === 0 ? (
              <Card className="border-dashed border-white/10 bg-slate-900/30">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Nenhuma meta consolidada definida</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Use o formulário ao lado para criar uma nova campanha
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metasConsolidadas?.map((meta) => {
                  // Calculate real progress from actual sales
                  const realizado = calculateConsolidadaProgress(meta);
                  const valorMeta = Number(meta.valor_meta) || 1;
                  const progress = Math.min((realizado / valorMeta) * 100, 100);

                  return (
                    <Card 
                      key={meta.id} 
                      className="relative overflow-hidden border-white/5 bg-gradient-to-br from-indigo-900/30 via-slate-900/50 to-slate-900/50 backdrop-blur-sm hover:from-indigo-900/40 transition-all group"
                    >
                      {/* Glow effect */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

                      {/* Delete Button - Always visible */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 z-20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              Tem certeza que deseja remover esta meta consolidada? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-white/10 text-white hover:bg-slate-700">
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
                            <Zap className="h-4 w-4 text-indigo-400" />
                            <h4 className="font-semibold text-white">
                              {meta.descricao || "Meta Consolidada"}
                            </h4>
                          </div>
                          <Badge variant="outline" className="bg-slate-800/50 border-white/10 text-slate-400 text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(meta.mes_referencia + "T12:00:00"), "MMMM yyyy", { locale: ptBR })}
                          </Badge>
                        </div>

                        {/* Body: Huge Value */}
                        <div className="py-2">
                          <p className="text-4xl font-bold text-white tabular-nums">
                            {formatCurrencyCompact(valorMeta)}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-slate-500">
                              Realizado: <span className="text-emerald-400 font-medium">{formatCurrency(realizado)}</span>
                            </span>
                            {meta.produto_alvo && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-500">
                                  Produto: <span className="text-indigo-400">{meta.produto_alvo}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Footer: Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Progresso da Equipe</span>
                            <span className={`font-medium ${
                              progress >= 100 ? "text-emerald-400" : "text-cyan-400"
                            }`}>
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(progress)} rounded-full transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            >
                              {progress >= 10 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
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
    </Tabs>
  );
};
