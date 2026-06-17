import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Reveal, StaggerContainer } from "./animation/Reveal";

// ─────────────────────────────────────────────────────────────────────────────
// F2.10 (2026-05-19) — FAQ reescrita pro novo posicionamento.
// 8 perguntas focadas em quebrar objeções de agência sobre EVA + WhatsApp +
// pipeline + memória comercial. Plano gratuito ainda não confirmado → resposta
// honesta "estamos estruturando".
// ─────────────────────────────────────────────────────────────────────────────

const FAQS = [
    {
        q: "O que é o Vyzon?",
        a: "Vyzon é uma Central Comercial com EVA para agências que vendem por conversa. Ele organiza Inbox, Pipeline, Central de Comando e IA comercial assistida para ajudar seu time a priorizar leads e transformar atendimento em oportunidade.",
    },
    {
        q: "O que é EVA?",
        a: "EVA é a IA comercial do Vyzon. Ela entende o contexto da agência, analisa conversas e sugere próximos passos para o time agir com mais clareza.",
    },
    {
        q: "A EVA responde sozinha meus leads?",
        a: "Não por padrão. A EVA analisa e sugere respostas, próximos passos e prioridades. Seu time aprova antes de qualquer ação.",
    },
    {
        q: "O Vyzon substitui meu vendedor?",
        a: "Não. O Vyzon ajuda o vendedor a agir melhor. A decisão continua com o time.",
    },
    {
        q: "A EVA aprende com os materiais da minha agência?",
        a: "Sim. Você pode adicionar serviços, FAQs, objeções, ICP e playbooks para a EVA usar como contexto. Nada é aplicado sem aprovação.",
    },
    // LP.3 2026-06-09: objeções práticas que não eram respondidas em lugar
    // nenhum da página (número atual, setup, CRM existente, dados, cancelar).
    {
        q: "Preciso trocar meu número de WhatsApp atual?",
        a: "Não. Você conecta o número que sua agência já usa, direto por QR code, e continua atendendo normalmente. O Vyzon organiza essas conversas na Inbox Comercial.",
    },
    {
        q: "Quanto tempo leva para configurar?",
        a: "A conexão do WhatsApp leva poucos minutos. Pipeline e time você monta no mesmo dia, e o contexto da EVA pode começar simples e crescer com o uso. Na demo, a gente mostra esse caminho com o seu cenário.",
    },
    {
        q: "Preciso abandonar meu CRM ou planilha atual?",
        a: "Não de imediato. O Vyzon organiza o atendimento e o pipeline das conversas. Muitas operações começam por aí e trazem o restante do processo no próprio ritmo.",
    },
    {
        q: "Quem vê minhas conversas e dados?",
        a: "Só o seu time. Os dados de cada agência ficam isolados na própria conta, e a EVA usa as conversas apenas para gerar análises e sugestões dentro da sua operação.",
    },
    {
        q: "O que acontece se eu cancelar?",
        a: "Você pode cancelar quando quiser, direto na plataforma, sem fidelidade. Seu número de WhatsApp continua seu e pode ser desconectado a qualquer momento.",
    },
];

function FAQItem({
    q,
    a,
    index,
    isOpen,
    onToggle,
}: {
    q: string;
    a: string;
    index: number;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            className="border-b"
            style={{ borderColor: "var(--lp-line)" }}
        >
            <button
                type="button"
                onClick={onToggle}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] w-full items-baseline gap-3 py-5 text-left cursor-pointer group"
                aria-expanded={isOpen}
            >
                <span className="lp-mono" style={{ color: isOpen ? "var(--lp-blue)" : "var(--lp-ink-40)", fontSize: 12 }}>
                    {String(index + 1).padStart(2, "0")}
                </span>
                <span
                    className="text-[15px] sm:text-[16px] leading-snug transition-colors"
                    style={{
                        fontWeight: 600,
                        color: isOpen ? "var(--lp-ink)" : "var(--lp-ink-90)",
                    }}
                >
                    {q}
                </span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex h-7 w-7 items-center justify-center flex-shrink-0 self-center"
                    style={{
                        border: "1px solid var(--lp-line)",
                        borderRadius: 6,
                        color: isOpen ? "var(--lp-blue)" : "var(--lp-ink-40)",
                        background: isOpen ? "rgba(21,86,192,0.06)" : "transparent",
                    }}
                >
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <p
                            className="pb-6 pr-10 pl-[52px] text-[14px] leading-relaxed"
                            style={{ color: "var(--lp-ink-70)" }}
                        >
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const FAQSection = () => {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--lp-white)" }}>
            <div className="mx-auto max-w-3xl">
                {/* Estação do fio */}
                <div className="lp-station mb-12 sm:mb-14 landing-fade-in-up">
                    <span className="lp-station-node" />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                        09 · perguntas frequentes
                    </span>
                    <span className="lp-station-rule" />
                </div>

                <Reveal className="mb-10 sm:mb-12">
                    <h2
                        className="font-satoshi"
                        style={{
                            fontWeight: 900,
                            fontSize: "clamp(1.85rem, 4.5vw, 2.6rem)",
                            lineHeight: 1.06,
                            letterSpacing: "-0.04em",
                            color: "var(--lp-ink)",
                        }}
                    >
                        Dúvidas?{" "}
                        <span className="lp-serif" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                            A gente responde.
                        </span>
                    </h2>
                    <p
                        className="mt-3 text-[14.5px]"
                        style={{ color: "var(--lp-ink-55)" }}
                    >
                        Tudo o que você precisa saber antes de começar.
                    </p>
                </Reveal>

                {/* Accordion — lista de hairlines, sem card */}
                <Reveal delay={0.05}>
                    <div className="border-t" style={{ borderColor: "var(--lp-line)" }}>
                        <StaggerContainer stagger={0.05} duration={0.4} amount={0.05}>
                            {FAQS.map((faq, i) => (
                                <FAQItem
                                    key={i}
                                    q={faq.q}
                                    a={faq.a}
                                    index={i}
                                    isOpen={open === i}
                                    onToggle={() => setOpen(open === i ? null : i)}
                                />
                            ))}
                        </StaggerContainer>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
