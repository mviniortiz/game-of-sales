import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, MoreHorizontal, FileText, Edit, Trash2, TrendingUp, DollarSign, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 20;

export const AdminVendas = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({
    vendedorId: "todos",
    produtoId: "todos",
    status: "todos",
    dateRange: {},
  });

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos } = useQuery({
    queryKey: ["produtos-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: vendas, isLoading } = useQuery({
    queryKey: ["admin-vendas", filters],
    queryFn: async () => {
      let query = supabase
        .from("vendas")
        .select(`
          *,
          profiles:user_id (nome, avatar_url)
        `)
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
        const fromDate = filters.dateRange.from.toISOString().split('T')[0];
        query = query.gte("data_venda", fromDate);
      }
      if (filters.dateRange.to) {
        const toDate = filters.dateRange.to.toISOString().split('T')[0];
        query = query.lte("data_venda", toDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!vendas) return { total: 0, valorTotal: 0, ticketMedio: 0 };
    
    const total = vendas.length;
    const valorTotal = vendas.reduce((acc, v) => acc + Number(v.valor), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;

    return { total, valorTotal, ticketMedio };
  }, [vendas]);

  // Pagination
  const paginatedVendas = useMemo(() => {
    if (!vendas) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return vendas.slice(start, start + ITEMS_PER_PAGE);
  }, [vendas, currentPage]);

  const totalPages = Math.ceil((vendas?.length || 0) / ITEMS_PER_PAGE);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendas"] });
      toast.success("Venda deletada com sucesso");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar venda: ${error.message}`);
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

    const today = new Date().toISOString().split("T")[0];
    const filename = `vendas_${today}.xlsx`;

    XLSX.writeFile(workbook, filename);
    toast.success("Relatório exportado com sucesso!");
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Aprovado":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "Pendente":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "Reembolsado":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Todas as Vendas</h3>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Vendas</p>
                <p className="text-2xl font-bold">{kpis.total}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-emerald-400">
                  R$ {kpis.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold text-indigo-400">
                  R$ {kpis.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-col gap-4">
        <VendasFilters
          vendedores={vendedores || []}
          produtos={produtos || []}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
        />
        <div className="flex justify-end">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando vendas...</div>
      ) : (
        <>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendas?.map((venda) => (
                  <TableRow key={venda.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="py-4">
                      {new Date(venda.data_venda).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={venda.profiles?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(venda.profiles?.nome || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{venda.profiles?.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{venda.cliente_nome}</TableCell>
                    <TableCell>{venda.produto_nome}</TableCell>
                    <TableCell className="font-bold text-emerald-400">
                      R$ {Number(venda.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(venda.status || "Aprovado")}>
                        {venda.status || "Aprovado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border z-50">
                          <DropdownMenuItem 
                            onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                            className="cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteId(venda.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Venda
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};