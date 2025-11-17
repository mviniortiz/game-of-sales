import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

const NovaVenda = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clienteNome, setClienteNome] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);

  const { data: produtos } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true);
      
      if (error) throw error;
      return data;
    },
  });

  const createVenda = useMutation({
    mutationFn: async (vendaData: any) => {
      const { data, error } = await supabase
        .from("vendas")
        .insert([vendaData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Venda registrada com sucesso!");
      
      // Reset form
      setClienteNome("");
      setProdutoId("");
      setValor("");
      setFormaPagamento("");
      setObservacoes("");
      setDataVenda(new Date().toISOString().split("T")[0]);
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar venda: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteNome || !produtoId || !valor || !formaPagamento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const produto = produtos?.find(p => p.id === produtoId);
    
    createVenda.mutate({
      user_id: user?.id,
      cliente_nome: clienteNome,
      produto_id: produtoId,
      produto_nome: produto?.nome,
      valor: parseFloat(valor),
      forma_pagamento: formaPagamento,
      data_venda: dataVenda,
      observacoes: observacoes || null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Registrar Nova Venda</h1>
        <p className="text-muted-foreground">Preencha os dados da venda para ganhar pontos</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Informações da Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data da Venda</Label>
              <Input
                id="data"
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Nome do Cliente</Label>
              <Input
                id="cliente"
                type="text"
                placeholder="Ex: João Silva"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produto">Produto</Label>
              <Select value={produtoId} onValueChange={setProdutoId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos?.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome} - R$ {Number(produto.preco_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor da Venda (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pagamento">Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione informações adicionais sobre a venda"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              disabled={createVenda.isPending}
            >
              {createVenda.isPending ? "Registrando..." : "Registrar Venda"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">💡 Dica</h3>
          <p className="text-sm text-muted-foreground">
            Cada R$ 1,00 em vendas = 1 ponto. Continue vendendo para subir de nível e desbloquear conquistas!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovaVenda;
