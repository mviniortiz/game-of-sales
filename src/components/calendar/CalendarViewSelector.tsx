import { Button } from "@/components/ui/button";
import { Calendar, List, Grid3x3 } from "lucide-react";

type ViewType = "day" | "week" | "month";

interface CalendarViewSelectorProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function CalendarViewSelector({ view, onViewChange }: CalendarViewSelectorProps) {
  return (
    <div className="flex gap-1 md:gap-2 border rounded-lg p-1 bg-muted/50">
      <Button
        variant={view === "day" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("day")}
        className="px-2 md:px-3"
      >
        <List className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Dia</span>
      </Button>
      <Button
        variant={view === "week" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("week")}
        className="px-2 md:px-3"
      >
        <Grid3x3 className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Semana</span>
      </Button>
      <Button
        variant={view === "month" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("month")}
        className="px-2 md:px-3"
      >
        <Calendar className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Mes</span>
      </Button>
    </div>
  );
}
