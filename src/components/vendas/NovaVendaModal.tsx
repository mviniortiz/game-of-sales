import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    CalendarIcon,
    User,
    DollarSign,
    Package,
    CreditCard,
    Store,
    CheckCircle,
    Trophy,
    Loader2
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

interface NovaVendaModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    prefillData?: {
        clienteNome?: string;
        valor?: number;
    };
}

export const NovaVendaModal = ({ open, onClose, onSuccess, prefillData }: NovaVendaModalProps) => {
    const { user, isAdmin, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const queryClient = useQueryClient();

    const [clienteNome, setClienteNome] = useState(prefillData?.clienteNome || "");
    const [produtoId, setProdutoId] = useState("");
    const [valor, setValor] = useState(prefillData?.valor?.toString() || "");
    const [valorFormatado, setValorFormatado] = useState("");
    const [formaPagamento, setFormaPagamento] = useState("");
    const [plataforma, setPlataforma] = useState("");
    const [status, setStatus] = useState("Aprovado");
    const [vendedorId, setVendedorId] = useState("");
    const [observacoes, setObservacoes] = useState("");
    const [dataVenda, setDataVenda] = useState<Date>(new Date());

    const effectiveCompanyId = activeCompanyId || companyId;

    const { data: produtos } = useQuery({
        queryKey: ["produtos", effectiveCompanyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("produtos")
                .select("*")
                .eq("ativo", true)
                .eq("company_id", effectiveCompanyId);

            if (error) throw error;
            return data;
        },
        enabled: !!effectiveCompanyId && open,
    });

    const { data: vendedores } = useQuery({
        queryKey: ["vendedores", effectiveCompanyId],
        queryFn: async () => {
            if (!isAdmin) return [];

            const { data, error } = await supabase
                .from("profiles")
                .select("id, nome, email, company_id")
                .eq("company_id", effectiveCompanyId)
                .order("nome");

            if (error) throw error;
            return data;
        },
        enabled: isAdmin && !!effectiveCompanyId && open,
    });

    // Formas de pagamento dinâmicas do banco de dados
    const { data: formasPagamento } = useQuery({
        queryKey: ["formas-pagamento", effectiveCompanyId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("formas_pagamento")
                .select("id, nome")
                .eq("ativo", true)
                .eq("company_id", effectiveCompanyId)
                .order("nome");

            if (error) throw error;
            return data as { id: string; nome: string }[];
        },
        enabled: !!effectiveCompanyId && open,
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
            // Invalidate all relevant queries
            queryClient.invalidateQueries({ queryKey: ["vendas"] });
            queryClient.invalidateQueries({ queryKey: ["vendas-evolution"] });
            queryClient.invalidateQueries({ queryKey: ["vendas-por-produto"] });
            queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
            queryClient.invalidateQueries({ queryKey: ["seller-ranking"] });

            playSaleChime();
            toast.success("🎉 Venda registrada com sucesso!", {
                description: `Você ganhou ${Math.floor(parseFloat(valor) || 0)} pontos!`
            });

            resetForm();
            onSuccess?.();
            onClose();
        },
        onError: (error: any) => {
            toast.error(`Erro ao registrar venda: ${error.message}`);
        },
    });

    const resetForm = () => {
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
    };

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
            company_id: effectiveCompanyId,
        });
    };

    const formatarMoeda = (value: string) => {
        const numero = value.replace(/\D/g, "");

        if (!numero) {
            setValor("");
            setValorFormatado("");
            return;
        }

        const valorNumerico = parseFloat(numero) / 100;
        setValor(valorNumerico.toString());

        const valorFormatadoBR = valorNumerico.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        setValorFormatado(valorFormatadoBR);
    };

    const pontosPrevistos = Math.floor(parseFloat(valor) || 0);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border border-border p-4 sm:p-6">
                <DialogHeader className="pb-4 border-b border-border">
                    <DialogTitle className="flex items-center gap-3 text-foreground">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
                            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-200" />
                        </div>
                        <div>
                            <span className="text-lg font-semibold">Registrar Venda</span>
                            <p className="text-[12px] text-muted-foreground font-normal mt-0.5">Preencha os dados da venda</p>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Formulário para registrar uma nova venda
                    </DialogDescription>

                    {/* Points Preview */}
                    {pontosPrevistos > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                            <Trophy className="h-6 w-6 text-amber-500" />
                            <div>
                                <span className="text-sm text-muted-foreground">Pontuação: </span>
                                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">+{pontosPrevistos}</span>
                            </div>
                        </div>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Row 1: Cliente + Produto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <User className="h-3 w-3" /> Cliente
                            </Label>
                            <Input
                                value={clienteNome}
                                onChange={(e) => setClienteNome(e.target.value)}
                                placeholder="Nome do cliente"
                                className="h-9"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Package className="h-3 w-3" /> Produto
                            </Label>
                            <Select value={produtoId} onValueChange={setProdutoId} required>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione" />
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

                    {/* Row 2: Valor + Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> Valor
                            </Label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="R$ 0,00"
                                value={valorFormatado}
                                onChange={(e) => formatarMoeda(e.target.value)}
                                className="h-9 font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" /> Data
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-9",
                                            !dataVenda && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {dataVenda ? format(dataVenda, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dataVenda}
                                        onSelect={(date) => date && setDataVenda(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Row 3: Plataforma + Pagamento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Store className="h-3 w-3" /> Plataforma
                            </Label>
                            <Select value={plataforma} onValueChange={setPlataforma} required>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione" />
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
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <CreditCard className="h-3 w-3" /> Pagamento
                            </Label>
                            <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione" />
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

                    {/* Row 4: Status + Vendedor (admin) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Status
                            </Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
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
                                <Label className="text-xs font-medium flex items-center gap-1">
                                    <User className="h-3 w-3" /> Vendedor
                                </Label>
                                <Select value={vendedorId} onValueChange={setVendedorId} required>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendedores?.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Observações (opcional)</Label>
                        <Textarea
                            placeholder="Adicione observações..."
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={createVenda.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                            {createVenda.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Registrando...
                                </>
                            ) : pontosPrevistos > 0 ? (
                                `Registrar (+${pontosPrevistos} pts)`
                            ) : (
                                "Registrar Venda"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
