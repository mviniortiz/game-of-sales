// /upgrade — assinar ou trocar de plano de dentro do app (via banner do trial,
// UpgradePrompt de limite, ou Faturamento). Usa o mesmo PlanPicker da tela de
// trial expirado, então aceita qualquer plano (inclusive o atual) — sem o antigo
// bloqueio de "selecione um plano superior".
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
                className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-6 transition-colors hover:opacity-80"
                style={{ color: "#64748B" }}
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para faturamento
            </button>

            <div className="text-center mb-9 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "#0B1220" }}>
                    Escolha seu plano
                </h1>
                <p className="text-[15px]" style={{ color: "#64748B" }}>
                    Assine ou troque de plano quando quiser. Cobrança mensal, cancele a qualquer momento.
                </p>
            </div>

            <div className="flex justify-center">
                <PlanPicker onPaid={handlePaid} currentPlan={currentPlan} />
            </div>
        </div>
    );
}
