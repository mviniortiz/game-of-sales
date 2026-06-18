import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { useEvaVoice } from "@/lib/eva-voz/useEvaVoice";

// EVA VOZ (rota /eva-voz) — conversa por voz BIDIRECIONAL com a EVA, isolada da
// demo. Half-duplex por turno: a EVA fala, depois é a sua vez. Fallback por texto.
const SYSTEM = [
    "Você é a EVA, a inteligência da Vyzon — central comercial com IA para agências que vendem por conversa.",
    "Converse em português do Brasil, calorosa e consultiva, frases curtas (1 a 3).",
    "Ajude a pessoa a entender como você lê os atendimentos do WhatsApp, aponta quem está pronto e sugere o próximo passo; o time aprova.",
    "A EVA sugere, o time aprova. Não invente preços, números nem clientes.",
].join(" ");
const GREETING = "Cumprimente em uma frase calorosa, diga que é a EVA da Vyzon e pergunte qual o maior gargalo comercial da agência da pessoa hoje.";

const EvaVoz = () => {
    const live = useEvaVoice();
    const [draft, setDraft] = useState("");
    const startedRef = useRef(false);

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => { if (wasDark) html.classList.add("dark"); live.disconnect(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const start = () => {
        startedRef.current = true;
        live.connect({ systemInstruction: SYSTEM, voiceName: "Sulafat", greeting: GREETING });
    };
    const send = () => {
        const t = draft.trim();
        if (!t || live.status !== "live") return;
        setDraft("");
        live.sendText(t);
    };

    const orbState = live.status === "connecting" || live.status === "reconnecting"
        ? "thinking"
        : live.status === "live"
            ? live.orb
            : "idle";

    const statusLine = (() => {
        if (live.status === "connecting") return "Conectando à EVA…";
        if (live.status === "reconnecting") return "Reconectando…";
        if (live.status === "error") return live.errorReason === "no_token" ? "Voz indisponível no momento." : "Voz indisponível — use o texto abaixo.";
        if (live.status === "ended") return "Conversa encerrada.";
        if (live.status === "live") {
            if (live.orb === "speaking") return "EVA está falando…";
            if (live.orb === "thinking") return "EVA está pensando…";
            return live.micReady ? "Pode falar — é a sua vez." : "Pode escrever sua pergunta abaixo.";
        }
        return "";
    })();

    const caption = live.evaText || (live.userText ? `Você: ${live.userText}` : "");
    const connected = live.status === "live" || live.status === "reconnecting";

    return (
        <div className="lp-v2 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <div className="flex w-full max-w-lg flex-col items-center text-center">
                <div className={live.orb === "speaking" && connected ? "vz-orb-speaking" : "vz-orb-calm"}>
                    <EvaOrb state={orbState as "idle" | "thinking" | "speaking" | "listening"} size={200} showVoice={connected} />
                </div>

                <h1 className="lp-display mt-9" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", letterSpacing: "-0.03em", color: "var(--lp-ink)" }}>
                    {startedRef.current ? "EVA" : "Converse com a EVA"}
                </h1>
                <p className="mt-3 min-h-[24px] text-[15px]" style={{ color: "rgba(5,5,5,0.6)" }}>
                    {startedRef.current ? statusLine : "Uma conversa por voz com a inteligência da Vyzon. Fale ou escreva."}
                </p>

                {/* legenda da conversa */}
                {connected && (
                    <p className="mt-6 max-h-[120px] overflow-hidden text-[16px]" style={{ color: "rgba(8,10,15,0.92)", lineHeight: 1.55, minHeight: 50 }}>
                        {caption}
                    </p>
                )}

                {/* ação inicial */}
                {!connected && live.status !== "error" && (
                    <button
                        type="button"
                        onClick={start}
                        className="mt-9 rounded-full px-7 py-3.5 text-[15px] text-white transition-transform hover:scale-[1.02] active:scale-95"
                        style={{ background: "var(--lp-ink)", fontWeight: 600 }}
                    >
                        {live.status === "ended" ? "Conversar de novo" : "Iniciar conversa"}
                    </button>
                )}
                {live.status === "error" && (
                    <button type="button" onClick={start} className="mt-9 rounded-full px-7 py-3.5 text-[15px] text-white" style={{ background: "var(--lp-ink)", fontWeight: 600 }}>
                        Tentar de novo
                    </button>
                )}

                {/* input de texto (fallback sempre disponível durante a conversa) */}
                {connected && (
                    <div className="mt-8 flex w-full items-center gap-2">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
                            placeholder="Ou escreva sua pergunta…"
                            className="vz-input-light flex-1"
                            aria-label="Escreva para a EVA"
                        />
                        <button
                            type="button"
                            onClick={send}
                            disabled={!draft.trim()}
                            aria-label="Enviar"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                            style={{ background: "var(--lp-blue)" }}
                        >
                            <ArrowUp size={18} strokeWidth={2.6} />
                        </button>
                    </div>
                )}

                {connected && (
                    <button type="button" onClick={live.disconnect} className="mt-6 text-[13.5px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                        Encerrar conversa
                    </button>
                )}
            </div>
        </div>
    );
};

export default EvaVoz;
