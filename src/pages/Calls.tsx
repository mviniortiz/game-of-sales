import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { Calendar, Phone, TrendingUp, Users } from "lucide-react";

const Calls = () => {
  // Mock data - will be connected to real data later
  const agendamentos = 245;
  const callsRealizadas = 198;
  const taxaComparecimento = (callsRealizadas / agendamentos * 100).toFixed(1);
  const vendas = 45;
  const taxaConversao = (vendas / callsRealizadas * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Performance de Calls</h1>
        <p className="text-muted-foreground">Acompanhe suas métricas de agendamentos e conversão</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Agendamentos"
          value={agendamentos.toString()}
          icon={Calendar}
        />
        <StatCard
          title="Calls Realizadas"
          value={callsRealizadas.toString()}
          icon={Phone}
        />
        <StatCard
          title="Taxa de Comparecimento"
          value={`${taxaComparecimento}%`}
          change={8.2}
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${taxaConversao}%`}
          change={15.3}
          trend="up"
          icon={TrendingUp}
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Agendamentos</span>
                <span className="font-medium">{agendamentos}</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Calls Realizadas</span>
                <span className="font-medium">{callsRealizadas}</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: `${taxaComparecimento}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Vendas Fechadas</span>
                <span className="font-medium">{vendas}</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${taxaConversao}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Registro de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Funcionalidade em desenvolvimento</p>
            <p className="text-sm mt-2">Em breve você poderá registrar agendamentos e calls diretamente aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calls;
