import { useMemo } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useReminders, useReminderMutations } from "@/hooks/useReminders";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function relativeTime(dateStr: string): { label: string; overdue: boolean } {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diffMs = target - now;
  const absDiff = Math.abs(diffMs);
  const overdue = diffMs < 0;

  const minutes = Math.floor(absDiff / 60_000);
  const hours = Math.floor(absDiff / 3_600_000);
  const days = Math.floor(absDiff / 86_400_000);

  let label: string;
  if (days >= 1) {
    label = overdue ? `atrasado ${days}d` : `em ${days}d`;
  } else if (hours >= 1) {
    label = overdue ? `atrasado ${hours}h` : `em ${hours}h`;
  } else {
    label = overdue ? `atrasado ${Math.max(1, minutes)}min` : `em ${Math.max(1, minutes)}min`;
  }

  return { label, overdue };
}

export function ReminderBell() {
  const { user, companyId, isSuperAdmin } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;
  const navigate = useNavigate();

  const { data: reminders = [] } = useReminders(user?.id, effectiveCompanyId);
  const { completeReminder } = useReminderMutations(user?.id, effectiveCompanyId);

  const { dueCount, overdueCount } = useMemo(() => {
    const now = Date.now();
    let due = 0;
    let overdue = 0;
    for (const r of reminders) {
      const t = new Date(r.remind_at).getTime();
      if (t <= now) {
        overdue++;
        due++;
      } else if (t <= now + 24 * 60 * 60 * 1000) {
        due++;
      }
    }
    return { dueCount: due, overdueCount: overdue };
  }, [reminders]);

  const displayCount = dueCount;
  const hasOverdue = overdueCount > 0;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 shrink-0"
            >
              <Bell
                className={`h-5 w-5 transition-colors ${
                  hasOverdue
                    ? "text-rose-400 animate-pulse"
                    : displayCount > 0
                    ? "text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
              {displayCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none shadow-sm shadow-rose-500/40">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {displayCount > 0
            ? `${displayCount} lembrete${displayCount > 1 ? "s" : ""} pendente${displayCount > 1 ? "s" : ""}`
            : "Sem lembretes"}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="start"
        side="right"
        className="w-80 p-0"
      >
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Lembretes</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {displayCount > 0
              ? `${displayCount} pendente${displayCount > 1 ? "s" : ""}`
              : "Nenhum lembrete pendente"}
          </p>
        </div>

        <ScrollArea className="max-h-80">
          {reminders.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhum lembrete agendado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reminders.map((reminder) => {
                const { label, overdue } = relativeTime(reminder.remind_at);
                return (
                  <div
                    key={reminder.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      overdue ? "bg-rose-500/5" : ""
                    }`}
                  >
                    <Checkbox
                      className="mt-0.5 shrink-0"
                      onCheckedChange={() => completeReminder.mutate(reminder.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        className="text-left w-full group"
                        onClick={() => navigate(`/deals/${reminder.deal_id}`)}
                      >
                        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                          {reminder.title}
                        </p>
                        {reminder.deal_title && (
                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            {reminder.deal_title}
                          </p>
                        )}
                      </button>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] shrink-0 whitespace-nowrap ${
                        overdue
                          ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                          : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
