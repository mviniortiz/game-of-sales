// AskEvaPalette — "Pergunte à EVA" via ⌘K/Ctrl+K, em qualquer tela do app.
// Command palette (estilo Ask-AI do Mintlify): input no topo, sugestões
// animadas, e ao perguntar vira o chat de ajuda da EVA (mesma conversa do
// EvaHelpDock — hook useEvaHelpChat + localStorage compartilhados).
//
// Regras de marca: enviar = seta-pra-cima circular (NUNCA avião); azul da
// marca; tema claro.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ChatCircleText, CircleNotch, Compass, MagnifyingGlass, NotePencil, WhatsappLogo, X } from "@phosphor-icons/react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { useEvaHelpChat } from "@/hooks/useEvaHelpChat";
import { AssistantBubble, labelForPath } from "./EvaHelpDock";

export function AskEvaPalette() {
    const reduce = useReducedMotion();
    const location = useLocation();
    const pageLabel = useMemo(() => labelForPath(location.pathname), [location.pathname]);

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [selected, setSelected] = useState(0);
    const { messages, loading, animateIdx, ask, reset, reloadFromStorage } = useEvaHelpChat(pageLabel);

    const threadRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const inChat = messages.length > 0;

    const scrollToEnd = () => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    };

    // Ctrl/Cmd+K abre/fecha de qualquer tela (não rouba o atalho de quem digita).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                const t = e.target as HTMLElement | null;
                const tag = t?.tagName?.toLowerCase();
                const isTyping = (tag === "input" || tag === "textarea" || t?.isContentEditable) && !open;
                if (isTyping) return;
                e.preventDefault();
                setOpen((v) => !v);
            }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (open) {
            reloadFromStorage();
            setInput("");
            setSelected(0);
            // foco após o mount do painel
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open, reloadFromStorage]);

    useEffect(() => { scrollToEnd(); }, [messages, loading]);

    const suggestions = useMemo(
        () => [
            {
                icon: <ChatCircleText size={16} weight="duotone" />,
                label: "Explicar esta tela",
                desc: pageLabel,
                q: `O que eu faço nesta tela (${pageLabel})? Explique de forma simples.`,
            },
            {
                icon: <Compass size={16} weight="duotone" />,
                label: "Por onde começo?",
                desc: "Primeiros passos no Vyzon",
                q: "Acabei de entrar no Vyzon. Por onde eu começo? Me dá os primeiros passos.",
            },
            {
                icon: <WhatsappLogo size={16} weight="duotone" />,
                label: "Como conecto o WhatsApp?",
                desc: "Conexão via QR code no Inbox",
                q: "Como eu conecto o meu WhatsApp no Vyzon?",
            },
        ],
        [pageLabel],
    );

    // Item 0 = perguntar o que foi digitado; itens seguintes = sugestões.
    const items = useMemo(() => {
        const typed = input.trim();
        return [
            {
                icon: <EvaOrb variant="blue" size={18} showVoice={false} state="idle" />,
                label: "Perguntar à EVA",
                desc: typed ? `“${typed}”` : "Digite sua pergunta",
                run: () => { if (typed) { ask(typed); setInput(""); } },
                disabled: !typed,
            },
            ...suggestions.map((s) => ({
                icon: s.icon,
                label: s.label,
                desc: s.desc,
                run: () => { ask(s.q); setInput(""); },
                disabled: false,
            })),
        ];
    }, [input, suggestions, ask]);

    const submit = () => {
        const it = items[selected] ?? items[0];
        if (!it.disabled) it.run();
    };

    const onInputKey = (e: React.KeyboardEvent) => {
        if (inChat) {
            if (e.key === "Enter") { e.preventDefault(); const q = input.trim(); if (q) { ask(q); setInput(""); } }
            return;
        }
        if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, items.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
        if (e.key === "Enter") { e.preventDefault(); submit(); }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="ask-eva-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="fixed inset-0 z-[80] flex items-start justify-center px-4 print:hidden"
                    style={{ background: "rgba(13, 20, 33, 0.34)", backdropFilter: "blur(2px)", paddingTop: "16vh" }}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Pergunte à EVA"
                >
                    <motion.div
                        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="w-[600px] max-w-full overflow-hidden rounded-2xl flex flex-col"
                        style={{
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 24px 60px -16px rgba(15,23,42,0.35), 0 6px 18px rgba(15,23,42,0.10)",
                            maxHeight: "min(64vh, 620px)",
                        }}
                    >
                        {/* Header do modo chat */}
                        {inChat && (
                            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b" style={{ borderColor: "#F1F5F9" }}>
                                <EvaOrb variant="blue" size={24} showVoice={false} state={loading ? "analyzing" : "idle"} className="shrink-0" />
                                <p className="flex-1 text-[13px] font-bold" style={{ color: "#0B1220" }}>EVA · ajuda com o Vyzon</p>
                                <button
                                    type="button"
                                    onClick={() => { reset(); setInput(""); inputRef.current?.focus(); }}
                                    aria-label="Nova conversa"
                                    title="Nova conversa"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-[#F1F5F9]"
                                    style={{ color: "#64748B" }}
                                >
                                    <NotePencil size={15} weight="duotone" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label="Fechar"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-[#F1F5F9]"
                                    style={{ color: "#64748B" }}
                                >
                                    <X size={15} weight="bold" />
                                </button>
                            </div>
                        )}

                        {/* Thread (modo chat) */}
                        {inChat && (
                            <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        {m.role === "user" ? (
                                            <div
                                                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                                                style={{ background: "#2563EB", color: "#FFFFFF", borderBottomRightRadius: 6 }}
                                            >
                                                {m.content}
                                            </div>
                                        ) : (
                                            <AssistantBubble content={m.content} animate={i === animateIdx} onTick={scrollToEnd} />
                                        )}
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "#64748B" }}>
                                        <CircleNotch size={13} weight="bold" className="animate-spin" style={{ color: "#2563EB" }} />
                                        EVA está escrevendo
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Input (busca no modo palette; composer no modo chat) */}
                        <div
                            className={`relative flex items-center gap-2.5 px-4 ${inChat ? "border-t py-2.5" : "border-b py-1"}`}
                            style={{ borderColor: "#F1F5F9" }}
                        >
                            {!inChat && <MagnifyingGlass size={17} style={{ color: "#94A3B8" }} className="shrink-0" />}
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => { setInput(e.target.value); setSelected(0); }}
                                onKeyDown={onInputKey}
                                placeholder={inChat ? "Pergunte qualquer coisa…" : "Pergunte à EVA como usar o Vyzon…"}
                                disabled={loading}
                                className="w-full h-12 bg-transparent text-[14px] outline-none disabled:opacity-70"
                                style={{ color: "#0B1220" }}
                            />
                            {inChat && (
                                <motion.button
                                    type="button"
                                    onClick={() => { const q = input.trim(); if (q) { ask(q); setInput(""); } }}
                                    disabled={!input.trim() || loading}
                                    aria-label="Enviar"
                                    whileTap={reduce ? undefined : { scale: 0.9 }}
                                    className="inline-flex shrink-0 items-center justify-center h-8 w-8 rounded-full text-white transition-all disabled:opacity-40"
                                    style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
                                >
                                    {loading ? <CircleNotch size={15} weight="bold" className="animate-spin" /> : <ArrowUp size={15} weight="bold" />}
                                </motion.button>
                            )}
                        </div>

                        {/* Lista do palette (só antes da 1ª pergunta) */}
                        {!inChat && (
                            <>
                                <div className="py-2">
                                    {items.map((it, i) => (
                                        <motion.button
                                            key={it.label}
                                            type="button"
                                            initial={reduce ? false : { opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.18, delay: reduce ? 0 : 0.04 * i, ease: "easeOut" }}
                                            onClick={() => { if (!it.disabled) it.run(); }}
                                            onMouseEnter={() => setSelected(i)}
                                            disabled={it.disabled}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:opacity-50"
                                            style={{ background: selected === i ? "#F4F6FB" : "transparent" }}
                                        >
                                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "#F1F5F9", color: "#1D4ED8" }}>
                                                {it.icon}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[13.5px] font-semibold leading-tight" style={{ color: "#0B1220" }}>{it.label}</span>
                                                <span className="block truncate text-[12px] leading-tight mt-0.5" style={{ color: "#64748B" }}>{it.desc}</span>
                                            </span>
                                            {selected === i && !it.disabled && (
                                                <span className="text-[11px] shrink-0" style={{ color: "#94A3B8" }}>↵</span>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 px-4 py-2 border-t text-[11px]" style={{ borderColor: "#F1F5F9", color: "#94A3B8" }}>
                                    <span>↑↓ navegar</span>
                                    <span>↵ perguntar</span>
                                    <span className="ml-auto">esc fechar</span>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
