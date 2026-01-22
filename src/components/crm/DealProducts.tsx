import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Package, Search } from "lucide-react";
import { ProposalPDFButton } from "./ProposalPDFGenerator";

interface DealProduct {
    id: string;
    deal_id: string;
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
    desconto_percentual: number;
    created_at: string;
    produto?: {
        id: string;
        nome: string;
        preco_base: number;
        descricao?: string;
    };
}

interface Produto {
    id: string;
    nome: string;
    preco_base: number;
    descricao?: string;
    ativo: boolean;
}

interface DealInfo {
    id: string;
    title: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
}

interface DealProductsProps {
    dealId: string;
    companyId: string;
    deal?: DealInfo;
}

export const DealProducts = ({ dealId, companyId, deal }: DealProductsProps) => {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
    const [quantidade, setQuantidade] = useState(1);
    const [precoUnitario, setPrecoUnitario] = useState(0);
    const [desconto, setDesconto] = useState(0);

    // Fetch deal products
    const { data: dealProducts = [], isLoading } = useQuery({
        queryKey: ["deal-products", dealId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("deal_products")
                .select(`
                    *,
                    produto:produtos(id, nome, preco_base, descricao)
                `)
                .eq("deal_id", dealId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching deal products:", error);
                return [];
            }
            return data as DealProduct[];
        },
        enabled: !!dealId,
    });

    // Fetch available products
    const { data: availableProducts = [] } = useQuery({
        queryKey: ["available-products", companyId, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from("produtos")
                .select("*")
                .eq("company_id", companyId)
                .eq("ativo", true)
                .order("nome");

            if (searchTerm) {
                query = query.ilike("nome", `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Produto[];
        },
        enabled: !!companyId && showAddModal,
    });

    // Add product mutation
    const addProductMutation = useMutation({
        mutationFn: async () => {
            if (!selectedProduct) throw new Error("Nenhum produto selecionado");

            const { error } = await (supabase as any)
                .from("deal_products")
                .insert({
                    deal_id: dealId,
                    produto_id: selectedProduct.id,
                    quantidade,
                    preco_unitario: precoUnitario,
                    desconto_percentual: desconto,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-products", dealId] });
            queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
            toast.success("Produto adicionado!");
            resetForm();
            setShowAddModal(false);
        },
        onError: (err: any) => {
            if (err?.message?.includes("unique")) {
                toast.error("Este produto já foi adicionado ao deal");
            } else {
                toast.error(err?.message || "Erro ao adicionar produto");
            }
        },
    });

    // Update product mutation
    const updateProductMutation = useMutation({
        mutationFn: async ({
            id,
            quantidade,
            desconto,
        }: {
            id: string;
            quantidade: number;
            desconto: number;
        }) => {
            const { error } = await (supabase as any)
                .from("deal_products")
                .update({
                    quantidade,
                    desconto_percentual: desconto,
                })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-products", dealId] });
            queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
        },
    });

    // Remove product mutation
    const removeProductMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from("deal_products")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-products", dealId] });
            queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
            toast.success("Produto removido!");
        },
        onError: () => {
            toast.error("Erro ao remover produto");
        },
    });

    const resetForm = () => {
        setSelectedProduct(null);
        setQuantidade(1);
        setPrecoUnitario(0);
        setDesconto(0);
        setSearchTerm("");
    };

    const handleSelectProduct = (produto: Produto) => {
        setSelectedProduct(produto);
        setPrecoUnitario(produto.preco_base);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const calculateSubtotal = (item: DealProduct) => {
        return item.quantidade * item.preco_unitario * (1 - item.desconto_percentual / 100);
    };

    const totalValue = dealProducts.reduce(
        (acc, item) => acc + calculateSubtotal(item),
        0
    );

    // Filter out already added products
    const filteredProducts = availableProducts.filter(
        (p) => !dealProducts.some((dp) => dp.produto_id === p.id)
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Produtos da Proposta
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {deal && dealProducts.length > 0 && (
                        <ProposalPDFButton deal={deal} products={dealProducts} />
                    )}
                    <Button
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-500"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Produto
                    </Button>
                </div>
            </div>

            {/* Products Table */}
            {dealProducts.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhum produto adicionado</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                        Clique em "Adicionar Produto" para criar sua proposta
                    </p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-center w-24">Qtd</TableHead>
                                <TableHead className="text-right">Preço Unit.</TableHead>
                                <TableHead className="text-center w-24">Desc. %</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dealProducts.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{item.produto?.nome}</p>
                                            {item.produto?.descricao && (
                                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                    {item.produto.descricao}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantidade}
                                            onChange={(e) =>
                                                updateProductMutation.mutate({
                                                    id: item.id,
                                                    quantidade: parseInt(e.target.value) || 1,
                                                    desconto: item.desconto_percentual,
                                                })
                                            }
                                            className="w-16 h-8 text-center mx-auto"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(item.preco_unitario)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.desconto_percentual}
                                            onChange={(e) =>
                                                updateProductMutation.mutate({
                                                    id: item.id,
                                                    quantidade: item.quantidade,
                                                    desconto: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-16 h-8 text-center mx-auto"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(calculateSubtotal(item))}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeProductMutation.mutate(item.id)}
                                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Total */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t">
                        <span className="text-sm font-semibold text-muted-foreground">
                            TOTAL DA PROPOSTA
                        </span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalValue)}
                        </span>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Adicionar Produto</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar produto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Product List */}
                        {!selectedProduct ? (
                            <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
                                {filteredProducts.length === 0 ? (
                                    <p className="text-center py-4 text-muted-foreground text-sm">
                                        {searchTerm
                                            ? "Nenhum produto encontrado"
                                            : "Todos os produtos já foram adicionados"}
                                    </p>
                                ) : (
                                    filteredProducts.map((produto) => (
                                        <button
                                            key={produto.id}
                                            onClick={() => handleSelectProduct(produto)}
                                            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-medium">{produto.nome}</p>
                                                {produto.descricao && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {produto.descricao}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold text-emerald-600">
                                                {formatCurrency(produto.preco_base)}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Selected Product */}
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-500/30">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                                                {selectedProduct.nome}
                                            </p>
                                            <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70">
                                                Preço base: {formatCurrency(selectedProduct.preco_base)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedProduct(null)}
                                            className="text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                        >
                                            Trocar
                                        </Button>
                                    </div>
                                </div>

                                {/* Quantity and Price */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Quantidade</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={quantidade}
                                            onChange={(e) =>
                                                setQuantidade(parseInt(e.target.value) || 1)
                                            }
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Preço Unitário (R$)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={precoUnitario}
                                            onChange={(e) =>
                                                setPrecoUnitario(parseFloat(e.target.value) || 0)
                                            }
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Desconto (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={desconto}
                                            onChange={(e) =>
                                                setDesconto(parseFloat(e.target.value) || 0)
                                            }
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Subtotal Preview */}
                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <span className="text-sm text-muted-foreground">Subtotal:</span>
                                    <span className="text-lg font-bold text-emerald-600">
                                        {formatCurrency(
                                            quantidade * precoUnitario * (1 - desconto / 100)
                                        )}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                setShowAddModal(false);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => addProductMutation.mutate()}
                            disabled={!selectedProduct || addProductMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-500"
                        >
                            {addProductMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="h-4 w-4 mr-2" />
                            )}
                            Adicionar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
