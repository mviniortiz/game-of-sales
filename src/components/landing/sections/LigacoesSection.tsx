import { PhoneCall, MessageCircle, Target, Lightbulb, ArrowRight } from "lucide-react";

const LIGACOES_FEATURES = [
    { icon: PhoneCall, title: "Clique para ligar", desc: "Chamada direto do card do lead ou deal." },
    { icon: MessageCircle, title: "Transcrição no histórico", desc: "Conversa salva no deal para follow-up." },
    { icon: Target, title: "Mais previsibilidade", desc: "Gestor acompanha volume e qualidade." },
    { icon: Lightbulb, title: "Insights sob demanda", desc: "Opcional por botão, sem travar o fluxo." },
] as const;

type Props = { onSeePlansClick: () => void };

export const LigacoesSection = ({ onSeePlansClick }: Props) => (
    <section className="py-28 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14 landing-fade-in-up">
                <span
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                    style={{ fontWeight: 600, letterSpacing: "0.08em", background: "var(--vyz-accent-soft-10)", border: "1px solid var(--vyz-accent-border)" }}
                >
                    <PhoneCall className="h-3 w-3" />
                    LIGAÇÕES NO CRM
                </span>

                <h2
                    className="font-heading mb-4"
                    style={{ fontWeight: "var(--fw-bold)", fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "var(--vyz-text-primary)" }}
                >
                    Ligue sem sair do deal. <span className="text-emerald-400">Registre tudo.</span>
                </h2>

                <p className="max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "var(--vyz-text-dim)" }}>
                    O vendedor liga dentro da plataforma e o histórico fica no CRM.
                    Gravação e transcrição no deal, sem depender de memória.
                </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {LIGACOES_FEATURES.map(({ icon: Icon, title, desc }, idx) => {
                    const delayClass = idx === 0 ? "" : idx === 1 ? "landing-delay-100" : idx === 2 ? "landing-delay-200" : "landing-delay-300";
                    return (
                        <div
                            key={title}
                            className={`flex items-start gap-4 rounded-xl p-5 landing-fade-in-up ${delayClass}`}
                            style={{ background: "var(--vyz-surface-1)", border: "1px solid var(--vyz-border-strong)" }}
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--vyz-accent-soft-10)" }}>
                                <Icon className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm mb-1" style={{ fontWeight: 600, color: "var(--vyz-text-strong)" }}>{title}</p>
                                <p className="text-xs leading-relaxed" style={{ color: "var(--vyz-text-dim)" }}>{desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                <p className="text-xs mb-4" style={{ fontWeight: 500, color: "var(--vyz-text-soft)" }}>
                    Add-on disponível para planos Plus e Pro
                </p>
                <button
                    onClick={onSeePlansClick}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-white"
                    style={{ background: "var(--vyz-gradient-accent)", fontWeight: 600 }}
                >
                    Ver planos com Ligações
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    </section>
);
