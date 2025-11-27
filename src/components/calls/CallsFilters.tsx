import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, Users, DollarSign, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CallsFiltersProps {
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  selectedVendedor: string;
  setSelectedVendedor: (value: string) => void;
  selectedResultado: string;
  setSelectedResultado: (value: string) => void;
  vendedores: Array<{ id: string; nome: string }>;
}

export const CallsFilters = ({
  dateRange,
  setDateRange,
  selectedVendedor,
  setSelectedVendedor,
  selectedResultado,
  setSelectedResultado,
  vendedores,
}: CallsFiltersProps) => {
  const setQuickRange = (range: string) => {
    const today = new Date();
    const from = new Date();
    
    switch (range) {
      case "hoje":
        setDateRange({ from: today, to: today });
        break;
      case "semana":
        from.setDate(today.getDate() - today.getDay());
        setDateRange({ from, to: today });
        break;
      case "mes":
        from.setDate(1);
        setDateRange({ from, to: today });
        break;
      case "30dias":
        from.setDate(today.getDate() - 30);
        setDateRange({ from, to: today });
        break;
    }
  };

  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Período Customizado */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Período
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-10 justify-start text-left font-normal bg-slate-800/50 border-white/10 text-white hover:bg-slate-800 hover:text-white",
                    !dateRange.from && "text-slate-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <span className="text-sm">
                        {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                      </span>
                    ) : (
                      <span className="text-sm">{format(dateRange.from, "dd/MM/yyyy")}</span>
                    )
                  ) : (
                    <span className="text-sm">Selecione</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  locale={ptBR}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Períodos Rápidos */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Atalhos</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange("hoje")}
                className="h-10 text-xs bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange("semana")}
                className="h-10 text-xs bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange("mes")}
                className="h-10 text-xs bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickRange("30dias")}
                className="h-10 text-xs bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                30 dias
              </Button>
            </div>
          </div>

          {/* Vendedor */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Vendedor
            </Label>
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resultado da Call */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Resultado
            </Label>
            <Select value={selectedResultado} onValueChange={setSelectedResultado}>
              <SelectTrigger className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os resultados</SelectItem>
                <SelectItem value="venda">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    Venda Fechada
                  </div>
                </SelectItem>
                <SelectItem value="sem_interesse">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-red-500" />
                    Sem Interesse
                  </div>
                </SelectItem>
                <SelectItem value="reagendar">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                    Reagendar
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
