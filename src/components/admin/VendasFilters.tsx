import { useState } from "react";
import { FileText, Package, Users } from "lucide-react";
import { DateRangePicker, FilterBar, FilterSelect, PeriodToggle, type ActiveFilter } from "@/components/filters";

interface VendasFiltersProps {
  vendedores: Array<{ id: string; nome: string }>;
  produtos: Array<{ id: string; nome: string }>;
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  vendedorId: string;
  produtoId: string;
  status: string;
  dateRange: { from?: Date; to?: Date };
}

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos status" },
  { value: "Aprovado", label: "Aprovado" },
  { value: "Pendente", label: "Pendente" },
  { value: "Reembolsado", label: "Reembolsado" },
];

const EMPTY_FILTERS: FilterValues = {
  vendedorId: "todos",
  produtoId: "todos",
  status: "todos",
  dateRange: {},
};

export const VendasFilters = ({ vendedores, produtos, onFilterChange }: VendasFiltersProps) => {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);

  const update = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFilterChange(next);
  };

  const clear = () => {
    setFilters(EMPTY_FILTERS);
    onFilterChange(EMPTY_FILTERS);
  };

  const vendedorOptions = [
    { value: "todos", label: "Todos vendedores" },
    ...vendedores.map((v) => ({ value: v.id, label: v.nome })),
  ];
  const produtoOptions = [
    { value: "todos", label: "Todos produtos" },
    ...produtos.map((p) => ({ value: p.id, label: p.nome })),
  ];

  const activeFilters: ActiveFilter[] = [];
  if (filters.dateRange.from) {
    activeFilters.push({
      key: "dateRange",
      label: "Período",
      value: filters.dateRange.to
        ? `${filters.dateRange.from.toLocaleDateString("pt-BR")} – ${filters.dateRange.to.toLocaleDateString("pt-BR")}`
        : filters.dateRange.from.toLocaleDateString("pt-BR"),
      onRemove: () => update("dateRange", {}),
    });
  }
  if (filters.vendedorId !== "todos") {
    activeFilters.push({
      key: "vendedor",
      label: "Vendedor",
      value: vendedores.find((v) => v.id === filters.vendedorId)?.nome,
      onRemove: () => update("vendedorId", "todos"),
    });
  }
  if (filters.produtoId !== "todos") {
    activeFilters.push({
      key: "produto",
      label: "Produto",
      value: produtos.find((p) => p.id === filters.produtoId)?.nome,
      onRemove: () => update("produtoId", "todos"),
    });
  }
  if (filters.status !== "todos") {
    activeFilters.push({
      key: "status",
      label: "Status",
      value: filters.status,
      onRemove: () => update("status", "todos"),
    });
  }

  return (
    <FilterBar
      activeFilters={activeFilters}
      onClearAll={activeFilters.length > 0 ? clear : undefined}
    >
      <PeriodToggle value={filters.dateRange} onChange={(r) => update("dateRange", r)} />
      <DateRangePicker
        value={filters.dateRange}
        onChange={(r) => update("dateRange", r)}
        placeholder="Custom"
      />
      <FilterSelect
        value={filters.vendedorId}
        onChange={(v) => update("vendedorId", v)}
        options={vendedorOptions}
        icon={Users}
        neutralValue="todos"
        minWidth="160px"
      />
      <FilterSelect
        value={filters.produtoId}
        onChange={(v) => update("produtoId", v)}
        options={produtoOptions}
        icon={Package}
        neutralValue="todos"
        minWidth="160px"
      />
      <FilterSelect
        value={filters.status}
        onChange={(v) => update("status", v)}
        options={STATUS_OPTIONS}
        icon={FileText}
        neutralValue="todos"
        minWidth="150px"
      />
    </FilterBar>
  );
};
