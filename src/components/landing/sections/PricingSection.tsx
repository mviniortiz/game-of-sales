import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/data/landing/pricing";
import { LandingButton } from "../LandingButton";

// Trust banner ACIMA dos cards — reforça confiança antes do preço.
// LP.3 2026-06-09: "Sem add-on por feature" saiu (contradizia "Ligações como
// add-on" no Plus); chip do meio afirma só o que vale pra todo plano.
// LP.4 2026-06-09: reskin "tabela de tarifas" editorial — hairlines, preço
// tabular gigante, mono pra telemetria. Sem glass/glow/blur. Lógica intocada.
const TRUST_BANNER = [
    "WhatsApp + EVA inclusos",
    "Inbox e Pipeline em todos os planos",
    "Cancele quando quiser",
];

type Props = {
    onPlanSelect: (planName: string) => void;
    onScheduleDemo: (location: string) => void;
};

export const PricingSection = ({ onPlanSelect, onScheduleDemo }: Props) => {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "var(--lp-white)" }}>
            <div className="max-w-5xl mx-auto relative z-10">
                {/* Estação do fio */}
                <div className="lp-station mb-12 sm:mb-14 landing-fade-in-up">
                    <span className="lp-station-node" />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                        08 · planos e preços
                    </span>
                    <span className="lp-station-rule" />
                </div>

                {/* Header */}
                <div className="mb-10 landing-fade-in-up">
                    <h2
                        className="font-satoshi mb-4"
                        style={{
                            fontWeight: 900,
                            fontSize: "clamp(1.9rem, 5vw, 3.2rem)",
                            lineHeight: 1.04,
                            letterSpacing: "-0.04em",
                            color: "var(--lp-ink)",
                            maxWidth: "720px",
                        }}
                    >
                        Planos simples,{" "}
                        <span className="lp-serif" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                            em real
                        </span>
                        , para organizar seu comercial.
                    </h2>

                    <p
                        className="max-w-2xl"
                        style={{
                            fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                            color: "var(--lp-ink-70)",
                        }}
                    >
                        Comece com Inbox, Pipeline e EVA assistida. Escale conforme seu volume de leads, vendedores e operações.
                    </p>
                </div>

                {/* Trust banner + toggle na mesma régua */}
                <div
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 py-4 mb-10 border-t border-b landing-fade-in-up landing-delay-100"
                    style={{ borderColor: "var(--lp-line)" }}
                >
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        {TRUST_BANNER.map((label) => (
                            <span
                                key={label}
                                className="lp-mono inline-flex items-center gap-1.5"
                                style={{ color: "var(--lp-ink-55)", textTransform: "none", letterSpacing: "0.03em" }}
                            >
                                <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: "var(--lp-live)" }} />
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Toggle mensal/anual */}
                    <div
                        className="inline-flex self-start lg:self-auto"
                        style={{ border: "1px solid var(--lp-line)", borderRadius: 8, padding: 3 }}
                    >
                        {([false, true] as const).map((annual) => (
                            <button
                                key={String(annual)}
                                onClick={() => setIsAnnual(annual)}
                                className="lp-mono relative flex items-center gap-2 px-4 py-2"
                                style={{
                                    background: isAnnual === annual ? "var(--lp-ink)" : "transparent",
                                    color: isAnnual === annual ? "#FAF9F5" : "var(--lp-ink-55)",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    textTransform: "none",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                {annual ? "anual" : "mensal"}
                                {annual && (
                                    <span
                                        style={{
                                            color: isAnnual === annual ? "#7FE0B0" : "var(--lp-live)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        −10%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-0 md:items-stretch">
                    {PLANS.map((plan, i) => {
                        const isFree = plan.priceNumber === 0;
                        const isCustom = plan.priceNumber === null;
                        const monthly = plan.priceNumber && isAnnual
                            ? Math.round(plan.priceNumber * 0.9)
                            : plan.priceNumber ?? 0;
                        const annualSaving = plan.priceNumber
                            ? Math.round((plan.priceNumber - Math.round(plan.priceNumber * 0.9)) * 12)
                            : 0;
                        const isPopular = plan.popular;
                        const delayClass = i === 0 ? "" : i === 1 ? "landing-delay-100" : "landing-delay-200";

                        return (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col landing-fade-in-up ${delayClass} ${isPopular ? "order-first md:order-none md:-my-5 z-10" : ""}`}
                                style={{
                                    background: isPopular ? "var(--lp-paper)" : "var(--lp-white)",
                                    border: isPopular ? "2px solid var(--lp-ink)" : "1px solid var(--lp-line)",
                                    borderRadius: isPopular ? 10 : 0,
                                    boxShadow: isPopular ? "8px 8px 0 0 rgba(21,86,192,0.18)" : "none",
                                    marginLeft: i === 2 ? -1 : 0,
                                    marginRight: i === 0 ? -1 : 0,
                                }}
                            >
                                {/* Tag MAIS POPULAR */}
                                {isPopular && (
                                    <div className="absolute -top-3.5 left-6">
                                        <span
                                            className="lp-mono inline-flex px-3 py-1.5"
                                            style={{
                                                background: "var(--lp-ink)",
                                                color: "#FAF9F5",
                                                borderRadius: 4,
                                            }}
                                        >
                                            mais popular
                                        </span>
                                    </div>
                                )}

                                <div className={`flex flex-col flex-1 p-6 sm:p-7 ${isPopular ? "pt-9" : ""}`}>
                                    {/* Nome + tagline */}
                                    <div className="mb-6">
                                        <p
                                            className="lp-mono mb-1.5"
                                            style={{ color: isPopular ? "var(--lp-blue)" : "var(--lp-ink-55)" }}
                                        >
                                            {plan.name}
                                        </p>
                                        <p className="text-sm leading-snug" style={{ color: "var(--lp-ink-70)" }}>
                                            {plan.tagline}
                                        </p>
                                        {isPopular && (
                                            <p className="text-[12px] mt-2" style={{ color: "var(--lp-blue)", fontWeight: 600 }}>
                                                Recomendado para a maioria das agências.
                                            </p>
                                        )}
                                    </div>

                                    {/* Preço */}
                                    <div className="flex items-baseline gap-1.5 mb-2">
                                        {isCustom ? (
                                            <span
                                                className="font-satoshi leading-none landing-fade-in"
                                                style={{
                                                    fontWeight: 900,
                                                    color: "var(--lp-ink)",
                                                    fontSize: "clamp(1.8rem, 5vw, 2.3rem)",
                                                    letterSpacing: "-0.03em",
                                                }}
                                            >
                                                Sob medida
                                            </span>
                                        ) : (
                                            <>
                                                <span className="lp-mono" style={{ color: "var(--lp-ink-55)", fontSize: 13 }}>
                                                    R$
                                                </span>
                                                <span
                                                    key={monthly}
                                                    className="font-satoshi leading-none tabular-nums landing-fade-in"
                                                    style={{
                                                        fontWeight: 900,
                                                        color: "var(--lp-ink)",
                                                        fontSize: isPopular ? "clamp(3rem, 8vw, 3.9rem)" : "clamp(2.4rem, 7vw, 3.1rem)",
                                                        letterSpacing: "-0.04em",
                                                    }}
                                                >
                                                    {monthly}
                                                </span>
                                                <span className="lp-mono" style={{ color: "var(--lp-ink-55)", fontSize: 12, textTransform: "none" }}>
                                                    /mês
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Cobrança anual */}
                                    <div className="min-h-[38px] mb-5">
                                        {isFree ? (
                                            <p className="text-[11.5px]" style={{ color: "var(--lp-live)", fontWeight: 700 }}>
                                                Grátis pra sempre, sem cartão
                                            </p>
                                        ) : isCustom ? (
                                            <p className="text-[11.5px]" style={{ color: "var(--lp-ink-55)" }}>
                                                Preço pelo tamanho do time
                                            </p>
                                        ) : isAnnual ? (
                                            <p key="annual-info" className="text-[11.5px] landing-fade-in" style={{ color: "var(--lp-ink-55)" }}>
                                                Cobrado R$ {Math.round(monthly * 12).toLocaleString("pt-BR")}/ano
                                                {annualSaving > 0 && (
                                                    <span style={{ color: "var(--lp-live)", fontWeight: 700 }}>
                                                        {" "}· economize R$ {annualSaving.toLocaleString("pt-BR")}
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-[11.5px]" style={{ color: "var(--lp-ink-55)" }}>
                                                Faturado mensalmente
                                            </p>
                                        )}
                                        {plan.extraInfo && (
                                            <p className="text-[11.5px] mt-0.5" style={{ color: "var(--lp-ink-40)" }}>
                                                {plan.extraInfo}
                                            </p>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <ul
                                        className="flex flex-col mb-7 flex-1 border-t"
                                        style={{ borderColor: "var(--lp-line)" }}
                                    >
                                        {plan.features.map((f) => (
                                            <li
                                                key={f}
                                                className="flex items-start gap-2.5 py-2.5 border-b"
                                                style={{ borderColor: "var(--lp-line-soft)" }}
                                            >
                                                <Check
                                                    className="h-3.5 w-3.5 mt-0.5 shrink-0"
                                                    strokeWidth={2.6}
                                                    style={{ color: isPopular ? "var(--lp-blue)" : "var(--lp-ink-40)" }}
                                                />
                                                <span
                                                    className="text-[13.5px] leading-snug"
                                                    style={{ color: "var(--lp-ink-90)", fontWeight: 500 }}
                                                >
                                                    {f}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA por plano: Free → criar conta direto; Pro → demo é
                                        o caminho principal (LP.3), conta como secundário;
                                        Escala → conversa com o time. */}
                                    <div className="space-y-2.5">
                                        <LandingButton
                                            as="button"
                                            onClick={() =>
                                                isFree
                                                    ? onPlanSelect("free")
                                                    : onScheduleDemo(`pricing_${plan.name.toLowerCase()}`)
                                            }
                                            variant={isPopular ? "primary" : "secondary"}
                                            size="lg"
                                            fullWidth
                                            showArrow
                                        >
                                            {plan.ctaLabel}
                                        </LandingButton>
                                        {isPopular && (
                                            <button
                                                onClick={() => onPlanSelect("pro")}
                                                className="w-full text-xs cursor-pointer transition-colors hover:text-black"
                                                style={{ color: "var(--lp-ink-55)", fontWeight: 500 }}
                                            >
                                                ou crie sua conta e teste sozinho
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* "Todos os planos incluem" */}
                <div className="mt-12 landing-fade-in landing-delay-300">
                    <p
                        className="max-w-2xl"
                        style={{
                            fontSize: "0.9375rem",
                            lineHeight: 1.6,
                            color: "var(--lp-ink-55)",
                        }}
                    >
                        <span style={{ color: "var(--lp-ink)", fontWeight: 600 }}>Todos os planos incluem:</span>{" "}
                        WhatsApp conectado, Inbox Comercial, pipeline, EVA assistida e suporte humano em português.
                    </p>
                </div>
            </div>
        </section>
    );
};
