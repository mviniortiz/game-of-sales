import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down";
  iconClassName?: string;
}

export const StatCard = ({ title, value, change, icon: Icon, trend, iconClassName }: StatCardProps) => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all hover-scale">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg", iconClassName || "bg-primary/10")}>
            <Icon className={cn("h-5 w-5", iconClassName ? "" : "text-primary")} />
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1.5 text-sm font-medium shrink-0",
              trend === "up" ? "text-success" : "text-destructive"
            )}>
              {trend === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground leading-tight">{title}</p>
          <p className="text-2xl font-bold break-words">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};
