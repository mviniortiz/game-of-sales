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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                        <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Formas de Pagamento</h3>
                        <p className="text-sm text-muted-foreground">
                            {FORMAS_PADRAO.length} padrão + {formasPagamentoDB.length} personalizadas
                        </p>
                    </div>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nova Forma
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingItem ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome *</Label>
                                <Input
                                    id="nome"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Ex: Cartão de Crédito, PIX, Boleto..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição</Label>
                                <Input
                                    id="descricao"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descrição opcional"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="ativo">Ativo</Label>
                                <Switch
                                    id="ativo"
                                    checked={ativo}
                                    onCheckedChange={setAtivo}
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
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || updateMutation.isPending}
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
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Forma de Pagamento</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {todasFormas.map((item) => (
                            <TableRow key={item.id} className={item.isPadrao ? "bg-muted/30" : ""}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{item.nome}</p>
                                        {item.descricao && (
                                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                {item.descricao}
                                            </p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.isPadrao ? (
                                        <Badge variant="secondary" className="gap-1">
                                            <Shield className="h-3 w-3" />
                                            Padrão
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600">
                                            Personalizada
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.isPadrao ? (
                                        <span className="text-sm text-muted-foreground">Sempre ativo</span>
                                    ) : (
                                        <Switch
                                            checked={item.ativo}
                                            onCheckedChange={(checked) =>
                                                toggleActiveMutation.mutate({
                                                    id: item.id,
                                                    ativo: checked,
                                                })
                                            }
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {item.isPadrao ? (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditDialog(item)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                onClick={() => {
                                                    if (
                                                        confirm(
                                                            `Tem certeza que deseja excluir "${item.nome}"?`
                                                        )
                                                    ) {
                                                        deleteMutation.mutate(item.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                    <strong>💡 Dica:</strong> As formas <strong>Padrão</strong> são sempre exibidas em vendas.
                    Crie formas <strong>Personalizadas</strong> para adicionar opções específicas da sua empresa.
                </p>
            </div>
        </div>
    );
};
