import { Check } from "lucide-react";
import { ButtonV2 } from "./ButtonV2";
import { Reveal } from "./Reveal";
import { PLANS } from "@/data/landing/pricing";

// LP.9 (v2) — seção de PLANOS com preço transparente (desarma o "deve ser caro").
// CTA primário "Testar 14 dias grátis" (self-service, /onboarding); secundário
// "Agendar demo". O Pro inverte: "Falar com especialista" (call) como primário.
// Estilo editorial da landing; o plano popular ganha destaque azul.
interface PricingV2Props {
    onTrial: (planSlug: string) => void;
    onScheduleDemo: () => void;
}

export const PricingV2 = ({ onTrial, onScheduleDemo }: PricingV2Props) => {
    return (
        <section id="planos" className="relative overflow-hidden px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            {/* aura azul de marca atrás do plano popular (centro) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2"
                style={{
                    width: "min(760px, 92vw)", aspectRatio: "1", transform: "translate(-50%, -38%)",
                    background: "radial-gradient(circle, rgba(21,86,192,0.13), rgba(21,86,192,0.04) 40%, transparent 64%)",
                }}
            />
            <div className="relative mx-auto max-w-[1100px]">
                <Reveal>
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Planos</p>
                        <h2
                            className="lp-display mt-3"
                            style={{ fontSize: "clamp(2.1rem, 4.6vw, 3.4rem)", lineHeight: 1.04, letterSpacing: "-0.035em", color: "#050505" }}
                        >
                            Preço simples e transparente
                        </h2>
                        <p className="mx-auto mt-4 max-w-md" style={{ fontSize: "1.05rem", lineHeight: 1.55, color: "rgba(5,5,5,0.66)" }}>
                            Comece grátis, sem cartão e sem prazo. Assine o Pro quando seu time crescer.
                        </p>
                    </div>
                </Reveal>

                <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-3">
                    {PLANS.map((plan, i) => {
                        const slug = plan.name.toLowerCase();
                        const isPro = plan.name === "Pro";
                        return (
                            <Reveal key={plan.name} delay={i * 80}>
                                <div
                                    className="vz-price-card flex h-full flex-col rounded-[20px] p-7 sm:p-8"
                                    onMouseMove={(e) => {
                                        const r = e.currentTarget.getBoundingClientRect();
                                        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                                        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                                    }}
                                    style={{
                                        border: plan.popular ? "1.5px solid var(--lp-blue)" : "1px solid var(--lp-line)",
                                        background: "var(--lp-white)",
                                        boxShadow: plan.popular ? "0 18px 50px -28px rgba(21,86,192,0.4)" : "none",
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="lp-display" style={{ fontSize: "1.45rem", letterSpacing: "-0.02em", color: "#050505" }}>
                                            {plan.name}
                                        </h3>
                                        {plan.popular && (
                                            <span className="lp-mono rounded-full px-2.5 py-1 text-white" style={{ background: "var(--lp-blue)", fontSize: 10.5, letterSpacing: "0.04em" }}>
                                                MAIS POPULAR
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-[13.5px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.5, minHeight: 40 }}>
                                        {plan.tagline}
                                    </p>

                                    <div className="mt-5 flex items-baseline gap-1.5">
                                        {plan.priceNumber === null ? (
                                            <span className="lp-display" style={{ fontSize: "2rem", letterSpacing: "-0.03em", color: "#050505" }}>
                                                Sob medida
                                            </span>
                                        ) : (
                                            <>
                                                <span className="lp-display" style={{ fontSize: "2.6rem", letterSpacing: "-0.04em", color: "#050505" }}>
                                                    R$ {plan.price}
                                                </span>
                                                <span className="text-[14px]" style={{ color: "rgba(5,5,5,0.55)" }}>
                                                    {plan.priceNumber === 0 ? "pra sempre" : "/mês"}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {plan.extraInfo && (
                                        <p className="lp-mono mt-1.5" style={{ color: "var(--lp-ink-40)", fontSize: 11.5 }}>{plan.extraInfo}</p>
                                    )}

                                    <div className="mt-6 flex flex-col gap-2.5">
                                        {plan.features.map((f) => (
                                            <div key={f} className="flex items-start gap-2.5">
                                                <Check size={16} strokeWidth={2.6} className="mt-0.5 shrink-0" style={{ color: "var(--lp-blue)" }} />
                                                <span className="text-[13.5px]" style={{ color: "rgba(5,5,5,0.78)", lineHeight: 1.45 }}>{f}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col items-center gap-2.5 pt-7" style={{ marginTop: "auto" }}>
                                        {plan.priceNumber === null ? (
                                            // Escala: conversa com o time, sem self-service
                                            <ButtonV2 onClick={onScheduleDemo} variant="secondary" className="w-full">
                                                {plan.ctaLabel}
                                            </ButtonV2>
                                        ) : isPro ? (
                                            <>
                                                <ButtonV2 onClick={() => onTrial(slug)} variant="primary" className="w-full">
                                                    Testar o Pro 14 dias grátis
                                                </ButtonV2>
                                                <button type="button" onClick={onScheduleDemo} className="text-[13px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                                                    ou agendar uma demo
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <ButtonV2 onClick={() => onTrial(slug)} variant="secondary" className="w-full">
                                                    Começar grátis
                                                </ButtonV2>
                                                <button type="button" onClick={onScheduleDemo} className="text-[13px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                                                    Agendar demo
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>

                <p className="mx-auto mt-8 text-center text-[12.5px]" style={{ color: "var(--lp-ink-40)" }}>
                    Assinatura mensal, cancele quando quiser. Pagamento via Mercado Pago.
                </p>
            </div>
        </section>
    );
};
