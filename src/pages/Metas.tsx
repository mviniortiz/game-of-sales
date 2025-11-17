import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

const Metas = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Metas</h1>
        <p className="text-muted-foreground">Acompanhe e gerencie suas metas mensais</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Minhas Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Funcionalidade em desenvolvimento</p>
            <p className="text-sm mt-2">Em breve você poderá acompanhar suas metas e progresso aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Metas;
