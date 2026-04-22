import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FilterChip } from "./FilterChip";

export interface ActiveFilter {
  key: string;
  label: string;
  value?: string;
  onRemove: () => void;
}

interface FilterBarProps {
  /** Pills de filtros (PeriodToggle, DateRangePicker, FilterSelect, etc). */
  children: ReactNode;
  /** Filtros ativos — aparece linha separada abaixo com chips removíveis. */
  activeFilters?: ActiveFilter[];
  /** Handler pra limpar tudo. Só aparece se houver filtros ativos. */
  onClearAll?: () => void;
  /** Slot à direita para CTA (ex: "Exportar", "Novo"). */
  trailing?: ReactNode;
  className?: string;
  /** Label opcional à esquerda ("Filtros", "Ver"). */
  label?: string;
}

/**
 * Shell da filter bar — horizontal rail estilo Linear. Children são pills
 * inline; filtros ativos viram chips em linha abaixo quando presentes.
 */
export const FilterBar = ({
  children,
  activeFilters = [],
  onClearAll,
  trailing,
  className,
  label,
}: FilterBarProps) => {
  const hasChips = activeFilters.length > 0;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {label ? (
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {label}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
      </div>

      {hasChips && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              value={f.value}
              onRemove={f.onRemove}
            />
          ))}
          {onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpar tudo
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
