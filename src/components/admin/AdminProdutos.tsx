import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useNavigate } from "react-router-dom";
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
    const { isSuperAdmin, getProductLimit, planInfo, currentPlan } = useTenant();
    const navigate = useNavigate();
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
            // Enforce do limite de produtos do plano
            const productLimit = getProductLimit();
            if (!isSuperAdmin && Number.isFinite(productLimit) && produtos.length >= productLimit) {
                toast.error(`Seu plano ${planInfo.label} permite até ${productLimit} produtos.`, {
                    description: "Faça upgrade para cadastrar mais produtos.",
                    action: {
                        label: "Fazer upgrade",
                        onClick: () => navigate("/upgrade"),
                    },
                });
                return;
            }
            createMutation.mutate();
        }
    };

    const formatCurrency = (value: number | null | undefined) =>
        (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const filteredProdutos = produtos.filter((p) =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = produtos.filter((p) => p.ativo).length;
    const inactiveCount = produtos.length - activeCount;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#94A3B8" }} />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-[18px] font-bold tracking-tight" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>Produtos</h3>
                    <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>Catálogo de produtos e serviços vendidos</p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    size="sm"
                    className="gap-2 h-9 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white shrink-0"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Produto
                </Button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Cadastrados", value: produtos.length, color: "#2563EB" },
                    { label: "Ativos", value: activeCount, color: "#16A34A" },
                    { label: "Inativos", value: inactiveCount, color: "#94A3B8" },
                ].map((k) => (
                    <div key={k.label} className="rounded-xl px-4 py-3.5" style={{ background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: k.color }} />
                            <p className="text-[10.5px] font-semibold uppercase truncate" style={{ color: "#64748B", letterSpacing: "0.04em" }}>{k.label}</p>
                        </div>
                        <p className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-none" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            {produtos.length > 0 && (
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: "#94A3B8" }} />
                    <Input
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 rounded-lg bg-white text-[13px] border-[#E6EDF5] text-[#0B1220] placeholder:text-[#94A3B8] hover:border-[#D7DEE9] focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.18)] focus-visible:border-[#2563EB]"
                    />
                </div>
            )}

            {/* Table or Empty State */}
            {produtos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl" style={{ background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl mb-4" style={{ background: "#EFF4FF" }}>
                        <Package className="h-6 w-6 text-[#2563EB]" />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#0B1220" }}>Nenhum produto cadastrado</p>
                    <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Clique em "Novo Produto" para começar</p>
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E6EDF5" }}>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-0" style={{ background: "#F8FAFC" }}>
                                <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold h-11" style={{ color: "#94A3B8" }}>Produto</TableHead>
                                <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold text-right h-11" style={{ color: "#94A3B8" }}>Valor</TableHead>
                                <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold text-center h-11" style={{ color: "#94A3B8" }}>Status</TableHead>
                                <TableHead className="w-24 h-11" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProdutos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-sm" style={{ color: "#94A3B8" }}>
                                        Nenhum produto encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProdutos.map((produto) => (
                                    <TableRow key={produto.id} className="group transition-colors hover:bg-[#F8FAFC]" style={{ borderTop: "1px solid #EEF2F7" }}>
                                        <TableCell className="py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0" style={{ background: "#EFF4FF" }}>
                                                    <Package className="h-4 w-4 text-[#2563EB]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: "#0B1220" }}>{produto.nome}</p>
                                                    {produto.descricao && (
                                                        <p className="text-[11px] truncate max-w-[200px]" style={{ color: "#94A3B8" }}>
                                                            {produto.descricao}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-sm font-bold tabular-nums" style={{ color: "#0B1220" }}>
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
                                                    className="data-[state=checked]:bg-[#2563EB]"
                                                />
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-semibold rounded-full ${
                                                        produto.ativo
                                                            ? "bg-[#ECFDF3] text-[#16A34A] border-[#A7F3D0]"
                                                            : "bg-[#F1F5F9] text-[#64748B] border-[#E6EDF5]"
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
                                                    className="h-7 w-7 p-0 text-[#94A3B8] hover:text-[#2563EB]"
                                                    onClick={() => openEditDialog(produto)}
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
                                className="data-[state=checked]:bg-[#2563EB]"
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
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
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
