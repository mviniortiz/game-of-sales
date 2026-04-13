import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, MoreHorizontal, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useTenant } from "@/contexts/TenantContext";
import { invalidateSalesQueries } from "@/utils/salesSync";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VendasFilters, FilterValues } from "./VendasFilters";

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;

export const AdminVendas = () => {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useTenant();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({
    vendedorId: "todos",
    produtoId: "todos",
    status: "todos",
    dateRange: {},
  });

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .eq("company_id", activeCompanyId)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: produtos } = useQuery({
    queryKey: ["produtos-filter", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome")
        .eq("company_id", activeCompanyId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: vendas, isLoading } = useQuery({
    queryKey: ["admin-vendas", filters, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("vendas")
        .select(`*, profiles:user_id (nome, avatar_url)`)
        .eq("company_id", activeCompanyId)
        .order("data_venda", { ascending: false });

      if (filters.vendedorId && filters.vendedorId !== "todos") {
        query = query.eq("user_id", filters.vendedorId);
      }
      if (filters.produtoId && filters.produtoId !== "todos") {
        query = query.eq("produto_id", filters.produtoId);
      }
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status as any);
      }
      if (filters.dateRange.from) {
        query = query.gte("data_venda", filters.dateRange.from.toISOString().split("T")[0]);
      }
      if (filters.dateRange.to) {
        query = query.lte("data_venda", filters.dateRange.to.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const kpis = useMemo(() => {
    if (!vendas) return { total: 0, valorTotal: 0, ticketMedio: 0 };
    const total = vendas.length;
    const valorTotal = vendas.reduce((acc, v) => acc + Number(v.valor), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    return { total, valorTotal, ticketMedio };
  }, [vendas]);

  const totalPages = Math.ceil((vendas?.length || 0) / pageSize);

  const paginatedVendas = useMemo(() => {
    if (!vendas) return [];
    const start = (currentPage - 1) * pageSize;
    return vendas.slice(start, start + pageSize);
  }, [vendas, currentPage, pageSize]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("vendas")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("A venda não foi removida (sem permissão ou registro não encontrado).");
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendas"] });
      await invalidateSalesQueries(queryClient);
      toast.success("Venda removida com sucesso");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover venda: ${error.message}`);
    },
  });

  const exportToExcel = () => {
    if (!vendas || vendas.length === 0) {
      toast.error("Nenhuma venda para exportar");
      return;
    }

    const dataToExport = vendas.map((venda) => ({
      Data: new Date(venda.data_venda).toLocaleDateString("pt-BR"),
      Vendedor: venda.profiles?.nome || "N/A",
      Cliente: venda.cliente_nome,
      Produto: venda.produto_nome,
      Valor: Number(venda.valor),
      Plataforma: venda.plataforma || "N/A",
      "Forma de Pagamento": venda.forma_pagamento,
      Status: venda.status || "Aprovado",
      Observações: venda.observacoes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
    XLSX.writeFile(workbook, `vendas_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aprovado":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Pendente":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Reembolsado":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, vendas?.length || 0);

  return (
    <div className="space-y-5">
      {/* Header + KPIs inline */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Vendas</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {kpis.total} registros · {formatCurrency(kpis.valorTotal)} total · {formatCurrency(kpis.ticketMedio)} ticket médio
          </p>
        </div>
        <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2 border-border/50 text-muted-foreground hover:text-foreground shrink-0">
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <VendasFilters
        vendedores={vendedores || []}
        produtos={produtos || []}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground text-sm">Carregando vendas...</div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Data</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Vendedor</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Cliente</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Produto</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-right">Valor</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        Nenhuma venda encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendas.map((venda) => (
                      <TableRow key={venda.id} className="group hover:bg-muted/30 transition-colors border-border/50">
                        <TableCell className="py-3.5">
                          <div className="text-sm text-foreground">
                            {new Date(venda.data_venda).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(venda.data_venda).getFullYear()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={venda.profiles?.avatar_url || ""} />
                              <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                                {getInitials(venda.profiles?.nome || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                              {venda.profiles?.nome}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                            {venda.cliente_nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[140px] block">
                            {venda.produto_nome}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(Number(venda.valor))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${getStatusBadge(venda.status || "Aprovado")}`}>
                            {venda.status || "Aprovado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem
                                onClick={() => setDeleteId(venda.id)}
                                className="cursor-pointer text-rose-400 focus:text-rose-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Bar */}
          {(vendas?.length || 0) > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {/* Left: page size selector */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Exibir</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8 text-xs border-border/50 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>

              {/* Center: showing X-Y of Z */}
              <span className="text-xs text-muted-foreground tabular-nums">
                {startItem}–{endItem} de {vendas?.length || 0}
              </span>

              {/* Right: prev/next */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border/50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers — show max 5 */}
                {(() => {
                  const pages: number[] = [];
                  let start = Math.max(1, currentPage - 2);
                  let end = Math.min(totalPages, start + 4);
                  if (end - start < 4) start = Math.max(1, end - 4);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((p) => (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs ${
                        p === currentPage
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "border-border/50 text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ));
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border/50"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja remover esta venda? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
