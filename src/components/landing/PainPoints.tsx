import { Clock, TrendingDown, AlertTriangle, Check, X, ArrowRight } from "lucide-react";

const COMPARISONS = [
    {
        icon: Clock,
        before: "Pipeline invisível",
        beforeDesc: "Deal espalhado em planilha, WhatsApp e na cabeça do vendedor. Ninguém sabe onde tá cada coisa.",
        after: "Pipeline vivo",
        afterDesc: "Arrasta e solta. Cada deal aparece, do lead ao fechamento, em tempo real.",
        delayClass: "",
    },
    {
        icon: TrendingDown,
        before: "Time sem norte",
        beforeDesc: "Vendedor não sabe quanto falta pra bater meta. Gestor cobra todo dia no grupo.",
        after: "Time com norte",
        afterDesc: "Cada vendedor enxerga a meta, o progresso e a posição no ranking. Motivação sem precisar cobrar.",
        delayClass: "landing-delay-100",
    },
    {
        icon: AlertTriangle,
        before: "Venda caindo no vácuo",
        beforeDesc: "Checkout aprovou e ninguém registrou. Vendeu e o painel nem ficou sabendo.",
        after: "Venda que não escapa",
        afterDesc: "Webhook conecta o seu checkout ao CRM. Caiu venda, ranking atualiza e o painel reflete na hora.",
        delayClass: "landing-delay-200",
    },
];

export const PainPoints = () => {
    return (
        <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                }}
            />
            <div className="relative max-w-3xl mx-auto">
                <div className="text-center mb-20 landing-fade-in-up">
                    <p
                        className="text-xs uppercase mb-4 tracking-widest"
                        style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.35)" }}
                    >
                        Parece familiar?
                    </p>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Seu processo de vendas{" "}
                        <span className="text-red-400">não precisa ser assim.</span>
                    </h2>
                </div>

                <div className="space-y-6">
                    {COMPARISONS.map(({ icon: Icon, before, beforeDesc, after, afterDesc, delayClass }, i) => (
                        <div
                            key={i}
                            className={`grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch landing-fade-in-up ${delayClass}`}
                        >
                            <div
                                className="flex items-start gap-3.5 rounded-xl p-5"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                            >
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: "rgba(239,68,68,0.15)" }}
                                >
                                    <Icon className="h-[22px] w-[22px] text-red-400" strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <X className="h-3.5 w-3.5 text-red-400 shrink-0" strokeWidth={2.5} />
                                        <p
                                            className="text-sm"
                                            style={{ fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.95)" }}
                                        >
                                            {before}
                                        </p>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                                        {beforeDesc}
                                    </p>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center justify-center px-1">
                                <ArrowRight className="h-5 w-5 text-emerald-400" strokeWidth={2.25} />
                            </div>

                            <div
                                className="flex items-start gap-3.5 rounded-xl p-5"
                                style={{ background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}
                            >
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: "rgba(0,227,122,0.15)" }}
                                >
                                    <Icon className="h-[22px] w-[22px] text-emerald-400" strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
                                        <p
                                            className="text-sm"
                                            style={{ fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.95)" }}
                                        >
                                            {after}
                                        </p>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                                        {afterDesc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 flex flex-col items-center text-center landing-fade-in-up landing-delay-400">
                    <p
                        style={{ fontWeight: "var(--fw-medium)", fontSize: "1.0625rem", color: "rgba(255,255,255,0.95)" }}
                    >
                        Tem um jeito{" "}
                        <span className="text-emerald-400" style={{ fontWeight: "var(--fw-bold)" }}>
                            melhor.
                        </span>
                    </p>
                    <p className="text-xs mt-1 mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Um CRM que resolve tudo isso. E fica no ar em 5 minutos.
                    </p>
                    <div className="h-12 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
            </div>
        </section>
    );
};
