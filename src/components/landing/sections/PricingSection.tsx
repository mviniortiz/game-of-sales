import { useState } from "react";
import { Check, Star, Tag, MessageCircle, Layers, ShieldCheck } from "lucide-react";
import { PLANS } from "@/data/landing/pricing";
import { LandingButton } from "../LandingButton";

// Trust banner ACIMA dos cards — reforça confiança antes do preço.
const TRUST_BANNER = [
    { icon: MessageCircle, label: "WhatsApp + EVA inclusos" },
    { icon: Layers, label: "Sem add-on por feature" },
    { icon: ShieldCheck, label: "Cancele quando quiser" },
];

type Props = {
    onPlanSelect: (planName: string) => void;
    onScheduleDemo: (location: string) => void;
};

export const PricingSection = ({ onPlanSelect, onScheduleDemo }: Props) => {
    const [isAnnual, setIsAnnual] = useState(true);

    return (
        <section className="py-28 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "#F7FAFF" }}>
            {/* Soft radial blue glow no topo */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
                aria-hidden
                style={{
                    background: "radial-gradient(ellipse, rgba(21,86,192,0.10) 0%, rgba(74,140,232,0.04) 35%, transparent 65%)",
                    filter: "blur(40px)",
                }}
            />
            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.025] pointer-events-none"
                aria-hidden
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(10,10,10,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,0.1) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                }}
            />

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12 landing-fade-in-up">
                    <span
                        className="inline-flex items-center gap-1.5 text-[11px] rounded-full px-4 py-1.5 mb-6"
                        style={{
                            letterSpacing: "0.12em",
                            fontWeight: 600,
                            background: "rgba(21,86,192,0.08)",
                            color: "#1556C0",
                            border: "1px solid rgba(21,86,192,0.22)",
                        }}
                    >
                        <Tag className="h-3 w-3" />
                        PLANOS E PREÇOS
                    </span>

                    <h2
                        className="font-satoshi mb-4"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.9rem, 5vw, 3.25rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            color: "#0A0A0A",
                        }}
                    >
                        Planos simples, em real,{" "}
                        <span style={{ color: "rgba(10,10,10,0.5)" }}>para organizar seu comercial.</span>
                    </h2>

                    <p
                        className="max-w-2xl mx-auto"
                        style={{
                            fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                            color: "rgba(10,10,10,0.65)",
                        }}
                    >
                        Comece com Inbox, Pipeline e EVA assistida. Escale conforme seu volume de leads, vendedores e operações.
                    </p>
                </div>

                {/* Trust banner acima dos cards */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-10 landing-fade-in-up landing-delay-100">
                    {TRUST_BANNER.map(({ icon: Icon, label }) => (
                        <div
                            key={label}
                            className="inline-flex items-center gap-2 text-xs px-3.5 py-2 rounded-full"
                            style={{
                                background: "rgba(255,255,255,0.7)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                border: "1px solid rgba(10,10,10,0.08)",
                                color: "rgba(10,10,10,0.78)",
                                fontWeight: 500,
                            }}
                        >
                            <Icon className="h-3.5 w-3.5" strokeWidth={2} style={{ color: "#1556C0" }} />
                            {label}
                        </div>
                    ))}
                </div>

                {/* Toggle mensal/anual */}
                <div className="flex justify-center mb-10 landing-fade-in-up landing-delay-200">
                    <div
                        className="inline-flex gap-1 p-1 rounded-2xl"
                        style={{
                            background: "rgba(255,255,255,0.7)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            boxShadow: "inset 0 0 0 1px rgba(10,10,10,0.08)",
                        }}
                    >
                        {([false, true] as const).map((annual) => (
                            <button
                                key={String(annual)}
                                onClick={() => setIsAnnual(annual)}
                                className="relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-colors"
                                style={{
                                    fontWeight: 600,
                                    color: isAnnual === annual ? "#0A0A0A" : "rgba(10,10,10,0.55)",
                                }}
                            >
                                {isAnnual === annual && (
                                    <span
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background: "#FFFFFF",
                                            boxShadow:
                                                "0 1px 2px rgba(10,10,10,0.06), 0 4px 12px -2px rgba(21,86,192,0.12), inset 0 0 0 1px rgba(10,10,10,0.06)",
                                        }}
                                    />
                                )}
                                <span className="relative">{annual ? "Anual" : "Mensal"}</span>
                                {annual && (
                                    <span
                                        className="relative text-[10px] text-white px-2 py-0.5 rounded-full"
                                        style={{
                                            background: "linear-gradient(135deg, #1556C0, #4A8CE8)",
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-end">
                    {PLANS.map((plan, i) => {
                        const monthly = isAnnual ? Math.round(plan.priceNumber * 0.9) : plan.priceNumber;
                        const annualSaving = Math.round((plan.priceNumber - Math.round(plan.priceNumber * 0.9)) * 12);
                        const isPopular = plan.popular;
                        const delayClass = i === 0 ? "" : i === 1 ? "landing-delay-100" : "landing-delay-200";

                        return (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col landing-fade-in-up ${delayClass} ${isPopular ? "order-first md:order-none md:-mt-7 pt-8 md:pt-0" : ""}`}
                            >
                                {/* Glow azul atrás do Plus */}
                                {isPopular && (
                                    <div
                                        className="absolute inset-0 -z-10 rounded-3xl pointer-events-none"
                                        aria-hidden
                                        style={{
                                            background:
                                                "radial-gradient(ellipse at center, rgba(21,86,192,0.16) 0%, rgba(74,140,232,0.06) 40%, transparent 70%)",
                                            filter: "blur(24px)",
                                            transform: "scale(1.1)",
                                        }}
                                    />
                                )}

                                {/* Badge MAIS POPULAR flutuante */}
                                {isPopular && (
                                    <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
                                        <span
                                            className="inline-flex items-center gap-1.5 text-[10px] px-4 py-1.5 rounded-full"
                                            style={{
                                                background: "linear-gradient(135deg, #1556C0, #4A8CE8)",
                                                color: "white",
                                                fontWeight: 700,
                                                letterSpacing: "0.1em",
                                                boxShadow:
                                                    "0 8px 24px -6px rgba(21,86,192,0.5), 0 0 0 3px #F7FAFF",
                                            }}
                                        >
                                            <Star className="h-2.5 w-2.5" fill="currentColor" />
                                            MAIS POPULAR
                                        </span>
                                    </div>
                                )}

                                <div
                                    className="relative flex flex-col flex-1 rounded-2xl overflow-hidden"
                                    style={{
                                        background: isPopular
                                            ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,250,255,0.96) 100%)"
                                            : "rgba(255,255,255,0.7)",
                                        backdropFilter: "blur(8px)",
                                        WebkitBackdropFilter: "blur(8px)",
                                        boxShadow: isPopular
                                            ? "0 0 0 1.5px #1556C0, 0 8px 24px -6px rgba(21,86,192,0.2), 0 32px 72px -16px rgba(21,86,192,0.22)"
                                            : "0 0 0 1px rgba(10,10,10,0.08), 0 4px 12px -4px rgba(10,10,10,0.06)",
                                    }}
                                >
                                    {/* Top accent line no Plus */}
                                    {isPopular && (
                                        <div
                                            className="absolute top-0 inset-x-0 h-px"
                                            style={{
                                                background:
                                                    "linear-gradient(90deg, transparent, rgba(21,86,192,0.8) 30%, rgba(74,140,232,0.6) 65%, transparent)",
                                            }}
                                        />
                                    )}

                                    <div className="p-6 sm:p-7 flex flex-col flex-1">
                                        {/* Plan name + tagline */}
                                        <div className="mb-5">
                                            <p
                                                className="text-xs mb-1"
                                                style={{
                                                    color: isPopular ? "#1556C0" : "rgba(10,10,10,0.5)",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.16em",
                                                }}
                                            >
                                                {plan.name.toUpperCase()}
                                            </p>
                                            <p
                                                className="text-sm leading-snug"
                                                style={{ color: "rgba(10,10,10,0.65)", fontWeight: 400 }}
                                            >
                                                {plan.tagline}
                                            </p>
                                            {isPopular && (
                                                <p
                                                    className="text-[11px] mt-2"
                                                    style={{
                                                        color: "rgba(21,86,192,0.85)",
                                                        fontWeight: 600,
                                                        letterSpacing: "0.01em",
                                                    }}
                                                >
                                                    Recomendado para a maioria das agências.
                                                </p>
                                            )}
                                        </div>

                                        {/* Preço — R$ pequeno / número grande / /mês na base */}
                                        <div className="mb-2">
                                            <div className="flex items-baseline gap-1.5">
                                                <span
                                                    className="text-base leading-none"
                                                    style={{ fontWeight: 500, color: "rgba(10,10,10,0.55)" }}
                                                >
                                                    R$
                                                </span>
                                                <span
                                                    key={monthly}
                                                    className="leading-none tabular-nums landing-fade-in"
                                                    style={{
                                                        fontWeight: 700,
                                                        color: "#0A0A0A",
                                                        fontSize: isPopular
                                                            ? "clamp(2.75rem, 8vw, 3.75rem)"
                                                            : "clamp(2.25rem, 7vw, 3rem)",
                                                        letterSpacing: "-0.03em",
                                                    }}
                                                >
                                                    {monthly}
                                                </span>
                                                <span
                                                    className="text-sm leading-none"
                                                    style={{ color: "rgba(10,10,10,0.55)", fontWeight: 500 }}
                                                >
                                                    /mês
                                                </span>
                                            </div>
                                        </div>

                                        {/* Annual savings */}
                                        <div className="min-h-[34px] mb-5">
                                            {isAnnual ? (
                                                <div key="annual-info" className="flex items-center gap-2 flex-wrap mt-1 landing-fade-in">
                                                    <span className="text-[11px]" style={{ color: "rgba(10,10,10,0.55)" }}>
                                                        Cobrado R$ {Math.round(monthly * 12).toLocaleString("pt-BR")}/ano
                                                    </span>
                                                    {annualSaving > 0 && (
                                                        <span
                                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                                            style={{
                                                                background: isPopular ? "rgba(21,86,192,0.12)" : "rgba(10,10,10,0.05)",
                                                                color: isPopular ? "#1556C0" : "rgba(10,10,10,0.65)",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            Economize R$ {annualSaving.toLocaleString("pt-BR")}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] mt-1" style={{ color: "rgba(10,10,10,0.55)" }}>
                                                    Faturado mensalmente
                                                </p>
                                            )}
                                            {plan.extraInfo && (
                                                <p className="text-[11px] mt-0.5" style={{ color: "rgba(10,10,10,0.5)" }}>
                                                    {plan.extraInfo}
                                                </p>
                                            )}
                                        </div>

                                        {/* Divider */}
                                        <div
                                            className="h-px mb-5"
                                            style={{
                                                background: isPopular ? "rgba(21,86,192,0.18)" : "rgba(10,10,10,0.08)",
                                            }}
                                        />

                                        {/* Features */}
                                        <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                                            {plan.features.map((f) => (
                                                <li key={f} className="flex items-start gap-2.5">
                                                    <div
                                                        className="w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0"
                                                        style={{
                                                            background: isPopular ? "rgba(21,86,192,0.14)" : "rgba(10,10,10,0.05)",
                                                        }}
                                                    >
                                                        <Check
                                                            className="h-2.5 w-2.5"
                                                            strokeWidth={3}
                                                            style={{ color: isPopular ? "#1556C0" : "rgba(10,10,10,0.55)" }}
                                                        />
                                                    </div>
                                                    <span
                                                        className="text-sm leading-snug"
                                                        style={{
                                                            color: isPopular ? "rgba(10,10,10,0.88)" : "rgba(10,10,10,0.78)",
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {f}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA + agende */}
                                        <div className="space-y-2">
                                            <LandingButton
                                                as="button"
                                                onClick={() => onPlanSelect(plan.name.toLowerCase())}
                                                variant={isPopular ? "primary" : "secondary"}
                                                size="lg"
                                                fullWidth
                                                showArrow
                                            >
                                                {plan.ctaLabel}
                                            </LandingButton>
                                            <button
                                                onClick={() => onScheduleDemo(isPopular ? "pricing_popular" : "pricing_other")}
                                                className="w-full text-xs cursor-pointer transition-colors hover:text-black"
                                                style={{ color: "rgba(10,10,10,0.55)", fontWeight: 500 }}
                                            >
                                                ou agende uma demo antes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Comparativo "Todos os planos incluem" */}
                <div className="mt-12 text-center landing-fade-in landing-delay-500">
                    <p
                        className="max-w-2xl mx-auto"
                        style={{
                            fontSize: "0.9375rem",
                            lineHeight: 1.6,
                            color: "rgba(10,10,10,0.6)",
                            fontWeight: 400,
                        }}
                    >
                        <span style={{ color: "rgba(10,10,10,0.88)", fontWeight: 600 }}>Todos os planos incluem:</span>{" "}
                        WhatsApp conectado, Inbox Comercial, pipeline, EVA assistida e suporte humano em português.
                    </p>
                </div>
            </div>
        </section>
    );
};
