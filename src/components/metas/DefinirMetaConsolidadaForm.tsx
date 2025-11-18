import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target } from "lucide-react";

interface DefinirMetaConsolidadaFormProps {
  onSuccess: () => void;
}

export const DefinirMetaConsolidadaForm = ({ onSuccess }: DefinirMetaConsolidadaFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mes_referencia: "",
    valor_meta: "",
    descricao: "",
    produto_alvo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Converter mes_referencia (YYYY-MM) para primeira data do mês
      const [ano, mes] = formData.mes_referencia.split("-");
      const dataReferencia = `${ano}-${mes}-01`;

      const { error } = await supabase.from("metas_consolidadas").insert({
        mes_referencia: dataReferencia,
        valor_meta: parseFloat(formData.valor_meta),
        descricao: formData.descricao || null,
        produto_alvo: formData.produto_alvo || null,
      });

      if (error) throw error;

      toast.success("Meta consolidada definida com sucesso!");
      setFormData({
        mes_referencia: "",
        valor_meta: "",
        descricao: "",
        produto_alvo: "",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao definir meta:", error);
      if (error.code === "23505") {
        toast.error("Já existe uma meta definida para este mês");
      } else {
        toast.error("Erro ao definir meta consolidada");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Definir Meta Consolidada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mes_referencia">Mês/Ano *</Label>
            <Input
              id="mes_referencia"
              type="month"
              required
              value={formData.mes_referencia}
              onChange={(e) =>
                setFormData({ ...formData, mes_referencia: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_meta">Valor da Meta Total (R$) *</Label>
            <Input
              id="valor_meta"
              type="number"
              step="0.01"
              required
              value={formData.valor_meta}
              onChange={(e) =>
                setFormData({ ...formData, valor_meta: e.target.value })
              }
              placeholder="200000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Ex: Meta Black Friday"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="produto_alvo">Produto Alvo (opcional)</Label>
            <Input
              id="produto_alvo"
              value={formData.produto_alvo}
              onChange={(e) =>
                setFormData({ ...formData, produto_alvo: e.target.value })
              }
              placeholder="Deixe vazio para todos os produtos"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Definindo..." : "Definir Meta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
