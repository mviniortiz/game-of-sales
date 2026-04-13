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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Package, Loader2, Pencil, Trash2, Search } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    const [searchTerm, setSearchTerm] = useState("");

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
        onError: (err: any) => toast.error(err?.message || "Erro ao criar produto"),
    });

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
            toast.success("Produto atualizado!");
            queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
            resetForm();
            setDialogOpen(false);
        },
        onError: (err: any) => toast.error(err?.message || "Erro ao atualizar produto"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("produtos").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Produto excluído!");
            queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
        },
        onError: (err: any) => toast.error(err?.message || "Erro ao excluir produto"),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
            const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-produtos"] }),
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

    const formatCurrency = (value: number | null | undefined) =>
        (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const filteredProdutos = produtos.filter((p) =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = produtos.filter((p) => p.ativo).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Produtos</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {produtos.length} cadastrados · {activeCount} ativos
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Produto
                </Button>
            </div>

            {/* Search */}
            {produtos.length > 0 && (
                <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9 bg-transparent border-border/50 text-sm"
                    />
                </div>
            )}

            {/* Table or Empty State */}
            {produtos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mb-4">
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhum produto cadastrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Produto" para começar</p>
                </div>
            ) : (
                <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/50">
                                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Produto</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-right">Valor</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-center">Status</TableHead>
                                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold w-24" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProdutos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                                        Nenhum produto encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProdutos.map((produto) => (
                                    <TableRow key={produto.id} className="group hover:bg-muted/30 transition-colors border-border/50">
                                        <TableCell className="py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{produto.nome}</p>
                                                    {produto.descricao && (
                                                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                                            {produto.descricao}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                                {formatCurrency(produto.preco_base)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Switch
                                                    checked={produto.ativo}
                                                    onCheckedChange={(checked) =>
                                                        toggleActiveMutation.mutate({ id: produto.id, ativo: checked })
                                                    }
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-semibold ${
                                                        produto.ativo
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                            : "bg-muted text-muted-foreground border-border/50"
                                                    }`}
                                                >
                                                    {produto.ativo ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openEditDialog(produto)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-card border-border">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-foreground">Excluir produto</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-muted-foreground">
                                                                Tem certeza que deseja excluir <span className="font-semibold text-foreground">"{produto.nome}"</span>? Esta ação é irreversível.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-rose-600 hover:bg-rose-700 text-white"
                                                                onClick={() => deleteMutation.mutate(produto.id)}
                                                            >
                                                                Excluir
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-[420px] bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {editingProduct ? "Editar Produto" : "Novo Produto"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="nome" className="text-sm text-muted-foreground">Nome *</Label>
                            <Input
                                id="nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Nome do produto"
                                className="bg-transparent border-border/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="valor" className="text-sm text-muted-foreground">Valor (R$)</Label>
                            <Input
                                id="valor"
                                type="number"
                                step="0.01"
                                value={valor}
                                onChange={(e) => setValor(e.target.value)}
                                placeholder="0,00"
                                className="bg-transparent border-border/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="descricao" className="text-sm text-muted-foreground">Descrição</Label>
                            <Input
                                id="descricao"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Opcional"
                                className="bg-transparent border-border/50"
                            />
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <Label htmlFor="ativo" className="text-sm text-muted-foreground">Ativo</Label>
                            <Switch
                                id="ativo"
                                checked={ativo}
                                onCheckedChange={setAtivo}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { resetForm(); setDialogOpen(false); }}
                            className="border-border/50 text-muted-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            )}
                            {editingProduct ? "Salvar" : "Criar"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
