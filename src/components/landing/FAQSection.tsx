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
];

function FAQItem({
    q,
    a,
    isOpen,
    onToggle,
}: {
    q: string;
    a: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            className="border-b last:border-b-0 px-1"
            style={{ borderColor: "rgba(10,10,10,0.06)" }}
        >
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 py-5 text-left cursor-pointer group"
                aria-expanded={isOpen}
            >
                <span
                    className="text-[15px] sm:text-[15.5px] leading-snug transition-colors"
                    style={{
                        fontWeight: 600,
                        color: isOpen ? "#0B1220" : "rgba(10,10,10,0.82)",
                    }}
                >
                    {q}
                </span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                    style={{
                        background: isOpen ? "rgba(37,99,235,0.10)" : "rgba(10,10,10,0.04)",
                        color: isOpen ? "#2563EB" : "rgba(10,10,10,0.35)",
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
                            className="pb-5 pr-10 text-[14px] leading-relaxed"
                            style={{ color: "rgba(10,10,10,0.58)" }}
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
        <section className="py-24 sm:py-28 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "#FFFFFF" }}>
            <div className="mx-auto max-w-2xl">
                {/* Header — F2.11: usa Reveal padrão (opacity + Y) */}
                <Reveal className="text-center mb-12 sm:mb-14">
                    <span
                        className="inline-flex items-center text-[10.5px] sm:text-[11px] uppercase rounded-full px-3 py-1 mb-5"
                        style={{
                            background: "rgba(37,99,235,0.08)",
                            border: "1px solid rgba(37,99,235,0.22)",
                            color: "#1D4ED8",
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                        }}
                    >
                        Perguntas frequentes
                    </span>
                    <h2
                        className="font-satoshi"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.85rem, 4.5vw, 2.4rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "#0B1220",
                        }}
                    >
                        Dúvidas? A gente responde.
                    </h2>
                    <p
                        className="mt-3 text-[14.5px]"
                        style={{ color: "rgba(10,10,10,0.52)" }}
                    >
                        Tudo o que você precisa saber antes de começar.
                    </p>
                </Reveal>

                {/* Accordion — F2.11: Reveal no card + stagger nos items */}
                <Reveal delay={0.05}>
                    <div
                        className="rounded-2xl bg-white"
                        style={{
                            border: "1px solid #D9E2EC",
                            boxShadow:
                                "0 1px 2px rgba(15,23,42,0.04), 0 14px 40px -12px rgba(15,23,42,0.08)",
                        }}
                    >
                        <StaggerContainer className="px-6 sm:px-7" stagger={0.06} duration={0.45} amount={0.05}>
                            {FAQS.map((faq, i) => (
                                <FAQItem
                                    key={i}
                                    q={faq.q}
                                    a={faq.a}
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
