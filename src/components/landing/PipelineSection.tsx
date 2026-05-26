import { Workflow, Check, MessageCircle, Sparkle, ArrowRight } from "lucide-react";

// LP.1 2026-05-25: seção nova — Pipeline contextual (deep-dive). Light section
// pra alternar com a Central de Comando (dark) que vem antes.
const BULLETS = [
    "Veja oportunidades por etapa e valor.",
    "Abra a conversa direto do card.",
    "Entenda se a EVA já analisou o lead.",
    "Identifique oportunidades paradas.",
    "Acompanhe próximos passos sem sair do fluxo.",
] as const;

export const PipelineSection = () => {
    return (
        <section className="relative py-28 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
            {/* Glow azul sutil no topo */}
            <div
                className="absolute inset-x-0 top-0 h-[360px] pointer-events-none"
                aria-hidden
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.06) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Texto + bullets */}
                <div className="landing-fade-in-up">
                    <span
                        className="inline-flex items-center gap-2 text-[11px] rounded-full px-4 py-1.5 mb-6"
                        style={{
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            background: "rgba(10,10,10,0.04)",
                            color: "rgba(10,10,10,0.6)",
                            border: "1px solid rgba(10,10,10,0.08)",
                        }}
                    >
                        <Workflow className="h-3 w-3" strokeWidth={2} />
                        Pipeline
                    </span>

                    <h2
                        className="font-satoshi mb-4"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.04em",
                            color: "#0A0A0A",
                        }}
                    >
                        Pipeline que carrega <span style={{ color: "rgba(10,10,10,0.5)" }}>o contexto da conversa.</span>
                    </h2>

                    <p
                        className="mb-7 max-w-md"
                        style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(10,10,10,0.55)" }}
                    >
                        Cada card mostra mais que etapa e valor. Veja canal, status da EVA, tags, próxima ação e conversa vinculada.
                    </p>

                    <ul className="flex flex-col gap-3">
                        {BULLETS.map((b) => (
                            <li key={b} className="flex items-start gap-3">
                                <span
                                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(21,86,192,0.1)" }}
                                >
                                    <Check className="h-3 w-3 text-blue-700" strokeWidth={3} />
                                </span>
                                <span className="text-[15px]" style={{ color: "rgba(10,10,10,0.72)", lineHeight: 1.5 }}>
                                    {b}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Mock de card de oportunidade */}
                <div className="landing-fade-in-up landing-delay-200">
                    <div
                        className="rounded-2xl p-5 sm:p-6 bg-white"
                        style={{
                            border: "1px solid #D9E2EC",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -20px rgba(15,23,42,0.18)",
                        }}
                    >
                        {/* Header do card */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
                                    style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                                >
                                    CR
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[14.5px] truncate" style={{ color: "#0B1220", fontWeight: 600 }}>
                                        Carla Ribeiro
                                    </p>
                                    <p className="text-[12px] truncate" style={{ color: "rgba(10,10,10,0.5)" }}>
                                        Clínica de Estética · Meta Ads
                                    </p>
                                </div>
                            </div>
                            <span
                                className="text-[11px] px-2.5 py-1 rounded-md shrink-0"
                                style={{ background: "rgba(37,99,235,0.1)", color: "#1D4ED8", fontWeight: 600 }}
                            >
                                Qualificação
                            </span>
                        </div>

                        {/* Tags / status */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.1)", color: "#6D28D9", fontWeight: 600 }}>
                                <Sparkle className="h-2.5 w-2.5" strokeWidth={2.5} />
                                EVA analisou
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(16,185,129,0.1)", color: "#047857", fontWeight: 600 }}>
                                Fit: bom
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(10,10,10,0.05)", color: "rgba(10,10,10,0.6)", fontWeight: 600 }}>
                                R$ 4.500
                            </span>
                        </div>

                        {/* Próxima ação */}
                        <div
                            className="rounded-lg px-3.5 py-3 mb-3 flex items-start gap-2.5"
                            style={{ background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.15)" }}
                        >
                            <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-700" strokeWidth={2.4} />
                            <p className="text-[13px]" style={{ color: "rgba(10,10,10,0.7)", lineHeight: 1.45 }}>
                                <span style={{ color: "#1D4ED8", fontWeight: 600 }}>Próxima ação: </span>
                                perguntar orçamento e urgência antes da proposta.
                            </p>
                        </div>

                        {/* Conversa vinculada */}
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 text-[13px] py-2.5 rounded-lg transition-colors"
                            style={{ background: "rgba(10,10,10,0.04)", color: "rgba(10,10,10,0.65)", fontWeight: 600 }}
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Abrir conversa vinculada
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
