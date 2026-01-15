import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

export const DefinirMetaForm = () => {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useTenant();
  const [userId, setUserId] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [valorMeta, setValorMeta] = useState("");

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-metas", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("company_id", activeCompanyId)
        .order("nome");

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const definirMetaMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !mesReferencia || !valorMeta) {
        throw new Error("Preencha todos os campos");
      }

      const valor = parseFloat(valorMeta);
      if (valor <= 0) {
        throw new Error("O valor da meta deve ser maior que zero");
      }

      // Converter mes-referencia para primeiro dia do mês
      const [year, month] = mesReferencia.split("-");
      const dataReferencia = `${year}-${month}-01`;

      const { error } = await supabase
        .from("metas")
        .upsert({
          user_id: userId,
          mes_referencia: dataReferencia,
          valor_meta: valor,
        }, {
          onConflict: "user_id,mes_referencia"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      toast.success("Meta definida com sucesso!");
      setUserId("");
      setMesReferencia("");
      setValorMeta("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao definir meta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    definirMetaMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Definir Meta (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores?.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês/Ano</Label>
              <Input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                placeholder="Selecione o mês"
                className="bg-background"
                lang="pt-BR"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: Novembro 2025
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor da Meta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorMeta}
                onChange={(e) => setValorMeta(e.target.value)}
                placeholder="50000.00"
              />
            </div>
          </div>

          <Button type="submit" disabled={definirMetaMutation.isPending}>
            {definirMetaMutation.isPending ? "Salvando..." : "Definir Meta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
