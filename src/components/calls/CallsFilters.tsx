import { Users } from "lucide-react";
import { DateRangePicker, FilterBar, FilterSelect, PeriodToggle, type ActiveFilter } from "@/components/filters";

interface CallsFiltersProps {
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  selectedVendedor: string;
  setSelectedVendedor: (value: string) => void;
  selectedResultado: string;
  setSelectedResultado: (value: string) => void;
  vendedores: Array<{ id: string; nome: string }>;
  isAdmin?: boolean;
}

const RESULTADO_OPTIONS = [
  { value: "todos", label: "Todos resultados" },
  { value: "venda", label: "Venda fechada" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "reagendar", label: "Reagendar" },
];

export const CallsFilters = ({
  dateRange,
  setDateRange,
  selectedVendedor,
  setSelectedVendedor,
  selectedResultado,
  setSelectedResultado,
  vendedores,
  isAdmin = false,
}: CallsFiltersProps) => {
  const vendedorOptions = [
    { value: "todos", label: "Todos vendedores" },
    ...vendedores.map((v) => ({ value: v.id, label: v.nome })),
  ];

  const activeFilters: ActiveFilter[] = [];
  if (dateRange.from) {
    activeFilters.push({
      key: "dateRange",
      label: "Período",
      value: dateRange.to
        ? `${dateRange.from.toLocaleDateString("pt-BR")} – ${dateRange.to.toLocaleDateString("pt-BR")}`
        : dateRange.from.toLocaleDateString("pt-BR"),
      onRemove: () => setDateRange({}),
    });
  }
  if (isAdmin && selectedVendedor !== "todos") {
    activeFilters.push({
      key: "vendedor",
      label: "Vendedor",
      value: vendedores.find((v) => v.id === selectedVendedor)?.nome,
      onRemove: () => setSelectedVendedor("todos"),
    });
  }
  if (selectedResultado !== "todos") {
    activeFilters.push({
      key: "resultado",
      label: "Resultado",
      value: RESULTADO_OPTIONS.find((r) => r.value === selectedResultado)?.label,
      onRemove: () => setSelectedResultado("todos"),
    });
  }

  const handleClearAll = () => {
    setDateRange({});
    setSelectedVendedor("todos");
    setSelectedResultado("todos");
  };

  return (
    <FilterBar
      activeFilters={activeFilters}
      onClearAll={activeFilters.length > 0 ? handleClearAll : undefined}
    >
      <PeriodToggle value={dateRange} onChange={setDateRange} />
      <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom" numberOfMonths={1} />
      {isAdmin ? (
        <FilterSelect
          value={selectedVendedor}
          onChange={setSelectedVendedor}
          options={vendedorOptions}
          icon={Users}
          neutralValue="todos"
          minWidth="160px"
        />
      ) : null}
      <FilterSelect
        value={selectedResultado}
        onChange={setSelectedResultado}
        options={RESULTADO_OPTIONS}
        neutralValue="todos"
        minWidth="150px"
      />
    </FilterBar>
  );
};
