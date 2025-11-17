import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AdminMetas = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [valorMeta, setValorMeta] = useState("");

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: metas } = useQuery({
    queryKey: ["admin-metas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas")
        .select("*, profiles:user_id(nome)")
        .order("mes_referencia", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createMeta = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("metas").insert({
        user_id: userId,
        mes_referencia: mesReferencia,
        valor_meta: parseFloat(valorMeta),
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-metas"] });
      toast.success("Meta definida com sucesso!");
      setUserId("");
      setMesReferencia("");
      setValorMeta("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir meta: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !mesReferencia || !valorMeta) {
      toast.error("Preencha todos os campos");
      return;
    }
    createMeta.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Definir Nova Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores?.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome} ({vendedor.email})
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
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Valor da Meta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorMeta}
                onChange={(e) => setValorMeta(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <Button type="submit" disabled={createMeta.isPending}>
              {createMeta.isPending ? "Definindo..." : "Definir Meta"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead>Valor da Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas?.map((meta) => (
                  <TableRow key={meta.id}>
                    <TableCell>{meta.profiles?.nome}</TableCell>
                    <TableCell>
                      {new Date(meta.mes_referencia).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      R$ {Number(meta.valor_meta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
