import { CreditCard, Package, Users } from "lucide-react";
import { DateRangePicker, FilterBar, FilterSelect, PeriodToggle, type ActiveFilter } from "@/components/filters";

interface AdminFiltersProps {
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  selectedVendedor: string;
  setSelectedVendedor: (value: string) => void;
  vendedores: Array<{ id: string; nome: string }>;
  selectedFormaPagamento?: string;
  setSelectedFormaPagamento?: (value: string) => void;
  selectedProduto?: string;
  setSelectedProduto?: (value: string) => void;
  produtos?: Array<{ id: string; nome: string; company_id?: string }>;
  activeCompanyId?: string | null;
}

const FORMAS_PAGAMENTO = [
  "Cartão de Crédito",
  "PIX",
  "Recorrência",
  "Boleto",
  "Parte PIX Parte Cartão",
  "Múltiplos Cartões",
];

export const AdminFilters = ({
  dateRange,
  setDateRange,
  selectedVendedor,
  setSelectedVendedor,
  vendedores,
  selectedFormaPagamento,
  setSelectedFormaPagamento,
  selectedProduto,
  setSelectedProduto,
  produtos = [],
  activeCompanyId,
}: AdminFiltersProps) => {
  const vendedorOptions = [
    { value: "todos", label: "Todos vendedores" },
    ...vendedores.map((v) => ({ value: v.id, label: v.nome })),
  ];
  const pagamentoOptions = [
    { value: "todas", label: "Todas formas" },
    ...FORMAS_PAGAMENTO.map((f) => ({ value: f, label: f })),
  ];
  const produtoOptions = [
    { value: "todos", label: "Todos produtos" },
    ...produtos
      .filter((p) => !activeCompanyId || p.company_id === activeCompanyId)
      .map((p) => ({ value: p.id, label: p.nome })),
  ];

  const activeFilters: ActiveFilter[] = [];
  if (dateRange.from) {
    activeFilters.push({
      key: "dateRange",
      label: "Período",
      value:
        dateRange.to
          ? `${dateRange.from.toLocaleDateString("pt-BR")} – ${dateRange.to.toLocaleDateString("pt-BR")}`
          : dateRange.from.toLocaleDateString("pt-BR"),
      onRemove: () => setDateRange({}),
    });
  }
  if (selectedVendedor !== "todos") {
    activeFilters.push({
      key: "vendedor",
      label: "Vendedor",
      value: vendedores.find((v) => v.id === selectedVendedor)?.nome,
      onRemove: () => setSelectedVendedor("todos"),
    });
  }
  if (setSelectedFormaPagamento && selectedFormaPagamento && selectedFormaPagamento !== "todas") {
    activeFilters.push({
      key: "formaPagamento",
      label: "Pagamento",
      value: selectedFormaPagamento,
      onRemove: () => setSelectedFormaPagamento("todas"),
    });
  }
  if (setSelectedProduto && selectedProduto && selectedProduto !== "todos") {
    activeFilters.push({
      key: "produto",
      label: "Produto",
      value: produtos.find((p) => p.id === selectedProduto)?.nome,
      onRemove: () => setSelectedProduto("todos"),
    });
  }

  const handleClearAll = () => {
    setDateRange({});
    setSelectedVendedor("todos");
    setSelectedFormaPagamento?.("todas");
    setSelectedProduto?.("todos");
  };

  return (
    <FilterBar
      activeFilters={activeFilters}
      onClearAll={activeFilters.length > 0 ? handleClearAll : undefined}
    >
      <PeriodToggle value={dateRange} onChange={setDateRange} />
      <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom" />
      <FilterSelect
        value={selectedVendedor}
        onChange={setSelectedVendedor}
        options={vendedorOptions}
        icon={Users}
        neutralValue="todos"
        minWidth="160px"
      />
      {setSelectedFormaPagamento ? (
        <FilterSelect
          value={selectedFormaPagamento || "todas"}
          onChange={setSelectedFormaPagamento}
          options={pagamentoOptions}
          icon={CreditCard}
          neutralValue="todas"
          minWidth="170px"
        />
      ) : null}
      {setSelectedProduto ? (
        <FilterSelect
          value={selectedProduto || "todos"}
          onChange={setSelectedProduto}
          options={produtoOptions}
          icon={Package}
          neutralValue="todos"
          minWidth="160px"
        />
      ) : null}
    </FilterBar>
  );
};
