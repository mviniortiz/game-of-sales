import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface FilterChipProps {
  label: string;
  value?: string;
  onRemove: () => void;
  className?: string;
}

/**
 * Chip de filtro ativo. Usa accent emerald do brand guide (rgba 0,227,122).
 */
export const FilterChip = ({ label, value, onRemove, className }: FilterChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/10 pl-2.5 pr-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/25 transition-colors hover:bg-emerald-500/15",
        className,
      )}
    >
      <span className="text-emerald-400/80">{label}</span>
      {value ? <span className="text-foreground/90">{value}</span> : null}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-emerald-400/70 transition-colors hover:bg-emerald-500/25 hover:text-emerald-200"
        aria-label={`Remover ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};
