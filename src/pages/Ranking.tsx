import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Ranking = () => {
  const { data: rankings } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("pontos", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

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

  const getPodiumIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (position === 2) return <Medal className="h-8 w-8 text-gray-400" />;
    if (position === 3) return <Award className="h-8 w-8 text-amber-700" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ranking de Vendedores</h1>
        <p className="text-muted-foreground">Veja quem está liderando a competição este mês</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {rankings?.slice(0, 3).map((vendedor, index) => (
          <Card 
            key={vendedor.id}
            className={`border-border/50 ${index === 0 ? 'lg:col-span-3 lg:order-first' : ''}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getPodiumIcon(index + 1)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold">#{index + 1}</span>
                    <Badge className={`${getNivelColor(vendedor.nivel)} text-white`}>
                      {vendedor.nivel}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold">{vendedor.nome}</h3>
                  <p className="text-muted-foreground">{vendedor.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{vendedor.pontos}</p>
                  <p className="text-sm text-muted-foreground">pontos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Classificação Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankings?.map((vendedor, index) => (
              <div 
                key={vendedor.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground w-8">
                    #{index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{vendedor.nome}</p>
                      <Badge className={`${getNivelColor(vendedor.nivel)} text-white text-xs`}>
                        {vendedor.nivel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{vendedor.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{vendedor.pontos}</p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ranking;
