import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";

interface MetaRankingItem {
  posicao: number;
  nome: string;
  valorMeta: number;
  valorRealizado: number;
  percentual: number;
}

interface MetasRankingProps {
  ranking: MetaRankingItem[];
}

export const MetasRanking = ({ ranking }: MetasRankingProps) => {
  const getMedal = (posicao: number) => {
    if (posicao === 1) return "🥇";
    if (posicao === 2) return "🥈";
    if (posicao === 3) return "🥉";
    return `${posicao}º`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getRowClassName = (percentual: number, posicao: number) => {
    if (percentual >= 100) return "bg-green-500/10";
    if (posicao === ranking.length && ranking.length > 1) return "bg-red-500/10";
    return "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Ranking de Metas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((item) => (
                <TableRow key={item.posicao} className={getRowClassName(item.percentual, item.posicao)}>
                  <TableCell className="font-medium text-lg">
                    {getMedal(item.posicao)}
                  </TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.valorMeta)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.valorRealizado)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold ${
                      item.percentual >= 100 ? "text-green-500" :
                      item.percentual >= 80 ? "text-blue-500" :
                      item.percentual >= 50 ? "text-yellow-500" :
                      "text-red-500"
                    }`}>
                      {item.percentual.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
