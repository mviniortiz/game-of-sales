import { useEffect, useRef, useState } from "react";
import { EvaOrb } from "./EvaOrb";
import { useGeminiLive } from "./useGeminiLive";

// LP.8 (v2) — tour AO VIVO: o app real num iframe (/embed-demo) + a EVA por VOZ
// (Gemini Live, rodando no parent) narrando e NAVEGANDO o iframe. A tool
// navegar(tela) dispara o goto via postMessage → o EmbedController move o cursor
// e troca de rota. Fallback manual (botões) se sem microfone/chave.
interface DemoLiveStageProps {
    onDone: () => void;
    site: string;
}

const SCREEN_ORDER = ["inicio", "inbox", "pipeline", "lead", "eva-studio"];
const SCREEN_LABEL: Record<string, string> = { inicio: "Central de Comando", inbox: "Inbox", pipeline: "Pipeline", lead: "Detalhe do lead", "eva-studio": "Configurar agente", metas: "Metas", ranking: "Ranking" };
const NAV_ENUM = ["inicio", "inbox", "pipeline", "lead", "eva-studio", "metas", "ranking"];

function buildSystem(site: string): string {
    const alvo = site.trim() ? ` para ${site.trim()}` : "";
    return [
        `Você é a EVA, a inteligência da Vyzon — Central Comercial com IA para agências que vendem por conversa.`,
        `Fale SEMPRE em português do Brasil, calorosa, consultiva, frases curtas. É uma conversa, e você está MOSTRANDO a plataforma na tela${alvo}.`,
        `RITMO IMPORTANTE: apresente UMA tela por vez. Para cada tela, chame a ferramenta navegar e então EXPLIQUE com calma, em 2 ou 3 frases, o que ela mostra. NUNCA chame navegar para a próxima tela enquanto ainda estiver explicando a atual — só avance depois de terminar a explicação da tela atual.`,
        `Siga esta ordem: navegar "inicio" (Central de Comando: você reúne conversas, leads quentes e o próximo passo de cada lead) → navegar "inbox" (as conversas chegando dos canais, onde você lê cada atendimento) → navegar "pipeline" (cada conversa vira uma oportunidade no funil e você aponta o que está parado) → navegar "lead" (abra o DETALHE de uma oportunidade e mostre as informações: contexto, histórico e o próximo passo sugerido) → navegar "eva-studio" (onde a pessoa cria um agente especialista em minutos com o playbook da agência).`,
        `Conduza de forma contínua, sem esperar a pessoa pedir para avançar, mas responda se ela te interromper com uma pergunta. Ao final, convide para agendar uma demo ou testar 14 dias grátis.`,
        `Regra do produto: a EVA SUGERE, o time APROVA. Nunca diga que envia mensagens sozinha. Não invente preços, números, clientes nem integrações.`,
    ].join(" ");
}

const TOOLS = [{
    functionDeclarations: [{
        name: "navegar",
        description: "Abre uma tela da plataforma Vyzon (ou, com tela='lead', o detalhe de uma oportunidade) para a pessoa ver, enquanto você explica.",
        parameters: { type: "OBJECT", properties: { tela: { type: "STRING", enum: NAV_ENUM, description: "qual tela abrir" } }, required: ["tela"] },
    }],
}];

export const DemoLiveStage = ({ onDone, site }: DemoLiveStageProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [active, setActive] = useState("inicio");
    const [appReady, setAppReady] = useState(false);
    const [muted, setMuted] = useState(false);
    const connectedRef = useRef(false);
    const activeRef = useRef("inicio");
    const queueRef = useRef<string[]>([]);
    const pumpRef = useRef<number | null>(null);
    const live = useGeminiLive();

    // tempo mínimo que cada tela fica antes de avançar — desacopla a rajada de
    // tool calls do Gemini do ritmo visual (senão o iframe pula à frente da fala)
    const MIN_DWELL = 9500;

    const sendGoto = (screen: string) => {
        try { iframeRef.current?.contentWindow?.postMessage({ source: "vyzon-demo", action: "goto", screen }, window.location.origin); } catch { /* noop */ }
    };
    const setScreen = (screen: string) => { activeRef.current = screen; setActive(screen); sendGoto(screen); };

    // fila com ritmo: processa a 1ª tela na hora e as próximas a cada MIN_DWELL
    const pump = () => {
        const next = queueRef.current.shift();
        if (next === undefined) { pumpRef.current = null; return; }
        setScreen(next);
        pumpRef.current = window.setTimeout(pump, MIN_DWELL);
    };
    const enqueue = (screen: string) => {
        const q = queueRef.current;
        if (q[q.length - 1] === screen) return; // evita duplicado consecutivo
        q.push(screen);
        if (pumpRef.current === null) pump();
    };

    // handshake + auto-connect da voz quando o app real fica pronto
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const d = e.data;
            if (d?.source !== "vyzon-demo" || d?.event !== "ready") return;
            if (d.path && String(d.path).startsWith("/embed-demo")) return;
            setAppReady(true);
            sendGoto(activeRef.current);
            if (!connectedRef.current) {
                connectedRef.current = true;
                live.connect({
                    systemInstruction: buildSystem(site),
                    voiceName: "Sulafat",
                    tools: TOOLS,
                    kickoff: "Comece a demonstração agora pela Central de Comando e conduza na ordem das telas (inicio, inbox, pipeline, abrir o detalhe de um lead, e configurar agente), explicando CADA uma com calma e por completo antes de avançar para a próxima. Não espere minhas respostas para seguir.",
                    onToolCall: (name, args) => {
                        if (name === "navegar") {
                            const tela = String((args as { tela?: string }).tela || "");
                            if (import.meta.env.DEV) console.debug("[demo] navegar →", tela);
                            if (NAV_ENUM.includes(tela)) enqueue(tela);
                        }
                        return "ok";
                    },
                });
            }
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // desconecta a voz e para a fila ao sair do tour
    useEffect(() => () => { live.disconnect(); if (pumpRef.current) clearTimeout(pumpRef.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const liveOrb = live.status === "connecting" ? "thinking" : live.status === "live" ? live.orbState : "idle";
    const activeIdx = Math.max(0, SCREEN_ORDER.indexOf(active));
    const manual = live.status === "error" || (appReady && live.status === "idle");
    const goManual = (i: number) => { if (i >= SCREEN_ORDER.length) onDone(); else setScreen(SCREEN_ORDER[i]); };
    const toggleMute = () => { const m = !muted; setMuted(m); live.setMuted(m); };

    return (
        <div className="flex h-full flex-1 flex-col">
            <div className="relative flex-1" style={{ background: "#0b0d12" }}>
                <iframe ref={iframeRef} src="/embed-demo" title="Demonstração da Vyzon" allow="microphone" className="h-full w-full" style={{ border: 0, display: "block" }} />
                {!appReady && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--lp-paper)" }}>
                        <div className="flex flex-col items-center gap-4">
                            <EvaOrb state="thinking" size={120} />
                            <p className="text-[14px]" style={{ color: "rgba(5,5,5,0.6)" }}>Abrindo a Vyzon ao vivo…</p>
                        </div>
                    </div>
                )}
            </div>

            {/* barra: orb + transcrição/estado + controles (empilha no mobile) */}
            <div className="flex shrink-0 flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-3.5" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <EvaOrb state={liveOrb} size={42} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                        {live.status === "live" ? (
                            <>
                                <p className="lp-mono" style={{ color: "var(--lp-live)" }}>EVA ao vivo · {SCREEN_LABEL[active] || active}</p>
                                <p className="truncate text-[13px]" style={{ color: "rgba(5,5,5,0.66)" }}>
                                    {live.evaText || (live.userText ? `Você: ${live.userText}` : "Pode falar com a EVA, ela está te mostrando a plataforma.")}
                                </p>
                            </>
                        ) : live.status === "connecting" ? (
                            <p className="text-[13.5px]" style={{ color: "rgba(5,5,5,0.6)" }}>Conectando a EVA… libere o microfone quando o navegador pedir.</p>
                        ) : live.status === "error" ? (
                            <p className="text-[13px]" style={{ color: "rgba(5,5,5,0.6)" }}>
                                {live.errorReason === "mic_denied" ? "Sem microfone — navegue pelos botões." : live.errorReason === "no_key" ? "Voz não configurada — use os botões." : "Voz indisponível — use os botões."}
                            </p>
                        ) : (
                            <p className="text-[13.5px]" style={{ color: "rgba(5,5,5,0.6)" }}>{SCREEN_LABEL[active]}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex items-center gap-1.5">
                        {SCREEN_ORDER.map((s, i) => (
                            <span key={s} className="h-1.5 rounded-full transition-all" style={{ width: i === activeIdx ? 18 : 6, background: i <= activeIdx ? "var(--lp-blue)" : "var(--lp-line)" }} />
                        ))}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        {manual && (
                            <>
                                <button type="button" onClick={() => goManual(activeIdx - 1)} disabled={activeIdx === 0} className="text-[13.5px] disabled:opacity-30" style={{ color: "var(--lp-ink-55)" }}>Anterior</button>
                                <button type="button" onClick={() => goManual(activeIdx + 1)} className="rounded-full px-4 py-1.5 text-[13.5px] text-white sm:px-5 sm:py-2" style={{ background: "var(--lp-ink)", fontWeight: 600 }}>
                                    {activeIdx >= SCREEN_ORDER.length - 1 ? "Concluir" : "Próximo"}
                                </button>
                            </>
                        )}
                        {live.status === "live" && (
                            <button type="button" onClick={toggleMute} className="text-[13px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                                {muted ? "Ativar som" : "Desativar som"}
                            </button>
                        )}
                        <button type="button" onClick={() => { live.disconnect(); onDone(); }} className="text-[13px]" style={{ color: "var(--lp-ink-55)", fontWeight: 500 }}>Encerrar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
