import { useEffect, useState } from "react";
import { Users, CheckCircle2 } from "lucide-react";
import { FilterBar, FilterSelect, type ActiveFilter } from "@/components/filters";
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

const STATUS_OPTIONS = [
  { value: "all", label: "Todos status" },
  { value: "agendado", label: "Pendente" },
  { value: "realizado", label: "Compareceu" },
  { value: "nao_compareceu", label: "Não compareceu" },
  { value: "cancelado", label: "Cancelado" },
];

export const CalendarFilters = ({
  selectedVendedor,
  selectedStatus,
  onVendedorChange,
  onStatusChange,
  hideVendedorFilter = false,
}: CalendarFiltersProps) => {
  const [vendedores, setVendedores] = useState<Profile[]>([]);

  useEffect(() => {
    if (hideVendedorFilter) return;
    supabase
      .from("profiles")
      .select("id, nome")
      .order("nome")
      .then(({ data, error }) => {
        if (!error && data) setVendedores(data);
      });
  }, [hideVendedorFilter]);

  const vendedorOptions = [
    { value: "all", label: "Todos vendedores" },
    ...vendedores.map((v) => ({ value: v.id, label: v.nome })),
  ];

  const activeFilters: ActiveFilter[] = [];
  if (!hideVendedorFilter && selectedVendedor !== "all") {
    activeFilters.push({
      key: "vendedor",
      label: "Vendedor",
      value: vendedores.find((v) => v.id === selectedVendedor)?.nome,
      onRemove: () => onVendedorChange("all"),
    });
  }
  if (selectedStatus !== "all") {
    activeFilters.push({
      key: "status",
      label: "Status",
      value: STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.label,
      onRemove: () => onStatusChange("all"),
    });
  }

  const handleClearAll = () => {
    if (!hideVendedorFilter) onVendedorChange("all");
    onStatusChange("all");
  };

  return (
    <FilterBar
      activeFilters={activeFilters}
      onClearAll={activeFilters.length > 0 ? handleClearAll : undefined}
    >
      {!hideVendedorFilter && (
        <FilterSelect
          value={selectedVendedor}
          onChange={onVendedorChange}
          options={vendedorOptions}
          icon={Users}
          neutralValue="all"
          minWidth="160px"
        />
      )}
      <FilterSelect
        value={selectedStatus}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        icon={CheckCircle2}
        neutralValue="all"
        minWidth="150px"
      />
    </FilterBar>
  );
};
