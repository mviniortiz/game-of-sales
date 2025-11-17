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
import { z } from "zod";

const vendaSchema = z.object({
  clienteNome: z.string().trim().min(1, "Nome do cliente é obrigatório").max(200, "Nome muito longo"),
  valor: z.number().positive("Valor deve ser positivo").max(999999999, "Valor muito alto"),
  formaPagamento: z.enum(['Cartão de Crédito', 'PIX', 'Recorrência', 'Boleto', 'Parte PIX Parte Cartão', 'Múltiplos Cartões'], {
    errorMap: () => ({ message: "Forma de pagamento inválida" })
  }),
  plataforma: z.enum(['Celetus', 'Cakto', 'Greenn', 'Pix/Boleto'], {
    errorMap: () => ({ message: "Plataforma inválida" })
  }),
  status: z.enum(['Aprovado', 'Pendente', 'Reembolsado'], {
    errorMap: () => ({ message: "Status inválido" })
  }),
  observacoes: z.string().max(1000, "Observações muito longas").optional(),
  dataVenda: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
});

const NovaVenda = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [clienteNome, setClienteNome] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [status, setStatus] = useState("Aprovado");
  const [vendedorId, setVendedorId] = useState("");
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

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
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
      setPlataforma("");
      setStatus("Aprovado");
      setVendedorId("");
      setObservacoes("");
      setDataVenda(new Date().toISOString().split("T")[0]);
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar venda: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteNome || !produtoId || !valor || !formaPagamento || !plataforma || !status) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isAdmin && !vendedorId) {
      toast.error("Selecione o vendedor");
      return;
    }

    // Validate inputs
    const validationResult = vendaSchema.safeParse({
      clienteNome,
      valor: parseFloat(valor),
      formaPagamento,
      plataforma,
      status,
      observacoes,
      dataVenda
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    const produto = produtos?.find(p => p.id === produtoId);
    if (!produto) {
      toast.error("Produto não encontrado");
      return;
    }
    
    createVenda.mutate({
      user_id: isAdmin ? vendedorId : user?.id,
      cliente_nome: validationResult.data.clienteNome,
      produto_id: produtoId,
      produto_nome: produto.nome,
      valor: validationResult.data.valor,
      forma_pagamento: validationResult.data.formaPagamento as any,
      plataforma: validationResult.data.plataforma,
      status: validationResult.data.status as any,
      data_venda: validationResult.data.dataVenda,
      observacoes: validationResult.data.observacoes || null,
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
                      {produto.nome}
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
              <Label htmlFor="plataforma">Plataforma</Label>
              <Select value={plataforma} onValueChange={setPlataforma} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Celetus">Celetus</SelectItem>
                  <SelectItem value="Cakto">Cakto</SelectItem>
                  <SelectItem value="Greenn">Greenn</SelectItem>
                  <SelectItem value="Pix/Boleto">Pix/Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pagamento">Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Recorrência">Recorrência</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Parte PIX Parte Cartão">Parte PIX Parte Cartão</SelectItem>
                  <SelectItem value="Múltiplos Cartões">Múltiplos Cartões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Reembolsado">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="vendedor">Vendedor</Label>
                <Select value={vendedorId} onValueChange={setVendedorId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
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
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione observações sobre esta venda (opcional)"
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
