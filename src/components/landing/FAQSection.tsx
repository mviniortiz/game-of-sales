import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

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

const FAQItem = ({
    q,
    a,
    isOpen,
    onToggle,
}: {
    q: string;
    a: string;
    isOpen: boolean;
    onToggle: () => void;
}) => (
    <motion.div
        layout
        className="relative overflow-hidden rounded-2xl border transition-colors duration-200 cursor-pointer"
        style={{
            background: isOpen ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.95)",
            borderColor: isOpen ? "rgba(16,185,129,0.22)" : "rgba(229,231,235,1)",
        }}
        onClick={onToggle}
    >
        {/* Left accent bar */}
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ background: "linear-gradient(180deg, #10b981, #0d9488)" }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    exit={{ scaleY: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                />
            )}
        </AnimatePresence>

        {/* Question row */}
        <div className="flex items-center justify-between px-6 py-5 gap-4 select-none">
            <span
                className="text-sm leading-snug transition-colors duration-200"
                style={{
                    color: isOpen ? "rgba(17,24,39,0.9)" : "rgba(55,65,81,0.85)",
                    fontWeight: "600",
                }}
            >
                {q}
            </span>
            <motion.div
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                    background: isOpen ? "rgba(16,185,129,0.15)" : "rgba(243,244,246,1)",
                    color: isOpen ? "#10b981" : "rgba(156,163,175,1)",
                }}
            >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </motion.div>
        </div>

        {/* Answer */}
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                >
                    <div
                        className="px-6 pb-5 text-sm leading-relaxed"
                        style={{ color: "rgba(107,114,128,0.9)" }}
                    >
                        {a}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
);

export const FAQSection = () => {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 relative overflow-hidden">
            {/* Faint radial glow */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)",
                    filter: "blur(60px)",
                }}
            />

            <div className="max-w-2xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="inline-block text-xs text-emerald-600 border border-emerald-500/20 bg-emerald-500/6 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "0.1em", fontWeight: 600 }}
                    >
                        PERGUNTAS FREQUENTES
                    </span>
                    <h2
                        className="font-heading text-gray-900 mb-3 tracking-tight"
                        style={{
                            fontWeight: 800,
                            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                            lineHeight: 1.2,
                        }}
                    >
                        Dúvidas?{" "}
                        <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                            Temos respostas.
                        </span>
                    </h2>
                    <p className="text-gray-400 text-sm">
                        Tudo que você precisa saber antes de começar.
                    </p>
                </motion.div>

                {/* Accordion */}
                <motion.div
                    className="flex flex-col gap-3"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15, duration: 0.4 }}
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
                </motion.div>
            </div>
        </section>
    );
};
