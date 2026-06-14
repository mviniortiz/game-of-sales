import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  /** Itens selecionados. Vazio = "todos". */
  selected: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  icon?: LucideIcon;
  /** Texto quando nada selecionado (= todos). */
  allLabel: string;
  minWidth?: string;
}

/**
 * Filtro multi-seleção em pill (mesma linguagem visual do FilterSelect).
 * Lista vazia significa "todos" — não conta como filtro ativo.
 */
export const MultiSelectFilter = ({
  selected,
  onChange,
  options,
  icon: Icon,
  allLabel,
  minWidth = "160px",
}: MultiSelectFilterProps) => {
  const isActive = selected.length > 0;

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const label = !isActive
    ? allLabel
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? `${selected.length}`
      : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[12.5px] font-medium transition-colors",
            "border-[#E6EDF5] hover:border-[#D7DEE9] hover:bg-[#F8FAFC]",
            isActive ? "text-[#0B1220] border-[#2563EB] ring-2 ring-[rgba(37,99,235,0.18)]" : "text-[#64748B]",
          )}
          style={{ minWidth }}
        >
          {Icon ? <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" /> : null}
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5 bg-white border border-[#E6EDF5] shadow-lg">
        <button
          type="button"
          onClick={() => onChange([])}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-[#475569] hover:bg-[#F1F5F9] transition-colors"
        >
          <span className={cn("h-4 w-4 rounded border flex items-center justify-center", !isActive ? "bg-[#2563EB] border-[#2563EB]" : "border-[#CBD5E1]")}>
            {!isActive && <Check className="h-3 w-3 text-white" />}
          </span>
          {allLabel}
        </button>
        <div className="my-1 h-px bg-[#EEF2F7]" />
        <div className="max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-[#0B1220] hover:bg-[#F1F5F9] transition-colors"
              >
                <span className={cn("h-4 w-4 rounded border flex items-center justify-center", checked ? "bg-[#2563EB] border-[#2563EB]" : "border-[#CBD5E1]")}>
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="truncate text-left">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
