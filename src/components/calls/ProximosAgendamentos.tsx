import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  vendedor: string;
}

interface ProximosAgendamentosProps {
  agendamentos: Agendamento[];
  onRegistrarClick: (id: string) => void;
}

export const ProximosAgendamentos = ({
  agendamentos,
  onRegistrarClick,
}: ProximosAgendamentosProps) => {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          Próximos Agendamentos
        </CardTitle>
        <p className="text-xs text-muted-foreground">Calls agendadas para os próximos dias</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {agendamentos.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum agendamento pendente
            </div>
          ) : (
            agendamentos.map((agendamento) => {
              const data = new Date(agendamento.data_agendamento);
              const isToday = format(data, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const isTomorrow =
                format(data, "yyyy-MM-dd") ===
                format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

              return (
                <div
                  key={agendamento.id}
                  className="p-3 border border-border rounded-lg hover:border-emerald-500/30 bg-muted/60 dark:bg-slate-800/30 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                        <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground">
                            {isToday && (
                              <span className="text-emerald-600 dark:text-emerald-300">Hoje, </span>
                            )}
                            {isTomorrow && (
                              <span className="text-blue-600 dark:text-blue-300">Amanhã, </span>
                            )}
                            {!isToday && !isTomorrow && (
                              <span className="text-muted-foreground">
                                {format(data, "dd/MM", { locale: ptBR })},{" "}
                              </span>
                            )}
                            {format(data, "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground truncate">
                          {agendamento.cliente_nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {agendamento.vendedor}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRegistrarClick(agendamento.id)}
                      className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shrink-0 shadow-md shadow-primary/20"
                    >
                      <Phone className="h-3 w-3 mr-1.5" />
                      Registrar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
