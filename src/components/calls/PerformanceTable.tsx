import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, XCircle, BarChart3 } from "lucide-react";

interface PerformanceData {
  vendedor: string;
  agendamentos: number;
  calls: number;
  taxaComparecimento: number;
  vendas: number;
  taxaConversao: number;
  status: "excelente" | "bom" | "precisa_melhorar";
}

interface PerformanceTableProps {
  data: PerformanceData[];
}

export const PerformanceTable = ({ data }: PerformanceTableProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excelente":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "bom":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance por Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Agend.</TableHead>
                <TableHead className="text-center">Calls</TableHead>
                <TableHead className="text-center">Comp%</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead className="text-center">Conv%</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.vendedor}</TableCell>
                    <TableCell className="text-center">{row.agendamentos}</TableCell>
                    <TableCell className="text-center">{row.calls}</TableCell>
                    <TableCell className="text-center">
                      {row.taxaComparecimento.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">{row.vendas}</TableCell>
                    <TableCell className="text-center font-bold">
                      {row.taxaConversao.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusIcon(row.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
