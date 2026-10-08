// /upgrade: assinar o plano único de dentro do app (banner do teste grátis,
// aviso de limite ou Faturamento). Mesmo PlanPicker da tela de teste expirado.
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { usePlano } from "@/hooks/usePlano";
import { PlanPicker } from "@/components/billing/PlanPicker";

export default function Upgrade() {
    const navigate = useNavigate();
    const { pago } = usePlano();

    return (
        <div className="px-4 sm:px-6 py-8 sm:py-10 max-w-5xl mx-auto">
            <button
                onClick={() => navigate("/configuracoes/faturamento")}
                className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--vyz-text-muted)] transition-colors hover:text-[var(--vyz-text-primary)]"
            >
                <ArrowLeft size={14} aria-hidden />
                Voltar para o plano
            </button>

            <div className="text-center mb-9 max-w-lg mx-auto">
                <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.03em] text-[var(--vyz-text-primary)]">Assinar o Vyzon</h1>
                <p className="text-[15px] text-[var(--vyz-text-muted)]">
                    Um plano só, com tudo liberado para a sua equipe.
                </p>
            </div>

            <div className="flex justify-center">
                <PlanPicker paid={pago} />
            </div>
        </div>
    );
}
