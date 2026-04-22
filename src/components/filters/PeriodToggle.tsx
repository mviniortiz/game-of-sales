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
        "inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5 backdrop-blur-sm",
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
              "h-7 rounded-full px-3 text-[11px] font-medium transition-colors",
              active
                ? "bg-white/10 text-foreground shadow-sm ring-1 ring-white/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {longLabels ? range.longLabel : range.label}
          </button>
        );
      })}
    </div>
  );
};
