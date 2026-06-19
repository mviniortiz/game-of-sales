import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Mic, MicOff, Volume2, VolumeX, MessageSquare, PhoneOff } from "lucide-react";
import { EvaOrb } from "./EvaOrb";
import { useGeminiLive, primeEvaAudio } from "./useGeminiLive";
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

// Saudação inicial: a EVA se apresenta (momento visual com o orbe grande) ANTES
// do tour. Curta e calorosa; ao terminar, o tour começa sozinho.
const GREETING_PROMPT = "Cumprimente a pessoa de forma calorosa e BREVE: diga oi, que você é a EVA, a inteligência da Vyzon, e que vai mostrar rapidinho como a plataforma organiza o comercial de uma agência. Termine convidando a começar, tipo 'vem comigo'. No máximo 2 ou 3 frases curtas. Ao terminar, pare.";

// IMPORTANTE: manter system + tools ENXUTOS. O modelo native-audio (com
// thinkingBudget:0) retorna erro interno (WS close 1011) quando a SOMA de
// systemInstruction + descrições das tools passa de ~1.4k chars — reproduzido
// 3/3 em Node (system 871 + tools 1122 = 1011; reduzir qualquer um resolve).
// Esta versão soma ~1.3k e foi validada 3/3. NÃO voltar a inflar nenhum dos dois.
function buildSystem(site: string): string {
    const alvo = site.trim() ? ` para ${site.trim()}` : "";
    return [
        `Você é a EVA, a inteligência da Vyzon (Central Comercial com IA para agências que vendem por conversa). Fale sempre em português do Brasil, calorosa e consultiva, frases curtas. Você mostra a plataforma${alvo}.`,
        `Demo GUIADA: o sistema abre cada tela e diz qual você deve explicar. Explique SÓ a tela indicada em 3 ou 4 frases e pare. NÃO use a ferramenta navegar durante o tour.`,
        `Se a pessoa perguntar algo, responda e pare. Se pedir outra área, use navegar. Se quiser marcar uma demo, use agendar (abrir, selecionar o dia que ela falar, confirmar); horários: terça 14h, quarta 10h, quinta 16h, sexta 11h. Você não envia links nem e-mails.`,
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
// Descrições ENXUTAS de propósito (vide nota do 1011 acima): o fluxo de cada
// tool já é explicado no systemInstruction; aqui só os nomes/enums importam.
const TOOLS = [{
    functionDeclarations: [
        {
            name: "navegar",
            description: "Abre uma tela da plataforma para a pessoa ver.",
            parameters: { type: "OBJECT", properties: { tela: { type: "STRING", enum: NAV_ENUM } }, required: ["tela"] },
        },
        {
            name: "agendar",
            description: "Conduz o agendamento de uma demo.",
            parameters: {
                type: "OBJECT",
                properties: {
                    acao: { type: "STRING", enum: ["abrir", "selecionar", "detalhes", "confirmar", "fechar"] },
                    horario: { type: "STRING", description: "dia/hora que a pessoa escolheu" },
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
// RESILIÊNCIA da voz (validado em Node, 3/3 no tour de 9 telas): o modelo
// native-audio acumula contexto e trava (turno vazio) depois de ~5 telas, e
// ainda sofre 1011 transitório do servidor. Correção: sessão fresca periódica +
// reconectar-e-retomar quando um turno vem vazio ou o WS cai.
const RECONNECT_EVERY = 4;    // reconecta a sessão a cada N telas narradas (zera o contexto)
const MAX_RETRY = 3;          // re-tentativas (reconectando) por turno vazio
const MAX_RECONNECTS = 14;    // teto global de reconexões (anti-loop)
const SPEAK_TIMEOUT = 8000;   // se a EVA não começa a falar nesse tempo após o nudge = turno vazio

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
    const [greeting, setGreeting] = useState(false); // momento de saudação (orbe grande) antes do tour
    const [greetExit, setGreetExit] = useState(false); // saudação dissolvendo (transição pra demo)
    const [stageIn, setStageIn] = useState(false);     // demo "entrando" (zoom sutil)
    const greetSpokeRef = useRef(false);
    const greetExitRef = useRef(false);
    const greetWatchRef = useRef<number | null>(null);
    const connectedRef = useRef(false);
    const activeRef = useRef("inicio");
    const navTimersRef = useRef<number[]>([]);
    const lastTargetRef = useRef("inicio");
    const tourIdxRef = useRef(-1);      // -1 = não começou, -2 = concluído
    const tourStartedRef = useRef(false);
    const stepSpokeRef = useRef(false); // a EVA já narrou a tela atual?
    const nudgedStepRef = useRef(-1);   // último passo já mandado narrar (anti-duplicação)
    const stepWatchRef = useRef<number | null>(null); // watchdog do passo atual
    const speakTimerRef = useRef<number | null>(null); // speak-check (detecta turno vazio)
    const chatOpenRef = useRef(false);  // refs lidas dentro do watchdog (sem closure stale)
    const schedRef = useRef(false);
    // resiliência da sessão de voz (reconexão proativa + reconectar-e-retomar)
    const telasNaSessaoRef = useRef(0);   // telas já narradas na sessão de voz atual
    const reconnectsRef = useRef(0);      // total de reconexões (anti-loop)
    const retryCountRef = useRef(0);      // re-tentativas do passo atual
    const awaitingResumeRef = useRef(false); // reconectando: aguarda voltar "live" pra renarrar
    const resumeStepRef = useRef(0);      // passo a retomar quando a voz voltar
    const live = useGeminiLive();

    const greetingRef = useRef(false);
    useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
    useEffect(() => { schedRef.current = !!sched; }, [sched]);
    useEffect(() => { greetingRef.current = greeting; }, [greeting]);

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
    const clearSpeakTimer = () => { if (speakTimerRef.current) { clearTimeout(speakTimerRef.current); speakTimerRef.current = null; } };

    // reconecta a voz numa SESSÃO FRESCA e RETOMA o passo i quando voltar "live"
    // (zera o contexto que trava a EVA / recupera de 1011). A tela já está aberta.
    const doReconnect = (i: number) => {
        clearStepWatch();
        clearSpeakTimer();
        reconnectsRef.current += 1;
        telasNaSessaoRef.current = 0;
        awaitingResumeRef.current = true;
        resumeStepRef.current = i;
        live.reconnect();
    };

    // (re)envia o nudge do passo i e arma o WATCHDOG (anti-trava) + o SPEAK-CHECK
    // (detecta turno vazio: se a EVA não começa a falar a tempo, reconecta e
    // retoma o mesmo passo numa sessão fresca). A tela já foi aberta por startStep.
    const narrateStep = (i: number) => {
        const screen = SCREEN_ORDER[i];
        const mount = MOUNT_DELAY[screen] ?? 750;
        const voiceLive = live.status === "live";
        if (voiceLive) {
            const t = window.setTimeout(() => live.nudge(TOUR_PROMPT[screen] || `Explique a tela ${screen}.`), mount);
            navTimersRef.current.push(t);
            clearSpeakTimer();
            speakTimerRef.current = window.setTimeout(() => {
                if (tourIdxRef.current !== i || stepSpokeRef.current) return;     // já falou/avançou
                if (chatOpenRef.current || schedRef.current) return;             // pessoa engajada
                if (retryCountRef.current < MAX_RETRY && reconnectsRef.current < MAX_RECONNECTS) {
                    retryCountRef.current += 1;
                    doReconnect(i);                                              // turno vazio → sessão fresca + retoma
                }
            }, mount + SPEAK_TIMEOUT);
        }
        // WATCHDOG anti-trava: se o passo não avança até o teto, segue pro próximo.
        clearStepWatch();
        const ceil = (voiceLive ? STEP_CEIL : STEP_DWELL_NOVOICE) + mount;
        const tick = () => {
            if (tourIdxRef.current !== i) return;
            if (chatOpenRef.current || schedRef.current) { stepWatchRef.current = window.setTimeout(tick, 4000); return; }
            startStep(i + 1);
        };
        stepWatchRef.current = window.setTimeout(tick, ceil);
    };

    // TOUR ROBUSTO: abre a tela i, mostra a legenda e dispara a narração. Antes de
    // narrar, se a sessão já contou RECONNECT_EVERY telas, reconecta (sessão
    // fresca) — o contexto acumulado trava a EVA depois de ~5 telas.
    const startStep = (i: number) => {
        clearStepWatch();
        clearSpeakTimer();
        if (i < 0 || i >= SCREEN_ORDER.length) { tourIdxRef.current = -2; return; }
        if (nudgedStepRef.current >= i) return;  // este passo já foi iniciado (anti-repetição)
        nudgedStepRef.current = i;
        tourIdxRef.current = i;
        stepSpokeRef.current = false;
        retryCountRef.current = 0;
        const screen = SCREEN_ORDER[i];
        lastTargetRef.current = screen;
        setScreen(screen);
        setCapFallback(SCREEN_CAPTION[screen] || "");
        if (live.status === "live" && telasNaSessaoRef.current >= RECONNECT_EVERY && reconnectsRef.current < MAX_RECONNECTS) {
            doReconnect(i);   // sessão fresca antes de narrar; retoma o passo i ao voltar "live"
            return;
        }
        narrateStep(i);
    };

    const clearGreetWatch = () => { if (greetWatchRef.current) { clearTimeout(greetWatchRef.current); greetWatchRef.current = null; } };
    // termina a saudação com TRANSIÇÃO: o overlay DISSOLVE (greetExit) e, ao
    // fim, a demo ENTRA com um zoom sutil (stageIn) e o tour começa.
    const endGreeting = () => {
        clearGreetWatch();
        if (greetExitRef.current) return; // já transicionando
        greetExitRef.current = true;
        setGreetExit(true);
        const t = window.setTimeout(() => {
            setGreeting(false);
            setGreetExit(false);
            greetExitRef.current = false;
            setStageIn(true);
            const t2 = window.setTimeout(() => setStageIn(false), 950);
            navTimersRef.current.push(t2);
            startStep(0);
        }, 640); // dura a dissolução do overlay
        navTimersRef.current.push(t);
    };
    // SAUDAÇÃO: a EVA se apresenta com o orbe grande antes do tour, reusando a
    // sessão de voz (1º turno). Ao terminar de falar (efeito de avanço) ou no
    // teto, o tour começa. Sem voz, passa direto pro tour (legenda).
    const startGreeting = () => {
        setGreeting(true);
        greetSpokeRef.current = false;
        if (live.status === "live") {
            const t = window.setTimeout(() => live.nudge(GREETING_PROMPT), 400);
            navTimersRef.current.push(t);
        }
        clearGreetWatch();
        greetWatchRef.current = window.setTimeout(endGreeting, live.status === "live" ? 17000 : 1100);
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
                    voiceName: "Achernar",
                    tools: TOOLS,
                    onToolCall: (name, args) => {
                        if (name === "navegar") {
                            const tela = String((args as { tela?: string }).tela || "");
                            // DURANTE o tour determinístico o SISTEMA controla as telas.
                            // O modelo às vezes chama navegar mesmo proibido (atropela a
                            // narração e embola). Só aceitamos navegar quando o tour
                            // ACABOU (-2) ou a pessoa está em Q&A (chat aberto).
                            const tourAtivo = tourIdxRef.current >= 0 && !chatOpenRef.current;
                            if (import.meta.env.DEV) console.debug("[demo] navegar →", tela, tourAtivo ? "(ignorado: tour ativo)" : "");
                            if (!tourAtivo && NAV_ENUM.includes(tela)) scheduleNav(tela);
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
    useEffect(() => () => { live.disconnect(); navTimersRef.current.forEach(clearTimeout); clearStepWatch(); clearSpeakTimer(); clearGreetWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // quando a EVA começa a falar: tira o "pensando", marca que narrou a tela,
    // conta a tela nesta sessão de voz e cancela o speak-check (não veio vazio).
    useEffect(() => {
        if (live.orbState !== "speaking") return;
        setWaiting(false);
        if (greetingRef.current) {
            if (!greetSpokeRef.current) { greetSpokeRef.current = true; telasNaSessaoRef.current += 1; clearSpeakTimer(); }
            return;
        }
        if (!stepSpokeRef.current) { stepSpokeRef.current = true; telasNaSessaoRef.current += 1; clearSpeakTimer(); }
    }, [live.orbState]);

    // COORDENADOR da voz: início do tour, RETOMADA após reconexão (renarra o passo
    // pendente) e RECONEXÃO REATIVA se a sessão cai no meio (1011 transitório).
    useEffect(() => {
        if (live.status === "live") {
            if (awaitingResumeRef.current) { awaitingResumeRef.current = false; narrateStep(resumeStepRef.current); return; }
            if (!tourStartedRef.current) { tourStartedRef.current = true; startGreeting(); } // saúda, depois o tour
            return;
        }
        if ((live.status === "ended" || live.status === "error") && tourStartedRef.current
            && tourIdxRef.current >= 0 && !awaitingResumeRef.current && reconnectsRef.current < MAX_RECONNECTS) {
            doReconnect(Math.max(0, tourIdxRef.current)); // sessão caiu → reconecta e retoma
        }
    }, [live.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // REDE DE SEGURANÇA: se a voz não conectar a tempo, conduz por legenda — a
    // demo nunca fica parada esperando a EVA. (Quedas no meio o coordenador cobre.)
    useEffect(() => {
        if (!appReady || tourStartedRef.current) return;
        const t = window.setTimeout(() => {
            if (!tourStartedRef.current) { tourStartedRef.current = true; startStep(0); }
        }, CONNECT_WAIT);
        return () => clearTimeout(t);
    }, [appReady]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // fim da SAUDAÇÃO: quando a EVA termina de se apresentar, começa o tour.
        if (greeting) {
            if (live.orbState === "listening" && greetSpokeRef.current && !live.userText.trim()) {
                const t = window.setTimeout(endGreeting, live.playbackLeadMs() + 700);
                return () => clearTimeout(t);
            }
            return;
        }
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
    }, [live.orbState, chatOpen, sched, live.userText, greeting]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const toggleMute = () => { primeEvaAudio(); const m = !muted; setMuted(m); live.setMuted(m); };
    const toggleMic = () => { primeEvaAudio(); live.setMicEnabled(!live.micOn); };
    const endCall = () => { tourIdxRef.current = -2; awaitingResumeRef.current = false; live.disconnect(); onDone(); };
    const voiceLive = live.status === "live";
    // estado do orbe: reflete o que a EVA está fazendo (fala/escuta/pensa).
    const liveOrb = live.status === "live" ? live.orbState : live.status === "connecting" ? "thinking" : "idle";
    // legenda do palco: a fala da EVA quando há voz; senão a legenda pré-escrita.
    const stageCaption = (voiceLive && capCurrent) ? capCurrent : capFallback;

    return (
        <div className="flex h-full flex-1 flex-col">
            <div className={`relative flex-1 ${stageIn ? "vz-stage-in" : ""}`} style={{ background: "#0b0d12" }}>
                <iframe ref={iframeRef} src="/embed-demo" title="Demonstração da Vyzon" allow="microphone" className="h-full w-full" style={{ border: 0, display: "block" }} />
                {!appReady && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--lp-paper)" }}>
                        <div className="flex flex-col items-center gap-4">
                            <EvaOrb state="thinking" size={120} />
                            <p className="text-[14px]" style={{ color: "rgba(5,5,5,0.6)" }}>Abrindo a Vyzon ao vivo…</p>
                        </div>
                    </div>
                )}

                {/* SAUDAÇÃO: momento de apresentação com o orbe grande, antes do
                    tour. Cobre o palco; sai quando a EVA termina de se apresentar. */}
                {appReady && greeting && (
                    <div className={`${greetExit ? "vz-greet-out" : "vz-greet-in"} absolute inset-0 z-30 flex flex-col items-center justify-center gap-7 px-6 text-center`} style={{ background: "var(--lp-paper)" }}>
                        <div className={live.orbState === "speaking" ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb state={liveOrb} size={210} />
                        </div>
                        <div className="max-w-xl">
                            <p className="lp-display" style={{ fontSize: "clamp(1.8rem,3.4vw,2.4rem)", color: "var(--lp-ink)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>EVA</p>
                            <p className="mx-auto mt-3 text-[16px]" style={{ color: "rgba(8,10,15,0.92)", lineHeight: 1.55, minHeight: 50, maxWidth: 520 }} aria-live="polite">
                                {live.evaText || "Oi! Só um instante, já começo…"}
                            </p>
                        </div>
                    </div>
                )}

                {/* LEGENDA + estado ao vivo sobre o palco (estilo Handhold): a EVA
                    "narra" o que está na tela; chip "ao vivo" no topo do bloco. */}
                {appReady && !greeting && !chatOpen && !sched && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2.5 px-4 pb-5 pt-20"
                        style={{ background: "linear-gradient(to top, rgba(8,9,12,0.62), rgba(8,9,12,0.18) 55%, transparent)" }}>
                        {/* orbe da EVA: anima quando ela fala (barras de voz + bounce) */}
                        <div className={live.orbState === "speaking" ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb state={liveOrb} size={58} />
                        </div>
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
