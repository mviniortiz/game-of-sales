// Seleção de plano + checkout embutido, usada no /upgrade e no Faturamento.
// Modelo 2026-07: Free (sem cobrança), Pro (checkout Mercado Pago embutido)
// e Escala (conversa com o time via WhatsApp — sem preço público).
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Rocket, Building2, ArrowRight, ArrowLeft, MessageCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/config/plans";
import { whatsappUrl } from "@/config/contact";
import { PlanCheckoutForm } from "@/components/billing/PlanCheckoutForm";

const PLAN_ICONS: Record<PlanId, LucideIcon> = { free: Star, pro: Rocket, escala: Building2 };

const ESCALA_WHATSAPP_MESSAGE =
    "Olá! Tenho um time com mais de 5 pessoas e quero conversar sobre o plano Escala do Vyzon.";

interface PlanPickerProps {
    /** Chamado após o pagamento ser aprovado. */
    onPaid: () => void;
    /** Plano já em uso (marca como atual). */
    currentPlan?: string;
}

export function PlanPicker({ onPaid, currentPlan }: PlanPickerProps) {
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const proPlan = PLANS.pro;

    return (
        <>
            <div className="grid md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl w-full">
                {PLAN_ORDER.map((id, index) => {
                    const plan = PLANS[id];
                    const Icon = PLAN_ICONS[id];
                    const popular = !!plan.highlight;
                    const isCurrent = currentPlan === id;

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
                                {!!plan.monthlyPrice && (
                                    <span className="text-sm" style={{ color: "#94A3B8" }}>/mês</span>
                                )}
                            </div>
                            <p className="text-xs font-semibold mb-5" style={{ color: "#2563EB" }}>
                                {Number.isFinite(plan.limits.users)
                                    ? plan.limits.users === 1 ? "1 usuário" : `Até ${plan.limits.users} usuários`
                                    : "Time do seu tamanho"}
                            </p>

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

                            {id === "pro" && (
                                <Button
                                    onClick={() => {
                                        trackEvent(FUNNEL_EVENTS.UPGRADE_CLICK, { plan: id });
                                        setCheckoutOpen(true);
                                    }}
                                    disabled={isCurrent}
                                    className="w-full h-11 font-semibold text-[14px] rounded-xl border-none text-white mt-auto"
                                    style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
                                >
                                    {isCurrent ? "Seu plano atual" : "Assinar Pro"}
                                    {!isCurrent && <ArrowRight className="ml-1.5 h-4 w-4" />}
                                </Button>
                            )}
                            {id === "free" && (
                                <div
                                    className="w-full h-11 flex items-center justify-center font-semibold text-[13px] rounded-xl mt-auto"
                                    style={{ background: "#F1F5F9", color: "#64748B" }}
                                >
                                    {isCurrent ? "Seu plano atual" : "Incluído pra sempre"}
                                </div>
                            )}
                            {id === "escala" && (
                                <Button
                                    onClick={() => {
                                        trackEvent(FUNNEL_EVENTS.UPGRADE_CLICK, { plan: id });
                                        window.open(whatsappUrl(ESCALA_WHATSAPP_MESSAGE), "_blank", "noopener,noreferrer");
                                    }}
                                    className="w-full h-11 font-semibold text-[14px] rounded-xl border-none text-white mt-auto"
                                    style={{ background: "#0B1220" }}
                                >
                                    <MessageCircle className="mr-1.5 h-4 w-4" />
                                    Falar com a gente
                                </Button>
                            )}
                        </motion.div>
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
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Voltar aos planos
                            </button>

                            <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: "1px solid #E6EDF5" }}>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
                                    <Rocket className="h-5 w-5" style={{ color: "#2563EB" }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px]" style={{ color: "#64748B" }}>Assinando o plano</p>
                                    <p className="text-base font-bold" style={{ color: "#0B1220" }}>{proPlan.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold" style={{ color: "#0B1220" }}>{formatPrice(proPlan.monthlyPrice)}</p>
                                    <p className="text-[11px]" style={{ color: "#94A3B8" }}>/mês</p>
                                </div>
                            </div>

                            <PlanCheckoutForm
                                planId="pro"
                                billingCycle="monthly"
                                upgrade={!!currentPlan && currentPlan !== "pro"}
                                submitLabel={`Assinar Pro · ${formatPrice(proPlan.monthlyPrice)}/mês`}
                                onSuccess={onPaid}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
