import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down";
  iconClassName?: string;
  subtitle?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  iconClassName,
  subtitle
}: StatCardProps) => {
  const isPositive = trend === "up";
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon with glow */}
          <div className={cn(
            "relative p-3 rounded-xl group-hover:scale-110 transition-transform",
            iconClassName || "bg-primary/10"
          )}>
            <div className={cn(
              "absolute inset-0 rounded-xl blur-lg opacity-50",
              iconClassName || "bg-primary/10"
            )} />
            <Icon className={cn(
              "h-6 w-6 relative z-10",
              iconClassName ? "" : "text-primary"
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-white tabular-nums tracking-tight break-words">
              {value}
            </p>
            
            {/* Trend or Subtitle */}
            <div className="flex items-center gap-2 mt-1">
              {change !== undefined && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                )}>
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {Math.abs(change).toFixed(1)}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-slate-500">
                  {subtitle}
                </span>
              )}
              {change !== undefined && !subtitle && (
                <span className="text-xs text-slate-500">
                  vs mês anterior
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
