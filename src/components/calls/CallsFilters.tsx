import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import {
  format,
  isSameDay,
  differenceInCalendarDays,
  startOfMonth,
  startOfWeek,
} from "date-fns";
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
  isAdmin?: boolean;
}

const QUICK_RANGES = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "30dias", label: "30 dias" },
] as const;

const RESULTADO_OPTIONS = [
  { value: "todos", label: "Todos resultados" },
  { value: "venda", label: "Venda fechada" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "reagendar", label: "Reagendar" },
];

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
    if (dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yy")} – ${format(dateRange.to, "dd/MM/yy")}`;
    }
    return format(dateRange.from, "dd/MM/yy");
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

  const activeChips = [
    dateRange.from
      ? { key: "dateRange", label: formatRangeLabel() || "" }
      : null,
    isAdmin && selectedVendedor !== "todos"
      ? {
          key: "vendedor",
          label: vendedores.find((v) => v.id === selectedVendedor)?.nome || "Vendedor",
        }
      : null,
    selectedResultado !== "todos"
      ? {
          key: "resultado",
          label:
            RESULTADO_OPTIONS.find((r) => r.value === selectedResultado)?.label ||
            selectedResultado,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const handleClearAll = () => {
    setDateRange({});
    setSelectedVendedor("todos");
    setSelectedResultado("todos");
  };

  const handleRemoveChip = (key: string) => {
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

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick ranges */}
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background/40 p-0.5">
          {QUICK_RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => setQuickRange(range.id)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-medium rounded-md transition-colors",
                isQuickRangeActive(range.id)
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-[11px] border-border bg-background/40 hover:bg-card",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {formatRangeLabel() || "Período customizado"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              locale={ptBR}
              numberOfMonths={1}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-[120px]" />

        {/* Vendedor (admin only) */}
        {isAdmin && (
          <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-[11px] border-border bg-background/40 gap-1.5">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Resultado */}
        <Select value={selectedResultado} onValueChange={setSelectedResultado}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-[11px] border-border bg-background/40 gap-1.5">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            {RESULTADO_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10.5px] font-medium"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => handleRemoveChip(chip.key)}
                className="ml-0.5 hover:text-emerald-300 transition-colors"
                aria-label={`Remover ${chip.label}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10.5px] text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  );
};
