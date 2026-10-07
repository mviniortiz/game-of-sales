// Seleção de plano + checkout embutido, usada no /upgrade e no Faturamento.
// Modelo 2026-08-21: Essential e Pro (checkout Mercado Pago embutido).
// O piso "free" existe só internamente e NÃO aparece aqui (plans.ts).
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/config/plans";
import { PlanCheckoutForm } from "@/components/billing/PlanCheckoutForm";

interface PlanPickerProps {
    /** Chamado após o pagamento ser aprovado. */
    onPaid: () => void;
    /** Plano já em uso (marca como atual). */
    currentPlan?: string;
}

export function PlanPicker({ onPaid, currentPlan }: PlanPickerProps) {
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<PlanId>("pro");
    const selectedPlan = PLANS[checkoutPlan];
    const visiblePlans = PLAN_ORDER.map((id) => PLANS[id]).filter((p) => p.visible !== false);

    return (
        <>
            <div className="grid w-full max-w-4xl gap-4 sm:gap-5 md:grid-cols-2">
                {visiblePlans.map((plan, index) => {
                    const id = plan.id;
                    const popular = !!plan.highlight;
                    const isCurrent = currentPlan === id;

                    return (
                        <motion.article
                            key={id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className={`relative flex flex-col rounded-[18px] bg-[var(--vyz-surface-1)] p-6 ${
                                popular
                                    ? "shadow-[0_0_0_1.5px_var(--vyz-text-primary),0_18px_40px_-22px_rgba(11,18,32,0.35)]"
                                    : "shadow-[0_0_0_1px_var(--vyz-border),0_10px_30px_-24px_rgba(11,18,32,0.25)]"
                            }`}
                            aria-label={`Plano ${plan.name}`}
                        >
                            <header className="flex items-center justify-between gap-3">
                                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">{plan.name}</h3>
                                {isCurrent ? (
                                    <span className="rounded-full bg-[var(--vyz-surface-2)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--vyz-text-muted)]">Seu plano</span>
                                ) : popular && plan.badge ? (
                                    <span className="rounded-full bg-[var(--vyz-accent-soft-10)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--vyz-accent)]">{plan.badge}</span>
                                ) : null}
                            </header>
                            <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">{plan.description}</p>

                            <div className="mt-5 flex items-baseline gap-1">
                                <span className="text-[34px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--vyz-text-primary)]">
                                    {formatPrice(plan.monthlyPrice)}
                                </span>
                                {!!plan.monthlyPrice && <span className="text-[14px] text-[var(--vyz-text-muted)]">/mês</span>}
                            </div>

                            <ul className="mt-5 flex-1 space-y-2.5 border-t border-[var(--vyz-border-subtle)] pt-5">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5 text-[13.5px] text-[var(--vyz-text)]">
                                        <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-[var(--vyz-accent)]" aria-hidden />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                onClick={() => {
                                    trackEvent(FUNNEL_EVENTS.UPGRADE_CLICK, { plan: id });
                                    setCheckoutPlan(id);
                                    setCheckoutOpen(true);
                                }}
                                disabled={isCurrent}
                                className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-[opacity,transform,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:cursor-default disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)] ${
                                    popular
                                        ? "bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] enabled:hover:opacity-90"
                                        : "border border-[var(--vyz-border-strong)] text-[var(--vyz-text-primary)] enabled:hover:bg-[var(--vyz-surface-2)]"
                                }`}
                            >
                                {isCurrent ? "Seu plano atual" : `Assinar ${plan.name}`}
                                {!isCurrent && <ArrowRight size={15} weight="bold" aria-hidden />}
                            </button>
                        </motion.article>
                    );
                })}
            </div>

            <AnimatePresence>
                {checkoutOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(11,18,32,0.45)" }}
                        onClick={() => setCheckoutOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="w-full max-w-md rounded-2xl bg-white p-6 max-h-[92dvh] overflow-y-auto"
                            style={{ boxShadow: "0 24px 64px -24px rgba(15,23,42,0.4)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setCheckoutOpen(false)}
                                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold mb-4"
                                style={{ color: "#64748B" }}
                            >
                                <ArrowLeft size={14} aria-hidden />
                                Voltar aos planos
                            </button>

                            <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: "1px solid #E6EDF5" }}>
                                <div className="flex-1">
                                    <p className="text-[13px]" style={{ color: "#64748B" }}>Assinando o plano</p>
                                    <p className="text-base font-bold" style={{ color: "#0B1220" }}>{selectedPlan.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold" style={{ color: "#0B1220" }}>{formatPrice(selectedPlan.monthlyPrice)}</p>
                                    <p className="text-[11px]" style={{ color: "#94A3B8" }}>/mês</p>
                                </div>
                            </div>

                            <PlanCheckoutForm
                                planId={checkoutPlan}
                                billingCycle="monthly"
                                upgrade={!!currentPlan && normalizeForCompare(currentPlan) !== checkoutPlan}
                                submitLabel={`Assinar ${selectedPlan.name} · ${formatPrice(selectedPlan.monthlyPrice)}/mês`}
                                onSuccess={onPaid}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// compara o plano atual (pode vir legado: plus/escala) com o alvo
function normalizeForCompare(plan: string): PlanId {
    const v = (plan || "").toLowerCase();
    if (v === "pro" || v === "plus" || v === "escala" || v === "enterprise") return "pro";
    if (v === "essential" || v === "essencial") return "essential";
    return "free";
}
