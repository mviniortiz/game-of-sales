import { Check, Phone, Mail } from "lucide-react";
import { ButtonV2 } from "./ButtonV2";
import { Reveal } from "./Reveal";
import { PLANS, ADDONS } from "@/data/landing/pricing";

// LP.9 (v2) — seção de PLANOS: dois planos (Essential/Pro) + faixa de
// adicionais (ligações e e-mail ficam FORA dos planos, decisão 2026-08-21).
// CTA do Pro: "Testar 14 dias grátis" (self-service); Essential entra direto.
// Estilo editorial da landing; o plano recomendado ganha destaque azul.
interface PricingV2Props {
    onTrial: (planSlug: string) => void;
    onScheduleDemo: () => void;
}

export const PricingV2 = ({ onTrial, onScheduleDemo }: PricingV2Props) => {
    return (
        <section id="planos" className="relative overflow-hidden px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            {/* aura azul de marca atrás do plano recomendado (centro) */}
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
                            Dois planos. Nenhuma pegadinha.
                        </h2>
                        <p className="mx-auto mt-4 max-w-md" style={{ fontSize: "1.05rem", lineHeight: 1.55, color: "rgba(5,5,5,0.66)" }}>
                            Escolha o tamanho da sua operação. Ligações e e-mail entram como adicionais, em qualquer plano.
                        </p>
                    </div>
                </Reveal>

                <div className="mx-auto mt-12 grid max-w-[880px] gap-5 sm:mt-16 lg:grid-cols-2">
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
                                                RECOMENDADO
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-[13.5px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.5, minHeight: 40 }}>
                                        {plan.tagline}
                                    </p>

                                    <div className="mt-5 flex items-baseline gap-1.5">
                                        <span className="lp-display" style={{ fontSize: "2.6rem", letterSpacing: "-0.04em", color: "#050505" }}>
                                            R$ {plan.price}
                                        </span>
                                        <span className="text-[14px]" style={{ color: "rgba(5,5,5,0.55)" }}>
                                            /mês
                                        </span>
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
                                        {isPro ? (
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
                                                    Começar no Essential
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

                {/* Adicionais: fora dos planos por decisão de produto */}
                <Reveal delay={120}>
                    <div className="mx-auto mt-10 max-w-[880px] rounded-[20px] p-6 sm:p-7" style={{ background: "var(--lp-white)", border: "1px dashed var(--lp-line)" }}>
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            {ADDONS.map((a) => (
                                <div key={a.name} className="flex flex-1 items-start gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(21,86,192,0.07)", color: "var(--lp-blue)" }}>
                                        {a.name === "Ligações" ? <Phone size={15} /> : <Mail size={15} />}
                                    </span>
                                    <div>
                                        <p className="text-[14px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                                            {a.name} <span className="lp-mono" style={{ color: "var(--lp-ink-40)", fontWeight: 400 }}>· adicional</span>
                                        </p>
                                        <p className="mt-1 text-[13px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.5 }}>{a.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={onScheduleDemo} className="lp-mono mt-5 inline-block underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)", fontSize: 12 }}>
                            habilitar adicional: fale com a gente ↗
                        </button>
                    </div>
                </Reveal>

                <p className="mx-auto mt-8 text-center text-[12.5px]" style={{ color: "var(--lp-ink-40)" }}>
                    Assinatura mensal, cancele quando quiser. Pagamento via Mercado Pago.
                </p>
            </div>
        </section>
    );
};
