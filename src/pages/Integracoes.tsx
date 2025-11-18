import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Zap } from "lucide-react";

const Integracoes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrações</h1>
        <p className="text-muted-foreground">
          Conecte suas ferramentas favoritas para automatizar seu fluxo de trabalho
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Integrações Disponíveis</CardTitle>
                <CardDescription>
                  Conecte serviços externos para melhorar sua produtividade
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendário
          </h2>
          <GoogleCalendarConnect />
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-dashed">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Mais integrações em breve</h3>
                <p className="text-sm text-muted-foreground">
                  Estamos trabalhando em novas integrações para melhorar sua experiência
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integracoes;
