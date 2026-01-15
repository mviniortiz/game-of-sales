import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
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
import { playSaleChime } from "@/utils/sounds";

const vendaSchema = z.object({
  clienteNome: z.string().trim().min(1, "Nome do cliente é obrigatório").max(200, "Nome muito longo"),
  valor: z.number().positive("Valor deve ser positivo").max(999999999, "Valor muito alto"),
  formaPagamento: z.string().min(1, "Forma de pagamento é obrigatória"),
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
  const { activeCompanyId } = useTenant();
  const queryClient = useQueryClient();
  const [clienteNome, setClienteNome] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("");
  const [valorFormatado, setValorFormatado] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [status, setStatus] = useState("Aprovado");
  const [vendedorId, setVendedorId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataVenda, setDataVenda] = useState<Date>(new Date());

  const { data: produtos } = useQuery({
    queryKey: ["produtos", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores", activeCompanyId],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, company_id")
        .eq("company_id", activeCompanyId)
        .order("nome");

      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!activeCompanyId,
  });

  // Formas de pagamento dinâmicas do banco de dados
  const { data: formasPagamento } = useQuery({
    queryKey: ["formas-pagamento", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("formas_pagamento")
        .select("id, nome")
        .eq("ativo", true)
        .eq("company_id", activeCompanyId)
        .order("nome");

      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
    enabled: !!activeCompanyId,
  });

  // Fallback para formas de pagamento padrão caso não haja cadastradas
  const formasPagamentoOptions = formasPagamento && formasPagamento.length > 0
    ? formasPagamento
    : [
      { id: "cartao", nome: "Cartão de Crédito" },
      { id: "pix", nome: "PIX" },
      { id: "boleto", nome: "Boleto" },
    ];

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
      // Invalidate all relevant queries to update dashboards
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-evolution"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-por-produto"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-por-plataforma"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-top-vendedores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vendas-evolution"] });
      queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
      queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
      queryClient.invalidateQueries({ queryKey: ["seller-ranking"] });

      playSaleChime();
      toast.success("🎉 Venda registrada com sucesso!", {
        description: `Você ganhou ${Math.floor(parseFloat(valor) || 0)} pontos!`
      });

      // Reset form
      setClienteNome("");
      setProdutoId("");
      setValor("");
      setValorFormatado("");
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
      company_id: activeCompanyId,
    });
  };

  // Função para formatar valor como moeda
  const formatarMoeda = (value: string) => {
    // Remove tudo que não é número
    const numero = value.replace(/\D/g, "");

    if (!numero) {
      setValor("");
      setValorFormatado("");
      return;
    }

    // Converte para número com centavos
    const valorNumerico = parseFloat(numero) / 100;
    setValor(valorNumerico.toString());

    // Formata como moeda brasileira
    const valorFormatadoBR = valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setValorFormatado(valorFormatadoBR);
  };

  // Cálculo dinâmico de pontos
  const pontosPrevistos = Math.floor(parseFloat(valor) || 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
            Registrar Nova Venda
          </h1>
          <p className="text-muted-foreground">Preencha os dados da venda para ganhar pontos e subir no ranking</p>
        </div>

        <Card className="border border-border bg-card shadow-sm">
          {/* Header com Título e Card de Pontuação */}
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <PlusCircle className="h-5 w-5 text-muted-foreground" />
              Informações da Venda
            </CardTitle>

            {/* Card de Pontuação - Compacto */}
            <div className="rounded-lg p-4 min-w-[280px] border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-md shadow-lg shadow-yellow-500/10">
              <div className="flex items-center gap-3">
                {/* Troféu com Glow */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-yellow-400/25 rounded-full blur-xl"></div>
                  <Trophy className="relative h-12 w-12 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                </div>

                {/* Pontuação */}
                <div className="flex-1">
                  <div className="text-xs text-gray-300 uppercase tracking-wide mb-1">
                    Pontuação Prevista
                  </div>
                  <div className="text-3xl font-bold text-yellow-400 animate-pulse">
                    +{pontosPrevistos}
                  </div>
                  <div className="text-xs text-gray-400">pontos</div>
                </div>
              </div>

              {pontosPrevistos > 0 ? (
                <div className="mt-3 pt-3 border-t border-yellow-500/20">
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <TrendingUp className="h-3 w-3 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">
                      R$ {parseFloat(valor || "0").toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-center text-yellow-300 font-medium">
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
                      className="h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plataforma" className="text-sm font-semibold flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      Plataforma
                    </Label>
                    <Select value={plataforma} onValueChange={setPlataforma} required>
                      <SelectTrigger className="h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500">
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
                      <SelectTrigger className="h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamentoOptions.map((forma) => (
                          <SelectItem key={forma.id} value={forma.nome}>
                            {forma.nome}
                          </SelectItem>
                        ))}
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
                      <SelectTrigger className="h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500">
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
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={valorFormatado}
                      onChange={(e) => formatarMoeda(e.target.value)}
                      className="h-11 text-base font-medium bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
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
                            "w-full justify-start text-left font-normal h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white hover:bg-muted dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500",
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
                    <SelectTrigger className="h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500">
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
                      <SelectTrigger className="h-11 bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500">
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
                  className="resize-none bg-white dark:bg-slate-900/60 border border-gray-300 dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
              </div>

              {/* Resumo da Venda */}
              {(clienteNome || produtoId || valor || plataforma || formaPagamento) && (
                <div className="mt-8 p-6 border border-border rounded-lg bg-card shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-5 w-5" />
                    Resumo da Venda
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    {clienteNome && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cliente</p>
                          <p className="font-medium text-sm truncate text-foreground">{clienteNome}</p>
                        </div>
                      </div>
                    )}

                    {produtoId && produtos && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <Package className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                          <p className="font-medium text-sm truncate text-foreground">
                            {produtos.find(p => p.id === produtoId)?.nome}
                          </p>
                        </div>
                      </div>
                    )}

                    {valor && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <DollarSign className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Valor</p>
                          <p className="font-bold text-base text-primary">{valorFormatado || "R$ 0,00"}</p>
                        </div>
                      </div>
                    )}

                    {plataforma && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <Store className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plataforma</p>
                          <p className="font-medium text-sm text-foreground">{plataforma}</p>
                        </div>
                      </div>
                    )}

                    {formaPagamento && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pagamento</p>
                          <p className="font-medium text-sm text-foreground">{formaPagamento}</p>
                        </div>
                      </div>
                    )}

                    {status && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                          <p className="font-medium text-sm text-foreground">{status}</p>
                        </div>
                      </div>
                    )}

                    {dataVenda && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <CalendarIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Data</p>
                          <p className="font-medium text-sm text-foreground">{format(dataVenda, "PPP", { locale: ptBR })}</p>
                        </div>
                      </div>
                    )}

                    {isAdmin && vendedorId && vendedores && (
                      <div className="flex items-start gap-3 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                        <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vendedor</p>
                          <p className="font-medium text-sm truncate text-foreground">
                            {vendedores.find(v => v.id === vendedorId)?.nome}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {observacoes && (
                    <div className="mt-4 p-3 bg-muted/60 dark:bg-slate-900/40 rounded-md border border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Observações</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{observacoes}</p>
                    </div>
                  )}

                  {pontosPrevistos > 0 && (
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Você ganhará
                        </span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          +{pontosPrevistos}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                          pontos
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Submit - Melhorado */}
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.98]"
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