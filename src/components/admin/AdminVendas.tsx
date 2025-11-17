import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VendasFilters, FilterValues } from "./VendasFilters";

export const AdminVendas = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterValues>({
    vendedorId: "todos",
    produtoId: "todos",
    status: "todos",
    dataInicio: "",
    dataFim: "",
  });

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
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
          profiles:user_id (nome)
        `)
        .order("data_venda", { ascending: false });

      // Aplicar filtros
      if (filters.vendedorId && filters.vendedorId !== "todos") {
        query = query.eq("user_id", filters.vendedorId);
      }
      if (filters.produtoId && filters.produtoId !== "todos") {
        query = query.eq("produto_id", filters.produtoId);
      }
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status as any);
      }
      if (filters.dataInicio) {
        query = query.gte("data_venda", filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte("data_venda", filters.dataFim);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendas"] });
      toast.success("Venda deletada com sucesso");
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

    // Preparar dados para exportação
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

    // Criar planilha
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    // Aplicar formatação às colunas de valor
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 4 }); // Coluna Valor
      if (worksheet[cellAddress] && typeof worksheet[cellAddress].v === "number") {
        worksheet[cellAddress].z = 'R$ #,##0.00';
      }
    }

    // Gerar nome do arquivo com data atual
    const today = new Date().toISOString().split("T")[0];
    const filename = `vendas_${today}.xlsx`;

    // Download
    XLSX.writeFile(workbook, filename);
    toast.success("Relatório exportado com sucesso!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aprovado":
        return "bg-green-500/10 text-green-500";
      case "Pendente":
        return "bg-yellow-500/10 text-yellow-500";
      case "Reembolsado":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Todas as Vendas</h3>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <VendasFilters
        vendedores={vendedores || []}
        produtos={produtos || []}
        onFilterChange={setFilters}
      />

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando vendas...</div>
      ) : (
        <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas?.map((venda) => (
              <TableRow key={venda.id}>
                <TableCell>
                  {new Date(venda.data_venda).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>{venda.profiles?.nome}</TableCell>
                <TableCell>{venda.cliente_nome}</TableCell>
                <TableCell>{venda.produto_nome}</TableCell>
                <TableCell>
                  R$ {Number(venda.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>{venda.plataforma}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(venda.status || "Aprovado")}>
                    {venda.status || "Aprovado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
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
                          onClick={() => deleteMutation.mutate(venda.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
