// /upgrade: assinar o plano único de dentro do app (banner do teste grátis,
// aviso de limite ou Faturamento). Mesmo PlanPicker da tela de teste expirado.
import { Link, useNavigate } from "react-router-dom";
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
                <p className="mt-2 text-[13px] text-[var(--vyz-text-muted)]">
                    As 10 primeiras integradoras não pagam. Se a sua é uma delas, a gente libera a conta sem cobrar e avisa no WhatsApp.
                </p>
            </div>

            <div className="flex justify-center">
                <PlanPicker paid={pago} />
            </div>

            {/* Plano Escala: mais de um WhatsApp, sem preço; o pedido vai pelo /escala. */}
            <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 rounded-[18px] border border-[var(--vyz-border-subtle)] bg-[var(--vyz-surface-1)] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-[15px] font-semibold text-[var(--vyz-text-primary)]">Plano Escala</h2>
                    <p className="mt-0.5 text-[13px] text-[var(--vyz-text-muted)]">Mais de um WhatsApp? Montamos o plano com você.</p>
                </div>
                <Link
                    to="/escala"
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[var(--vyz-border-subtle)] px-4 text-[13px] font-semibold text-[var(--vyz-text-primary)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--vyz-surface-2)] active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(21,86,192,0.3)]"
                >
                    Falar com um especialista
                </Link>
            </div>
        </div>
    );
}
