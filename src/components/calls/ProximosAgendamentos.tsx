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
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-400" />
          Próximos Agendamentos
        </CardTitle>
        <p className="text-xs text-slate-500">Calls agendadas para os próximos dias</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {agendamentos.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
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
                  className="p-3 border border-white/5 rounded-lg hover:border-indigo-500/30 bg-slate-800/30 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                        <Clock className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white">
                            {isToday && (
                              <span className="text-emerald-400">Hoje, </span>
                            )}
                            {isTomorrow && (
                              <span className="text-blue-400">Amanhã, </span>
                            )}
                            {!isToday && !isTomorrow && (
                              <span className="text-slate-400">
                                {format(data, "dd/MM", { locale: ptBR })},{" "}
                              </span>
                            )}
                            {format(data, "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="font-semibold text-white truncate">
                          {agendamento.cliente_nome}
                        </p>
                        <p className="text-xs text-slate-500">
                          {agendamento.vendedor}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRegistrarClick(agendamento.id)}
                      className="h-8 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-medium shrink-0"
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
