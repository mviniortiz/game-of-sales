import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  nome: string;
}

interface CalendarFiltersProps {
  selectedVendedor: string;
  selectedStatus: string;
  onVendedorChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  hideVendedorFilter?: boolean;
}

export const CalendarFilters = ({
  selectedVendedor,
  selectedStatus,
  onVendedorChange,
  onStatusChange,
  hideVendedorFilter = false,
}: CalendarFiltersProps) => {
  const [vendedores, setVendedores] = useState<Profile[]>([]);

  useEffect(() => {
    if (!hideVendedorFilter) {
      loadVendedores();
    }
  }, [hideVendedorFilter]);

  const loadVendedores = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome")
      .order("nome");

    if (!error && data) {
      setVendedores(data);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filtros:
      </div>
      
      {!hideVendedorFilter && (
        <Select value={selectedVendedor} onValueChange={onVendedorChange}>
          <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
            <SelectValue placeholder="Todos os vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os vendedores</SelectItem>
            {vendedores.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="agendado">Pendente</SelectItem>
          <SelectItem value="realizado">Compareceu</SelectItem>
          <SelectItem value="nao_compareceu">Não Compareceu</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
