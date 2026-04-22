import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  CalendarDays,
  Zap,
  RefreshCw,
  Medal,
} from "lucide-react";
import { endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { logger } from "@/utils/logger";

const Metas = () => {
  const { user } = useAuth();
  const { needsUpgrade } = usePlan();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useTenant();
  const [selectedMetaId, setSelectedMetaId] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const applyCompanyFilter = (query: any) => {
    // SECURITY: Always require a valid company_id to prevent data leakage
    if (!activeCompanyId) {
      return query.eq("company_id", "00000000-0000-0000-0000-000000000000");
    }
    return query.eq("company_id", activeCompanyId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
      await queryClient.invalidateQueries({ queryKey: ["metas-individuais-full"] });
      await queryClient.invalidateQueries({ queryKey: ["vendas-mes-atual"] });
      await queryClient.invalidateQueries({ queryKey: ["vendas-mes-anterior"] });
      toast.success("Dados atualizados!");
    } catch {
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Metas consolidadas
  const { data: metasConsolidadas = [], isLoading: loadingConsolidadas } = useQuery({
    queryKey: ["metas-consolidadas", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("metas_consolidadas")
          .select("*")
          .order("mes_referencia", { ascending: false })
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setSelectedMetaId("all");
  }, [activeCompanyId]);

  const metaConsolidadaSelecionada = selectedMetaId === "all"
    ? metasConsolidadas[0]
    : metasConsolidadas.find(m => m.id === selectedMetaId);

  // Vendas do mês atual
  const { data: vendasMesAtual = [] } = useQuery({
    queryKey: ["vendas-mes-atual", metaConsolidadaSelecionada?.mes_referencia, activeCompanyId],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada) return [];
      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const [year, month] = mesRef.split('-');
      const inicioMes = `${year}-${month}-01`;
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
      const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

      logger.log(`[Metas] Buscando vendas de ${inicioMes} até ${fimMes}`);

      const { data, error } = await applyCompanyFilter(
        supabase
          .from("vendas")
          .select("user_id, valor, status, data_venda, company_id")
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!metaConsolidadaSelecionada,
    refetchInterval: 30_000,
  });

  // Vendas do mês anterior (para delta comparável)
  const { data: vendasMesAnterior = [] } = useQuery({
    queryKey: ["vendas-mes-anterior", metaConsolidadaSelecionada?.mes_referencia, activeCompanyId],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada) return [];
      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const [year, month] = mesRef.split('-');
      const ref = new Date(parseInt(year), parseInt(month) - 1, 1);
      ref.setMonth(ref.getMonth() - 1);
      const prevYear = ref.getFullYear();
      const prevMonth = String(ref.getMonth() + 1).padStart(2, '0');
      const inicioMes = `${prevYear}-${prevMonth}-01`;
      const ultimoDia = new Date(prevYear, ref.getMonth() + 1, 0).getDate();
      const fimMes = `${prevYear}-${prevMonth}-${String(ultimoDia).padStart(2, '0')}`;

      const { data, error } = await applyCompanyFilter(
        supabase
          .from("vendas")
          .select("valor, data_venda")
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!metaConsolidadaSelecionada && !!activeCompanyId,
    refetchInterval: 60_000,
  });

  // Metas individuais
  const { data: metasIndividuais = [], isLoading: loadingIndividuais } = useQuery({
    queryKey: ["metas-individuais-full", metaConsolidadaSelecionada?.mes_referencia, vendasMesAtual, activeCompanyId],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada || !activeCompanyId) return [];
      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const metaConsolidadaValor = Number(metaConsolidadaSelecionada.valor_meta) || 0;

      let metasQuery = supabase
        .from("metas")
        .select("*, profiles:user_id(id, nome, avatar_url, is_super_admin, company_id)")
        .eq("mes_referencia", mesRef)
        .gt("valor_meta", 0);

      metasQuery = metasQuery.eq("company_id", activeCompanyId);

      const { data: metas, error: metasError } = await metasQuery;
      if (metasError) {
        logger.error("[Metas] Erro ao buscar metas individuais:", metasError);
        throw metasError;
      }

      const vendasPorUsuario: { [key: string]: number } = {};
      vendasMesAtual.forEach((venda: any) => {
        vendasPorUsuario[venda.user_id] = (vendasPorUsuario[venda.user_id] || 0) + Number(venda.valor);
      });

      const resultado = (metas || [])
        .filter((meta: any) => {
          if (!(Number(meta?.valor_meta) > 0)) return false;
          if (meta?.profiles?.company_id && meta.profiles.company_id !== activeCompanyId) return false;
          if (!meta?.profiles?.nome) return false;
          if (meta.user_id === user?.id) return true;
          if (meta.profiles?.is_super_admin) return false;
          return true;
        })
        .map((meta: any) => {
          const valorMeta = Number(meta.valor_meta) || 0;
          const valorRealizado = vendasPorUsuario[meta.user_id] || 0;
          const percentual = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;
          const contribuicaoPercentual = metaConsolidadaValor > 0
            ? (valorRealizado / metaConsolidadaValor) * 100
            : 0;
          const faltaAtingir = Math.max(0, valorMeta - valorRealizado);

          return {
            id: meta.id,
            user_id: meta.user_id,
            nome: meta.profiles.nome,
            avatar_url: meta.profiles.avatar_url,
            valorMeta,
            valorRealizado,
            percentual,
            contribuicaoPercentual,
            faltaAtingir,
          };
        }).sort((a: any, b: any) => b.valorRealizado - a.valorRealizado);

      return resultado;
    },
    enabled: !!metaConsolidadaSelecionada && !!activeCompanyId,
  });

  // Cockpit: tudo que precisamos pra renderizar a visão consolidada
  const cockpit = useMemo(() => {
    const atingido = vendasMesAtual.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
    const total = Number(metaConsolidadaSelecionada?.valor_meta) || 0;
    const percentual = total > 0 ? (atingido / total) * 100 : 0;

    let diasTotal = 30;
    let diasDecorridos = 1;
    let diasRestantes = 0;
    if (metaConsolidadaSelecionada) {
      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const [year, month] = mesRef.split('-');
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const ultimoDiaMesDate = endOfMonth(new Date(yearNum, monthNum - 1));
      const inicio = new Date(yearNum, monthNum - 1, 1);
      const hoje = new Date();
      diasTotal = ultimoDiaMesDate.getDate();

      if (hoje < inicio) {
        diasDecorridos = 0;
        diasRestantes = diasTotal;
      } else if (hoje > ultimoDiaMesDate) {
        diasDecorridos = diasTotal;
        diasRestantes = 0;
      } else {
        diasDecorridos = hoje.getDate();
        diasRestantes = diasTotal - diasDecorridos;
      }
    }

    const percentualEsperadoHoje = diasTotal > 0 ? (diasDecorridos / diasTotal) * 100 : 0;
    const paceDiarioNecessario = diasRestantes > 0 ? Math.max(0, (total - atingido) / diasRestantes) : 0;
    const projecaoFimMes = diasDecorridos > 0 ? (atingido / diasDecorridos) * diasTotal : atingido;

    // Delta vs mês anterior no mesmo período (same day-of-month ou antes)
    const valorMesAnteriorMesmoDia = vendasMesAnterior
      .filter((v: any) => {
        if (!v.data_venda) return false;
        const dia = new Date(`${v.data_venda}T12:00:00`).getDate();
        return dia <= (diasDecorridos || 1);
      })
      .reduce((acc: number, v: any) => acc + Number(v.valor), 0);
    const deltaVsMesAnterior = valorMesAnteriorMesmoDia > 0
      ? ((atingido - valorMesAnteriorMesmoDia) / valorMesAnteriorMesmoDia) * 100
      : null;

    // Podemos julgar ritmo só se o mês já começou faz mais que 2 dias e ainda não acabou
    const canJudgePace = diasDecorridos > 2 && diasRestantes > 0;

    return {
      atingido,
      total,
      percentual,
      diasTotal,
      diasDecorridos,
      diasRestantes,
      percentualEsperadoHoje,
      paceDiarioNecessario,
      projecaoFimMes,
      deltaVsMesAnterior,
      canJudgePace,
    };
  }, [vendasMesAtual, vendasMesAnterior, metaConsolidadaSelecionada]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')} M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')} k`;
    return formatCurrency(value);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const isLoading = loadingConsolidadas || loadingIndividuais;

  if (needsUpgrade('metas')) {
    return <UpgradePrompt feature="metas" />;
  }

  // Geometria do círculo
  const circleR = 62;
  const circleCircumference = 2 * Math.PI * circleR;
  const circleOffset = circleCircumference * (1 - Math.min(cockpit.percentual, 100) / 100);

  return (
    <div className="space-y-5 sm:space-y-6 px-2 sm:px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Metas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Acompanhe o progresso da equipe em tempo real</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 border-border bg-muted text-foreground hover:bg-muted/80 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* Seletor de Meta - Pills */}
      {metasConsolidadas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
          <button
            onClick={() => setSelectedMetaId("all")}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${selectedMetaId === "all"
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.05]"
              }`}
          >
            Atual
          </button>
          {metasConsolidadas.map((meta) => (
            <button
              key={meta.id}
              onClick={() => setSelectedMetaId(meta.id)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${selectedMetaId === meta.id
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.05]"
                }`}
            >
              {meta.descricao || format(new Date(meta.mes_referencia + "T12:00:00"), "MMM yyyy", { locale: ptBR })}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
          <p className="mt-4">Carregando metas...</p>
        </div>
      ) : !metaConsolidadaSelecionada ? (
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma Meta Consolidada</h3>
          <p className="text-muted-foreground">Crie uma meta consolidada em Administração → Metas</p>
        </div>
      ) : (
        <>
          {/* COCKPIT */}
          <Card className="border border-border bg-card overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Title row */}
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400/80 font-medium">Meta Consolidada</p>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground mt-0.5">
                    {metaConsolidadaSelecionada.descricao || "Meta da Equipe"}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground capitalize">
                    {format(new Date(metaConsolidadaSelecionada.mes_referencia + "T12:00:00"), "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {cockpit.diasRestantes > 0 && (
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      Faltam {cockpit.diasRestantes} {cockpit.diasRestantes === 1 ? "dia" : "dias"}
                    </p>
                  )}
                </div>
              </div>

              {/* Main grid: circular + stats */}
              <div className="grid lg:grid-cols-[auto_1fr] gap-6 items-center">
                {/* Circular progress */}
                <div className="relative w-[160px] h-[160px] mx-auto lg:mx-0 flex-shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r={circleR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle
                      cx="80"
                      cy="80"
                      r={circleR}
                      fill="none"
                      stroke="url(#cockpitGrad)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={circleOffset}
                      style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
                    />
                    <defs>
                      <linearGradient id="cockpitGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#00E37A" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-semibold text-foreground tabular-nums leading-none">
                      {cockpit.percentual.toFixed(0)}
                      <span className="text-xl text-muted-foreground">%</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1.5">
                      da meta
                    </span>
                  </div>
                </div>

                {/* 3 stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Realizado com delta */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="text-[11px] uppercase tracking-wider font-medium">Realizado</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground mt-2 tabular-nums">
                      {formatCurrencyCompact(cockpit.atingido)}
                    </p>
                    {cockpit.deltaVsMesAnterior !== null ? (
                      <div className={`flex items-center gap-1 text-[11px] mt-1.5 ${cockpit.deltaVsMesAnterior >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {cockpit.deltaVsMesAnterior >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span className="tabular-nums font-medium">
                          {cockpit.deltaVsMesAnterior >= 0 ? "+" : ""}{cockpit.deltaVsMesAnterior.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground/60">vs mês anterior</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5 tabular-nums">
                        de {formatCurrencyCompact(cockpit.total)}
                      </p>
                    )}
                  </div>

                  {/* Pace diário necessário */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      <span className="text-[11px] uppercase tracking-wider font-medium">Pace diário</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground mt-2 tabular-nums">
                      {cockpit.diasRestantes > 0 ? formatCurrencyCompact(cockpit.paceDiarioNecessario) : "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                      {cockpit.diasRestantes > 0
                        ? `necessário nos próximos ${cockpit.diasRestantes} ${cockpit.diasRestantes === 1 ? "dia" : "dias"}`
                        : "período encerrado"}
                    </p>
                  </div>

                  {/* Projeção */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="text-[11px] uppercase tracking-wider font-medium">Projeção</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-semibold text-foreground mt-2 tabular-nums">
                      {formatCurrencyCompact(cockpit.projecaoFimMes)}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                      {cockpit.total <= 0
                        ? "meta não definida"
                        : cockpit.projecaoFimMes >= cockpit.total
                          ? "bate meta no ritmo atual"
                          : `${((cockpit.projecaoFimMes / cockpit.total) * 100).toFixed(0)}% da meta no ritmo atual`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar com marcador de hoje */}
              <div className="space-y-2 pt-1">
                <div className="relative h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(cockpit.percentual, 100)}%`,
                      background: "linear-gradient(90deg, #00E37A 0%, #06b6d4 100%)",
                    }}
                  />
                  {cockpit.percentualEsperadoHoje > 0 && cockpit.percentualEsperadoHoje < 100 && (
                    <div
                      className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-white/50"
                      style={{ left: `${cockpit.percentualEsperadoHoje}%` }}
                      aria-label="Pace ideal hoje"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span className="tabular-nums">
                    <span className="text-muted-foreground/60">Realizado:</span> {formatCurrencyCompact(cockpit.atingido)}
                  </span>
                  {cockpit.percentualEsperadoHoje > 0 && cockpit.percentualEsperadoHoje < 100 && (
                    <span className="tabular-nums">
                      <span className="text-muted-foreground/60">Pace ideal hoje:</span> {cockpit.percentualEsperadoHoje.toFixed(0)}%
                    </span>
                  )}
                  <span className="tabular-nums">
                    <span className="text-muted-foreground/60">Meta:</span> {formatCurrencyCompact(cockpit.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* INDIVIDUAL SELLERS - Lista enxuta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Contribuição individual</h2>
                <p className="text-xs text-muted-foreground">
                  {metasIndividuais.length} {metasIndividuais.length === 1 ? "vendedor" : "vendedores"} ordenados por volume
                </p>
              </div>
            </div>

            {metasIndividuais.length === 0 ? (
              <Card className="border border-border bg-card p-8 text-center">
                <Medal className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma meta individual</h3>
                <p className="text-muted-foreground text-xs">
                  Defina metas para os vendedores em Administração → Metas
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {metasIndividuais.map((vendedor: any, index: number) => {
                  const posicao = index + 1;
                  const isWinner = vendedor.percentual >= 100;
                  const behindPace = cockpit.canJudgePace && !isWinner &&
                    vendedor.percentual < (cockpit.percentualEsperadoHoje - 15);
                  const gap = cockpit.percentualEsperadoHoje - vendedor.percentual;

                  return (
                    <div
                      key={vendedor.id}
                      className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] transition-colors overflow-hidden"
                    >
                      {/* Stripe status lateral */}
                      <span
                        className={`absolute left-0 top-0 bottom-0 w-0.5 ${isWinner
                          ? "bg-emerald-400"
                          : behindPace
                            ? "bg-amber-400/80"
                            : "bg-transparent"
                          }`}
                        aria-hidden
                      />

                      <div className="grid grid-cols-[auto_auto_1fr_auto] gap-3 sm:gap-4 items-center p-3 sm:p-4">
                        {/* Posição */}
                        <span className="w-5 text-center text-xs font-medium text-muted-foreground/60 tabular-nums">
                          {posicao}
                        </span>

                        {/* Avatar */}
                        <Avatar className={`h-9 w-9 ${isWinner ? "ring-2 ring-emerald-400/60" : ""}`}>
                          {vendedor.avatar_url && (
                            <AvatarImage src={vendedor.avatar_url} alt={vendedor.nome} />
                          )}
                          <AvatarFallback className="bg-white/[0.04] text-foreground font-medium text-xs">
                            {getInitials(vendedor.nome)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Nome + chips + barra */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground truncate">{vendedor.nome}</span>
                            {isWinner && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-medium uppercase tracking-wider">
                                Bateu meta
                              </span>
                            )}
                            {behindPace && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-medium uppercase tracking-wider tabular-nums">
                                {gap.toFixed(0)}pp abaixo do pace
                              </span>
                            )}
                            {vendedor.contribuicaoPercentual > 0 && (
                              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                                {vendedor.contribuicaoPercentual < 0.1
                                  ? "<0,1%"
                                  : `${vendedor.contribuicaoPercentual.toFixed(1)}%`} do global
                              </span>
                            )}
                          </div>
                          <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden mt-2">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(vendedor.percentual, 100)}%`,
                                background: isWinner
                                  ? "linear-gradient(90deg, #00E37A 0%, #33FF9E 100%)"
                                  : behindPace
                                    ? "linear-gradient(90deg, #d97706 0%, #f59e0b 100%)"
                                    : "linear-gradient(90deg, #00E37A 0%, #06b6d4 100%)",
                              }}
                            />
                            {cockpit.percentualEsperadoHoje > 0 && cockpit.percentualEsperadoHoje < 100 && (
                              <div
                                className="absolute top-[-2px] bottom-[-2px] w-px bg-white/40"
                                style={{ left: `${cockpit.percentualEsperadoHoje}%` }}
                                aria-hidden
                              />
                            )}
                          </div>
                        </div>

                        {/* Valores à direita */}
                        <div className="text-right flex-shrink-0">
                          <div className={`text-lg font-semibold tabular-nums leading-none ${isWinner
                            ? "text-emerald-400"
                            : behindPace
                              ? "text-amber-300"
                              : "text-foreground"
                            }`}>
                            {vendedor.percentual.toFixed(0)}%
                          </div>
                          <div className="text-[11px] text-muted-foreground tabular-nums mt-1">
                            {formatCurrencyCompact(vendedor.valorRealizado)}{" "}
                            <span className="text-muted-foreground/40">/</span>{" "}
                            {formatCurrencyCompact(vendedor.valorMeta)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Metas;
