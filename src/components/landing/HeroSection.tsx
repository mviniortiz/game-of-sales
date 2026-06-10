import { useEffect } from "react";
import { Calendar, Check } from "lucide-react";
import { LandingButton } from "./LandingButton";
import { trackEvent } from "@/lib/analytics";

// LP.4 2026-06-09: hero "O Fio da Conversa" — layout assimétrico. Esquerda:
// headline Satoshi 900 com acento Sentient itálica. Direita: o artefato-
// assinatura, um cartão onde a EVA lê uma conversa real em loop CSS de 9s
// (mensagem → varredura → pills de análise → sugestão → aprovação → pipeline).
// A página demonstra o produto antes de explicá-lo. Sem IO, sem JS de motion.
const HERO_COPY = {
    line1: "Pare de perder leads",
    line2: "no WhatsApp.",
    subtitle:
        "A Central Comercial para agências que vendem por conversa. A EVA lê cada atendimento, aponta quem está pronto para avançar e sugere o próximo passo. Seu time aprova e a oportunidade segue no pipeline.",
};

const READ_PILLS = [
    { cls: "lp-read-pill-1", label: "intenção: preço", color: "#1556C0", bg: "rgba(21,86,192,0.08)", border: "rgba(21,86,192,0.3)" },
    { cls: "lp-read-pill-2", label: "urgência: alta", color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.35)" },
    { cls: "lp-read-pill-3", label: "fit: bom", color: "#008A52", bg: "rgba(0,138,82,0.08)", border: "rgba(0,138,82,0.3)" },
] as const;

interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onScheduleDemoClick?: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onScheduleDemoClick }: HeroSectionProps) => {
    useEffect(() => {
        try {
            trackEvent("hero_variant_shown", { variant: "fio_da_conversa_lp4" });
        } catch {
            /* analytics never breaks UX */
        }
    }, []);

    const onSchedule = onScheduleDemoClick || onCTAClick;

    return (
        <section className="lp-paper lp-paper--fine relative overflow-hidden">
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-14 lg:gap-10 items-center pt-32 sm:pt-40 pb-20 sm:pb-28">
                    {/* ── ESQUERDA: headline + sub + CTA ─────────────────── */}
                    <div className="text-left">
                        {/* Eyebrow mono — a telemetria abre a página */}
                        <p
                            className="lp-mono landing-fade-in-up"
                            style={{ color: "var(--lp-blue)" }}
                        >
                            Central Comercial&nbsp;&nbsp;·&nbsp;&nbsp;agências que vendem por conversa
                        </p>

                        <h1
                            className="font-satoshi mt-5 landing-fade-in-up landing-delay-100"
                            style={{
                                fontSize: "clamp(2.9rem, 7vw, 5rem)",
                                lineHeight: 0.98,
                                letterSpacing: "-0.045em",
                                color: "var(--lp-ink)",
                                fontWeight: 900,
                            }}
                        >
                            {HERO_COPY.line1}
                            <br />
                            <span
                                className="lp-serif lp-underline"
                                style={{
                                    fontWeight: 500,
                                    letterSpacing: "-0.03em",
                                    color: "var(--lp-blue)",
                                    paddingRight: "0.04em",
                                }}
                            >
                                {HERO_COPY.line2}
                            </span>
                        </h1>

                        <p
                            className="mt-7 max-w-[560px] landing-fade-in-up landing-delay-200"
                            style={{
                                fontSize: "clamp(1rem, 1.9vw, 1.1875rem)",
                                lineHeight: 1.6,
                                color: "var(--lp-ink-70)",
                                fontWeight: 400,
                            }}
                        >
                            {HERO_COPY.subtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-9 landing-fade-in-up landing-delay-300">
                            <LandingButton
                                href="#agendar-demo"
                                onClick={(e) => {
                                    if (onSchedule) {
                                        e.preventDefault();
                                        onSchedule();
                                    }
                                }}
                                variant="primary"
                                size="lg"
                                icon={<Calendar className="h-4 w-4" strokeWidth={2} />}
                                showArrow
                            >
                                Agendar demo gratuita
                            </LandingButton>
                            <p
                                className="text-[13px] leading-snug max-w-[220px]"
                                style={{ color: "var(--lp-ink-55)", fontWeight: 500 }}
                            >
                                Gratuita e personalizada para o contexto da sua agência.
                            </p>
                        </div>
                    </div>

                    {/* ── DIREITA: a EVA lendo uma conversa (loop CSS 9s) ── */}
                    <div className="relative landing-fade-in-up landing-delay-300" aria-hidden="true">
                        <div className="lp-card lp-frame p-5 sm:p-6 max-w-[440px] mx-auto lg:mx-0 lg:ml-auto">
                            {/* Header de telemetria */}
                            <div className="flex items-center gap-2.5 pb-4 border-b" style={{ borderColor: "var(--lp-line-soft)" }}>
                                <span className="lp-live-dot shrink-0" />
                                <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                                    EVA · lendo a conversa
                                </span>
                                <span
                                    className="lp-blink ml-auto"
                                    style={{
                                        width: 8,
                                        height: 14,
                                        background: "var(--lp-blue)",
                                        display: "inline-block",
                                    }}
                                />
                            </div>

                            {/* Mensagem do lead */}
                            <div className="lp-read-msg mt-5">
                                <p className="lp-mono mb-1.5" style={{ color: "var(--lp-ink-40)" }}>
                                    Carla R. · Meta Ads · 14:32
                                </p>
                                <div
                                    className="px-4 py-3 text-[14px]"
                                    style={{
                                        background: "var(--lp-paper)",
                                        border: "1px solid var(--lp-line)",
                                        borderRadius: "10px 10px 10px 3px",
                                        color: "var(--lp-ink-90)",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Oi, vi o anúncio e queria entender os planos.
                                </div>
                                {/* Varredura de leitura */}
                                <div
                                    className="lp-read-scan mt-2 h-[2px]"
                                    style={{ background: "linear-gradient(90deg, var(--lp-blue), rgba(21,86,192,0.2))" }}
                                />
                            </div>

                            {/* Pills de análise */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {READ_PILLS.map((p) => (
                                    <span
                                        key={p.label}
                                        className={`${p.cls} lp-mono px-2.5 py-1.5`}
                                        style={{
                                            color: p.color,
                                            background: p.bg,
                                            border: `1px solid ${p.border}`,
                                            borderRadius: 6,
                                            textTransform: "none",
                                            letterSpacing: "0.02em",
                                        }}
                                    >
                                        {p.label}
                                    </span>
                                ))}
                            </div>

                            {/* Sugestão + aprovação */}
                            <div className="lp-read-suggest mt-4">
                                <div
                                    className="px-4 py-3.5"
                                    style={{
                                        background: "var(--lp-white)",
                                        border: "1px solid var(--lp-line)",
                                        borderLeft: "3px solid var(--lp-blue)",
                                        borderRadius: 8,
                                    }}
                                >
                                    <p className="lp-mono mb-1.5" style={{ color: "var(--lp-blue)" }}>
                                        sugestão da EVA
                                    </p>
                                    <p className="text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>
                                        Pergunte sobre orçamento e urgência antes de propor uma reunião.
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span
                                            className="lp-read-approve inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-white"
                                            style={{ background: "var(--lp-blue)", borderRadius: 6, fontWeight: 600 }}
                                        >
                                            <Check className="h-3 w-3" strokeWidth={2.8} />
                                            Usar sugestão
                                        </span>
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 text-[12px]"
                                            style={{
                                                border: "1px solid var(--lp-line)",
                                                borderRadius: 6,
                                                color: "var(--lp-ink-55)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Editar
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Carimbo: virou oportunidade */}
                            <div className="flex justify-end mt-4">
                                <span
                                    className="lp-read-stamp lp-mono inline-flex items-center gap-2 px-3 py-2"
                                    style={{
                                        color: "var(--lp-ink)",
                                        border: "1.5px solid var(--lp-ink)",
                                        borderRadius: 4,
                                        background: "var(--lp-paper)",
                                    }}
                                >
                                    → oportunidade no pipeline
                                </span>
                            </div>
                        </div>

                        {/* O fio desce para a próxima seção */}
                        <div
                            className="hidden lg:block absolute left-1/2 -bottom-28 h-28 w-px"
                            style={{
                                background:
                                    "repeating-linear-gradient(180deg, var(--lp-line) 0 6px, transparent 6px 12px)",
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};
