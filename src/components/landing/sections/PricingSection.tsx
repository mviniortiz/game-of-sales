import { useState } from "react";
import { Check, ArrowRight, Zap, Award, PhoneCall } from "lucide-react";
import { PLANS } from "@/data/landing/pricing";

const TRUST_ITEMS = [
    { icon: <Check className="h-3.5 w-3.5" />, label: "Cancele quando quiser" },
    { icon: <Zap className="h-3.5 w-3.5" />, label: "Setup em 5 minutos" },
    { icon: <PhoneCall className="h-3.5 w-3.5" />, label: "Ligações (Plus e Pro)" },
    { icon: <Award className="h-3.5 w-3.5" />, label: "Suporte via WhatsApp" },
];

type Props = {
    onPlanSelect: (planName: string) => void;
    onScheduleDemo: (location: string) => void;
};

export const PricingSection = ({ onPlanSelect, onScheduleDemo }: Props) => {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse, var(--vyz-accent-soft-10) 0%, transparent 60%)", filter: "blur(80px)" }} />
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

            <div className="max-w-5xl mx-auto relative z-10">
                <div className="text-center mb-14 landing-fade-in-up">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "var(--ls-widest)", fontWeight: "var(--fw-semibold)", background: "var(--vyz-accent-soft-10)", border: "1px solid var(--vyz-accent-border)" }}>
                        <Zap className="h-3 w-3" />
                        PLANOS E PREÇOS
                    </span>

                    <h2 className="font-heading mb-4"
                        style={{ fontWeight: "var(--fw-bold)", fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "var(--vyz-text-primary)" }}>
                        Investimento que se{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">multiplica</span>
                    </h2>

                    <p className="max-w-xl mx-auto mb-8" style={{ fontSize: "1.0625rem", color: "var(--vyz-text-soft)" }}>
                        Retorno médio de <strong style={{ color: "var(--vyz-text-strong)" }}>12× o valor investido</strong>. Sem surpresas, sem taxas escondidas.
                    </p>

                    <div className="inline-flex gap-1 p-1 rounded-2xl"
                        style={{ background: "var(--vyz-surface-2)", boxShadow: "0 0 0 1px var(--vyz-border-strong)" }}>
                        {([false, true] as const).map((annual) => (
                            <button key={String(annual)} onClick={() => setIsAnnual(annual)}
                                className="relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm"
                                style={{ fontWeight: "var(--fw-semibold)", color: isAnnual === annual ? "var(--vyz-text-primary)" : "var(--vyz-text-soft)" }}>
                                {isAnnual === annual && (
                                    <span
                                        className="absolute inset-0 rounded-xl"
                                        style={{ background: "var(--vyz-border-strong)", boxShadow: "0 0 0 1px var(--vyz-border-strong)" }}
                                    />
                                )}
                                <span className="relative">{annual ? "Anual" : "Mensal"}</span>
                                {annual && (
                                    <span className="relative text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full"
                                        style={{ fontWeight: "var(--fw-bold)" }}>
                                        −10%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-end">
                    {PLANS.map((plan, i) => {
                        const monthly = isAnnual ? Math.round(plan.priceNumber * 0.9) : plan.priceNumber;
                        const annualSaving = Math.round((plan.priceNumber - Math.round(plan.priceNumber * 0.9)) * 12);
                        const isPopular = plan.popular;
                        const delayClass = i === 0 ? "" : i === 1 ? "landing-delay-100" : "landing-delay-200";

                        return (
                            <div key={plan.name}
                                className={`pricing-card relative flex flex-col landing-fade-in-up ${delayClass} ${isPopular ? "order-first md:order-none md:-mt-7 pt-8 md:pt-0" : ""}`}>

                                {isPopular && (
                                    <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/25"
                                            style={{
                                                background: "var(--vyz-gradient-accent)",
                                                color: "white",
                                                fontWeight: "var(--fw-bold)",
                                                letterSpacing: "var(--ls-wide)"
                                            }}>
                                            <Zap className="h-2.5 w-2.5" fill="currentColor" />
                                            MAIS POPULAR
                                        </span>
                                    </div>
                                )}

                                <div className="relative flex flex-col flex-1 rounded-2xl overflow-hidden"
                                    style={{
                                        background: isPopular
                                            ? "linear-gradient(155deg, var(--vyz-accent-soft-6) 0%, var(--vyz-surface-2) 55%)"
                                            : "var(--vyz-surface-1)",
                                        border: "none",
                                        boxShadow: isPopular
                                            ? "0 0 0 1px var(--vyz-accent-border-strong), 0 8px 24px var(--vyz-accent-soft-10), 0 32px 72px -12px var(--vyz-accent-soft-12)"
                                            : "0 0 0 1px var(--vyz-border-strong), 0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)",
                                    }}>
                                    {isPopular && (
                                        <div className="absolute top-0 inset-x-0 h-px"
                                            style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.55) 35%, rgba(20,184,166,0.45) 65%, transparent)" }} />
                                    )}
                                    <div className="p-5 sm:p-7 flex flex-col flex-1">

                                        <div className="mb-5">
                                            <p className="text-xs mb-0.5"
                                                style={{ color: isPopular ? "var(--vyz-accent-light)" : "var(--vyz-text-dim)", fontWeight: "var(--fw-bold)", letterSpacing: "var(--ls-widest)" }}>
                                                {plan.name.toUpperCase()}
                                            </p>
                                            <p className="text-sm leading-snug" style={{ color: "var(--vyz-text-dim)" }}>{plan.tagline}</p>
                                        </div>

                                        <div className="mb-1">
                                            <div key={monthly} className="flex items-end gap-1 landing-fade-in">
                                                <span className="text-base leading-none mb-1.5"
                                                    style={{ fontWeight: "var(--fw-medium)", color: "var(--vyz-text-dim)" }}>R$</span>
                                                <span className="leading-none tabular-nums"
                                                    style={{
                                                        fontWeight: "var(--fw-extrabold)",
                                                        color: "var(--vyz-text-primary)",
                                                        fontSize: isPopular
                                                            ? "clamp(2.4rem, 8vw, 3.25rem)"
                                                            : "clamp(2rem, 7vw, 2.5rem)"
                                                    }}>
                                                    {monthly}
                                                </span>
                                                <span className="text-sm leading-none mb-1.5" style={{ color: "var(--vyz-text-soft)" }}>/mês</span>
                                            </div>
                                        </div>

                                        <div className="min-h-[34px] mb-5">
                                            {isAnnual ? (
                                                <div key="annual-info" className="flex items-center gap-2 flex-wrap mt-1 landing-fade-in">
                                                    <span className="text-[11px]" style={{ color: "var(--vyz-text-soft)" }}>
                                                        Cobrado R$ {Math.round(monthly * 12).toLocaleString("pt-BR")}/ano
                                                    </span>
                                                    {annualSaving > 0 && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                                                            style={{
                                                                background: isPopular ? "var(--vyz-accent-soft-12)" : "var(--vyz-surface-3)",
                                                                color: isPopular ? "var(--vyz-accent-light)" : "var(--vyz-text-soft)",
                                                                fontWeight: "var(--fw-semibold)"
                                                            }}>
                                                            Economize R$ {annualSaving.toLocaleString("pt-BR")}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] mt-1" style={{ color: "var(--vyz-text-soft)" }}>Faturado mensalmente</p>
                                            )}
                                            {plan.extraInfo && (
                                                <p className="text-[11px] mt-0.5" style={{ color: "var(--vyz-text-dim)" }}>{plan.extraInfo}</p>
                                            )}
                                        </div>

                                        <div className="h-px mb-5"
                                            style={{ background: isPopular ? "var(--vyz-accent-border)" : "var(--vyz-border)" }} />

                                        <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                                            {plan.features.map((f) => (
                                                <li key={f} className="flex items-start gap-2.5">
                                                    <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0"
                                                        style={{ background: isPopular ? "var(--vyz-accent-soft-12)" : "var(--vyz-surface-3)" }}>
                                                        <Check className="h-2.5 w-2.5" strokeWidth={3}
                                                            style={{ color: isPopular ? "var(--vyz-accent-light)" : "var(--vyz-text-dim)" }} />
                                                    </div>
                                                    <span className="text-sm leading-snug"
                                                        style={{ color: isPopular ? "var(--vyz-text-strong)" : "var(--vyz-text)", fontWeight: "var(--fw-medium)" }}>
                                                        {f}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {isPopular ? (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => onPlanSelect(plan.name.toLowerCase())}
                                                    className="relative w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm text-white overflow-hidden cursor-pointer"
                                                    style={{
                                                        background: "var(--vyz-gradient-accent)",
                                                        boxShadow: "var(--vyz-shadow-cta)",
                                                        fontWeight: "var(--fw-semibold)"
                                                    }}>
                                                    <span
                                                        className="absolute inset-0 rounded-xl landing-shine"
                                                        style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)" }}
                                                    />
                                                    <span className="relative">Começar teste de 14 dias</span>
                                                    <ArrowRight className="relative h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onScheduleDemo("pricing_popular")}
                                                    className="w-full text-xs cursor-pointer transition-colors"
                                                    style={{ color: "var(--vyz-text-dim)", fontWeight: "var(--fw-medium)" }}
                                                >
                                                    ou agende uma demo antes
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => onPlanSelect(plan.name.toLowerCase())}
                                                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm cursor-pointer"
                                                    style={{
                                                        background: "var(--vyz-surface-2)",
                                                        border: "none",
                                                        boxShadow: "0 0 0 1px var(--vyz-border-strong)",
                                                        color: "var(--vyz-text-strong)",
                                                        fontWeight: "var(--fw-semibold)"
                                                    }}>
                                                    Começar teste de 14 dias
                                                    <ArrowRight className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => onScheduleDemo("pricing_other")}
                                                    className="w-full text-xs cursor-pointer transition-colors"
                                                    style={{ color: "var(--vyz-text-soft)", fontWeight: "var(--fw-medium)" }}
                                                >
                                                    ou agende uma demo antes
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2 sm:gap-y-3 mt-10 sm:mt-12 landing-fade-in landing-delay-500">
                    {TRUST_ITEMS.map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs"
                            style={{ fontWeight: "var(--fw-medium)", color: "var(--vyz-text-soft)" }}>
                            <span className="text-emerald-500/50">{icon}</span>
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
