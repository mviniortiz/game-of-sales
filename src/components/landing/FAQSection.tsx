import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";

const FAQS = [
    {
        q: "Quanto tempo leva para implementar?",
        a: "Menos de 5 minutos. Basta criar sua conta, configurar os webhooks da sua plataforma e pronto. A integração com Hotmart, Kiwify, Greenn e outras é automática e sem código.",
    },
    {
        q: "Posso testar antes de assinar?",
        a: "Sim! Nosso plano PRO inclui 7 dias de acesso completo para você ver o impacto real no seu time antes de continuar.",
    },
    {
        q: "Tem ligação dentro da plataforma?",
        a: "Sim. O recurso de Ligações está disponível como add-on nos planos Plus e Pro (com gravação/transcrição em evolução). Assim você centraliza o histórico da conversa no deal sem sair do CRM.",
    },
    {
        q: "Funciona para qualquer tipo de venda?",
        a: "O Game Sales é ideal para times que vendem infoprodutos, serviços ou produtos físicos. Se você tem vendedores, o Game Sales transforma a rotina deles em competição saudável.",
    },
    {
        q: "Meus dados estão seguros?",
        a: "100%. Usamos criptografia de ponta a ponta e nossa infraestrutura é hospedada em servidores com certificação de segurança. Conformidade total com LGPD.",
    },
    {
        q: "Posso cancelar a qualquer momento?",
        a: "Sim, sem multas ou taxas. Você cancela diretamente pelo painel, sem precisar falar com ninguém — mas acreditamos que você não vai querer sair.",
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
            background: isOpen ? "rgba(16,185,129,0.04)" : "rgba(15,23,42,0.55)",
            borderColor: isOpen ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.06)",
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
                    color: isOpen ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)",
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
                    background: isOpen ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                    color: isOpen ? "#10b981" : "rgba(255,255,255,0.35)",
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
                        style={{ color: "rgba(255,255,255,0.45)" }}
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
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
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
                        className="inline-block text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/6 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "0.1em", fontWeight: 600 }}
                    >
                        PERGUNTAS FREQUENTES
                    </span>
                    <h2
                        className="text-white mb-3"
                        style={{
                            fontWeight: 800,
                            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                            lineHeight: 1.2,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Dúvidas?{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                            Temos respostas.
                        </span>
                    </h2>
                    <p className="text-white/35 text-sm">
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
