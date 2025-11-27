import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import googleCalendarLogo from "@/assets/integrations/google-calendar.png";
import celetusLogo from "@/assets/integrations/celetus.png";
import caktoLogo from "@/assets/integrations/cakto.png";
import greennLogo from "@/assets/integrations/greenn.png";

const Integracoes = () => {
  const roadmapIntegrations = [
    {
      name: "Celetus",
      description: "Importe vendas e transações automaticamente da Celetus",
      logo: celetusLogo,
      color: "from-indigo-500 to-indigo-600"
    },
    {
      name: "Cakto",
      description: "Sincronize vendas e comissões em tempo real",
      logo: caktoLogo,
      color: "from-blue-500 to-indigo-500"
    },
    {
      name: "Greenn",
      description: "Conecte recorrências e assinaturas da Greenn",
      logo: greennLogo,
      color: "from-green-500 to-emerald-500"
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
                <div className="p-3 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm">
                  <img src={googleCalendarLogo} alt="Google Calendar" className="h-8 w-8" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="w-16 h-16 rounded-xl bg-white/90 flex items-center justify-center mb-3 shadow-sm opacity-50 group-hover:opacity-100 transition-opacity p-2">
                  <img src={integration.logo} alt={integration.name} className="w-full h-full object-contain" />
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

      {/* Footer com links importantes */}
      <div className="text-center text-sm text-muted-foreground pt-8 border-t">
        <p>
          Ao conectar integrações, você concorda com nossa{" "}
          <Link to="/politica-privacidade" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Integracoes;
