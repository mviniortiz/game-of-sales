// Seleção de plano + checkout embutido, compartilhada entre a tela de trial
// expirado (UpgradeLock) e o /upgrade. Mostra os planos do config e, ao escolher,
// abre o checkout (PlanCheckoutForm) na própria tela. Aceita QUALQUER plano
// (inclusive o atual) — é o que conserta o bug do "só plano superior".
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Crown, Rocket, ArrowRight, ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { PLANS, formatPrice } from "@/config/plans";
import { PlanCheckoutForm } from "@/components/billing/PlanCheckoutForm";

const PLAN_ICONS: Record<string, LucideIcon> = { starter: Star, plus: Crown, pro: Rocket };
const PLAN_ORDER = ["starter", "plus", "pro"] as const;

interface PlanPickerProps {
    /** Chamado após o pagamento ser aprovado. */
    onPaid: () => void;
    /** Plano já em uso (marca como atual, mas continua assinável). */
    currentPlan?: string;
}

export function PlanPicker({ onPaid, currentPlan }: PlanPickerProps) {
    const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

    return (
        <>
            <div className="grid md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl w-full">
                {PLAN_ORDER.map((id, index) => {
                    const plan = PLANS[id];
                    const Icon = PLAN_ICONS[id];
                    const popular = !!plan.highlight;
                    const isCurrent = currentPlan === id;
                    const sellers =
                        plan.limits.sellers === 1 ? "1 vendedor" : `Até ${plan.limits.sellers} vendedores`;

                    return (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.08 }}
                            className="relative rounded-2xl p-6 bg-white flex flex-col"
                            style={{
                                boxShadow: popular
                                    ? "0 0 0 2px #2563EB, 0 18px 40px -20px rgba(37,99,235,0.45)"
                                    : "0 0 0 1px #E6EDF5, 0 10px 30px -22px rgba(15,23,42,0.25)",
                            }}
                        >
                            {popular && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full"
                                        style={{ background: "#2563EB", letterSpacing: "0.08em" }}
                                    >
                                        Mais popular
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: popular ? "rgba(37,99,235,0.1)" : "#F1F5F9" }}
                                >
                                    <Icon className="h-5 w-5" style={{ color: popular ? "#2563EB" : "#64748B" }} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-base font-bold" style={{ color: "#0B1220" }}>
                                            {plan.name}
                                        </h3>
                                        {isCurrent && (
                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "#F1F5F9", color: "#64748B" }}>
                                                Atual
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs" style={{ color: "#94A3B8" }}>{plan.description}</p>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-3xl font-bold tracking-tight" style={{ color: "#0B1220" }}>
                                    {formatPrice(plan.monthlyPrice)}
                                </span>
                                <span className="text-sm" style={{ color: "#94A3B8" }}>/mês</span>
                            </div>
                            <p className="text-xs font-semibold mb-5" style={{ color: "#2563EB" }}>{sellers}</p>

                            <ul className="space-y-2.5 mb-6 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-[13px]" style={{ color: "#334155" }}>
                                        <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
                                            <Check className="h-2.5 w-2.5" style={{ color: "#2563EB" }} strokeWidth={3} />
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => {
                                    trackEvent(FUNNEL_EVENTS.UPGRADE_CLICK, { plan: id });
                                    setCheckoutPlan(id);
                                }}
                                className="w-full h-11 font-semibold text-[14px] rounded-xl border-none text-white mt-auto"
                                style={popular ? { background: "linear-gradient(135deg, #2563EB, #1D4ED8)" } : { background: "#0B1220" }}
                            >
                                Assinar {plan.name}
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            <AnimatePresence>
                {checkoutPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(11,18,32,0.45)" }}
                        onClick={() => setCheckoutPlan(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="w-full max-w-md rounded-2xl bg-white p-6 max-h-[92vh] overflow-y-auto"
                            style={{ boxShadow: "0 24px 64px -24px rgba(15,23,42,0.4)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const plan = PLANS[checkoutPlan];
                                const Icon = PLAN_ICONS[checkoutPlan];
                                return (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setCheckoutPlan(null)}
                                            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold mb-4"
                                            style={{ color: "#64748B" }}
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" />
                                            Voltar aos planos
                                        </button>

                                        <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: "1px solid #E6EDF5" }}>
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
                                                <Icon className="h-5 w-5" style={{ color: "#2563EB" }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[13px]" style={{ color: "#64748B" }}>Assinando o plano</p>
                                                <p className="text-base font-bold" style={{ color: "#0B1220" }}>{plan.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold" style={{ color: "#0B1220" }}>{formatPrice(plan.monthlyPrice)}</p>
                                                <p className="text-[11px]" style={{ color: "#94A3B8" }}>/mês</p>
                                            </div>
                                        </div>

                                        <PlanCheckoutForm
                                            planId={checkoutPlan}
                                            billingCycle="monthly"
                                            upgrade={!!currentPlan && currentPlan !== checkoutPlan}
                                            submitLabel={`Assinar ${plan.name} · ${formatPrice(plan.monthlyPrice)}/mês`}
                                            onSuccess={onPaid}
                                        />
                                    </>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
