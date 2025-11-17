import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface VendasFiltersProps {
  vendedores: Array<{ id: string; nome: string }>;
  produtos: Array<{ id: string; nome: string }>;
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  vendedorId: string;
  produtoId: string;
  status: string;
  dataInicio: string;
  dataFim: string;
}

export const VendasFilters = ({ vendedores, produtos, onFilterChange }: VendasFiltersProps) => {
  const [filters, setFilters] = useState<FilterValues>({
    vendedorId: "todos",
    produtoId: "todos",
    status: "todos",
    dataInicio: "",
    dataFim: "",
  });

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      vendedorId: "todos",
      produtoId: "todos",
      status: "todos",
      dataInicio: "",
      dataFim: "",
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== "" && value !== "todos");

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Vendedor</Label>
            <Select
              value={filters.vendedorId}
              onValueChange={(value) => handleFilterChange("vendedorId", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos">Todos</SelectItem>
                {vendedores?.map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Produto</Label>
            <Select
              value={filters.produtoId}
              onValueChange={(value) => handleFilterChange("produtoId", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos">Todos</SelectItem>
                {produtos?.map((produto) => (
                  <SelectItem key={produto.id} value={produto.id}>
                    {produto.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Reembolsado">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => handleFilterChange("dataInicio", e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(e) => handleFilterChange("dataFim", e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
