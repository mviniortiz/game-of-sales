import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { GestaoResultados } from "@/components/gestao/GestaoResultados";
import { GestaoEquipe } from "@/components/gestao/GestaoEquipe";
import { GestaoFunil } from "@/components/gestao/GestaoFunil";
import { GestaoMeta } from "@/components/gestao/GestaoMeta";
import { AdminCompanies } from "@/components/admin/AdminCompanies";
import { EvolutionMonitor } from "@/components/admin/EvolutionMonitor";
import { AdminProspeccao } from "@/components/admin/AdminProspeccao";

type Tab = { id: string; label: string; render: () => JSX.Element; superAdminOnly?: boolean };

// Gestão enxuta para o dono da integradora (decisão de 07/10/2026): Vendas,
// Produtos, Pagamentos, Contratos, Relatórios e Metas antigas saíram (uso real
// zero); os dados continuam no banco.
const TABS: Tab[] = [
  { id: "resultados", label: "Visão geral", render: () => <GestaoResultados /> },
  { id: "equipe", label: "Equipe", render: () => <GestaoEquipe /> },
  { id: "funil", label: "Funil", render: () => <GestaoFunil /> },
  { id: "meta", label: "Meta do mês", render: () => <GestaoMeta /> },
  { id: "empresas", label: "Empresas", render: () => <AdminCompanies />, superAdminOnly: true },
  { id: "monitor", label: "Monitor WhatsApp", render: () => <EvolutionMonitor />, superAdminOnly: true },
  { id: "prospeccao", label: "Prospecção", render: () => <AdminProspeccao />, superAdminOnly: true },
];

const Admin = () => {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Só administradores acessam Resultados.");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading || !isAdmin) return null;

  const tabs = TABS.filter((t) => !t.superAdminOnly || isSuperAdmin);
  const active = tabs.find((t) => t.id === params.get("aba")) ?? tabs[0];
  const select = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("aba", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="vp-tela">
      <header className="vp-cabeca">
        <div>
          <h1 className="vp-titulo">Resultados</h1>
          <p className="vp-sub">Sua equipe, seu funil e o dinheiro que está parado.</p>
        </div>
        <div role="tablist" aria-label="Seções de Resultados" className="vp-segmento">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === active.id} onClick={() => select(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div role="tabpanel" aria-label={active.label}>
        {active.render()}
      </div>
    </div>
  );
};

export default Admin;
