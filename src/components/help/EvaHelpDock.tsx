// EvaHelpDock — a orb flutuante de AJUDA do produto (a "Holly" do Vyzon, na voz
// da EVA). Pill no canto → painel com chips + chat. Responde "como usar o Vyzon"
// via edge function eva-help. NÃO é a EVA comercial (que lê pipeline/conversas).
//
// Regras de marca: botão de enviar = seta-pra-cima circular (NUNCA avião); a EVA
// aqui usa o azul da marca; tema claro.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, CircleNotch, NotePencil, X } from "@phosphor-icons/react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTypewriter } from "@/hooks/useTypewriter";

interface ChatMsg {
    role: "user" | "assistant";
    content: string;
}

// Rótulo humano da tela atual (pra "Explicar esta tela" e contexto do endpoint).
const ROUTE_LABELS: { prefix: string; label: string }[] = [
    { prefix: "/inicio", label: "Início (Central de Comando)" },
    { prefix: "/inbox", label: "Inbox (conversas de WhatsApp)" },
    { prefix: "/pulse", label: "Pulse (conversas de WhatsApp)" },
    { prefix: "/pipeline", label: "Pipeline (funil de oportunidades)" },
    { prefix: "/deal", label: "Oportunidade (detalhe do negócio)" },
    { prefix: "/configuracoes/eva", label: "Configurações da EVA (contexto da empresa)" },
    { prefix: "/configuracoes", label: "Configurações" },
    { prefix: "/integracoes", label: "Integrações" },
    { prefix: "/metas", label: "Metas" },
    { prefix: "/performance", label: "Performance" },
    { prefix: "/eva", label: "EVA Studio" },
];

function labelForPath(pathname: string): string {
    const hit = ROUTE_LABELS.find((r) => pathname.startsWith(r.prefix));
    return hit?.label || "uma tela do Vyzon";
}

// Bolha da EVA com efeito "digitando" só na mensagem recém-chegada (as restauradas
// do histórico aparecem inteiras). Rola o thread conforme o texto cresce.
function AssistantBubble({ content, animate, onTick }: { content: string; animate: boolean; onTick: () => void }) {
    const { displayed, done } = useTypewriter(content, { enabled: animate, speed: 10 });
    useEffect(() => { onTick(); }, [displayed, onTick]);
    return (
        <div
            className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{ background: "#F4F6FB", color: "#0B1220", border: "1px solid #EAF0F6", borderBottomLeftRadius: 6 }}
        >
            {displayed}
            {animate && !done && (
                <motion.span
                    aria-hidden
                    className="inline-block"
                    style={{ marginLeft: 1, color: "#1D4ED8" }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                >
                    ▍
                </motion.span>
            )}
        </div>
    );
}

export function EvaHelpDock() {
    const reduce = useReducedMotion();
    const location = useLocation();
    const { user } = useAuth();
    const pageLabel = useMemo(() => labelForPath(location.pathname), [location.pathname]);
    const storageKey = user ? `vyz-eva-help:${user.id}` : null;

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [loading, setLoading] = useState(false);
    const [animateIdx, setAnimateIdx] = useState<number | null>(null); // qual msg digita

    const threadRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToEnd = () => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    };

    // Continuar de onde paramos: restaura o histórico do localStorage (por usuário).
    useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setMessages(parsed);
            }
        } catch { /* ignora */ }
    }, [storageKey]);

    // Persiste (últimas 30 mensagens) a cada mudança.
    useEffect(() => {
        if (!storageKey) return;
        try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); } catch { /* ignora */ }
    }, [messages, storageKey]);

    useEffect(() => { scrollToEnd(); }, [messages, loading]);
    useEffect(() => { if (open) { inputRef.current?.focus(); scrollToEnd(); } }, [open]);

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
        const history = messages.slice(-6);
        const assistantIdx = messages.length + 1; // índice da bolha da EVA (após a do user)
        setMessages((m) => [...m, { role: "user", content: q }]);
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("eva-help", {
                body: { question: q, page: pageLabel, history },
            });
            const answer = (!error && data && typeof data.answer === "string")
                ? data.answer
                : `Não consegui responder agora. Fala com o suporte no WhatsApp: https://wa.me/5548991696887`;
            setAnimateIdx(assistantIdx); // a próxima (assistant) digita
            setMessages((m) => [...m, { role: "assistant", content: answer }]);
        } catch {
            setAnimateIdx(assistantIdx);
            setMessages((m) => [...m, { role: "assistant", content: "Tive um problema pra responder. Tenta de novo em instantes." }]);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        setMessages([]);
        setAnimateIdx(null);
        setInput("");
        if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignora */ } }
        inputRef.current?.focus();
    };

    const suggestions = [
        { label: "Explicar esta tela", q: `O que eu faço nesta tela (${pageLabel})? Explique de forma simples.` },
        { label: "Por onde começo?", q: "Acabei de entrar no Vyzon. Por onde eu começo? Me dá os primeiros passos." },
        { label: "Como conecto o WhatsApp?", q: "Como eu conecto o meu WhatsApp no Vyzon?" },
    ];

    // No /inicio a EVA comercial já é a entrada (rail/bottom-sheet) — esconde a orb
    // de ajuda aqui pra não ter dois "Perguntar à EVA" (sobretudo no mobile).
    if (/^\/(inicio|dashboard)/.test(location.pathname)) return null;

    return (
        <div className="fixed z-[60] right-4 bottom-[88px] sm:right-6 sm:bottom-6 print:hidden">
            <AnimatePresence mode="wait">
                {open ? (
                    <motion.div
                        key="panel"
                        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "bottom right" }}
                        className="w-[360px] max-w-[calc(100vw-2rem)]"
                    >
                        <div
                            className="rounded-2xl overflow-hidden flex flex-col"
                            style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                boxShadow: "0 12px 28px -8px rgba(15,23,42,0.22), 0 4px 10px rgba(15,23,42,0.08)",
                                maxHeight: "min(70vh, 560px)",
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "#F1F5F9" }}>
                                <EvaOrb variant="blue" size={26} showVoice={false} state={loading ? "analyzing" : "idle"} className="shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13.5px] font-bold leading-tight" style={{ color: "#0B1220" }}>EVA</p>
                                    <p className="text-[11px] leading-tight" style={{ color: "#64748B" }}>Ajuda com o Vyzon</p>
                                </div>
                                {messages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={resetChat}
                                        aria-label="Nova conversa"
                                        title="Nova conversa"
                                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-[#F1F5F9]"
                                        style={{ color: "#64748B" }}
                                    >
                                        <NotePencil size={15} weight="duotone" />
                                    </button>
                                )}
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

                            {/* Thread */}
                            <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
                                {messages.length === 0 && (
                                    <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>
                                        Oi! Sou a EVA. Posso te ajudar a usar o Vyzon, conectar o WhatsApp, configurar seu contexto e dar os primeiros passos. Pergunte o que quiser.
                                    </p>
                                )}
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
                                                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                                                style={{ background: "#2563EB", color: "#FFFFFF", borderBottomRightRadius: 6 }}
                                            >
                                                {m.content}
                                            </div>
                                        ) : (
                                            <AssistantBubble content={m.content} animate={i === animateIdx} onTick={scrollToEnd} />
                                        )}
                                    </motion.div>
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "#64748B" }}>
                                        <span className="inline-flex gap-1">
                                            {[0, 1, 2].map((d) => (
                                                <motion.span
                                                    key={d}
                                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                                    style={{ background: "#2563EB" }}
                                                    animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                                                    transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15, ease: "easeInOut" }}
                                                />
                                            ))}
                                        </span>
                                        EVA está escrevendo
                                    </div>
                                )}
                            </div>

                            {/* Chips (só quando ainda não perguntou nada) */}
                            {messages.length === 0 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-2">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s.label}
                                            type="button"
                                            onClick={() => ask(s.q)}
                                            className="text-[12px] px-3 py-1.5 rounded-full transition-colors hover:bg-[#F1F5F9]"
                                            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#334155", fontWeight: 500 }}
                                        >
                                            {s.label}
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
                                    placeholder="Pergunte qualquer coisa…"
                                    disabled={loading}
                                    className="w-full h-11 pl-4 pr-12 rounded-xl text-[13px] outline-none transition-all focus:border-[#2563EB]/40 disabled:opacity-70"
                                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0B1220" }}
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    aria-label="Enviar"
                                    whileTap={reduce ? undefined : { scale: 0.9 }}
                                    className="absolute right-4 top-2 inline-flex items-center justify-center h-8 w-8 rounded-full text-white transition-all disabled:opacity-40"
                                    style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
                                >
                                    {loading ? <CircleNotch size={15} weight="bold" className="animate-spin" /> : <ArrowUp size={15} weight="bold" />}
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
                        className="inline-flex items-center gap-2.5 h-12 pl-2 pr-4 rounded-full transition-shadow hover:shadow-lg"
                        style={{
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 10px 26px -8px rgba(15,23,42,0.28)",
                        }}
                        aria-label="Perguntar à EVA"
                    >
                        <EvaOrb variant="blue" size={34} showVoice={false} state="idle" className="shrink-0" />
                        <span className="text-[14px] font-semibold" style={{ color: "#0B1220" }}>Perguntar à EVA</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
