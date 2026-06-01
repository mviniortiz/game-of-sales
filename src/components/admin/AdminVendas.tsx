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
import { Download, MoreHorizontal, Trash2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Sparkline } from "./Sparkline";
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
  const [search, setSearch] = useState("");
  const [showTable, setShowTable] = useState(false);
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

  const filteredVendas = useMemo(() => {
    if (!vendas) return [];
    const q = search.trim().toLowerCase();
    if (!q) return vendas;
    return vendas.filter((v) =>
      (v.cliente_nome || "").toLowerCase().includes(q) ||
      (v.produto_nome || "").toLowerCase().includes(q) ||
      (v.profiles?.nome || "").toLowerCase().includes(q)
    );
  }, [vendas, search]);

  const kpis = useMemo(() => {
    const total = filteredVendas.length;
    const valorTotal = filteredVendas.reduce((acc, v) => acc + Number(v.valor), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    return { total, valorTotal, ticketMedio };
  }, [filteredVendas]);

  const totalPages = Math.ceil(filteredVendas.length / pageSize);

  const paginatedVendas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVendas.slice(start, start + pageSize);
  }, [filteredVendas, currentPage, pageSize]);

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
    if (filteredVendas.length === 0) {
      toast.error("Nenhuma venda para exportar");
      return;
    }

    const dataToExport = filteredVendas.map((venda) => ({
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
        return "bg-[#ECFDF3] text-[#16A34A] border-[#A7F3D0]";
      case "Pendente":
        return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
      case "Reembolsado":
        return "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]";
      default:
        return "bg-[#F1F5F9] text-[#64748B] border-[#E6EDF5]";
    }
  };

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredVendas.length);

  // Análise da operação (séries diárias + leitura da EVA) — tudo client-side
  const analytics = useMemo(() => {
    const byDay = new Map<string, { fat: number; count: number }>();
    filteredVendas.forEach((s: any) => {
      const day = (s.data_venda || "").split("T")[0];
      if (!day) return;
      const cur = byDay.get(day) || { fat: 0, count: 0 };
      cur.fat += Number(s.valor) || 0;
      cur.count += 1;
      byDay.set(day, cur);
    });
    const days = Array.from(byDay.keys()).sort();
    const fatSeries = days.map((d) => byDay.get(d)!.fat);
    const countSeries = days.map((d) => byDay.get(d)!.count);
    const ticketSeries = days.map((d) => {
      const x = byDay.get(d)!;
      return x.count ? x.fat / x.count : 0;
    });
    const aprovadas = filteredVendas.filter((s: any) => (s.status || "Aprovado") === "Aprovado").length;
    const approvalPct = filteredVendas.length ? Math.round((aprovadas / filteredVendas.length) * 100) : 0;

    let bestDay: { day: string; fat: number } | null = null;
    byDay.forEach((val, day) => { if (!bestDay || val.fat > bestDay.fat) bestDay = { day, fat: val.fat }; });
    const byProd = new Map<string, number>();
    filteredVendas.forEach((s: any) => byProd.set(s.produto_nome || "—", (byProd.get(s.produto_nome || "—") || 0) + (Number(s.valor) || 0)));
    let topProd: { nome: string; total: number } | null = null;
    byProd.forEach((total, nome) => { if (!topProd || total > topProd.total) topProd = { nome, total }; });
    const byPgto = new Map<string, number>();
    filteredVendas.forEach((s: any) => byPgto.set(s.forma_pagamento || "—", (byPgto.get(s.forma_pagamento || "—") || 0) + 1));
    let topPgto: { nome: string; n: number } | null = null;
    byPgto.forEach((n, nome) => { if (!topPgto || n > topPgto.n) topPgto = { nome, n }; });

    return { fatSeries, countSeries, ticketSeries, approvalPct, bestDay, topProd, topPgto };
  }, [filteredVendas]);

  const evaText = useMemo(() => {
    if (filteredVendas.length === 0) return null;
    const parts: string[] = [];
    const bd = analytics.bestDay as { day: string; fat: number } | null;
    if (bd) {
      const d = new Date(bd.day + "T12:00:00");
      parts.push(`o melhor dia foi ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} (${formatCurrency(bd.fat)})`);
    }
    const tp = analytics.topProd as { nome: string; total: number } | null;
    if (tp && kpis.valorTotal > 0) {
      parts.push(`${tp.nome} puxou ${Math.round((tp.total / kpis.valorTotal) * 100)}% do faturamento`);
    }
    const pg = analytics.topPgto as { nome: string; n: number } | null;
    if (pg) parts.push(`${pg.nome} foi a forma de pagamento mais usada`);
    if (parts.length === 0) return null;
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return [first, ...parts.slice(1)].join(". ") + ".";
  }, [analytics, filteredVendas.length, kpis.valorTotal]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-bold tracking-tight" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>Vendas</h3>
          <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>Histórico de vendas da operação</p>
        </div>
        <Button
          onClick={exportToExcel}
          variant="outline"
          size="sm"
          className="gap-2 h-9 rounded-lg border-[#E6EDF5] text-[#475569] hover:text-[#0B1220] hover:bg-[#F8FAFC] shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
      </div>

      {/* Leitura da EVA */}
      {evaText && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.12)" }}>
          <span className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-px leading-none" style={{ background: "#7C3AED" }}>E</span>
          <p className="text-[12.5px] leading-relaxed flex-1" style={{ color: "#475569" }}>
            <span className="font-semibold" style={{ color: "#0B1220" }}>Leitura da EVA:</span> {evaText}
          </p>
        </div>
      )}

      {/* KPIs com tendência */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Faturamento", value: formatCurrency(kpis.valorTotal), color: "#16A34A", series: analytics.fatSeries },
          { label: "Vendas", value: String(kpis.total), color: "#2563EB", series: analytics.countSeries },
          { label: "Ticket médio", value: formatCurrency(kpis.ticketMedio), color: "#7C3AED", series: analytics.ticketSeries },
          { label: "Aprovação", value: `${analytics.approvalPct}%`, color: "#0EA5E9", series: [] as number[] },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl px-5 py-4 flex flex-col" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: k.color }} />
              <p className="text-[10.5px] font-semibold uppercase truncate" style={{ color: "#64748B", letterSpacing: "0.04em" }}>{k.label}</p>
            </div>
            <p className="text-[22px] sm:text-[26px] font-bold tabular-nums leading-none truncate" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>{k.value}</p>
            <div className="mt-3 h-8">
              <Sparkline data={k.series} color={k.color} width={140} height={32} className="w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabela detalhada — sob demanda */}
      <button
        type="button"
        onClick={() => setShowTable((s) => !s)}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showTable ? "rotate-180" : ""}`} />
        {showTable ? "Ocultar tabela" : `Ver todas as vendas (${filteredVendas.length})`}
      </button>

      {showTable && (
      <>
      {/* Filters */}
      <VendasFilters
        vendedores={vendedores || []}
        produtos={produtos || []}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-sm" style={{ color: "#94A3B8" }}>Carregando vendas...</div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E6EDF5" }}>
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0" style={{ background: "#F8FAFC" }}>
                    {["Data", "Vendedor", "Cliente", "Produto"].map((h) => (
                      <TableHead key={h} className="text-[10.5px] uppercase tracking-wider font-semibold h-11" style={{ color: "#94A3B8" }}>{h}</TableHead>
                    ))}
                    <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold text-right h-11" style={{ color: "#94A3B8" }}>Valor</TableHead>
                    <TableHead className="text-[10.5px] uppercase tracking-wider font-semibold h-11" style={{ color: "#94A3B8" }}>Status</TableHead>
                    <TableHead className="w-10 h-11" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-14 text-sm" style={{ color: "#94A3B8" }}>
                        Nenhuma venda encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendas.map((venda) => (
                      <TableRow key={venda.id} className="group transition-colors hover:bg-[#F8FAFC]" style={{ borderTop: "1px solid #EEF2F7" }}>
                        <TableCell className="py-3.5">
                          <div className="text-sm font-medium" style={{ color: "#0B1220" }}>
                            {new Date(venda.data_venda).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </div>
                          <div className="text-[10px]" style={{ color: "#94A3B8" }}>
                            {new Date(venda.data_venda).getFullYear()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={venda.profiles?.avatar_url || ""} />
                              <AvatarFallback className="bg-[#EFF4FF] text-[#2563EB] text-[10px] font-semibold">
                                {getInitials(venda.profiles?.nome || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-[120px]" style={{ color: "#0B1220" }}>
                              {venda.profiles?.nome}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[120px] block" style={{ color: "#64748B" }}>
                            {venda.cliente_nome || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate max-w-[140px] block" style={{ color: "#64748B" }}>
                            {venda.produto_nome}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold tabular-nums" style={{ color: "#0B1220" }}>
                            {formatCurrency(Number(venda.valor))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold rounded-full ${getStatusBadge(venda.status || "Aprovado")}`}>
                            {venda.status || "Aprovado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#94A3B8] hover:text-[#0B1220] opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem
                                onClick={() => setDeleteId(venda.id)}
                                className="cursor-pointer text-rose-600 focus:text-rose-600"
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
          {(filteredVendas.length) > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {/* Left: page size selector */}
              <div className="flex items-center gap-2 text-[13px]" style={{ color: "#64748B" }}>
                <span>Exibir</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8 text-xs rounded-lg border-[#E6EDF5] bg-white">
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
              <span className="text-xs tabular-nums" style={{ color: "#94A3B8" }}>
                {startItem}–{endItem} de {filteredVendas.length}
              </span>

              {/* Right: prev/next */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg border-[#E6EDF5] text-[#475569]"
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
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-xs rounded-lg"
                      style={p === currentPage
                        ? { background: "rgba(37,99,235,0.10)", color: "#2563EB", borderColor: "rgba(37,99,235,0.30)" }
                        : { borderColor: "#E6EDF5", color: "#64748B" }}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ));
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg border-[#E6EDF5] text-[#475569]"
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
