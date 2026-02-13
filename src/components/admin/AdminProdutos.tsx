import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Package, Loader2, Pencil, Trash2 } from "lucide-react";

interface Produto {
    id: string;
    nome: string;
    preco_base: number;
    descricao?: string;
    ativo: boolean;
    company_id: string;
}

export const AdminProdutos = () => {
    const { companyId } = useAuth();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
    const [nome, setNome] = useState("");
    const [valor, setValor] = useState("");
    const [descricao, setDescricao] = useState("");
    const [ativo, setAtivo] = useState(true);

    // Fetch products
    const { data: produtos = [], isLoading } = useQuery({
        queryKey: ["admin-produtos", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from("produtos")
                .select("*")
                .eq("company_id", companyId)
                .order("nome");
            if (error) throw error;
            return data as Produto[];
        },
        enabled: !!companyId,
    });

    // Create product mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error("Company ID not found");
            const { error } = await supabase.from("produtos").insert({
                nome,
                preco_base: parseFloat(valor) || 0,
                descricao: descricao || null,
                ativo,
                company_id: companyId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Produto criado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
            resetForm();
            setDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Erro ao criar produto");
        },
    });

    // Update product mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingProduct) throw new Error("No product selected");
            const { error } = await supabase
                .from("produtos")
                .update({
                    nome,
                    preco_base: parseFloat(valor) || 0,
                    descricao: descricao || null,
                    ativo,
                })
                .eq("id", editingProduct.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Produto atualizado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
            resetForm();
            setDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Erro ao atualizar produto");
        },
    });

    // Delete product mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("produtos").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Produto excluído!");
            queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
        },
        onError: (err: any) => {
            toast.error(err?.message || "Erro ao excluir produto");
        },
    });

    // Toggle active status
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
            const { error } = await supabase
                .from("produtos")
                .update({ ativo })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
        },
    });

    const resetForm = () => {
        setNome("");
        setValor("");
        setDescricao("");
        setAtivo(true);
        setEditingProduct(null);
    };

    const openEditDialog = (produto: Produto) => {
        setEditingProduct(produto);
        setNome(produto.nome);
        setValor(produto.preco_base.toString());
        setDescricao(produto.descricao || "");
        setAtivo(produto.ativo);
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
        if (editingProduct) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                        <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Produtos</h3>
                        <p className="text-sm text-muted-foreground">
                            {produtos.length} produtos cadastrados
                        </p>
                    </div>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Produto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProduct ? "Editar Produto" : "Novo Produto"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome *</Label>
                                <Input
                                    id="nome"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Nome do produto"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="valor">Valor (R$)</Label>
                                <Input
                                    id="valor"
                                    type="number"
                                    step="0.01"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição</Label>
                                <Input
                                    id="descricao"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descrição do produto"
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
                                {editingProduct ? "Salvar" : "Criar"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            {produtos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum produto cadastrado</p>
                    <p className="text-sm">Clique em "Novo Produto" para começar</p>
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {produtos.map((produto) => (
                                <TableRow key={produto.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{produto.nome}</p>
                                            {produto.descricao && (
                                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                                    {produto.descricao}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(produto.preco_base)}
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={produto.ativo}
                                            onCheckedChange={(checked) =>
                                                toggleActiveMutation.mutate({
                                                    id: produto.id,
                                                    ativo: checked,
                                                })
                                            }
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditDialog(produto)}
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
                                                            `Tem certeza que deseja excluir "${produto.nome}"?`
                                                        )
                                                    ) {
                                                        deleteMutation.mutate(produto.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
};
