import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
    {
        q: "A Vyzon é só para infoprodutores?",
        a: "Não. A Vyzon atende times comerciais que precisam de mais adesão ao CRM, clareza de metas e gestão de pipeline. Infoprodutores, agências, indústrias, distribuidoras e times B2B (SDR/Closer) podem usar a plataforma.",
    },
    {
        q: "O que significa CRM gamificado?",
        a: "Significa transformar metas, ranking, tarefas e evolução comercial em uma experiência mais visual e engajadora, para que o time acompanhe a própria performance diariamente — em vez de depender de planilha, print e cobrança no WhatsApp.",
    },
    {
        q: "Preciso substituir meu processo comercial atual?",
        a: "Não necessariamente. A Vyzon organiza pipeline, metas e rotina comercial com integrações e fluxos que podem ser adaptados ao processo existente. A maioria dos times mantém o que já funciona e usa a Vyzon pra dar visibilidade e ritmo.",
    },
    {
        q: "Quanto tempo leva pra configurar?",
        a: "Menos de 5 minutos pra subir o ambiente: cria a conta, convida o time, configura pipeline e metas. Integrações via webhook (checkouts, formulários, planilhas) também são plug-and-play.",
    },
    {
        q: "A Vyzon integra com quais plataformas?",
        a: "Sincronização nativa via webhook com Hotmart, Kiwify, Greenn, Eduzz, Cakto, Asaas, Braip, Monetizze, Notazz, RD Station, Mercado Pago e Zapier. Google Calendar pra agendamentos. WhatsApp via Evolution API. Lead webhooks (formulário e Google Sheets) e API/Webhooks abertos pra qualquer plataforma que dispare evento. Stripe, Pagar.me e Celetus estão no roadmap (sob consulta).",
    },
    {
        q: "Serve para times pequenos?",
        a: "Sim. A Vyzon faz mais sentido pra operações com metas claras e pelo menos alguns vendedores, SDRs ou closers — mas também funciona muito bem pra times em crescimento que querem instalar uma rotina antes de escalar.",
    },
    {
        q: "Posso cancelar quando quiser?",
        a: "Pode, sem multa nem taxa. Cancela direto pelo painel, sem precisar falar com ninguém.",
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
                    style={{ color: isOpen ? "#33FF9E" : "rgba(255,255,255,0.25)" }}
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
        <section className="py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--vyz-bg)" }}>
            <div className="mx-auto max-w-2xl">
                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ y: 16 }}
                    whileInView={{ y: 0 }}
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
                        Dúvida? A gente responde.
                    </h2>
                    <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Tudo o que você precisa saber antes de começar.
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
