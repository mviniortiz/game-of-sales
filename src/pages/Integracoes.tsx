import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, CreditCard, Bell } from "lucide-react";

const Integracoes = () => {
  const roadmapIntegrations = [
    {
      name: "Celetus",
      description: "Importe vendas e transações automaticamente da Celetus",
      icon: "💎",
      color: "from-cyan-500 to-blue-500"
    },
    {
      name: "Cakto",
      description: "Sincronize vendas e comissões em tempo real",
      icon: "🎯",
      color: "from-blue-500 to-indigo-500"
    },
    {
      name: "Greenn",
      description: "Conecte recorrências e assinaturas da Greenn",
      icon: "🌱",
      color: "from-green-500 to-emerald-500"
    },
    {
      name: "Pix/Boleto",
      description: "Integração com gateways de pagamento direto",
      icon: "💳",
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Hub de Integrações</h1>
        <p className="text-muted-foreground">
          Conecte suas ferramentas favoritas e automatize seu fluxo de trabalho de vendas
        </p>
      </div>

      {/* Seção 1: Disponível Agora */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-2xl font-semibold">Disponível Agora</h2>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Ativo
          </Badge>
        </div>
        
        <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-green-500/20 backdrop-blur-sm">
                  <CalendarIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                    Google Calendar
                  </CardTitle>
                  <CardDescription className="text-base">
                    Sincronize seus agendamentos e não perca nenhuma call de venda.
                    Mantenha sua agenda sempre atualizada em tempo real.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <GoogleCalendarConnect />
          </CardContent>
        </Card>
      </div>

      {/* Seção 2: Roadmap de Integrações */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">Roadmap de Integrações</h2>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Em Desenvolvimento
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Próximas integrações financeiras para automatizar completamente suas vendas
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roadmapIntegrations.map((integration) => (
            <Card 
              key={integration.name} 
              className="relative border-border/30 bg-card/30 backdrop-blur-sm overflow-hidden group hover:border-border/50 transition-all duration-300 opacity-75 grayscale hover:grayscale-0 hover:opacity-100"
            >
              <Badge 
                variant="secondary" 
                className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs"
              >
                Em Breve
              </Badge>
              
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${integration.color} flex items-center justify-center text-2xl mb-3 opacity-50 group-hover:opacity-100 transition-opacity`}>
                  {integration.icon}
                </div>
                <CardTitle className="text-lg">{integration.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled
                  className="w-full gap-2"
                >
                  <Bell className="h-3 w-3" />
                  Avise-me
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Precisa de uma integração específica?</h3>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato e conte-nos qual plataforma você gostaria de conectar
                  </p>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                Solicitar Integração
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integracoes;
