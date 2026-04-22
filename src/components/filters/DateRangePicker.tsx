import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "./useDateRange";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  numberOfMonths?: 1 | 2;
  className?: string;
}

/**
 * Pill-style date range picker (triggers popover com calendar dual).
 * Quando nada selecionado, mostra placeholder ghost.
 */
export const DateRangePicker = ({
  value,
  onChange,
  placeholder = "Período",
  numberOfMonths = 2,
  className,
}: DateRangePickerProps) => {
  const hasValue = Boolean(value.from);
  const label = (() => {
    if (!value.from) return placeholder;
    if (value.to) return `${format(value.from, "dd/MM/yy")} – ${format(value.to, "dd/MM/yy")}`;
    return format(value.from, "dd/MM/yy");
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11.5px] font-medium backdrop-blur-sm transition-colors",
            "hover:border-white/15 hover:bg-white/[0.06]",
            hasValue ? "text-foreground ring-1 ring-emerald-500/40" : "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border border-white/10 bg-card/95 p-0 shadow-xl backdrop-blur-xl"
        align="start"
      >
        <Calendar
          mode="range"
          selected={{ from: value.from, to: value.to }}
          onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
          locale={ptBR}
          numberOfMonths={numberOfMonths}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
