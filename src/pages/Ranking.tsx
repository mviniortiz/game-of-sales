import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaConsolidadaCard } from "@/components/metas/MetaConsolidadaCard";
import { RankingPodium } from "@/components/metas/RankingPodium";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

const Ranking = () => {
  const { isAdmin } = useAuth();

  // Buscar meta consolidada do mês atual
  const { data: metaAtual } = useQuery({
    queryKey: ["meta-consolidada-atual"],
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
    queryKey: ["contribuicao-vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribuicao_vendedores")
        .select("*")
        .order("contribuicao", { ascending: false });

      if (error) throw error;
      return data || [];
    },
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

  const getNivelColor = (nivel: string) => {
    const colors: Record<string, string> = {
      "Bronze": "bg-amber-700",
      "Prata": "bg-gray-400",
      "Ouro": "bg-yellow-500",
      "Platina": "bg-blue-400",
      "Diamante": "bg-cyan-400"
    };
    return colors[nivel] || "bg-gray-500";
  };

  // Vendedores a partir do 4º lugar
  const restanteVendedores = contribuicoes.slice(3);

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
            Ranking de Vendedores
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso da equipe e veja quem está liderando
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {metaAtual ? (
          <>
            <MetaConsolidadaCard
              metaTotal={Number(metaAtual.valor_meta)}
              valorAtingido={valorAtingido}
              diasRestantes={diasRestantes}
              descricao={metaAtual.descricao || undefined}
            />

            <RankingPodium vendedores={contribuicoes} />

            {restanteVendedores.length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Classificação Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {restanteVendedores.map((vendedor, index) => (
                      <div 
                        key={vendedor.user_id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-muted-foreground w-8">
                            #{index + 4}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{vendedor.nome}</p>
                              <Badge className={`${getNivelColor(vendedor.nivel || 'Bronze')} text-white text-xs`}>
                                {vendedor.nivel || 'Bronze'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              R$ {Number(vendedor.contribuicao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {Number(vendedor.percentual_contribuicao || 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">da meta</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Nenhuma Meta Definida
            </h2>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Defina uma meta consolidada na página de Metas para começar a acompanhar o progresso da equipe."
                : "Aguarde o administrador definir a meta consolidada do mês."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ranking;
