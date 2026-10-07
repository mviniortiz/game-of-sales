import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { Buildings, ChartLineUp, Flag, Funnel, Pulse, UsersThree, type Icon } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { GestaoResultados } from "@/components/gestao/GestaoResultados";
import { GestaoEquipe } from "@/components/gestao/GestaoEquipe";
import { GestaoFunil } from "@/components/gestao/GestaoFunil";
import { GestaoMeta } from "@/components/gestao/GestaoMeta";
import { AdminCompanies } from "@/components/admin/AdminCompanies";
import { EvolutionMonitor } from "@/components/admin/EvolutionMonitor";

type Tab = { id: string; label: string; icon: Icon; render: () => JSX.Element; superAdminOnly?: boolean };

// Gestão enxuta para o dono da integradora (decisão de 07/10/2026): Vendas,
// Produtos, Pagamentos, Contratos, Relatórios e Metas antigas saíram (uso real
// zero); os dados continuam no banco.
const TABS: Tab[] = [
  { id: "resultados", label: "Resultados", icon: ChartLineUp, render: () => <GestaoResultados /> },
  { id: "equipe", label: "Equipe", icon: UsersThree, render: () => <GestaoEquipe /> },
  { id: "funil", label: "Funil", icon: Funnel, render: () => <GestaoFunil /> },
  { id: "meta", label: "Meta do mês", icon: Flag, render: () => <GestaoMeta /> },
  { id: "empresas", label: "Empresas", icon: Buildings, render: () => <AdminCompanies />, superAdminOnly: true },
  { id: "monitor", label: "Monitor WhatsApp", icon: Pulse, render: () => <EvolutionMonitor />, superAdminOnly: true },
];

const Admin = () => {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Só administradores acessam a Gestão.");
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
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--vyz-text-primary)]">Gestão</h1>
        <p className="mt-1 text-[14px] text-[var(--vyz-text-muted)]">Sua equipe, seu funil e o dinheiro que está parado.</p>
      </header>

      <nav aria-label="Seções da Gestão" className="-mx-1 overflow-x-auto px-1">
        <div role="tablist" className="inline-flex gap-1 rounded-full border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-1">
          {tabs.map((t) => {
            const isActive = t.id === active.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => select(t.id)}
                className={`relative inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)] ${
                  isActive ? "text-[var(--vyz-btn-on)]" : "text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)]"
                }`}
              >
                {isActive &&
                  (reduceMotion ? (
                    <span aria-hidden className="absolute inset-0 rounded-full bg-[var(--vyz-btn-solid)]" />
                  ) : (
                    <motion.span
                      layoutId="gestao-tab"
                      aria-hidden
                      transition={{ type: "spring", stiffness: 460, damping: 38 }}
                      className="absolute inset-0 rounded-full bg-[var(--vyz-btn-solid)]"
                    />
                  ))}
                <t.icon size={15} weight={isActive ? "fill" : "regular"} className="relative" aria-hidden />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div role="tabpanel" aria-label={active.label}>
        {active.render()}
      </div>
    </div>
  );
};

export default Admin;
