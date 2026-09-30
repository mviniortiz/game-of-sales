import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  icon?: LucideIcon;
  /** Valor neutro (ex: "todos") — quando ativo não conta como filtro aplicado visualmente. */
  neutralValue?: string;
  className?: string;
  minWidth?: string;
}

/**
 * Select em formato pill, integra com FilterBar. Se `value !== neutralValue`
 * ganha ring accent pra sinalizar filtro ativo sem depender dos chips.
 */
export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  neutralValue,
  className,
  minWidth = "140px",
}: FilterSelectProps) => {
  const isActive = neutralValue !== undefined && value !== neutralValue;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-auto gap-1.5 rounded-full border bg-[var(--vyz-surface-1)] px-3 text-[12.5px] font-medium transition-[border-color,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]",
          "border-[var(--vyz-border)] hover:border-[var(--vyz-border-strong)] hover:bg-[var(--vyz-surface-2)]",
          "data-[state=open]:border-[var(--vyz-accent)] data-[state=open]:ring-2 data-[state=open]:ring-[var(--vyz-accent-soft-12)]",
          isActive
            ? "text-[var(--vyz-text-primary)] border-[var(--vyz-accent)] ring-2 ring-[var(--vyz-accent-soft-12)]"
            : "text-[var(--vyz-text-muted)]",
          className,
        )}
        style={{ minWidth }}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" /> : null}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border border-[var(--vyz-border)] bg-popover shadow-lg">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
