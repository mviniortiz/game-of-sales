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
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
            Registrar Nova Venda
          </h1>
          <p className="text-muted-foreground">Preencha os dados da venda para ganhar pontos e subir no ranking</p>
        </div>

        <Card className="border-border/50">
          {/* Header com Título e Card de Pontuação */}
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Informações da Venda
            </CardTitle>
            
            {/* Card de Pontuação - Compacto */}
            <div className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-4 shadow-md min-w-[280px]">
              <div className="flex items-center gap-3">
                {/* Troféu com Glow */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl"></div>
                  <Trophy className="relative h-12 w-12 text-amber-500 dark:text-amber-400" />
                </div>
                
                {/* Pontuação */}
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Pontuação Prevista
                  </div>
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                    +{pontosPrevistos}
                  </div>
                  <div className="text-xs text-muted-foreground">pontos</div>
                </div>
              </div>
              
              {pontosPrevistos > 0 ? (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      R$ {parseFloat(valor || "0").toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-center text-amber-700 dark:text-amber-400 font-medium">
                  💰 Digite o valor para simular
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grid 2 Colunas - Desktop */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Coluna Esquerda - Dados do Cliente */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente" className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Nome do Cliente
                    </Label>
                    <Input
                      id="cliente"
                      type="text"
                      placeholder="Ex: João Silva"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plataforma" className="text-sm font-semibold flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      Plataforma
                    </Label>
                    <Select value={plataforma} onValueChange={setPlataforma} required>
                      <SelectTrigger className="h-11">
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
                    <Label htmlFor="pagamento" className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Forma de Pagamento
                    </Label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
                      <SelectTrigger className="h-11">
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

                {/* Coluna Direita - Dados da Venda */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="produto" className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Produto
                    </Label>
                    <Select value={produtoId} onValueChange={setProdutoId} required>
                      <SelectTrigger className="h-11">
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
                    <Label htmlFor="valor" className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Valor da Venda
                    </Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data" className="text-sm font-semibold flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      Data da Venda
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11",
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
                </div>
              </div>

              {/* Segunda linha - Status */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    Status
                  </Label>
                  <Select value={status} onValueChange={setStatus} required>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aprovado">Aprovado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Reembolsado">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo Admin ao lado do Status */}
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="vendedor" className="text-sm font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Vendedor
                    </Label>
                    <Select value={vendedorId} onValueChange={setVendedorId} required>
                      <SelectTrigger className="h-11">
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
              </div>

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
                ) : pontosPrevistos > 0 ? (
                  <>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Registrar Venda (+{pontosPrevistos} Pontos)
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Registrar Venda
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovaVenda;