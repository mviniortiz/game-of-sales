import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays } from "lucide-react";
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
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Próximos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agendamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
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
                  className="p-4 border border-border/50 rounded-lg hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {isToday && "Hoje "}
                          {isTomorrow && "Amanhã "}
                          {format(data, "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="font-semibold text-lg">
                        {agendamento.cliente_nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vendedor: {agendamento.vendedor}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRegistrarClick(agendamento.id)}
                    >
                      Registrar Call
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
