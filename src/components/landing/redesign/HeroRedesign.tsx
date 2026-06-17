import { Calendar, ArrowRight, Check } from "lucide-react";
import { LandingButton } from "../LandingButton";
import { EvaNode } from "../EvaNode";

interface HeroRedesignProps {
    onScheduleDemoClick: () => void;
    onHowItWorksClick: () => void;
}

const PILLS = [
    { label: "intenção: preço", color: "#1556C0", bg: "rgba(21,86,192,0.08)", border: "rgba(21,86,192,0.3)" },
    { label: "urgência: alta", color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.35)" },
    { label: "fit: bom", color: "#008A52", bg: "rgba(0,138,82,0.08)", border: "rgba(0,138,82,0.3)" },
];

const PIPE = ["Novo lead", "Qualificação", "Proposta"];

/**
 * Hero do redesign — masthead editorial + headline dominante + filmstrip
 * horizontal do fluxo (Conversa → EVA lê → Pipeline). O artefato ocupa a
 * largura toda, equilibrando a composição (vs. o card tilt antigo à direita).
 */
export const HeroRedesign = ({ onScheduleDemoClick, onHowItWorksClick }: HeroRedesignProps) => {
    return (
        <section className="lp-paper lp-paper--fine relative overflow-hidden">
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16 sm:pb-20">
                {/* Masthead de edição */}
                <div className="lpx-masthead landing-fade-in-up">
                    <span
                        className="lp-mono"
                        style={{ color: "var(--lp-ink)", fontWeight: 700, letterSpacing: "0.06em" }}
                    >
                        VYZON · CENTRAL COMERCIAL
                    </span>
                    <span className="hidden sm:inline lp-mono" style={{ color: "var(--lp-ink-40)" }}>
                        agências que vendem por conversa
                    </span>
                    <span className="ml-auto inline-flex items-center gap-2">
                        <span className="lp-live-dot" />
                        <span className="lp-mono" style={{ color: "var(--lp-live)" }}>
                            EVA · ao vivo
                        </span>
                    </span>
                </div>

                {/* Headline + lede */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-end mt-10 sm:mt-14">
                    <h1
                        className="lpx-h landing-fade-in-up landing-delay-100"
                        style={{ fontSize: "clamp(2.8rem, 7.2vw, 5.4rem)", lineHeight: 0.97 }}
                    >
                        Pare de perder leads
                        <br />
                        <span className="lpx-serif lp-underline" style={{ color: "var(--lp-blue)" }}>
                            no WhatsApp.
                        </span>
                    </h1>

                    <div className="landing-fade-in-up landing-delay-200">
                        <p
                            className="max-w-[480px]"
                            style={{ fontSize: "clamp(1rem, 1.6vw, 1.125rem)", lineHeight: 1.62, color: "var(--lp-ink-70)" }}
                        >
                            A Central Comercial para agências que vendem por conversa. A EVA lê cada
                            atendimento, aponta quem está pronto para avançar e sugere o próximo passo.
                            Seu time aprova e a oportunidade segue no pipeline.
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-7">
                            <LandingButton
                                as="button"
                                onClick={onScheduleDemoClick}
                                variant="primary"
                                size="lg"
                                icon={<Calendar className="h-4 w-4" strokeWidth={2} />}
                                showArrow
                            >
                                Agendar demo gratuita
                            </LandingButton>
                            <LandingButton
                                as="button"
                                onClick={onHowItWorksClick}
                                variant="secondary"
                                size="lg"
                            >
                                Ver como funciona
                            </LandingButton>
                        </div>
                    </div>
                </div>

                {/* Filmstrip — o fluxo em 3 passos, regra-base */}
                <div
                    className="mt-14 sm:mt-20 pt-6 landing-fade-in-up landing-delay-300"
                    style={{ borderTop: "1.5px solid var(--lp-ink)" }}
                >
                    <div className="flex items-center justify-between mb-5">
                        <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                            o fio da conversa
                        </span>
                        <span className="lp-mono" style={{ color: "var(--lp-ink-40)" }}>
                            inbox → eva → pipeline
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-4 md:gap-3">
                        {/* 1 · Conversa */}
                        <article className="lpx-card lpx-step p-5" style={{ borderColor: "var(--lp-line)" }}>
                            <p className="lp-mono mb-3" style={{ color: "var(--lp-ink-40)" }}>
                                01 · conversa
                            </p>
                            <p className="lp-mono mb-2" style={{ color: "var(--lp-ink-40)", fontSize: 11 }}>
                                Carla R. · Meta Ads · 14:32
                            </p>
                            <div
                                className="px-4 py-3 text-[13.5px]"
                                style={{
                                    background: "var(--lp-paper)",
                                    border: "1px solid var(--lp-line)",
                                    borderRadius: "10px 10px 10px 3px",
                                    color: "var(--lp-ink-90)",
                                    lineHeight: 1.45,
                                }}
                            >
                                Oi, vi o anúncio e queria entender os planos.
                            </div>
                        </article>

                        <Arrow />

                        {/* 2 · EVA lê */}
                        <article className="lpx-card lpx-step p-5" style={{ borderColor: "rgba(109,40,217,0.28)", background: "rgba(124,58,237,0.035)" }}>
                            <p className="lp-mono mb-3 inline-flex items-center gap-1.5" style={{ color: "var(--lp-eva)" }}>
                                <EvaNode size={12} color="var(--lp-eva)" /> 02 · eva lê
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {PILLS.map((p) => (
                                    <span
                                        key={p.label}
                                        className="lp-mono px-2 py-1"
                                        style={{
                                            color: p.color,
                                            background: p.bg,
                                            border: `1px solid ${p.border}`,
                                            borderRadius: 6,
                                            fontSize: 11,
                                            textTransform: "none",
                                            letterSpacing: "0.02em",
                                        }}
                                    >
                                        {p.label}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[12.5px]" style={{ color: "var(--lp-ink-70)", lineHeight: 1.45 }}>
                                Sugestão: pergunte orçamento e urgência antes de propor reunião.
                            </p>
                        </article>

                        <Arrow />

                        {/* 3 · Pipeline */}
                        <article className="lpx-card lpx-step p-5" style={{ borderColor: "var(--lp-line)" }}>
                            <p className="lp-mono mb-3" style={{ color: "var(--lp-ink-40)" }}>
                                03 · pipeline
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {PIPE.map((stage) => {
                                    const active = stage === "Qualificação";
                                    return (
                                        <span
                                            key={stage}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-[12.5px]"
                                            style={{
                                                background: active ? "rgba(21,86,192,0.08)" : "var(--lp-paper)",
                                                border: `1px solid ${active ? "rgba(21,86,192,0.4)" : "var(--lp-line)"}`,
                                                borderRadius: 7,
                                                color: active ? "var(--lp-blue-deep)" : "var(--lp-ink-55)",
                                                fontWeight: active ? 700 : 500,
                                            }}
                                        >
                                            {active && <Check className="h-3 w-3" strokeWidth={3} />}
                                            {stage}
                                        </span>
                                    );
                                })}
                            </div>
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Arrow = () => (
    <div className="hidden md:flex items-center justify-center" aria-hidden="true">
        <ArrowRight className="h-5 w-5" style={{ color: "var(--lp-ink-40)" }} strokeWidth={2} />
    </div>
);
