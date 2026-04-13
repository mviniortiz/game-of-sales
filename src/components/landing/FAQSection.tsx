import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
    {
        q: "O que é o Vyzon?",
        a: "Um CRM de vendas completo com pipeline Kanban, ranking gamificado, metas em tempo real, funil de calls, calendário com sync Google Calendar, hub WhatsApp com IA, e integrações automáticas com Hotmart, Kiwify e Greenn.",
    },
    {
        q: "Quanto tempo leva para configurar?",
        a: "Menos de 5 minutos. Crie sua conta, cole o webhook da sua plataforma de vendas e convide seu time. As vendas começam a aparecer automaticamente.",
    },
    {
        q: "Posso testar antes de assinar?",
        a: "Sim! Todos os planos pagos incluem 14 dias grátis com acesso completo. Você só é cobrado após o período de teste.",
    },
    {
        q: "Quais plataformas integram?",
        a: "Hotmart, Kiwify e Greenn com sync automático via webhook. Google Calendar para agendamentos. WhatsApp via Evolution API. Mais integrações sendo votadas pela comunidade.",
    },
    {
        q: "Tem ligação dentro da plataforma?",
        a: "Sim. Ligações é um add-on disponível nos planos Plus e Pro. Inclui chamadas dentro do CRM, gravação automática, transcrição e insights de cada conversa.",
    },
    {
        q: "Posso cancelar a qualquer momento?",
        a: "Sim, sem multas ou taxas. Cancele direto pelo painel, sem precisar falar com ninguém.",
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
            className="border-b last:border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-4 py-5 text-left cursor-pointer"
                aria-expanded={isOpen}
            >
                <span
                    className="text-[15px] leading-snug"
                    style={{ fontWeight: "var(--fw-semibold, 600)", color: "rgba(255,255,255,0.9)" }}
                >
                    {q}
                </span>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex-shrink-0"
                    style={{ color: isOpen ? "#34d399" : "rgba(255,255,255,0.25)" }}
                >
                    <ChevronDown className="h-4 w-4" strokeWidth={2} />
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
                        <p className="pb-5 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const FAQSection = () => {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "#06080a" }}>
            <div className="mx-auto max-w-2xl">
                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <p
                        className="text-xs uppercase text-emerald-400 mb-4"
                        style={{
                            fontWeight: "var(--fw-semibold, 600)",
                            letterSpacing: "0.08em",
                        }}
                    >
                        Perguntas frequentes
                    </p>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: "var(--fw-bold, 700)",
                            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                            lineHeight: 1.15,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Dúvidas? Temos respostas.
                    </h2>
                    <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Tudo que você precisa saber antes de começar.
                    </p>
                </motion.div>

                {/* Accordion */}
                <div
                    className="rounded-xl border px-6"
                    style={{ borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                >
                    {FAQS.map((faq, i) => (
                        <FAQItem
                            key={i}
                            q={faq.q}
                            a={faq.a}
                            isOpen={open === i}
                            onToggle={() => setOpen(open === i ? null : i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
