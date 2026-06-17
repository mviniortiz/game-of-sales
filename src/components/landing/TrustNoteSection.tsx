// LP.3 2026-06-09: bloco de confiança honesto — sem case, logo, métrica ou
// depoimento inventado. LP.4: vira uma carta em Sentient itálica (a voz
// humana da página), moldura com marcas de corte, sem decoração.
// LP.5 2026-06-12: reveals por scroll (Rise) no lugar dos fades de mount.
import { Rise } from "./animation/Rise";

export const TrustNoteSection = () => {
    return (
        <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--lp-white)" }}>
            <div className="relative max-w-5xl mx-auto">
                {/* Estação do fio */}
                <Rise>
                    <div className="lp-station mb-12 sm:mb-14">
                        <span className="lp-station-node" />
                        <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                            06 · por que o vyzon existe
                        </span>
                        <span className="lp-station-rule" />
                    </div>
                </Rise>

                <Rise delay={0.1} className="lp-frame max-w-3xl mx-auto">
                    <div
                        className="px-7 py-10 sm:px-14 sm:py-14"
                        style={{
                            background: "var(--lp-paper)",
                            border: "1px solid var(--lp-line)",
                            borderRadius: 10,
                        }}
                    >
                        <h2
                            className="font-satoshi"
                            style={{
                                fontWeight: 900,
                                fontSize: "clamp(1.5rem, 3.6vw, 2.2rem)",
                                lineHeight: 1.08,
                                letterSpacing: "-0.035em",
                                color: "var(--lp-ink)",
                                maxWidth: "560px",
                            }}
                        >
                            Construído a partir de uma dor real de operação comercial.
                        </h2>

                        <p
                            className="lp-serif mt-7"
                            style={{
                                fontSize: "clamp(1.125rem, 2.2vw, 1.375rem)",
                                lineHeight: 1.65,
                                color: "var(--lp-ink-90)",
                                fontWeight: 400,
                            }}
                        >
                            A maioria das agências não perde venda por falta de lead. Perde
                            porque o atendimento acontece no WhatsApp, o follow-up fica
                            espalhado e o pipeline não mostra o que realmente aconteceu na
                            conversa. O Vyzon nasce para fechar esse buraco entre atendimento
                            e venda, com a EVA assistindo o time, não substituindo o vendedor.
                        </p>

                        <div
                            className="mt-8 pt-6 flex items-center gap-3"
                            style={{ borderTop: "1px solid var(--lp-line)" }}
                        >
                            <span className="lp-live-dot shrink-0" />
                            <p className="text-[13.5px]" style={{ color: "var(--lp-ink-55)", fontWeight: 500, lineHeight: 1.55 }}>
                                Na demo, a gente mostra como seus leads virariam oportunidades,
                                follow-ups e próximas ações dentro do Vyzon.
                            </p>
                        </div>
                    </div>
                </Rise>
            </div>
        </section>
    );
};
