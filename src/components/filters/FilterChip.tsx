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
        "inline-flex h-6 items-center gap-1.5 rounded-full bg-[rgba(37,99,235,0.08)] pl-2.5 pr-1 text-[11px] font-medium ring-1 ring-[rgba(37,99,235,0.22)] transition-colors hover:bg-[rgba(37,99,235,0.12)]",
        className,
      )}
    >
      <span className="text-[#64748B]">{label}</span>
      {value ? <span className="text-[#0B1220] font-semibold">{value}</span> : null}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[#2563EB] transition-colors hover:bg-[rgba(37,99,235,0.18)]"
        aria-label={`Remover ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};
