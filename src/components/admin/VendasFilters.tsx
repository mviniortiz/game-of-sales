import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, CalendarIcon, Users, Package, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface VendasFiltersProps {
  vendedores: Array<{ id: string; nome: string }>;
  produtos: Array<{ id: string; nome: string }>;
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  vendedorId: string;
  produtoId: string;
  status: string;
  dateRange: { from?: Date; to?: Date };
}

export const VendasFilters = ({ vendedores, produtos, onFilterChange }: VendasFiltersProps) => {
  const [filters, setFilters] = useState<FilterValues>({
    vendedorId: "todos",
    produtoId: "todos",
    status: "todos",
    dateRange: {},
  });

  const handleFilterChange = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      vendedorId: "todos",
      produtoId: "todos",
      status: "todos",
      dateRange: {},
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const setQuickRange = (range: string) => {
    const today = new Date();
    const from = new Date();
    
    switch (range) {
      case "hoje":
        handleFilterChange("dateRange", { from: today, to: today });
        break;
      case "semana":
        from.setDate(today.getDate() - today.getDay());
        handleFilterChange("dateRange", { from, to: today });
        break;
      case "mes":
        from.setDate(1);
        handleFilterChange("dateRange", { from, to: today });
        break;
      case "30dias":
        from.setDate(today.getDate() - 30);
        handleFilterChange("dateRange", { from, to: today });
        break;
    }
  };

  const hasActiveFilters = 
    filters.vendedorId !== "todos" || 
    filters.produtoId !== "todos" || 
    filters.status !== "todos" ||
    filters.dateRange.from !== undefined;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Primeira linha: Período */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Período Customizado */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Período Customizado
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "dd/MM/yy")} - {format(filters.dateRange.to, "dd/MM/yy")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Selecione o período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                    onSelect={(range) => handleFilterChange("dateRange", { from: range?.from, to: range?.to })}
                    locale={ptBR}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Períodos Rápidos */}
            <div className="space-y-2">
              <Label>Períodos Rápidos</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setQuickRange("hoje")}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setQuickRange("semana")}
                >
                  Esta Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setQuickRange("mes")}
                >
                  Este Mês
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setQuickRange("30dias")}
                >
                  Últimos 30 dias
                </Button>
              </div>
            </div>
          </div>

          {/* Segunda linha: Outros filtros */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Vendedor
              </Label>
              <Select
                value={filters.vendedorId}
                onValueChange={(value) => handleFilterChange("vendedorId", value)}
              >
                <SelectTrigger className="bg-background h-9">
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
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Produto
              </Label>
              <Select
                value={filters.produtoId}
                onValueChange={(value) => handleFilterChange("produtoId", value)}
              >
                <SelectTrigger className="bg-background h-9">
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
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Status
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="bg-background h-9">
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
