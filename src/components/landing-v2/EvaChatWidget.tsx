// LP.11 (v2) — widget de chat da EVA acoplado à landing inteira: pill fixo no
// canto inferior direito; clicou, abre o painel com a EVA já saudando. Chat
// REAL (edge eva-landing-chat, anônimo, rate-limit por IP no backend). É a
// prova viva do produto: no dia a dia a EVA sugere e o time aprova; aqui ela
// responde direto porque o assunto é ela mesma.
// Marca: enviar = seta-pra-cima circular preta (NUNCA avião); tema papel.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, CircleNotch, X } from "@phosphor-icons/react";
import { EvaOrb } from "./EvaOrb";
import { supabase } from "@/integrations/supabase/client";
import { useTypewriter } from "@/hooks/useTypewriter";
import { trackBehavior } from "@/lib/analytics";

interface Msg {
    role: "user" | "assistant";
    content: string;
}

const SUGGESTIONS = [
    "O que exatamente a EVA faz?",
    "A EVA responde meus leads sozinha?",
    "Quanto custa?",
    "Funciona pra minha agência?",
];

function EvaBubble({ content, animate, onTick }: { content: string; animate: boolean; onTick: () => void }) {
    const { displayed, done } = useTypewriter(content, { enabled: animate, speed: 10 });
    useEffect(() => { onTick(); }, [displayed, onTick]);
    return (
        <div
            className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{ background: "#FFFFFF", color: "var(--lp-ink)", border: "1px solid var(--lp-line)", borderBottomLeftRadius: 6 }}
        >
            {displayed}
            {animate && !done && (
                <span aria-hidden className="inline-block animate-pulse" style={{ marginLeft: 1, color: "var(--lp-blue)" }}>▍</span>
            )}
        </div>
    );
}

export const EvaChatWidget = () => {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [animateIdx, setAnimateIdx] = useState<number | null>(null);
    const threadRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToEnd = () => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    };

    useEffect(() => { scrollToEnd(); }, [messages, loading]);
    useEffect(() => {
        if (open) {
            trackBehavior("landing_eva_chat_open", { messages: messages.length });
            requestAnimationFrame(() => { inputRef.current?.focus(); scrollToEnd(); });
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    const ask = async (question: string) => {
        const q = question.trim();
        if (!q || loading) return;
        setInput("");
        trackBehavior("landing_eva_chat_ask", { length: q.length, turn: messages.filter((m) => m.role === "user").length + 1 });
        const history = messages.slice(-6);
        const assistantIdx = messages.length + 1;
        setMessages((m) => [...m, { role: "user", content: q }]);
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("eva-landing-chat", {
                body: { question: q, history },
            });
            const answer = (!error && data && typeof data.answer === "string")
                ? data.answer
                : "Não consegui responder agora. Tenta de novo em instantes, ou agende uma demo no topo da página.";
            setAnimateIdx(assistantIdx);
            setMessages((m) => [...m, { role: "assistant", content: answer }]);
        } catch {
            setAnimateIdx(assistantIdx);
            setMessages((m) => [...m, { role: "assistant", content: "Não consegui responder agora. Tenta de novo em instantes." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed z-[90] right-4 bottom-4 sm:right-6 sm:bottom-6 print:hidden">
            <AnimatePresence mode="wait">
                {open ? (
                    <motion.div
                        key="panel"
                        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "bottom right" }}
                        className="w-[380px] max-w-[calc(100vw-2rem)]"
                    >
                        <div
                            className="flex flex-col overflow-hidden rounded-[18px]"
                            style={{
                                background: "var(--lp-paper)",
                                border: "1px solid var(--lp-line)",
                                boxShadow: "0 18px 44px -12px rgba(13,20,33,0.30), 0 5px 14px rgba(13,20,33,0.10)",
                                maxHeight: "min(72vh, 580px)",
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "var(--lp-line-soft)", background: "#FFFFFF" }}>
                                <EvaOrb webgl variant="blue" size={28} showVoice={false} state={loading ? "analyzing" : "idle"} className="shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13.5px] font-bold leading-tight" style={{ color: "var(--lp-ink)" }}>EVA</p>
                                    <p className="text-[11px] leading-tight" style={{ color: "rgba(5,5,5,0.5)" }}>a inteligência do Vyzon, ao vivo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Fechar"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(13,20,33,0.05)]"
                                    style={{ color: "rgba(5,5,5,0.5)" }}
                                >
                                    <X size={15} weight="bold" />
                                </button>
                            </div>

                            {/* Thread */}
                            <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
                                <div className="flex items-end gap-2.5">
                                    <EvaOrb variant="blue" size={20} showVoice={false} state="idle" className="mb-1 shrink-0" />
                                    <div
                                        className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                                        style={{ background: "#FFFFFF", color: "var(--lp-ink)", border: "1px solid var(--lp-line)", borderBottomLeftRadius: 6 }}
                                    >
                                        Oi! Sou a EVA. No produto eu leio seus atendimentos e sugiro o próximo passo pro seu
                                        time aprovar. Aqui eu respondo o que você quiser saber sobre o Vyzon.
                                    </div>
                                </div>
                                {messages.map((m, i) => (
                                    <motion.div
                                        key={i}
                                        initial={reduce ? false : { opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {m.role === "user" ? (
                                            <div
                                                className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                                                style={{ background: "#0D1421", color: "#FAF9F5", borderBottomRightRadius: 6 }}
                                            >
                                                {m.content}
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-2.5">
                                                <EvaOrb variant="blue" size={20} showVoice={false} state="idle" className="mb-1 shrink-0" />
                                                <EvaBubble content={m.content} animate={i === animateIdx} onTick={scrollToEnd} />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2.5 text-[12.5px]" style={{ color: "rgba(5,5,5,0.5)" }}>
                                        <EvaOrb variant="blue" size={20} showVoice={false} state="analyzing" className="shrink-0" />
                                        EVA está lendo sua pergunta
                                    </div>
                                )}
                            </div>

                            {/* Sugestões (antes da 1ª pergunta) */}
                            {messages.length === 0 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-2">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => ask(s)}
                                            className="rounded-full px-3 py-1.5 text-[12px] transition-colors hover:bg-[rgba(13,20,33,0.04)]"
                                            style={{ background: "#FFFFFF", border: "1px solid var(--lp-line)", color: "var(--lp-ink)", fontWeight: 500 }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Composer */}
                            <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="relative px-3 pb-3 pt-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Pergunte qualquer coisa sobre o Vyzon…"
                                    disabled={loading}
                                    maxLength={500}
                                    className="w-full h-11 pl-4 pr-12 rounded-full text-[13px] outline-none transition-colors focus:border-[rgba(13,20,33,0.35)] disabled:opacity-70"
                                    style={{ background: "#FFFFFF", border: "1px solid var(--lp-line)", color: "var(--lp-ink)" }}
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    aria-label="Perguntar à EVA"
                                    whileTap={reduce ? undefined : { scale: 0.9 }}
                                    className="absolute right-4 top-[5px] inline-flex h-9 w-9 items-center justify-center rounded-full transition-all disabled:opacity-40"
                                    style={{ background: "#080808", color: "#FFFFFF" }}
                                >
                                    {loading ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <ArrowUp size={16} weight="bold" />}
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        key="pill"
                        type="button"
                        onClick={() => setOpen(true)}
                        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                        whileHover={reduce ? undefined : { scale: 1.03 }}
                        whileTap={reduce ? undefined : { scale: 0.96 }}
                        className="inline-flex h-12 items-center gap-2.5 rounded-full pl-2 pr-4 transition-shadow hover:shadow-lg"
                        style={{
                            background: "#FFFFFF",
                            border: "1px solid var(--lp-line)",
                            boxShadow: "0 10px 26px -8px rgba(13,20,33,0.30)",
                        }}
                        aria-label="Perguntar à EVA"
                    >
                        <EvaOrb webgl variant="blue" size={34} showVoice={false} state="idle" className="shrink-0" />
                        <span className="text-[14px] font-semibold" style={{ color: "var(--lp-ink)" }}>Perguntar à EVA</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};
