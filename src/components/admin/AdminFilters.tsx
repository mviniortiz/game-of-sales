import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, Users, CreditCard, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AdminFiltersProps {
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  selectedVendedor: string;
  setSelectedVendedor: (value: string) => void;
  vendedores: Array<{ id: string; nome: string }>;
  selectedFormaPagamento?: string;
  setSelectedFormaPagamento?: (value: string) => void;
  selectedProduto?: string;
  setSelectedProduto?: (value: string) => void;
  produtos?: Array<{ id: string; nome: string }>;
}

export const AdminFilters = ({
  dateRange,
  setDateRange,
  selectedVendedor,
  setSelectedVendedor,
  vendedores,
  selectedFormaPagamento,
  setSelectedFormaPagamento,
  selectedProduto,
  setSelectedProduto,
  produtos = [],
}: AdminFiltersProps) => {
  const formasPagamento = [
    "Cartão de Crédito",
    "PIX",
    "Recorrência",
    "Boleto",
    "Parte PIX Parte Cartão",
    "Múltiplos Cartões",
  ];
  const setQuickRange = (range: string) => {
    const today = new Date();
    const from = new Date();
    
    switch (range) {
      case "hoje":
        setDateRange({ from: today, to: today });
        break;
      case "semana":
        from.setDate(today.getDate() - today.getDay());
        setDateRange({ from, to: today });
        break;
      case "mes":
        from.setDate(1);
        setDateRange({ from, to: today });
        break;
      case "30dias":
        from.setDate(today.getDate() - 30);
        setDateRange({ from, to: today });
        break;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Filtros Globais</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Período Customizado */}
          <div className="space-y-2 lg:col-span-2">
            <Label className="flex items-center gap-2 text-sm">
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
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  locale={ptBR}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Períodos Rápidos */}
          <div className="space-y-2 lg:col-span-4">
            <Label className="text-sm">Períodos Rápidos</Label>
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

          {/* Vendedor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              Vendedor
            </Label>
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Forma de Pagamento */}
          {setSelectedFormaPagamento && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-primary" />
                Forma de Pagamento
              </Label>
              <Select value={selectedFormaPagamento} onValueChange={setSelectedFormaPagamento}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="todas">Todas</SelectItem>
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Produto */}
          {setSelectedProduto && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" />
                Produto
              </Label>
              <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover">
                  <SelectItem value="todos">Todos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
