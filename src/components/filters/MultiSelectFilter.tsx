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
            "inline-flex h-9 items-center gap-1.5 rounded-full border bg-[var(--vyz-surface-1)] px-3 text-[12.5px] font-medium transition-[border-color,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]",
            "border-[var(--vyz-border)] hover:border-[var(--vyz-border-strong)] hover:bg-[var(--vyz-surface-2)]",
            isActive ? "text-[var(--vyz-text-primary)] border-[var(--vyz-accent)] ring-2 ring-[var(--vyz-accent-soft-12)]" : "text-[var(--vyz-text-muted)]",
          )}
          style={{ minWidth }}
        >
          {Icon ? <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" /> : null}
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5 bg-popover border border-[var(--vyz-border)] shadow-lg">
        <button
          type="button"
          onClick={() => onChange([])}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-[var(--vyz-text-strong)] hover:bg-[var(--vyz-surface-2)] transition-colors"
        >
          <span className={cn("h-4 w-4 rounded border flex items-center justify-center", !isActive ? "bg-[var(--vyz-accent)] border-[var(--vyz-accent)]" : "border-[var(--vyz-border-strong)]")}>
            {!isActive && <Check className="h-3 w-3 text-white" />}
          </span>
          {allLabel}
        </button>
        <div className="my-1 h-px bg-[var(--vyz-border-subtle)]" />
        <div className="max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-[var(--vyz-text-primary)] hover:bg-[var(--vyz-surface-2)] transition-colors"
              >
                <span className={cn("h-4 w-4 rounded border flex items-center justify-center", checked ? "bg-[var(--vyz-accent)] border-[var(--vyz-accent)]" : "border-[var(--vyz-border-strong)]")}>
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
