import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MetaConsolidadaCard } from "@/components/metas/MetaConsolidadaCard";
import { RankingPodium } from "@/components/metas/RankingPodium";
import { DefinirMetaConsolidadaForm } from "@/components/metas/DefinirMetaConsolidadaForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target } from "lucide-react";

const MetasConsolidadas = () => {
  const { isAdmin } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Buscar meta consolidada do mês atual
  const { data: metaAtual } = useQuery({
    queryKey: ["meta-consolidada-atual", refreshKey],
    queryFn: async () => {
      const hoje = new Date();
      const mesReferencia = `${hoje.getFullYear()}-${String(
        hoje.getMonth() + 1
      ).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("metas_consolidadas")
        .select("*")
        .eq("mes_referencia", mesReferencia)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Buscar contribuições dos vendedores
  const { data: contribuicoes = [] } = useQuery({
    queryKey: ["contribuicao-vendedores", refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribuicao_vendedores")
        .select("*")
        .order("contribuicao", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!metaAtual,
  });

  const valorAtingido = contribuicoes.reduce(
    (acc, v) => acc + Number(v.contribuicao),
    0
  );

  const calcularDiasRestantes = () => {
    const hoje = new Date();
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const diffTime = ultimoDiaMes.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const diasRestantes = calcularDiasRestantes();

  if (!metaAtual && !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Nenhuma Meta Definida
          </h2>
          <p className="text-muted-foreground">
            Aguarde o administrador definir a meta consolidada do mês.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Metas Consolidadas
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso da equipe
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="ranking" className="w-full">
          <TabsList>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="definir">Definir Meta</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="space-y-6">
            {metaAtual ? (
              <>
                <MetaConsolidadaCard
                  metaTotal={Number(metaAtual.valor_meta)}
                  valorAtingido={valorAtingido}
                  diasRestantes={diasRestantes}
                  descricao={metaAtual.descricao || undefined}
                />

                <RankingPodium vendedores={contribuicoes} />
              </>
            ) : (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Nenhuma Meta Definida
                </h2>
                <p className="text-muted-foreground">
                  Defina uma meta consolidada na aba "Definir Meta".
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="definir">
            <DefinirMetaConsolidadaForm
              onSuccess={() => setRefreshKey((k) => k + 1)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {metaAtual && (
            <>
              <MetaConsolidadaCard
                metaTotal={Number(metaAtual.valor_meta)}
                valorAtingido={valorAtingido}
                diasRestantes={diasRestantes}
                descricao={metaAtual.descricao || undefined}
              />

              <RankingPodium vendedores={contribuicoes} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MetasConsolidadas;
