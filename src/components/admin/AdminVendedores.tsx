import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const AdminVendedores = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["admin-vendedores"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          vendas:vendas(id, valor, data_venda, created_at)
        `);

      if (error) throw error;

      return profiles?.map((profile) => {
        const vendasMes = profile.vendas?.filter((v: any) => {
          const dataVenda = new Date(v.data_venda || v.created_at);
          return dataVenda >= startOfMonth;
        }) || [];

        const faturamentoMes = vendasMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);

        return {
          ...profile,
          totalVendasMes: vendasMes.length,
          faturamentoMes,
        };
      }) || [];
    },
  });

  const filteredVendedores = vendedores?.filter((v) =>
    v.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getNivelBadgeClass = (nivel: string) => {
    switch (nivel) {
      case "Bronze":
        return "bg-orange-900/50 text-orange-200 border-orange-800";
      case "Prata":
        return "bg-gray-500/50 text-gray-200 border-gray-600";
      case "Ouro":
        return "bg-yellow-600/50 text-yellow-200 border-yellow-700";
      case "Platina":
        return "bg-indigo-500/50 text-indigo-200 border-indigo-600";
      case "Diamante":
        return "bg-blue-500/50 text-blue-200 border-blue-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando vendedores...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-6">Todos os Vendedores</h3>
        
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Vendedor
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Vendedor</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Vendas (Mês)</TableHead>
              <TableHead>Faturamento (Mês)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendedores?.map((vendedor) => (
              <TableRow 
                key={vendedor.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={vendedor.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(vendedor.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{vendedor.nome}</div>
                      <div className="text-xs text-muted-foreground">{vendedor.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getNivelBadgeClass(vendedor.nivel)}>
                    {vendedor.nivel}
                  </Badge>
                </TableCell>
                <TableCell>{vendedor.pontos.toLocaleString("pt-BR")}</TableCell>
                <TableCell>{vendedor.totalVendasMes}</TableCell>
                <TableCell>
                  R$ {vendedor.faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => toast.error("Funcionalidade em desenvolvimento")}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};