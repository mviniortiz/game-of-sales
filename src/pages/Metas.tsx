import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MetaProgressCard } from "@/components/metas/MetaProgressCard";
import { MetasRanking } from "@/components/metas/MetasRanking";
import { MetaEvolutionChart } from "@/components/metas/MetaEvolutionChart";
import { Target } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui/skeleton-card";

const Metas = () => {
  const { user, isAdmin } = useAuth();
  const mesAtual = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  // Buscar progresso das metas
  const { data: metasProgresso, isLoading: loadingProgresso } = useQuery({
    queryKey: ["metas-progresso"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      const { data: metas, error: metasError } = await supabase
        .from("metas")
        .select("*, profiles!inner(id, nome)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (metasError) throw metasError;

      const progressoPromises = metas.map(async (meta) => {
        const { data: vendas } = await supabase
          .from("vendas")
          .select("valor")
          .eq("user_id", meta.user_id)
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes);

        const valorRealizado = vendas?.reduce((sum, v) => sum + Number(v.valor), 0) || 0;
        const valorMeta = Number(meta.valor_meta);
        const percentual = (valorRealizado / valorMeta) * 100;
        const faltaAtingir = Math.max(0, valorMeta - valorRealizado);
        
        const hoje = new Date();
        const ultimoDiaMes = endOfMonth(hoje);
        const diasRestantes = Math.ceil((ultimoDiaMes.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const mediaDiariaNecessaria = diasRestantes > 0 ? faltaAtingir / diasRestantes : 0;

        return {
          id: meta.user_id,
          nome: meta.profiles.nome,
          valorMeta,
          valorRealizado,
          percentual,
          faltaAtingir,
          diasRestantes,
          mediaDiariaNecessaria,
        };
      });

      const resultado = await Promise.all(progressoPromises);
      
      // Filtrar por usuário se não for admin
      if (!isAdmin && user) {
        return resultado.filter(m => m.id === user.id);
      }
      
      return resultado;
    },
  });

  // Buscar ranking
  const { data: ranking } = useQuery({
    queryKey: ["metas-ranking"],
    queryFn: async () => {
      if (!metasProgresso) return [];
      
      const rankingData = [...metasProgresso]
        .sort((a, b) => b.percentual - a.percentual)
        .map((meta, index) => ({
          posicao: index + 1,
          nome: meta.nome,
          valorMeta: meta.valorMeta,
          valorRealizado: meta.valorRealizado,
          percentual: meta.percentual,
        }));

      return rankingData;
    },
    enabled: !!metasProgresso,
  });

  // Buscar evolução (apenas para o usuário logado ou todos se admin)
  const { data: evolucao } = useQuery({
    queryKey: ["meta-evolucao", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const inicioMes = startOfMonth(new Date());
      const hoje = new Date();
      const dias = [];

      // Buscar meta do usuário
      const { data: meta } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("user_id", user.id)
        .gte("mes_referencia", inicioMes.toISOString().split('T')[0])
        .maybeSingle();

      if (!meta) return [];

      // Buscar vendas do mês
      const { data: vendas } = await supabase
        .from("vendas")
        .select("data_venda, valor")
        .eq("user_id", user.id)
        .eq("status", "Aprovado")
        .gte("data_venda", inicioMes.toISOString().split('T')[0])
        .lte("data_venda", hoje.toISOString().split('T')[0])
        .order("data_venda");

      // Agrupar vendas por dia e calcular acumulado
      const vendasPorDia: { [key: string]: number } = {};
      vendas?.forEach(venda => {
        const dia = new Date(venda.data_venda).getDate();
        vendasPorDia[dia] = (vendasPorDia[dia] || 0) + Number(venda.valor);
      });

      let acumulado = 0;
      for (let dia = 1; dia <= hoje.getDate(); dia++) {
        acumulado += vendasPorDia[dia] || 0;
        dias.push({
          dia,
          acumulado,
          meta: Number(meta.valor_meta),
        });
      }

      return dias;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold capitalize">🎯 Metas - {mesAtual}</h1>
          <p className="text-muted-foreground">Acompanhe o progresso das metas mensais</p>
        </div>
      </div>

      {loadingProgresso ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable />
          <SkeletonChart />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metasProgresso?.map((meta) => (
              <MetaProgressCard key={meta.id} {...meta} />
            ))}
          </div>

          {ranking && ranking.length > 0 && (
            <MetasRanking ranking={ranking} />
          )}

          {evolucao && evolucao.length > 0 && (
            <MetaEvolutionChart data={evolucao} />
          )}

          {(!metasProgresso || metasProgresso.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma meta definida para este mês</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Metas;
