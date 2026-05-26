import { BookOpen, Package, Target, MessageCircle, Ban, ArrowRight } from "lucide-react";

// LP.1 2026-05-25: seção repurposed de "Ligações no CRM" para "Base de
// Conhecimento" (ensinar a EVA como a agência vende). Export/prop mantidos
// (LigacoesSection / onSeePlansClick) pra não tocar imports da LandingPage.
const KB_CARDS = [
    { icon: Package, title: "Serviços e ofertas", desc: "O que sua agência vende e para quem." },
    { icon: Target, title: "ICP e qualificação", desc: "Quem é bom fit e quem não vale o esforço." },
    { icon: MessageCircle, title: "Objeções e respostas", desc: "Como responder preço, timing, confiança e comparação." },
    { icon: Ban, title: "Promessas proibidas", desc: "O que a EVA nunca deve sugerir." },
] as const;

type Props = { onSeePlansClick: () => void };

export const LigacoesSection = ({ onSeePlansClick }: Props) => (
    <section className="py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#FFFFFF" }}>
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14 landing-fade-in-up">
                <span
                    className="inline-flex items-center gap-1.5 text-xs text-blue-700 rounded-full px-4 py-1.5 mb-5"
                    style={{ fontWeight: 600, letterSpacing: "0.08em", background: "var(--vyz-accent-soft-10)", border: "1px solid var(--vyz-accent-border)" }}
                >
                    <BookOpen className="h-3 w-3" />
                    BASE DE CONHECIMENTO
                </span>

                <h2
                    className="font-satoshi mb-4"
                    style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "#0A0A0A" }}
                >
                    Ensine a EVA <span className="text-blue-700">como sua agência vende.</span>
                </h2>

                <p className="max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(10,10,10,0.5)" }}>
                    Adicione scripts, FAQs, serviços, objeções, tom de voz e playbooks.
                    A EVA transforma esse material em sugestões de contexto para sua aprovação.
                </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {KB_CARDS.map(({ icon: Icon, title, desc }, idx) => {
                    const delayClass = idx === 0 ? "" : idx === 1 ? "landing-delay-100" : idx === 2 ? "landing-delay-200" : "landing-delay-300";
                    return (
                        <div
                            key={title}
                            className={`flex items-start gap-4 rounded-xl p-5 landing-fade-in-up ${delayClass}`}
                            style={{ background: "rgba(10,10,10,0.025)", border: "1px solid rgba(10,10,10,0.1)" }}
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--vyz-accent-soft-10)" }}>
                                <Icon className="h-4 w-4 text-blue-700" />
                            </div>
                            <div>
                                <p className="text-sm mb-1" style={{ fontWeight: 600, color: "rgba(10,10,10,0.88)" }}>{title}</p>
                                <p className="text-xs leading-relaxed" style={{ color: "rgba(10,10,10,0.5)" }}>{desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                <p className="text-xs mb-4" style={{ fontWeight: 500, color: "rgba(10,10,10,0.65)" }}>
                    Nada entra no contexto da EVA sem aprovação humana.
                </p>
                <button
                    onClick={onSeePlansClick}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-white"
                    style={{ background: "var(--vyz-gradient-accent)", fontWeight: 600 }}
                >
                    Ver planos
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    </section>
);
