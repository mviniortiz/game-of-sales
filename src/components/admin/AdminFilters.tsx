import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, Users, CreditCard, Package, X } from "lucide-react";
import { format, isSameDay, differenceInCalendarDays, startOfMonth, startOfWeek } from "date-fns";
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

  const formatRangeLabel = () => {
    if (!dateRange.from) return null;
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`;
    }
    return format(dateRange.from, "dd/MM/yy");
  };

  const activeFilters = [
    dateRange.from
      ? { key: "dateRange", label: "Período", value: formatRangeLabel() || "" }
      : null,
    selectedVendedor !== "todos"
      ? {
          key: "vendedor",
          label: "Vendedor",
          value: vendedores.find((v) => v.id === selectedVendedor)?.nome || "Selecionado",
        }
      : null,
    setSelectedFormaPagamento &&
    selectedFormaPagamento &&
    selectedFormaPagamento !== "todas"
      ? { key: "formaPagamento", label: "Pagamento", value: selectedFormaPagamento }
      : null,
    setSelectedProduto && selectedProduto && selectedProduto !== "todos"
      ? { key: "produto", label: "Produto", value: produtos.find((p) => p.id === selectedProduto)?.nome || "Selecionado" }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  const activeCount = activeFilters.length;

  const handleClearAll = () => {
    setDateRange({});
    setSelectedVendedor("todos");
    if (setSelectedFormaPagamento) {
      setSelectedFormaPagamento("todas");
    }
    if (setSelectedProduto) {
      setSelectedProduto("todos");
    }
  };

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case "dateRange":
        setDateRange({});
        break;
      case "vendedor":
        setSelectedVendedor("todos");
        break;
      case "formaPagamento":
        setSelectedFormaPagamento?.("todas");
        break;
      case "produto":
        setSelectedProduto?.("todos");
        break;
    }
  };

  const isQuickRangeActive = (range: string) => {
    if (!dateRange.from || !dateRange.to) return false;
    const today = new Date();
    switch (range) {
      case "hoje":
        return isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
      case "semana":
        return (
          isSameDay(dateRange.to, today) &&
          isSameDay(dateRange.from, startOfWeek(today))
        );
      case "mes":
        return (
          isSameDay(dateRange.to, today) &&
          isSameDay(dateRange.from, startOfMonth(today))
        );
      case "30dias":
        return (
          isSameDay(dateRange.to, today) &&
          differenceInCalendarDays(today, dateRange.from) === 30
        );
      default:
        return false;
    }
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center">
              <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Filtros Globais
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-1 rounded-full">
                  {activeCount} ativo{activeCount === 1 ? "" : "s"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">Aplique combinações rápidas ou escolha filtros individuais.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-gray-200 dark:border-border bg-white dark:bg-secondary text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-secondary/80"
              onClick={() => setDateRange({ from: new Date(), to: new Date() })}
            >
              Hoje
            </Button>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                onClick={handleClearAll}
              >
                Limpar tudo
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[38px] border border-border rounded-xl bg-card px-3 py-2">
          {activeFilters.length === 0 ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Nenhum filtro ativo
            </span>
          ) : (
            activeFilters.map((f) => (
              <Button
                key={f.key}
                variant="secondary"
                size="sm"
                className="h-8 rounded-full px-3 text-xs bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-100"
              >
                <span className="font-semibold text-indigo-700 dark:text-indigo-100">{f.label}:</span>
                <span className="ml-1 text-foreground">{f.value}</span>
                <X
                  className="ml-2 h-3.5 w-3.5 text-indigo-500 dark:text-indigo-200 hover:text-indigo-700 dark:hover:text-indigo-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFilter(f.key);
                  }}
                />
              </Button>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Período Customizado */}
          <div className="space-y-2 lg:col-span-2">
            <Label className="flex items-center gap-2 text-sm text-foreground">
              <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-200" />
              Período Customizado
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground hover:bg-gray-50 dark:hover:bg-secondary/80",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-300" />
                  {formatRangeLabel() || <span className="text-muted-foreground">Selecione o período</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-white dark:bg-card border border-gray-200 dark:border-border shadow-md" align="start">
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
            <Label className="text-sm text-foreground">Períodos Rápidos</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: "hoje", label: "Hoje" },
                { id: "semana", label: "Esta Semana" },
                { id: "mes", label: "Este Mês" },
                { id: "30dias", label: "Últimos 30 dias" },
              ].map((range) => (
                <Button
                  key={range.id}
                  variant={isQuickRangeActive(range.id) ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9",
                    isQuickRangeActive(range.id)
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground hover:bg-gray-50 dark:hover:bg-secondary/80"
                  )}
                  onClick={() => setQuickRange(range.id)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Vendedor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-foreground">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-200" />
              Vendedor
            </Label>
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="w-full h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground">
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm">
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
              <Label className="flex items-center gap-2 text-sm text-foreground">
                <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-200" />
                Forma de Pagamento
              </Label>
              <Select value={selectedFormaPagamento} onValueChange={setSelectedFormaPagamento}>
                <SelectTrigger className="w-full h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm">
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
              <Label className="flex items-center gap-2 text-sm text-foreground">
                <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-200" />
                Produto
              </Label>
              <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                <SelectTrigger className="w-full h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm">
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
