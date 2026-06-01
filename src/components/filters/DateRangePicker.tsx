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
            "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[12.5px] font-medium transition-colors",
            "border-[#E6EDF5] hover:border-[#D7DEE9] hover:bg-[#F8FAFC]",
            hasValue ? "text-[#0B1220] border-[#2563EB] ring-2 ring-[rgba(37,99,235,0.18)]" : "text-[#64748B]",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border border-[#E6EDF5] bg-white p-0 shadow-lg"
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
