// /upgrade — assinar ou trocar de plano de dentro do app (via banner do trial,
// UpgradePrompt de limite, ou Faturamento). Usa o mesmo PlanPicker da tela de
// trial expirado, então aceita qualquer plano (inclusive o atual) — sem o antigo
// bloqueio de "selecione um plano superior".
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "@phosphor-icons/react";
import { usePlan } from "@/hooks/usePlan";
import { PlanPicker } from "@/components/billing/PlanPicker";

export default function Upgrade() {
    const navigate = useNavigate();
    const { currentPlan } = usePlan();

    const handlePaid = () => {
        toast.success("Plano atualizado!");
        navigate("/configuracoes/faturamento");
    };

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
                <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.03em] text-[var(--vyz-text-primary)]">Escolha seu plano</h1>
                <p className="text-[15px] text-[var(--vyz-text-muted)]">
                    Os dois têm a EVA completa. A diferença é o tamanho da equipe e quanto ela trabalha por dia.
                </p>
            </div>

            <div className="flex justify-center">
                <PlanPicker onPaid={handlePaid} currentPlan={currentPlan} />
            </div>
        </div>
    );
}
