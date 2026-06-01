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
          "h-9 w-auto gap-1.5 rounded-lg border bg-white px-3 text-[12.5px] font-medium transition-colors",
          "border-[#E6EDF5] hover:border-[#D7DEE9] hover:bg-[#F8FAFC]",
          "data-[state=open]:border-[#2563EB] data-[state=open]:ring-2 data-[state=open]:ring-[rgba(37,99,235,0.18)]",
          isActive
            ? "text-[#0B1220] border-[#2563EB] ring-2 ring-[rgba(37,99,235,0.18)]"
            : "text-[#64748B]",
          className,
        )}
        style={{ minWidth }}
      >
        {Icon ? <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" /> : null}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border border-[#E6EDF5] bg-white shadow-lg">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
