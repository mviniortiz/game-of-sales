import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon, Filter, Users, CreditCard, Package, X, ChevronDown, SlidersHorizontal } from "lucide-react";
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
  produtos?: Array<{ id: string; nome: string; company_id?: string }>;
  activeCompanyId?: string | null;
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
  activeCompanyId,
}: AdminFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
    <Card className="border border-slate-800 bg-slate-900 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header with quick actions - Always visible */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Filter className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Filtros
                {activeCount > 0 && (
                  <span className="text-xs font-medium text-indigo-300 bg-indigo-500/15 px-2 py-1 rounded-full ring-1 ring-indigo-500/20">
                    {activeCount} ativo{activeCount === 1 ? "" : "s"}
                  </span>
                )}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Period Buttons - Always visible */}
            {[
              { id: "hoje", label: "Hoje" },
              { id: "semana", label: "Esta Semana" },
              { id: "mes", label: "Este Mês" },
              { id: "30dias", label: "30 dias" },
            ].map((range) => (
              <Button
                key={range.id}
                variant={isQuickRangeActive(range.id) ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  isQuickRangeActive(range.id)
                    ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
                    : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
                onClick={() => setQuickRange(range.id)}
              >
                {range.label}
              </Button>
            ))}
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                onClick={handleClearAll}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Pills - Always visible when there are filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((f) => (
              <div
                key={f.key}
                className="inline-flex items-center h-7 rounded-full px-3 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-200"
              >
                <span className="font-medium text-indigo-300">{f.label}:</span>
                <span className="ml-1 text-slate-300">{f.value}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(f.key)}
                  className="ml-2 p-0.5 rounded-full hover:bg-indigo-500/30 transition-colors"
                >
                  <X className="h-3 w-3 text-indigo-400 hover:text-indigo-200 cursor-pointer" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Collapsible Advanced Filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-9 justify-between text-slate-400 hover:text-white hover:bg-slate-800/50 border border-slate-800 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros Avançados</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-800/30 border border-slate-800 rounded-xl">
              {/* Período Customizado */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-slate-300">
                  <CalendarIcon className="h-4 w-4 text-indigo-400" />
                  Período
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white",
                        !dateRange.from && "text-slate-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                      {formatRangeLabel() || <span className="text-slate-500">Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50 bg-slate-900 border border-slate-700 shadow-xl" align="start">
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

              {/* Vendedor */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-slate-300">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Vendedor
                </Label>
                <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                  <SelectTrigger className="w-full h-10 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-slate-900 border border-slate-700 shadow-xl">
                    <SelectItem value="todos">Todos</SelectItem>
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
                  <Label className="flex items-center gap-2 text-sm text-slate-300">
                    <CreditCard className="h-4 w-4 text-indigo-400" />
                    Pagamento
                  </Label>
                  <Select value={selectedFormaPagamento} onValueChange={setSelectedFormaPagamento}>
                    <SelectTrigger className="w-full h-10 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-slate-900 border border-slate-700 shadow-xl">
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
                  <Label className="flex items-center gap-2 text-sm text-slate-300">
                    <Package className="h-4 w-4 text-indigo-400" />
                    Produto
                  </Label>
                  <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                    <SelectTrigger className="w-full h-10 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-slate-900 border border-slate-700 shadow-xl">
                      <SelectItem value="todos">Todos</SelectItem>
                      {produtos
                        .filter((produto) => !activeCompanyId || produto.company_id === activeCompanyId)
                        .map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
