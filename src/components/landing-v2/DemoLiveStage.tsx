import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Mic, MicOff, Volume2, VolumeX, MessageSquare, PhoneOff } from "lucide-react";
import { EvaOrb } from "./EvaOrb";
import { useGeminiLive } from "./useGeminiLive";
import { whatsappUrl } from "@/config/contact";
import { WhatsappGlyph } from "@/components/icons/WhatsappGlyph";
import { DemoScheduler, DEMO_SLOTS, type SchedStep } from "./DemoScheduler";

// LP.8 (v2) — tour AO VIVO: o app real num iframe (/embed-demo) + a EVA por VOZ
// (Gemini Live, rodando no parent) narrando e NAVEGANDO o iframe. A tool
// navegar(tela) dispara o goto via postMessage → o EmbedController move o cursor
// e troca de rota.
//
// ROBUSTEZ (o tour NUNCA fica preso): o avanço de tela tem uma rede de segurança
// dupla — (1) watchdog por passo que força a próxima tela se a voz não conduzir
// no tempo esperado; (2) rede de conexão que conduz por LEGENDA pré-escrita se a
// voz não conectar. Quando a voz funciona, ela narra e o ritmo é dela; quando
// falha, a EVA conduz sozinha com legendas. Controles estilo Handhold embaixo.
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

// Legenda pré-escrita por tela: mostrada imediatamente ao abrir a tela e usada
// como NARRAÇÃO de fallback quando a voz não está conduzindo (sem chave/sem
// conexão/erro). Garante que a demo SEMPRE explica o que está na tela.
const SCREEN_CAPTION: Record<string, string> = {
    inicio: "Esta é a Central de Comando: tudo que precisa da sua atenção hoje num lugar só, com o próximo passo de cada conversa.",
    inbox: "A Caixa de Entrada reúne as conversas de todos os canais, na ordem do que precisa de resposta agora.",
    "inbox-analise": "A EVA leu a conversa inteira, viu que é um lead quente e já deixou a resposta sugerida pronta. O time só revisa e aprova.",
    pipeline: "No Pipeline cada conversa vira uma oportunidade no funil, e a EVA avisa quando algo precisa de follow-up.",
    lead: "No detalhe da oportunidade você vê o contexto do lead, o histórico da conversa e o próximo passo que a EVA sugere.",
    metas: "Em Metas você acompanha o objetivo do time em tempo real e configura a meta de cada vendedor.",
    ranking: "O Ranking é o placar da equipe: dá visibilidade e motiva o time de um jeito saudável, sem exposição.",
    "eva-studio": "No EVA Studio você cria agentes especialistas para qualificação, follow-up, propostas e reativação.",
    "eva-studio-criar": "Você conversa com a EVA, responde algumas perguntas sobre o negócio e o agente de qualificação fica pronto em minutos.",
};

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

// IMPORTANTE: manter o systemInstruction ENXUTO. O modelo native-audio (com
// thinkingBudget:0) retorna erro interno (WS close 1011) quando system+prompt
// somados ficam grandes demais — validado em testes. Não voltar a inflar isto.
function buildSystem(site: string): string {
    const alvo = site.trim() ? ` para ${site.trim()}` : "";
    return [
        `Você é a EVA, a inteligência da Vyzon — Central Comercial com IA para agências que vendem por conversa. Fale SEMPRE em português do Brasil, calorosa e consultiva, frases curtas. Você está mostrando a plataforma${alvo}.`,
        `Esta é uma demo GUIADA: o sistema abre cada tela e te diz qual explicar. Quando receber "Você está mostrando a tela X...", explique SÓ aquela tela em 3 ou 4 frases e pare. NÃO use a ferramenta navegar durante o tour — a tela já é trocada pra você.`,
        `Se a pessoa perguntar algo, responda e pare; se ela pedir pra ver outra área (ex Metas), use navegar.`,
        `Se ela quiser agendar uma demo, use a ferramenta agendar (abrir; depois selecionar com o dia que ela falar; depois confirmar). Horários: terça 14h, quarta 10h, quinta 16h, sexta 11h. Você NÃO envia links nem e-mails.`,
        `A EVA sugere, o time aprova. Não invente preços, números nem clientes.`,
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

// teto absoluto que uma tela pode ficar no ar quando a voz CONDUZ (anti-trava):
// se a EVA não terminar de narrar nesse tempo, o tour avança mesmo assim.
const STEP_CEIL = 22000;
// quanto tempo cada tela fica no ar quando a voz NÃO conduz (fallback legenda).
const STEP_DWELL_NOVOICE = 9000;
// quanto esperar a voz conectar antes de conduzir o tour por legenda.
const CONNECT_WAIT = 13000;

// botão de controle circular estilo Handhold (mic / áudio / conversar / desligar)
const CtrlBtn = ({ onClick, label, active, danger, disabled, children }: {
    onClick: () => void; label: string; active?: boolean; danger?: boolean; disabled?: boolean; children: ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        title={label}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-35 ${active || danger ? "" : "hover:bg-black/[0.06]"}`}
        style={{
            background: danger ? "rgba(214,40,40,0.12)" : active ? "var(--lp-blue)" : "transparent",
            color: danger ? "#d62828" : active ? "#fff" : "var(--lp-ink-90)",
        }}
    >
        {children}
    </button>
);

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
    const [capFallback, setCapFallback] = useState(SCREEN_CAPTION.inicio);
    const connectedRef = useRef(false);
    const activeRef = useRef("inicio");
    const navTimersRef = useRef<number[]>([]);
    const lastTargetRef = useRef("inicio");
    const tourIdxRef = useRef(-1);      // -1 = não começou, -2 = concluído
    const tourStartedRef = useRef(false);
    const stepSpokeRef = useRef(false); // a EVA já narrou a tela atual?
    const nudgedStepRef = useRef(-1);   // último passo já mandado narrar (anti-duplicação)
    const stepWatchRef = useRef<number | null>(null); // watchdog do passo atual
    const chatOpenRef = useRef(false);  // refs lidas dentro do watchdog (sem closure stale)
    const schedRef = useRef(false);
    const live = useGeminiLive();

    useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
    useEffect(() => { schedRef.current = !!sched; }, [sched]);

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

    const clearStepWatch = () => { if (stepWatchRef.current) { clearTimeout(stepWatchRef.current); stepWatchRef.current = null; } };

    // TOUR DETERMINÍSTICO + ROBUSTO: abre a tela i, mostra a legenda e (se a voz
    // estiver viva) manda a EVA narrar. Um WATCHDOG garante que o passo nunca
    // fica preso: se a voz não conduzir até o teto, avança sozinho. Quando a
    // pessoa abre conversa/agenda, o watchdog espera (não pula por cima dela).
    const startStep = (i: number) => {
        clearStepWatch();
        if (i < 0 || i >= SCREEN_ORDER.length) { tourIdxRef.current = -2; return; }
        if (nudgedStepRef.current >= i) return;  // este passo já foi iniciado (anti-repetição)
        nudgedStepRef.current = i;
        tourIdxRef.current = i;
        stepSpokeRef.current = false;
        const screen = SCREEN_ORDER[i];
        lastTargetRef.current = screen;
        setScreen(screen);
        setCapFallback(SCREEN_CAPTION[screen] || "");
        const mount = MOUNT_DELAY[screen] ?? 750;
        const voiceLive = live.status === "live";
        if (voiceLive) {
            const t = window.setTimeout(() => live.nudge(TOUR_PROMPT[screen] || `Explique a tela ${screen}.`), mount);
            navTimersRef.current.push(t);
        }
        // WATCHDOG anti-trava (a real correção do "fica parado na Central"):
        const ceil = (voiceLive ? STEP_CEIL : STEP_DWELL_NOVOICE) + mount;
        const tick = () => {
            if (tourIdxRef.current !== i) return;                       // já avançou
            if (chatOpenRef.current || schedRef.current) {              // pessoa engajada → espera
                stepWatchRef.current = window.setTimeout(tick, 4000);
                return;
            }
            startStep(i + 1);
        };
        stepWatchRef.current = window.setTimeout(tick, ceil);
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

    // desconecta a voz e limpa timers ao sair do tour
    useEffect(() => () => { live.disconnect(); navTimersRef.current.forEach(clearTimeout); clearStepWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // quando a EVA começa a falar: tira o "pensando" e marca que narrou a tela
    useEffect(() => {
        if (live.orbState === "speaking") { setWaiting(false); stepSpokeRef.current = true; }
    }, [live.orbState]);

    // INÍCIO do tour assim que a voz fica ao vivo (caminho feliz)
    useEffect(() => {
        if (live.status === "live" && !tourStartedRef.current) { tourStartedRef.current = true; startStep(0); }
    }, [live.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // REDE DE SEGURANÇA: se a voz der erro OU não conectar a tempo, conduz o tour
    // mesmo assim (por legenda). A demo NUNCA fica parada esperando a EVA conectar.
    useEffect(() => {
        if (!appReady || tourStartedRef.current) return;
        if (live.status === "error") { tourStartedRef.current = true; startStep(0); return; }
        const t = window.setTimeout(() => {
            if (!tourStartedRef.current) { tourStartedRef.current = true; startStep(0); }
        }, CONNECT_WAIT);
        return () => clearTimeout(t);
    }, [appReady, live.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // LEGENDA AO VIVO (voz): mostra SÓ a frase que ela está falando agora; quando
    // uma nova frase começa, a anterior DISSOLVE. A key da frase atual é o ÍNDICE
    // pra ela NÃO re-animar a cada palavra — só anima a entrada de frase nova.
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

    // abre o modo conversa quando o usuário começa a falar/digitar uma dúvida
    useEffect(() => {
        if (!chatOpen && live.userText.trim().length >= 3) setChatOpen(true);
    }, [live.userText, chatOpen]);

    // AVANÇO por VOZ: quando a EVA TERMINA de narrar a tela (volta a "listening"
    // depois de ter falado), espera o áudio drenar e abre a próxima. Pausa em
    // modo conversa/agenda e quando o usuário está falando. (O watchdog cobre o
    // resto: se a voz não terminar/cair, o tour avança por tempo mesmo assim.)
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

    const activeIdx = Math.max(0, SCREEN_ORDER.indexOf(active));
    const manual = live.status === "error" || (appReady && live.status === "idle");
    const goManual = (i: number) => { if (i >= SCREEN_ORDER.length) endCall(); else { nudgedStepRef.current = i - 1; startStep(i); } };
    const toggleMute = () => { const m = !muted; setMuted(m); live.setMuted(m); };
    const toggleMic = () => { live.setMicEnabled(!live.micOn); };
    const endCall = () => { live.disconnect(); onDone(); };
    const voiceLive = live.status === "live";
    // legenda do palco: a fala da EVA quando há voz; senão a legenda pré-escrita.
    const stageCaption = (voiceLive && capCurrent) ? capCurrent : capFallback;

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

                {/* LEGENDA + estado ao vivo sobre o palco (estilo Handhold): a EVA
                    "narra" o que está na tela; chip "ao vivo" no topo do bloco. */}
                {appReady && !chatOpen && !sched && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2.5 px-4 pb-5 pt-20"
                        style={{ background: "linear-gradient(to top, rgba(8,9,12,0.62), rgba(8,9,12,0.18) 55%, transparent)" }}>
                        <span className="lp-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white"
                            style={{ background: "rgba(8,9,12,0.55)", backdropFilter: "blur(6px)", fontSize: 10.5, letterSpacing: "0.04em" }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: voiceLive ? "var(--lp-live)" : "rgba(255,255,255,0.55)" }} />
                            EVA · {SCREEN_LABEL[active] || active}
                        </span>
                        <div className="relative w-full max-w-2xl text-center" style={{ minHeight: "2.7em" }} aria-live="polite">
                            {voiceLive && capFading.map((f) => (
                                <p key={f.id} className="vz-cap-out pointer-events-none absolute inset-x-0 top-0 line-clamp-2 text-[14.5px] font-medium leading-snug text-white">
                                    {f.text}
                                </p>
                            ))}
                            <p key={`${capKey}-${active}`} className="vz-cap-in line-clamp-2 text-[14.5px] font-medium leading-snug text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>
                                {live.userText.trim() ? `Você: ${live.userText}` : stageCaption}
                            </p>
                        </div>
                    </div>
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

                        {/* Texto opcional (texto + voz) + mic + mudo */}
                        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
                                placeholder={voiceLive ? "Pergunte à EVA…" : "Conectando a EVA…"}
                                disabled={!voiceLive}
                                className="vz-input-light flex-1"
                                aria-label="Sua pergunta pra EVA"
                            />
                            <button
                                type="button"
                                onClick={sendChat}
                                disabled={!draft.trim() || !voiceLive}
                                aria-label="Enviar pergunta"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                                style={{ background: "var(--lp-blue)" }}
                            >
                                <ArrowUp size={18} strokeWidth={2.6} />
                            </button>
                            {voiceLive && (
                                <button type="button" onClick={toggleMic} aria-pressed={live.micOn} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors" style={{ background: live.micOn ? "var(--lp-blue)" : "rgba(5,5,5,0.05)", color: live.micOn ? "#fff" : "var(--lp-ink-90)" }} aria-label={live.micOn ? "Desligar microfone" : "Falar com a EVA"} title={live.micOn ? "Desligar microfone" : "Falar com a EVA"}>
                                    {live.micOn ? <Mic size={17} /> : <MicOff size={17} />}
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

            {/* BARRA HANDHOLD: progresso à esquerda, controles circulares no centro
                (conversar · mic · áudio · desligar), CTA "Falar com a gente" à direita */}
            <div className="flex shrink-0 items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                {/* esquerda: progresso do tour (some no mobile estreito) */}
                <div className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
                    {SCREEN_ORDER.map((s, i) => (
                        <span key={s} className="h-1.5 rounded-full transition-all" style={{ width: i === activeIdx ? 18 : 6, background: i <= activeIdx ? "var(--lp-blue)" : "var(--lp-line)" }} />
                    ))}
                </div>

                {/* centro: pílula de controles estilo Handhold */}
                <div className="flex items-center gap-1 rounded-full px-1.5 py-1" style={{ background: "rgba(5,5,5,0.035)", border: "1px solid var(--lp-line)" }}>
                    <CtrlBtn onClick={() => setChatOpen(true)} label="Conversar com a EVA">
                        <MessageSquare size={18} />
                    </CtrlBtn>
                    <CtrlBtn onClick={toggleMic} active={live.micOn} disabled={!voiceLive} label={live.micOn ? "Desligar microfone" : "Falar com a EVA"}>
                        {live.micOn ? <Mic size={18} /> : <MicOff size={18} />}
                    </CtrlBtn>
                    <CtrlBtn onClick={toggleMute} active={muted} disabled={!voiceLive} label={muted ? "Ativar som da EVA" : "Silenciar a EVA"}>
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </CtrlBtn>
                    <span className="mx-0.5 h-6 w-px" style={{ background: "var(--lp-line)" }} />
                    <CtrlBtn onClick={endCall} danger label="Encerrar demo">
                        <PhoneOff size={17} />
                    </CtrlBtn>
                </div>

                {/* direita: estado/manual + CTA WhatsApp */}
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                    {manual && (
                        <button type="button" onClick={() => goManual(activeIdx + 1)} className="hidden rounded-full px-4 py-1.5 text-[13px] text-white sm:inline-flex" style={{ background: "var(--lp-ink)", fontWeight: 600 }}>
                            {activeIdx >= SCREEN_ORDER.length - 1 ? "Concluir" : "Próximo"}
                        </button>
                    )}
                    <a
                        href={whatsappUrl(`Oi! Vi a demo da EVA${site.trim() ? ` (${site.trim()})` : ""} e quero conversar sobre o Vyzon.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
                        style={{ background: "#0B1220" }}
                    >
                        <WhatsappGlyph size={14} />
                        <span className="hidden sm:inline">Falar com a gente</span>
                    </a>
                </div>
            </div>
        </div>
    );
};
