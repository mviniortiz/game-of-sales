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
          "h-8 gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11.5px] font-medium backdrop-blur-sm transition-colors",
          "hover:border-white/15 hover:bg-white/[0.06]",
          "data-[state=open]:border-white/20 data-[state=open]:bg-white/[0.08]",
          isActive
            ? "text-foreground ring-1 ring-emerald-500/40"
            : "text-muted-foreground",
          className,
        )}
        style={{ minWidth }}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 opacity-70" /> : null}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border border-white/10 bg-card/95 shadow-xl backdrop-blur-xl">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
