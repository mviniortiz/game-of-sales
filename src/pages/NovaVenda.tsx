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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  PlusCircle, 
  CalendarIcon, 
  User, 
  DollarSign, 
  Package, 
  CreditCard, 
  Store, 
  CheckCircle,
  Trophy,
  TrendingUp
} from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [dataVenda, setDataVenda] = useState<Date>(new Date());

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
      const { data, error} = await supabase
        .from("vendas")
        .insert([vendaData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("🎉 Venda registrada com sucesso!", {
        description: `Você ganhou ${Math.floor(parseFloat(valor) || 0)} pontos!`
      });
      
      // Reset form
      setClienteNome("");
      setProdutoId("");
      setValor("");
      setFormaPagamento("");
      setPlataforma("");
      setStatus("Aprovado");
      setVendedorId("");
      setObservacoes("");
      setDataVenda(new Date());
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar venda: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!produtoId) {
      toast.error("Selecione um produto");
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
      dataVenda: format(dataVenda, "yyyy-MM-dd")
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

  // Cálculo dinâmico de pontos
  const pontosPrevistos = Math.floor(parseFloat(valor) || 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
            Registrar Nova Venda
          </h1>
          <p className="text-muted-foreground">Preencha os dados da venda para ganhar pontos e subir no ranking</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Card de Pontuação Prevista - Fixo no Desktop */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <Card className="sticky top-6 border-2 border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Trophy className="h-5 w-5" />
                  Pontuação Prevista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-amber-600 dark:text-amber-400 mb-2 animate-pulse">
                    +{pontosPrevistos}
                  </div>
                  <div className="text-sm text-muted-foreground">pontos</div>
                </div>

                {pontosPrevistos > 0 && (
                  <div className="space-y-2 pt-4 border-t border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        R$ {parseFloat(valor || "0").toFixed(2)} em vendas
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Cada R$ 1,00 = 1 ponto
                    </p>
                  </div>
                )}

                {pontosPrevistos === 0 && (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">
                      Digite o valor da venda para ver os pontos 🎯
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulário - 2 Colunas */}
          <div className="lg:col-span-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Informações da Venda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Grid 2 Colunas - Desktop */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Coluna Esquerda - Dados do Cliente */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cliente" className="text-sm font-semibold">
                          Nome do Cliente
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="cliente"
                            type="text"
                            placeholder="Ex: João Silva"
                            value={clienteNome}
                            onChange={(e) => setClienteNome(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="plataforma" className="text-sm font-semibold">
                          Plataforma
                        </Label>
                        <div className="relative">
                          <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                          <Select value={plataforma} onValueChange={setPlataforma} required>
                            <SelectTrigger className="pl-10">
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
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pagamento" className="text-sm font-semibold">
                          Forma de Pagamento
                        </Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                          <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
                            <SelectTrigger className="pl-10">
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
                      </div>
                    </div>

                    {/* Coluna Direita - Dados da Venda */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="produto" className="text-sm font-semibold">
                          Produto
                        </Label>
                        <div className="relative">
                          <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                          <Select value={produtoId} onValueChange={setProdutoId} required>
                            <SelectTrigger className="pl-10">
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
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="valor" className="text-sm font-semibold">
                          Valor da Venda
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="valor"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="data" className="text-sm font-semibold">
                          Data da Venda
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dataVenda && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dataVenda ? format(dataVenda, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dataVenda}
                              onSelect={(date) => date && setDataVenda(date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-semibold">
                          Status
                        </Label>
                        <div className="relative">
                          <CheckCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                          <Select value={status} onValueChange={setStatus} required>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Aprovado">Aprovado</SelectItem>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                              <SelectItem value="Reembolsado">Reembolsado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campo Admin - Full Width */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="vendedor" className="text-sm font-semibold">
                        Vendedor
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                        <Select value={vendedorId} onValueChange={setVendedorId} required>
                          <SelectTrigger className="pl-10">
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
                    </div>
                  )}

                  {/* Observações - Full Width */}
                  <div className="space-y-2">
                    <Label htmlFor="observacoes" className="text-sm font-semibold">
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Adicione observações sobre esta venda..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Botão de Submit - Melhorado */}
                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={createVenda.isPending}
                  >
                    {createVenda.isPending ? (
                      <>Registrando venda...</>
                    ) : (
                      <>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Registrar Venda e Ganhar {pontosPrevistos} Pontos
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovaVenda;