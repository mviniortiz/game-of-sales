import { Button } from "@/components/ui/button";
import { Calendar, List, Grid3x3 } from "lucide-react";

type ViewType = "day" | "week" | "month";

interface CalendarViewSelectorProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function CalendarViewSelector({ view, onViewChange }: CalendarViewSelectorProps) {
  return (
    <div className="flex gap-2 border rounded-lg p-1 bg-muted/50">
      <Button
        variant={view === "day" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("day")}
      >
        <List className="h-4 w-4 mr-2" />
        Dia
      </Button>
      <Button
        variant={view === "week" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("week")}
      >
        <Grid3x3 className="h-4 w-4 mr-2" />
        Semana
      </Button>
      <Button
        variant={view === "month" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("month")}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Mês
      </Button>
    </div>
  );
}
