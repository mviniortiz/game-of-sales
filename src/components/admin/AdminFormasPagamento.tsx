import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CreditCard, Loader2, Pencil, Trash2, Shield } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FormaPagamento {
    id: string;
    nome: string;
    descricao?: string;
    ativo: boolean;
    company_id: string;
    isPadrao?: boolean; // Flag para identificar formas padrão
}

// Formas de pagamento padrão do sistema
const FORMAS_PADRAO: Omit<FormaPagamento, 'company_id'>[] = [
    { id: "padrao-cartao", nome: "Cartão de Crédito", descricao: "Pagamento via cartão de crédito", ativo: true, isPadrao: true },
    { id: "padrao-pix", nome: "PIX", descricao: "Pagamento instantâneo via PIX", ativo: true, isPadrao: true },
    { id: "padrao-boleto", nome: "Boleto", descricao: "Pagamento via boleto bancário", ativo: true, isPadrao: true },
];

export const AdminFormasPagamento = () => {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FormaPagamento | null>(null);
    const [nome, setNome] = useState("");
    const [descricao, setDescricao] = useState("");
    const [ativo, setAtivo] = useState(true);

    // Fetch payment methods
    const { data: formasPagamentoDB = [], isLoading } = useQuery({
        queryKey: ["admin-formas-pagamento", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            // Note: Using 'as any' because formas_pagamento table types may not be regenerated yet
            const { data, error } = await (supabase as any)
                .from("formas_pagamento")
                .select("*")
                .eq("company_id", companyId)
                .order("nome");
            if (error) throw error;
            return (data as FormaPagamento[]).map(f => ({ ...f, isPadrao: false }));
        },
        enabled: !!companyId,
    });

    // Combina formas padrão + formas personalizadas
    // As formas padrão aparecem primeiro, depois as personalizadas
    const todasFormas = [
        ...FORMAS_PADRAO.map(f => ({ ...f, company_id: companyId || "" })),
        ...formasPagamentoDB
    ];

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error("Company ID not found");
            const { error } = await (supabase as any).from("formas_pagamento").insert({
                nome,
                descricao: descricao || null,
                ativo,
                company_id: companyId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Forma de pagamento criada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["admin-formas-pagamento"] });
            queryClient.invalidateQueries({ queryKey: ["formas-pagamento"] });
            resetForm();
            setDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Erro ao criar forma de pagamento");
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingItem) throw new Error("No item selected");
            const { error } = await (supabase as any)
                .from("formas_pagamento")
                .update({
                    nome,
                    descricao: descricao || null,
                    ativo,
                })
                .eq("id", editingItem.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Forma de pagamento atualizada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["admin-formas-pagamento"] });
            queryClient.invalidateQueries({ queryKey: ["formas-pagamento"] });
            resetForm();
            setDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Erro ao atualizar forma de pagamento");
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from("formas_pagamento").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Forma de pagamento excluída!");
            queryClient.invalidateQueries({ queryKey: ["admin-formas-pagamento"] });
            queryClient.invalidateQueries({ queryKey: ["formas-pagamento"] });
        },
        onError: (err: any) => {
            toast.error(err?.message || "Erro ao excluir forma de pagamento");
        },
    });

    // Toggle active status
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
            const { error } = await (supabase as any)
                .from("formas_pagamento")
                .update({ ativo })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-formas-pagamento"] });
            queryClient.invalidateQueries({ queryKey: ["formas-pagamento"] });
        },
    });

    const resetForm = () => {
        setNome("");
        setDescricao("");
        setAtivo(true);
        setEditingItem(null);
    };

    const openEditDialog = (item: FormaPagamento) => {
        setEditingItem(item);
        setNome(item.nome);
        setDescricao(item.descricao || "");
        setAtivo(item.ativo);
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        resetForm();
        setDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!nome.trim()) {
            toast.error("Nome é obrigatório");
            return;
        }
        if (editingItem) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    // Nota: removido loading spinner - exibe diretamente as formas padrão enquanto carrega as personalizadas

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-[18px] font-bold tracking-tight" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>Formas de Pagamento</h3>
                    <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
                        {FORMAS_PADRAO.length} padrão · {formasPagamentoDB.length} personalizada{formasPagamentoDB.length === 1 ? "" : "s"}
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog} size="sm" className="gap-2 h-9 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0">
                            <Plus className="h-3.5 w-3.5" />
                            Nova Forma
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-[425px] bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">
                                {editingItem ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="nome" className="text-sm" style={{ color: "#475569" }}>Nome *</Label>
                                <Input
                                    id="nome"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Ex: Cartão de Crédito, PIX, Boleto..."
                                    className="rounded-lg border-[#E6EDF5] focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.18)] focus-visible:border-[#2563EB]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="descricao" className="text-sm" style={{ color: "#475569" }}>Descrição</Label>
                                <Input
                                    id="descricao"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descrição opcional"
                                    className="rounded-lg border-[#E6EDF5] focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.18)] focus-visible:border-[#2563EB]"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="ativo" className="text-sm" style={{ color: "#475569" }}>Ativo</Label>
                                <Switch
                                    id="ativo"
                                    checked={ativo}
                                    onCheckedChange={setAtivo}
                                    className="data-[state=checked]:bg-[#2563EB]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    resetForm();
                                    setDialogOpen(false);
                                }}
                                className="rounded-lg border-[#E6EDF5] text-[#475569]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                            >
                                {createMutation.isPending || updateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                {editingItem ? "Salvar" : "Criar"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E6EDF5" }}>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-0" style={{ background: "#F8FAFC" }}>
                            <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold h-11" style={{ color: "#94A3B8" }}>Forma de Pagamento</TableHead>
                            <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold h-11" style={{ color: "#94A3B8" }}>Tipo</TableHead>
                            <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold h-11" style={{ color: "#94A3B8" }}>Status</TableHead>
                            <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold text-right h-11" style={{ color: "#94A3B8" }}>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {todasFormas.map((item) => (
                            <TableRow key={item.id} className="group transition-colors hover:bg-[#F8FAFC]" style={{ borderTop: "1px solid #EEF2F7", background: item.isPadrao ? "#FCFDFE" : undefined }}>
                                <TableCell className="py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ background: "#EFF4FF" }}>
                                            <CreditCard className="h-4 w-4 text-[#2563EB]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium" style={{ color: "#0B1220" }}>{item.nome}</p>
                                            {item.descricao && (
                                                <p className="text-[11px] truncate max-w-xs" style={{ color: "#94A3B8" }}>
                                                    {item.descricao}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.isPadrao ? (
                                        <Badge variant="outline" className="gap-1 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B] border-[#E6EDF5]">
                                            <Shield className="h-3 w-3" />
                                            Padrão
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="rounded-full text-[10px] font-semibold bg-[#EFF4FF] text-[#2563EB] border-[rgba(37,99,235,0.22)]">
                                            Personalizada
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.isPadrao ? (
                                        <span className="text-[13px]" style={{ color: "#94A3B8" }}>Sempre ativo</span>
                                    ) : (
                                        <Switch
                                            checked={item.ativo}
                                            onCheckedChange={(checked) =>
                                                toggleActiveMutation.mutate({
                                                    id: item.id,
                                                    ativo: checked,
                                                })
                                            }
                                            className="data-[state=checked]:bg-[#2563EB]"
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {item.isPadrao ? (
                                        <span className="text-xs" style={{ color: "#CBD5E1" }}>—</span>
                                    ) : (
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-[#94A3B8] hover:text-[#2563EB]"
                                                onClick={() => openEditDialog(item)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-[#94A3B8] hover:text-rose-600 hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-card border-border">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-foreground">Excluir forma de pagamento</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-muted-foreground">
                                                            Tem certeza que deseja excluir "{item.nome}"? Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-rose-600 hover:bg-rose-700 text-white"
                                                            onClick={() => deleteMutation.mutate(item.id)}
                                                        >
                                                            Excluir
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Info */}
            <div className="rounded-xl px-4 py-3.5 flex items-start gap-2.5" style={{ background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
                <div className="flex items-center justify-center h-6 w-6 rounded-md shrink-0 mt-px" style={{ background: "#EFF4FF" }}>
                    <Shield className="h-3.5 w-3.5 text-[#2563EB]" />
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "#64748B" }}>
                    As formas <span className="font-semibold" style={{ color: "#0B1220" }}>Padrão</span> são sempre exibidas nas vendas. Crie formas <span className="font-semibold" style={{ color: "#0B1220" }}>Personalizadas</span> para opções específicas da sua empresa.
                </p>
            </div>
        </div>
    );
};
