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
                <div>
                    <h3 className="text-[13px] font-semibold text-[var(--vyz-text-primary)]">Produtos</h3>
                    <p className="text-[12px] text-[var(--vyz-text-muted)]">Os itens que entram no valor da proposta.</p>
                </div>
                <div className="flex items-center gap-2">
                    {deal && dealProducts.length > 0 && (
                        <ProposalPDFButton deal={deal} products={dealProducts} />
                    )}
                    <Button
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        className="gap-1.5 h-9 px-4 rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 font-semibold active:scale-[0.98] transition-[opacity,transform]"
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Adicionar produto
                    </Button>
                </div>
            </div>

            {/* Products Table */}
            {dealProducts.length === 0 ? (
                <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[var(--ibx-line-strong)] px-6 py-8 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ibx-sunken)] text-[var(--vyz-text-muted)]"><Package className="h-4 w-4" aria-hidden /></span>
                    <p className="mt-3 text-[13.5px] font-semibold text-[var(--vyz-text-primary)]">Nenhum produto neste card</p>
                    <p className="mt-1 text-[12.5px] text-[var(--vyz-text-muted)]">Adicione os itens do sistema, como placas, inversor e instalação.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-[12px] border border-[var(--ibx-line)]">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[var(--ibx-paper)] hover:bg-[var(--ibx-paper)] [&>th]:h-9 [&>th]:text-[11.5px] [&>th]:font-medium [&>th]:text-[var(--vyz-text-muted)]">
                                <TableHead>Produto</TableHead>
                                <TableHead className="hidden sm:table-cell text-center w-24">Qtd</TableHead>
                                <TableHead className="hidden sm:table-cell text-right">Preço</TableHead>
                                <TableHead className="hidden sm:table-cell text-center w-24">Desconto %</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dealProducts.map((item) => (
                                <TableRow key={item.id} className="border-[var(--ibx-line-soft)] hover:bg-[var(--ibx-paper)]/60">
                                    <TableCell>
                                        <div>
                                            <p className="text-[13.5px] font-medium text-[var(--vyz-text-primary)]">{item.produto?.nome}</p>
                                            {item.produto?.descricao && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-none sm:truncate max-w-xs">
                                                    {item.produto.descricao}
                                                </p>
                                            )}
                                            <p className="sm:hidden mt-0.5 text-xs tabular-nums text-[var(--vyz-text-muted)]">
                                                {item.quantidade} × {formatCurrency(item.preco_unitario)}
                                                {item.desconto_percentual ? ` · ${item.desconto_percentual}% de desconto` : ""}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">
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
                                            className="w-16 h-8 text-center mx-auto rounded-full border-[var(--ibx-line)] tabular-nums"
                                        />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-right font-medium tabular-nums">
                                        {formatCurrency(item.preco_unitario)}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">
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
                                            className="w-16 h-8 text-center mx-auto rounded-full border-[var(--ibx-line)] tabular-nums"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap text-[var(--vyz-text-primary)]">
                                        {formatCurrency(calculateSubtotal(item))}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeProductMutation.mutate(item.id)}
                                            aria-label={`Remover ${item.produto?.nome ?? "produto"}`}
                                            className="h-8 w-8 p-0 rounded-full text-[var(--vyz-text-muted)] hover:text-[var(--vyz-danger)] hover:bg-[var(--vyz-danger-bg)]"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Total */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[var(--ibx-paper)] border-t border-[var(--ibx-line)]">
                        <span className="text-[12.5px] font-medium text-[var(--vyz-text-muted)]">
                            Total
                        </span>
                        <span className="text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--vyz-text-primary)]">
                            {formatCurrency(totalValue)}
                        </span>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-[18px] border border-[var(--ibx-line)] bg-[var(--ibx-card)]">
                    <DialogHeader>
                        <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">Adicionar produto</DialogTitle>
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
                                            <span className="text-sm font-semibold tabular-nums text-[var(--vyz-text-primary)]">
                                                {formatCurrency(produto.preco_base)}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Selected Product */}
                                <div className="p-3 bg-[var(--ibx-sel)] rounded-[10px] border border-[var(--vyz-accent)]/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-[var(--vyz-text-primary)]">
                                                {selectedProduct.nome}
                                            </p>
                                            <p className="text-sm text-[var(--vyz-text-muted)]">
                                                Preço base: {formatCurrency(selectedProduct.preco_base)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedProduct(null)}
                                            className="rounded-full text-[var(--vyz-accent)] hover:bg-[var(--vyz-accent)]/10"
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
                                <div className="flex items-center justify-between p-3 bg-[var(--ibx-paper)] rounded-[10px]">
                                    <span className="text-sm text-[var(--vyz-text-muted)]">Subtotal</span>
                                    <span className="text-lg font-semibold tabular-nums text-[var(--vyz-text-primary)]">
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
                            className="rounded-full"
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
                            className="rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 font-semibold active:scale-[0.98] transition-[opacity,transform]"
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
