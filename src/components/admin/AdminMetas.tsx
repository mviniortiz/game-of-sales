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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Target, TrendingUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

export const AdminMetas = () => {
  const queryClient = useQueryClient();
  
  // Estados para Meta Individual
  const [userId, setUserId] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [valorMeta, setValorMeta] = useState("");

  // Estados para Meta Consolidada
  const [mesReferenciaConsolidada, setMesReferenciaConsolidada] = useState("");
  const [valorMetaConsolidada, setValorMetaConsolidada] = useState("");
  const [descricaoConsolidada, setDescricaoConsolidada] = useState("");
  const [produtoAlvo, setProdutoAlvo] = useState("");

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

  const createMeta = useMutation({
    mutationFn: async () => {
      const [year, month] = mesReferencia.split("-");
      const dataReferencia = `${year}-${month}-01`;

      const { error } = await supabase.from("metas").insert({
        user_id: userId,
        mes_referencia: dataReferencia,
        valor_meta: parseFloat(valorMeta),
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a metas
      queryClient.invalidateQueries({ queryKey: ["admin-metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      toast.success("Meta individual definida com sucesso!");
      setUserId("");
      setMesReferencia("");
      setValorMeta("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir meta: ${error.message}`);
    },
  });

  const createMetaConsolidada = useMutation({
    mutationFn: async () => {
      const [year, month] = mesReferenciaConsolidada.split("-");
      const dataReferencia = `${year}-${month}-01`;

      const { error } = await supabase.from("metas_consolidadas").insert({
        mes_referencia: dataReferencia,
        valor_meta: parseFloat(valorMetaConsolidada),
        descricao: descricaoConsolidada || null,
        produto_alvo: produtoAlvo || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a metas consolidadas
      queryClient.invalidateQueries({ queryKey: ["admin-metas-consolidadas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      toast.success("Meta consolidada definida com sucesso!");
      setMesReferenciaConsolidada("");
      setValorMetaConsolidada("");
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
      // Invalidar todas as queries relacionadas a metas
      queryClient.invalidateQueries({ queryKey: ["admin-metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      toast.success("Meta removida com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover meta: ${error.message}`);
    },
  });

  const deleteMetaConsolidada = useMutation({
    mutationFn: async (metaId: string) => {
      const { error } = await supabase
        .from("metas_consolidadas")
        .delete()
        .eq("id", metaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a metas consolidadas
      queryClient.invalidateQueries({ queryKey: ["admin-metas-consolidadas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["metas-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-progresso-metas"] });
      toast.success("Meta consolidada removida com sucesso!");
    },
    onError: (error: any) => {
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

  return (
    <Tabs defaultValue="individual" className="w-full">
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
        <TabsTrigger value="individual" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Metas Individuais
        </TabsTrigger>
        <TabsTrigger value="consolidada" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Meta Consolidada
        </TabsTrigger>
      </TabsList>

      <TabsContent value="individual" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Definir Meta Individual</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitMetaIndividual} className="space-y-4">
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
              </div>

              <Button type="submit" disabled={createMeta.isPending}>
                {createMeta.isPending ? "Definindo..." : "Definir Meta Individual"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas Individuais Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Valor da Meta</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metas?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma meta individual definida
                      </TableCell>
                    </TableRow>
                  ) : (
                    metas?.map((meta) => (
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
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover esta meta de {meta.profiles?.nome}? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMeta.mutate(meta.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="consolidada" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Definir Meta Consolidada</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitMetaConsolidada} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês/Ano *</Label>
                  <Input
                    type="month"
                    value={mesReferenciaConsolidada}
                    onChange={(e) => setMesReferenciaConsolidada(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor da Meta Consolidada (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorMetaConsolidada}
                    onChange={(e) => setValorMetaConsolidada(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <Textarea
                  value={descricaoConsolidada}
                  onChange={(e) => setDescricaoConsolidada(e.target.value)}
                  placeholder="Ex: Meta do trimestre Q4..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Produto Alvo (Opcional)</Label>
                <Input
                  value={produtoAlvo}
                  onChange={(e) => setProdutoAlvo(e.target.value)}
                  placeholder="Ex: Plano Premium, Produto X..."
                />
              </div>

              <Button type="submit" disabled={createMetaConsolidada.isPending}>
                {createMetaConsolidada.isPending ? "Definindo..." : "Definir Meta Consolidada"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas Consolidadas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Valor da Meta</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Produto Alvo</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metasConsolidadas?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma meta consolidada definida
                      </TableCell>
                    </TableRow>
                  ) : (
                    metasConsolidadas?.map((meta) => (
                      <TableRow key={meta.id}>
                        <TableCell>
                          {new Date(meta.mes_referencia).toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          R$ {Number(meta.valor_meta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{meta.descricao || "—"}</TableCell>
                        <TableCell>{meta.produto_alvo || "—"}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover esta meta consolidada? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMetaConsolidada.mutate(meta.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
