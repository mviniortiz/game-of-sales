import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, Users, DollarSign, Target, X } from "lucide-react";
import { format, isSameDay, differenceInCalendarDays, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CallsFiltersProps {
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  selectedVendedor: string;
  setSelectedVendedor: (value: string) => void;
  selectedResultado: string;
  setSelectedResultado: (value: string) => void;
  vendedores: Array<{ id: string; nome: string }>;
  isAdmin?: boolean; // Only show vendedor filter for admins
}

export const CallsFilters = ({
  dateRange,
  setDateRange,
  selectedVendedor,
  setSelectedVendedor,
  selectedResultado,
  setSelectedResultado,
  vendedores,
  isAdmin = false,
}: CallsFiltersProps) => {
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
    isAdmin && selectedVendedor !== "todos"
      ? {
        key: "vendedor",
        label: "Vendedor",
        value: vendedores.find((v) => v.id === selectedVendedor)?.nome || "Selecionado",
      }
      : null,
    selectedResultado !== "todos"
      ? { key: "resultado", label: "Resultado", value: mapResultadoLabel(selectedResultado) }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  const activeCount = activeFilters.length;

  const handleClearAll = () => {
    setDateRange({});
    setSelectedVendedor("todos");
    setSelectedResultado("todos");
  };

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case "dateRange":
        setDateRange({});
        break;
      case "vendedor":
        setSelectedVendedor("todos");
        break;
      case "resultado":
        setSelectedResultado("todos");
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

  function mapResultadoLabel(value: string) {
    switch (value) {
      case "venda":
        return "Venda Fechada";
      case "sem_interesse":
        return "Sem Interesse";
      case "reagendar":
        return "Reagendar";
      default:
        return value;
    }
  }

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Filtros (Calls)
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {activeCount} ativo{activeCount === 1 ? "" : "s"}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">Aplique rápido por período, vendedor e resultado.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-border bg-muted text-foreground hover:bg-muted/80"
              onClick={() => setDateRange({ from: new Date(), to: new Date() })}
            >
              Hoje
            </Button>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-rose-600 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                onClick={handleClearAll}
              >
                Limpar tudo
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[38px] border border-border rounded-xl bg-muted/60 dark:bg-secondary px-3 py-2">
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
                className="h-8 rounded-full px-3 text-xs bg-muted text-foreground border-border hover:bg-muted/80 dark:bg-white/10 dark:text-white"
              >
                <span className="font-semibold text-primary">{f.label}:</span>
                <span className="ml-1">{f.value}</span>
                <X
                  className="ml-2 h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFilter(f.key);
                  }}
                />
              </Button>
            ))
          )}
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {/* Período Customizado */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-10 justify-start text-left font-normal bg-background border-border text-foreground hover:bg-muted",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {formatRangeLabel() || <span className="text-sm text-muted-foreground">Selecione</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border shadow-md" align="start">
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
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Atalhos</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "hoje", label: "Hoje" },
                { id: "semana", label: "Semana" },
                { id: "mes", label: "Mês" },
                { id: "30dias", label: "30 dias" },
              ].map((range) => (
                <Button
                  key={range.id}
                  variant={isQuickRangeActive(range.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickRange(range.id)}
                  className={cn(
                    "h-9 text-xs",
                    isQuickRangeActive(range.id)
                      ? "bg-primary text-primary-foreground border-primary/70"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Vendedor - Only for Admin */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Vendedor
              </Label>
              <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                <SelectTrigger className="h-10 bg-background border-border text-foreground focus:ring-indigo-500">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="todos">Todos os vendedores</SelectItem>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resultado da Call */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" />
              Resultado
            </Label>
            <Select value={selectedResultado} onValueChange={setSelectedResultado}>
              <SelectTrigger className="h-10 bg-background border-border text-foreground focus:ring-indigo-500">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="todos">Todos os resultados</SelectItem>
                <SelectItem value="venda">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    Venda Fechada
                  </div>
                </SelectItem>
                <SelectItem value="sem_interesse">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-red-500" />
                    Sem Interesse
                  </div>
                </SelectItem>
                <SelectItem value="reagendar">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                    Reagendar
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
