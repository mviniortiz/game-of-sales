import { differenceInCalendarDays, isSameDay, startOfMonth, startOfWeek } from "date-fns";

export type DateRange = { from?: Date; to?: Date };

export type QuickRangeId = "hoje" | "semana" | "mes" | "30dias";

export const QUICK_RANGES: Array<{ id: QuickRangeId; label: string; longLabel: string }> = [
  { id: "hoje", label: "Hoje", longLabel: "Hoje" },
  { id: "semana", label: "Semana", longLabel: "Esta semana" },
  { id: "mes", label: "Mês", longLabel: "Este mês" },
  { id: "30dias", label: "30 dias", longLabel: "Últimos 30 dias" },
];

export function computeQuickRange(range: QuickRangeId): DateRange {
  const today = new Date();
  const from = new Date();
  switch (range) {
    case "hoje":
      return { from: today, to: today };
    case "semana":
      from.setDate(today.getDate() - today.getDay());
      return { from, to: today };
    case "mes":
      from.setDate(1);
      return { from, to: today };
    case "30dias":
      from.setDate(today.getDate() - 30);
      return { from, to: today };
  }
}

export function isQuickRangeActive(range: QuickRangeId, dateRange: DateRange): boolean {
  if (!dateRange.from || !dateRange.to) return false;
  const today = new Date();
  switch (range) {
    case "hoje":
      return isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
    case "semana":
      return isSameDay(dateRange.to, today) && isSameDay(dateRange.from, startOfWeek(today));
    case "mes":
      return isSameDay(dateRange.to, today) && isSameDay(dateRange.from, startOfMonth(today));
    case "30dias":
      return isSameDay(dateRange.to, today) && differenceInCalendarDays(today, dateRange.from) === 30;
  }
}
