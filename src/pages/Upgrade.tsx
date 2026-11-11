// /upgrade: assinar o plano único de dentro do app (faixa do placar, aviso de
// limite ou Faturamento). Mesmo PlanPicker da tela de teste expirado. Da vaga
// das primeiras integradoras só fala o que vale para esta conta.
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { usePlano } from "@/hooks/usePlano";
import { useVagaFundadora } from "@/hooks/useVagaFundadora";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { fraseFundadora, ofertaFundadora } from "@/lib/fundadora";
import { APP_HOME } from "@/config/routes";
import { PlanPicker } from "@/components/billing/PlanPicker";

export default function Upgrade() {
    const navigate = useNavigate();
    const { pago } = usePlano();
    const vaga = useVagaFundadora();
    const wa = useWhatsappConnection();
    const fundadora = vaga.data?.fundadora && vaga.data.numero ? vaga.data : null;
    const oferta = wa.loading ? null : ofertaFundadora(vaga.data ?? null, wa.connected);

    return (
        <div className="px-4 sm:px-6 py-8 sm:py-10 max-w-5xl mx-auto">
            <button
                onClick={() => navigate(APP_HOME)}
                className="vz-toque mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--vyz-text-muted)] transition-colors hover:text-[var(--vyz-text-primary)]"
            >
                <ArrowLeft size={14} aria-hidden />
                Voltar ao placar
            </button>

            <div className="text-center mb-9 max-w-lg mx-auto">
                <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.03em] text-[var(--vyz-text-primary)]">Assinar o Vyzon</h1>
                <p className="text-[15px] text-[var(--vyz-text-muted)]">
                    Um plano só, com tudo liberado para a sua equipe.
                </p>
                {fundadora ? (
                    <p className="mt-2 text-[13px] font-medium text-[var(--vyz-text-primary)]">{fraseFundadora(fundadora.numero!, fundadora.limite)}</p>
                ) : oferta ? (
                    <p className="mt-2 text-[13px] text-[var(--vyz-text-muted)]">
                        {oferta}{" "}
                        <Link to="/inbox?connect=1" className="font-medium text-[var(--vyz-text-primary)] underline underline-offset-4">
                            Conectar agora
                        </Link>
                    </p>
                ) : null}
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
