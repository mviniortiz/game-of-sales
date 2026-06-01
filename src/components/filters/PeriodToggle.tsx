import { cn } from "@/lib/utils";
import { computeQuickRange, isQuickRangeActive, QUICK_RANGES, type DateRange, type QuickRangeId } from "./useDateRange";

interface PeriodToggleProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  /** Omit specific ranges if not relevant. */
  ranges?: QuickRangeId[];
  /** Use long labels ("Esta semana" vs "Semana"). */
  longLabels?: boolean;
}

/**
 * Segmented control para presets de período. Integra com DateRangePicker
 * através do mesmo `DateRange` compartilhado.
 */
export const PeriodToggle = ({
  value,
  onChange,
  className,
  ranges,
  longLabels = false,
}: PeriodToggleProps) => {
  const items = ranges
    ? QUICK_RANGES.filter((r) => ranges.includes(r.id))
    : QUICK_RANGES;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-[#E6EDF5] bg-[#F8FAFC] p-0.5",
        className,
      )}
      role="tablist"
    >
      {items.map((range) => {
        const active = isQuickRangeActive(range.id, value);
        return (
          <button
            key={range.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(computeQuickRange(range.id))}
            className={cn(
              "h-7 rounded-md px-3 text-[11.5px] font-medium transition-colors",
              active
                ? "bg-white text-[#0B1220] shadow-sm ring-1 ring-[#E6EDF5]"
                : "text-[#64748B] hover:text-[#0B1220]",
            )}
          >
            {longLabels ? range.longLabel : range.label}
          </button>
        );
      })}
    </div>
  );
};
