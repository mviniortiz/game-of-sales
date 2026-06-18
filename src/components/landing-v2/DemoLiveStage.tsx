import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { EvaOrb } from "./EvaOrb";
import { useGeminiLive } from "./useGeminiLive";
import { whatsappUrl } from "@/config/contact";
import { WhatsappGlyph } from "@/components/icons/WhatsappGlyph";
import { DemoScheduler, DEMO_SLOTS, type SchedStep } from "./DemoScheduler";

// LP.8 (v2) — tour AO VIVO: o app real num iframe (/embed-demo) + a EVA por VOZ
// (Gemini Live, rodando no parent) narrando e NAVEGANDO o iframe. A tool
// navegar(tela) dispara o goto via postMessage → o EmbedController move o cursor
// e troca de rota. Fallback manual (botões) se sem microfone/chave.
interface DemoLiveStageProps {
    onDone: () => void;
    site: string;
}

const SCREEN_ORDER = ["inicio", "inbox", "inbox-analise", "pipeline", "lead", "metas", "ranking", "eva-studio", "eva-studio-criar"];
const SCREEN_LABEL: Record<string, string> = { inicio: "Central de Comando", inbox: "Inbox", "inbox-analise": "Análise da EVA", pipeline: "Pipeline", lead: "Detalhe do lead", "eva-studio": "EVA Studio", "eva-studio-criar": "Criar agente", metas: "Metas", ranking: "Ranking" };
const NAV_ENUM = ["inicio", "inbox", "inbox-analise", "pipeline", "lead", "eva-studio", "eva-studio-criar", "metas", "ranking"];

// telas pesadas demoram a montar — espera mais antes de mandar a EVA narrar,
// pra ela não falar sobre uma tela ainda em loading/spinner.
const MOUNT_DELAY: Record<string, number> = { "eva-studio": 2000, "eva-studio-criar": 2600, "inbox-analise": 1100, lead: 1100 };

// Tour DETERMINÍSTICO: o sistema abre a tela e MANDA a EVA narrar exatamente
// aquela tela (a tela já está aberta). Garante que fala e tela nunca divergem.
const TOUR_PROMPT: Record<string, string> = {
    inicio: "Você está mostrando a CENTRAL DE COMANDO. Em 3 ou 4 frases calorosas, explique que é aqui que o gestor começa o dia: você já leu toda a operação e reuniu num lugar só as conversas ativas, os leads quentes e a fila do que precisa de atenção agora, com o próximo passo de cada um. Ao terminar, pare.",
    inbox: "Agora você está mostrando a CAIXA DE ENTRADA (o Inbox). Em 2 ou 3 frases, explique que são todas as conversas dos canais (WhatsApp e afins) reunidas num lugar só, na ordem do que precisa de atenção. Ao terminar, pare.",
    "inbox-analise": "Agora você ABRIU a conversa da Carla e o seu painel de análise apareceu ao lado. Em 3 ou 4 frases, mostre o DIFERENCIAL: você leu a conversa inteira, percebeu que é um lead quente com intenção de preço, e já deixou a resposta sugerida pronta — o time só revisa e aprova antes de enviar. É isso que te diferencia de um chat comum: você entende a conversa e sugere o próximo passo. Ao terminar, pare.",
    pipeline: "Agora você está mostrando o PIPELINE. Em 3 ou 4 frases, explique que é o funil: cada conversa vira uma oportunidade; há estágios, dá pra ver um lead parado e você avisa quando algo precisa de follow-up. Ao terminar, pare.",
    lead: "Agora você está mostrando o DETALHE DE UMA OPORTUNIDADE. Em 3 ou 4 frases, explique o que aparece: o contexto do lead, o histórico da conversa, o que você entendeu e o próximo passo que você sugere. Ao terminar, pare.",
    metas: "Agora você está mostrando as METAS. Em 3 ou 4 frases, explique que aqui o gestor acompanha as metas do time em tempo real (quanto já foi feito do objetivo do mês) e que dá pra CONFIGURAR a meta de cada vendedor — definir o valor e o período, e a Vyzon mostra o quanto falta e o ritmo necessário. Ao terminar, pare.",
    ranking: "Agora você está mostrando o RANKING. Em 3 ou 4 frases, explique que é o placar da equipe: mostra como cada vendedor está em relação à meta, de um jeito que dá visibilidade e motiva o time sadiamente, sem exposição. Ao terminar, pare.",
    "eva-studio": "Agora você está mostrando o EVA STUDIO, onde a pessoa cria agentes especialistas. Em 2 ou 3 frases, diga que aqui ela monta agentes para qualificação, follow-up, propostas e reativação, cada um treinado com o playbook da agência. Ao terminar, pare.",
    "eva-studio-criar": "Agora você SELECIONOU o agente de Qualificação e abriu o chat de criação. Em 3 ou 4 frases, mostre como é simples: vocês conversam, você faz algumas perguntas sobre o negócio e monta o agente em minutos, pronto pra qualificar os leads que chegam. Ao terminar, convide calorosamente pra agendar uma demo ou testar 14 dias grátis e pare.",
};

function buildSystem(site: string): string {
    const alvo = site.trim() ? ` para ${site.trim()}` : "";
    const negocio = site.trim() ? `o negócio de ${site.trim()}` : "a agência dela";
    return [
        // ── PERSONA ──────────────────────────────────────────────────────────
        `Você é a EVA, a inteligência da Vyzon — Central Comercial com IA para agências que vendem por conversa. Fale SEMPRE em português do Brasil: calorosa, consultiva, frases curtas. É uma conversa, e você está MOSTRANDO a plataforma na tela${alvo}.`,

        // ── DEMO GUIADA: O SISTEMA controla a tela, não você ─────────────────
        `Esta é uma demonstração GUIADA. O SISTEMA controla a tela e te diz, uma de cada vez, qual tela explicar — a tela JÁ vai estar aberta na frente da pessoa quando você receber a instrução. Quando receber "Você está mostrando a tela X, explique...", explique EXATAMENTE essa tela, com substância (3 a 4 frases): o que aparece ali e por que importa pra uma agência. Ao terminar de explicar, PARE e aguarde a próxima instrução do sistema. Você NÃO precisa (e NÃO deve) usar a ferramenta navegar durante a apresentação guiada — a tela já é trocada pra você. Nunca fale de uma tela diferente da que o sistema acabou de indicar.`,

        // ── PERGUNTAS DA PESSOA (loop) ───────────────────────────────────────
        `Se a pessoa te interromper com uma pergunta, responda com naturalidade e pare; o sistema retoma a apresentação. Só se ela pedir EXPLICITAMENTE pra ver outra área (por exemplo "me mostra as metas") use a ferramenta navegar para abri-la e explique.`,

        // ── AGENDAR (só se ela quiser) ───────────────────────────────────────
        `AGENDAR (só se a pessoa demonstrar interesse em marcar — não force; você NÃO envia links, e-mails nem convites e nunca diz que enviou). Conduza pela ferramenta agendar: (a) agendar acao="abrir" e diga, resumido, os horários: terça às 14h, quarta às 10h, quinta às 16h ou sexta às 11h (horário de Brasília). (b) Quando ela escolher, agendar acao="selecionar" com horario = o que ela falou (ex "quinta"). (c) Pergunte, em uma frase, o que ela gostaria de ver na demo. (d) Faça 1 ou 2 perguntas curtas sobre ${negocio} (o que vende, como os leads chegam hoje). (e) agendar acao="confirmar", agradeça em uma frase e encerre.`,

        // ── GUARDRAILS ───────────────────────────────────────────────────────
        `REGRAS: a EVA SUGERE, o time APROVA — nunca diga que envia mensagens sozinha. Não invente preços, números, clientes nem integrações.`,
    ].join(" ");
}

// quebra a fala em frases (termina em . ! ? …) pra legenda mostrar só a frase
// ATUAL e deixar a anterior sumir — sem empilhar o turno inteiro.
function splitSentences(t: string): string[] {
    const out: string[] = [];
    let cur = "";
    for (const ch of t) {
        cur += ch;
        if (".!?…".indexOf(ch) >= 0) { const s = cur.trim(); if (s) out.push(s); cur = ""; }
    }
    const tail = cur.trim();
    if (tail) out.push(tail);
    return out;
}

// Tools BLOCKING (padrão): o modelo pausa MINIMAMENTE em cada chamada (a tool é
// instantânea, devolve "ok" na hora) — isso ESPAÇA a geração e mantém o lead de
// áudio pequeno, o que é essencial pra sincronia tela↔fala. NON_BLOCKING fazia
// ela falar contínuo, o lead explodia e a navegação travava no futuro.
const TOOLS = [{
    functionDeclarations: [
        {
            name: "navegar",
            description: "Abre uma tela da plataforma Vyzon (ou, com tela='lead', o detalhe de uma oportunidade) para a pessoa ver, enquanto você explica.",
            parameters: { type: "OBJECT", properties: { tela: { type: "STRING", enum: NAV_ENUM, description: "qual tela abrir" } }, required: ["tela"] },
        },
        {
            name: "agendar",
            description: "Conduz o agendamento de uma demo/call quando a pessoa demonstra interesse em marcar. Você NÃO envia links nem e-mails — você abre e opera esta agenda. acao='abrir' mostra a agenda; 'selecionar' (com horario) marca o dia/hora que a pessoa escolheu e avança; 'detalhes' avança pra etapa de perguntas; 'confirmar' finaliza; 'fechar' volta ao tour.",
            parameters: {
                type: "OBJECT",
                properties: {
                    acao: { type: "STRING", enum: ["abrir", "selecionar", "detalhes", "confirmar", "fechar"], description: "o que fazer na agenda" },
                    horario: { type: "STRING", description: "dia ou hora escolhido pela pessoa, ex 'quinta' ou '16h' (só em acao='selecionar')" },
                },
                required: ["acao"],
            },
        },
    ],
}];

export const DemoLiveStage = ({ onDone, site }: DemoLiveStageProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [active, setActive] = useState("inicio");
    const [appReady, setAppReady] = useState(false);
    const [muted, setMuted] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [waiting, setWaiting] = useState(false);
    const [sched, setSched] = useState<SchedStep | null>(null);
    const [slotId, setSlotId] = useState<string | null>(null);
    const connectedRef = useRef(false);
    const activeRef = useRef("inicio");
    const navTimersRef = useRef<number[]>([]);
    const lastTargetRef = useRef("inicio");
    const tourIdxRef = useRef(-1);      // -1 = não começou, -2 = concluído
    const stepSpokeRef = useRef(false); // a EVA já narrou a tela atual?
    const nudgedStepRef = useRef(-1);   // último passo já mandado narrar (anti-duplicação)
    const live = useGeminiLive();

    const sendGoto = (screen: string) => {
        try { iframeRef.current?.contentWindow?.postMessage({ source: "vyzon-demo", action: "goto", screen }, window.location.origin); } catch { /* noop */ }
    };
    const setScreen = (screen: string) => { activeRef.current = screen; setActive(screen); sendGoto(screen); };

    // SINCRONIA tela↔fala: o tool call `navegar` chega ADIANTADO (no tempo de
    // geração do modelo), mas a pessoa percebe o tempo de REPRODUÇÃO. Atrasamos a
    // troca de tela pelo áudio ainda na fila (playbackLeadMs) menos uma
    // antecipação pro cursor andar — assim a tela vira no instante em que ela
    // OUVE a transição. Robusto mesmo se o modelo adianta toda a narração.
    const ANTICIPATE = 480;   // ms que o cursor anda antes do clique/troca
    const MAX_SYNC = 7000;    // teto: nunca segura a tela mais que isso (anti-trava)
    // executa fn no instante em que a pessoa OUVE a fala atual: atrasa pelo áudio
    // ainda na fila (playbackLeadMs), menos a antecipação do cursor, com teto pra
    // a tela nunca ficar "presa no passado" se o lead crescer demais.
    const afterSpeech = (fn: () => void, extra = 0) => {
        const delay = Math.min(MAX_SYNC, Math.max(0, live.playbackLeadMs() - ANTICIPATE)) + extra;
        const t = window.setTimeout(fn, delay);
        navTimersRef.current.push(t);
    };
    const scheduleNav = (screen: string) => {
        if (lastTargetRef.current === screen) return;      // já estamos indo pra lá
        lastTargetRef.current = screen;
        afterSpeech(() => setScreen(screen));
    };

    // TOUR DETERMINÍSTICO: abre a tela i (de verdade), espera montar e MANDA a EVA
    // narrar exatamente essa tela. O avanço pra próxima é feito por efeito quando
    // ela termina de falar. Tela sempre bate com a fala.
    const startStep = (i: number) => {
        if (i < 0 || i >= SCREEN_ORDER.length) { tourIdxRef.current = -2; return; }
        if (nudgedStepRef.current >= i) return;  // este passo já foi mandado narrar (anti-repetição)
        nudgedStepRef.current = i;
        tourIdxRef.current = i;
        stepSpokeRef.current = false;
        const screen = SCREEN_ORDER[i];
        lastTargetRef.current = screen;
        setScreen(screen);
        const t = window.setTimeout(() => live.nudge(TOUR_PROMPT[screen] || `Explique a tela ${screen}.`), MOUNT_DELAY[screen] ?? 750);
        navTimersRef.current.push(t);
    };

    // agendamento conduzido pela EVA (substitui a alucinação do "enviei o link")
    const handleAgendar = (acao: string, horario: string) => {
        if (acao === "abrir") { afterSpeech(() => setSched("horarios")); return; }
        if (acao === "selecionar") {
            const q = horario.toLowerCase();
            const m = DEMO_SLOTS.find((s) =>
                q.includes(s.dia.toLowerCase()) || q.includes(s.hora.toLowerCase().replace("h", "")) || `${s.dia} ${s.hora}`.toLowerCase().includes(q),
            ) || DEMO_SLOTS[2];
            afterSpeech(() => { setSlotId(m.id); setSched("horarios"); });
            afterSpeech(() => setSched("detalhes"), 1400); // mostra o clique, depois avança
            return;
        }
        if (acao === "detalhes") { afterSpeech(() => setSched("detalhes")); return; }
        if (acao === "confirmar") { afterSpeech(() => setSched("confirmado")); return; }
        if (acao === "fechar") { setSched(null); return; }
    };

    // handshake + auto-connect da voz quando o app real fica pronto
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const d = e.data;
            if (d?.source !== "vyzon-demo" || d?.event !== "ready") return;
            if (d.path && String(d.path).startsWith("/embed-demo")) return;
            setAppReady(true);
            setScreen(activeRef.current); // posiciona em "inicio"; o tour é dirigido pelo cliente
            if (!connectedRef.current) {
                connectedRef.current = true;
                live.connect({
                    systemInstruction: buildSystem(site),
                    voiceName: "Sulafat",
                    tools: TOOLS,
                    // sem kickoff: o tour determinístico (efeito abaixo) abre a tela
                    // e MANDA a EVA narrar cada uma, na ordem.
                    onToolCall: (name, args) => {
                        if (name === "navegar") {
                            const tela = String((args as { tela?: string }).tela || "");
                            if (import.meta.env.DEV) console.debug("[demo] navegar →", tela);
                            if (NAV_ENUM.includes(tela)) scheduleNav(tela);
                        } else if (name === "agendar") {
                            const a = args as { acao?: string; horario?: string };
                            if (import.meta.env.DEV) console.debug("[demo] agendar →", a.acao, a.horario);
                            handleAgendar(String(a.acao || ""), String(a.horario || ""));
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

    // desconecta a voz e limpa timers de navegação ao sair do tour
    useEffect(() => () => { live.disconnect(); navTimersRef.current.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // quando a EVA começa a falar: tira o "pensando" e marca que narrou a tela
    useEffect(() => {
        if (live.orbState === "speaking") { setWaiting(false); stepSpokeRef.current = true; }
    }, [live.orbState]);

    // INÍCIO do tour: assim que a voz fica ao vivo, abre a 1ª tela e manda narrar
    useEffect(() => {
        if (live.status === "live" && tourIdxRef.current === -1) startStep(0);
    }, [live.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // LEGENDA AO VIVO: mostra SÓ a frase que ela está falando agora; quando uma
    // nova frase começa, a anterior DISSOLVE (vanish com blur). A key da frase
    // atual é o ÍNDICE (não o texto) pra ela NÃO re-animar a cada palavra que
    // chega — só anima a entrada quando começa uma frase nova.
    const [capCurrent, setCapCurrent] = useState("");
    const [capKey, setCapKey] = useState(0);
    const [capFading, setCapFading] = useState<{ id: number; text: string }[]>([]);
    const capSeenRef = useRef(0);
    const capIdRef = useRef(0);
    const capTimersRef = useRef<number[]>([]);
    useEffect(() => {
        const full = live.evaText;
        if (!full) { setCapCurrent(""); capSeenRef.current = 0; return; }
        const s = splitSentences(full);
        if (!s.length) return;
        const completedBefore = s.length - 1; // tudo antes da última já "passou"
        while (capSeenRef.current < completedBefore) {
            const text = s[capSeenRef.current];
            capSeenRef.current += 1;
            const id = ++capIdRef.current;
            setCapFading((f) => [...f.slice(-1), { id, text }]); // no máx. 1 dissolvendo
            const tm = window.setTimeout(() => setCapFading((f) => f.filter((x) => x.id !== id)), 2300);
            capTimersRef.current.push(tm);
        }
        setCapCurrent(s[s.length - 1] ?? "");
        setCapKey(s.length); // muda só quando começa uma frase nova → anima 1x
    }, [live.evaText]);
    useEffect(() => () => { capTimersRef.current.forEach(clearTimeout); }, []);

    // TRANSIÇÃO automática: abre o modo conversa SÓ quando o usuário começa a
    // tirar dúvidas (fala uma pergunta durante o tour). Quem só assiste não é
    // interrompido; o botão "Conversar com a EVA" continua como gatilho manual.
    useEffect(() => {
        if (!chatOpen && live.userText.trim().length >= 3) setChatOpen(true);
    }, [live.userText, chatOpen]);

    // AVANÇO do tour: quando a EVA TERMINA de narrar a tela atual (volta a
    // "listening" depois de ter falado), espera o áudio drenar e abre a próxima.
    // Pausa em modo conversa/agenda e quando o usuário está falando.
    useEffect(() => {
        if (tourIdxRef.current < 0) return;            // tour não rodando/concluído
        if (chatOpen || sched) return;                 // conversa/agenda mandam
        if (live.orbState !== "listening") return;     // ainda falando/pensando
        if (!stepSpokeRef.current) return;             // ainda não narrou esta tela
        if (live.userText.trim()) return;              // usuário está falando
        const t = window.setTimeout(() => {
            if (chatOpen || sched || live.userText.trim()) return;
            startStep(tourIdxRef.current + 1);
        }, live.playbackLeadMs() + 900);               // só depois do áudio terminar
        return () => clearTimeout(t);
    }, [live.orbState, chatOpen, sched, live.userText]); // eslint-disable-line react-hooks/exhaustive-deps

    // envia a pergunta por texto (a EVA responde por voz + texto)
    const sendChat = () => {
        const t = draft.trim();
        if (!t || live.status !== "live") return;
        setDraft("");
        setWaiting(true);
        live.sendText(t);
    };

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

                {/* CTA de conversão: alta intenção durante a demo → fala direto com o time */}
                {appReady && (
                    <a
                        href={whatsappUrl(`Oi! Vi a demo da EVA${site.trim() ? ` (${site.trim()})` : ""} e quero conversar sobre o Vyzon.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
                        style={{ background: "#0B1220" }}
                    >
                        <WhatsappGlyph size={15} />
                        Falar com a gente
                    </a>
                )}

                {/* Modo conversa: a EVA "sai da demo" e fica de frente, em VOZ. O
                    orb grande pulsa/aumenta quando ela fala. Texto é opcional embaixo. */}
                {chatOpen && (
                    <div className="vz-demochat-in absolute inset-0 z-20 flex flex-col" style={{ background: "var(--lp-paper)" }}>
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>EVA · ao vivo</span>
                            <button type="button" onClick={() => setChatOpen(false)} className="rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)", fontWeight: 500 }}>
                                Voltar pra demo
                            </button>
                        </div>

                        {/* Palco: orb grande de frente + nome + legenda da fala */}
                        <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center">
                            <div className={live.orbState === "speaking" ? "vz-orb-speaking" : "vz-orb-calm"}>
                                <EvaOrb state={live.orbState} size={232} />
                            </div>
                            <div className="max-w-xl">
                                <p className="lp-display" style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", color: "var(--lp-ink)", letterSpacing: "-0.025em", lineHeight: 1.1 }}>EVA</p>
                                <p className="mx-auto mt-3 text-[15.5px]" style={{ color: "rgba(8,10,15,0.92)", lineHeight: 1.55, minHeight: 50, maxWidth: 520 }}>
                                    {waiting
                                        ? "pensando…"
                                        : live.evaText || (live.userText ? `Você: ${live.userText}` : "Pode falar comigo, ou digite sua dúvida aqui embaixo.")}
                                </p>
                            </div>
                        </div>

                        {/* Texto opcional (texto + voz) + mudo */}
                        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
                                placeholder={live.status === "live" ? "Pergunte à EVA…" : "Conectando a EVA…"}
                                disabled={live.status !== "live"}
                                className="vz-input-light flex-1"
                                aria-label="Sua pergunta pra EVA"
                            />
                            <button
                                type="button"
                                onClick={sendChat}
                                disabled={!draft.trim() || live.status !== "live"}
                                aria-label="Enviar pergunta"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                                style={{ background: "var(--lp-blue)" }}
                            >
                                <ArrowUp size={18} strokeWidth={2.6} />
                            </button>
                            {live.status === "live" && (
                                <button type="button" onClick={toggleMute} className="shrink-0 text-[13px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                                    {muted ? "Ativar som" : "Desativar som"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Agendamento conduzido pela EVA (overlay acima da demo) */}
                {sched && (
                    <DemoScheduler
                        step={sched}
                        selectedId={slotId}
                        site={site}
                        onClose={() => setSched(null)}
                        onConclude={onDone}
                    />
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
                                <div className="relative" style={{ minHeight: "2.6em" }} aria-live="polite">
                                    {/* frase anterior dissolvendo (vanish) */}
                                    {capFading.map((f) => (
                                        <p key={f.id} className="vz-cap-out pointer-events-none absolute inset-x-0 top-0 line-clamp-2 text-[13px] leading-snug" style={{ color: "rgba(8,10,15,0.92)" }}>
                                            {f.text}
                                        </p>
                                    ))}
                                    {/* frase atual (key = índice da frase, não o texto) */}
                                    <p key={capKey} className="vz-cap-in line-clamp-2 text-[13px] leading-snug" style={{ color: "rgba(8,10,15,0.92)" }}>
                                        {capCurrent || (live.userText ? `Você: ${live.userText}` : "Pode falar com a EVA, ela está te mostrando a plataforma.")}
                                    </p>
                                </div>
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
                            <button type="button" onClick={() => setChatOpen(true)} className="text-[13px]" style={{ color: "var(--lp-blue)", fontWeight: 600 }}>
                                Conversar com a EVA
                            </button>
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
