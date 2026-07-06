import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Mic, MicOff, Volume2, VolumeX, MessageSquare, PhoneOff } from "lucide-react";
import { EvaOrb } from "./EvaOrb";
import { useGeminiLive, primeEvaAudio } from "./useGeminiLive";
import { useTourNarration } from "./useTourNarration";
import { whatsappUrl } from "@/config/contact";
import { WhatsappGlyph } from "@/components/icons/WhatsappGlyph";
import { trackBehavior, claritySet, DEMO_EVENTS } from "@/lib/analytics";

// DEMO.C — contexto do site do visitante (edge demo-site-context), usado pra
// personalizar a narração da EVA. Tudo opcional: sem contexto, demo genérica.
export interface DemoSiteContext {
    name: string | null;
    segment: string | null;
    oneliner: string | null;
}

// LP.8 (v2) — tour HÍBRIDO: o app real num iframe (/embed-demo) + duas vozes:
// (1) as CENAS roteirizadas (core + extras) tocam narração PRÉ-GERADA
// (ElevenLabs with-timestamps, public/demo-tour/) com legenda karaokê exata e
// avanço no onended — determinístico, sem watchdog de IA; (2) o Gemini Live
// fica só onde precisa ser vivo: saudação (personalizada pelo site), menu
// adaptativo (escolha por voz, tool navegar) e Q&A.
// Fallbacks: sem assets de áudio → legenda pré-escrita com dwell fixo; sem
// Live → a demo roda inteira mesmo assim (narração estática + chips).
interface DemoLiveStageProps {
    onDone: () => void;
    site: string;
    siteCtx?: DemoSiteContext | null;
    // Quando o tour CONCLUI naturalmente, o pai assume (ex.: abrir o booking).
    // Se não vier, cai na conversa livre (fallback antigo).
    onTourEnd?: () => void;
}

// DEMO.A+B — tour em duas fases: 4 cenas CORE curtas e fixas (contexto → canal
// → diferencial → resultado), depois um MENU adaptativo onde o visitante
// escolhe as áreas extras (por clique ou por voz). Ninguém assiste 9 cenas.
const CORE_ORDER = ["inicio", "inbox", "inbox-analise", "pipeline"];
const EXTRA_SCREENS = ["lead", "eva-studio", "eva-studio-criar", "metas", "ranking"];
const SCREEN_LABEL: Record<string, string> = { inicio: "Central de Comando", inbox: "Inbox", "inbox-analise": "Análise da EVA", pipeline: "Pipeline", lead: "Detalhe do lead", "eva-studio": "EVA Studio", "eva-studio-criar": "Criar agente", metas: "Metas", ranking: "Ranking" };
const NAV_ENUM = [...CORE_ORDER, ...EXTRA_SCREENS];

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

// Saudação inicial: a EVA se apresenta (momento visual com o orbe grande) ANTES
// do tour. Curta e calorosa; ao terminar, o tour começa sozinho. Com contexto
// do site (DEMO.C), ela cita o negócio da pessoa — o momento "ela me conhece".
function buildGreeting(ctx?: DemoSiteContext | null): string {
    const quem = ctx?.name
        ? ` A pessoa é da ${ctx.name}${ctx.segment ? ` (${ctx.segment})` : ""} — mencione isso com naturalidade e diga que preparou o tour pensando numa operação como a dela.`
        : "";
    return `Cumprimente a pessoa de forma calorosa e BREVE: diga oi, que você é a EVA, a inteligência da Vyzon, e que vai mostrar rapidinho como a plataforma organiza o comercial de uma agência.${quem} Termine convidando a começar, tipo 'vem comigo'. No máximo 3 frases curtas. Ao terminar, pare.`;
}

// MENU adaptativo (DEMO.B): depois das cenas core, a EVA pergunta o que a
// pessoa quer ver; escolha por voz (tool navegar) ou pelos chips na tela.
const MENU_PROMPT = "O tour principal terminou. Em 2 frases: diga que dá pra ver mais de perto o detalhe de uma oportunidade, os agentes da EVA, as metas ou o ranking, e pergunte o que a pessoa quer ver — ela pode falar com você ou tocar nos botões da tela. Quando ela pedir uma área, use navegar. Ao terminar, pare e escute.";
const MENU_RETURN_PROMPT = "Em 1 frase, pergunte se a pessoa quer ver mais alguma área ou seguir pro agendamento tocando em Continuar. Pare e escute.";

// Abertura da CONVERSA LIVRE (fim da demo): a EVA convida a pessoa a tirar
// dúvidas por voz; daqui em diante é Q&A sobre a Vyzon (sem mais navegar telas).
const FREECHAT_PROMPT = "O tour da plataforma acabou. Em 2 ou 3 frases calorosas, diga que adorou mostrar a Vyzon, reforce a ideia central com algo como 'eu aponto quem fechar, você decide o que fazer' e convide a pessoa a te perguntar QUALQUER dúvida agora, por voz, que você responde na hora. A partir daqui responda as perguntas dela sobre a Vyzon de forma simpática, consultiva e CURTA, e NÃO use a ferramenta navegar. Se ela quiser avançar, sugira agendar uma demo ou testar 14 dias grátis. Ao terminar de falar, pare e escute.";

// IMPORTANTE: manter system + tools ENXUTOS. O modelo native-audio (com
// thinkingBudget:0) retorna erro interno (WS close 1011) quando a SOMA de
// systemInstruction + descrições das tools passa de ~1.4k chars — reproduzido
// 3/3 em Node (system 871 + tools 1122 = 1011; reduzir qualquer um resolve).
// Esta versão soma ~1.3k e foi validada 3/3. NÃO voltar a inflar nenhum dos dois.
function buildSystem(site: string, ctx?: DemoSiteContext | null): string {
    // contexto do cliente COMPACTO (o teto de ~1.4k chars manda): nome + segmento
    // + uma frase; a personalização pesada vai nos nudges (fora do limite).
    const alvo = ctx?.name
        ? ` Cliente: ${ctx.name}${ctx.segment ? `, ${ctx.segment}` : ""}.${ctx.oneliner ? ` ${ctx.oneliner.slice(0, 110)}` : ""}`
        : site.trim() ? ` Você mostra a plataforma para ${site.trim()}.` : "";
    return [
        `Você é a EVA, a inteligência da Vyzon (Central Comercial com IA para agências que vendem por conversa). Fale sempre em português do Brasil, calorosa e consultiva, frases curtas.${alvo}`,
        `O tour das telas é narrado por um áudio do sistema: NÃO narre telas por conta própria e não use navegar durante o tour. No MENU final, pergunte o que a pessoa quer ver e use navegar quando ela pedir uma área.`,
        `Se a pessoa perguntar algo, responda e pare. Para agendar uma demo com o time, diga que é só tocar em Continuar na tela. Você não envia links nem e-mails.`,
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
    ],
}];

// teto absoluto que uma tela pode ficar no ar quando a voz CONDUZ (anti-trava):
// se a EVA não terminar de narrar nesse tempo, o tour avança mesmo assim.
const STEP_CEIL = 22000;
// quanto tempo cada tela fica no ar quando a voz NÃO conduz (fallback legenda).
const STEP_DWELL_NOVOICE = 9000;
// quanto esperar a voz conectar antes de conduzir o tour por legenda.
const CONNECT_WAIT = 13000;
// RESILIÊNCIA da voz — SESSÃO CONTÍNUA (validado em Node, 8/9 telas numa sessão só):
// o native-audio às vezes devolve turno VAZIO quando o contexto acumula, mas a
// sessão NÃO cai. Em vez de reconectar por tela (que apagava a memória e criava
// gaps), o speak-check faz RE-NUDGE na MESMA sessão — recupera a maioria dos vazios
// mantendo o contexto (memória → conversa). Reconexão só como ÚLTIMO recurso.
const MAX_RECONNECTS = 8;     // teto de reconexões do Live (anti-loop)

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

export const DemoLiveStage = ({ onDone, site, siteCtx, onTourEnd }: DemoLiveStageProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [active, setActive] = useState("inicio");
    const [appReady, setAppReady] = useState(false);
    const [muted, setMuted] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [waiting, setWaiting] = useState(false);
    const [menu, setMenu] = useState(false);            // menu adaptativo pós-core
    const [tourMode, setTourMode] = useState(false);    // cena roteirizada no ar (legenda do Live não entra)
    const [visited, setVisited] = useState<string[]>([]); // extras já vistas (chips)
    const [capFallback, setCapFallback] = useState(SCREEN_CAPTION.inicio);
    const [greeting, setGreeting] = useState(false); // momento de saudação (orbe grande) antes do tour
    const [greetExit, setGreetExit] = useState(false); // saudação dissolvendo (transição pra demo)
    const [stageIn, setStageIn] = useState(false);     // demo "entrando" (zoom sutil)
    const [freeChat, setFreeChat] = useState(false);   // conversa livre (mesh gradient) no fim da demo
    const greetSpokeRef = useRef(false);
    const greetExitRef = useRef(false);
    const greetWatchRef = useRef<number | null>(null);
    const freeChatRef = useRef(false);
    const awaitingFreeChatRef = useRef(false); // reconectando pra abrir a conversa livre
    const connectedRef = useRef(false);
    const activeRef = useRef("inicio");
    const navTimersRef = useRef<number[]>([]);
    const lastTargetRef = useRef("inicio");
    const tourIdxRef = useRef(-1);      // -1 = não começou, -2 = concluído
    const tourStartedRef = useRef(false);
    const nudgedStepRef = useRef(-1);   // último passo já iniciado (anti-duplicação)
    const stepWatchRef = useRef<number | null>(null); // backstop do passo atual
    const chatOpenRef = useRef(false);  // refs lidas dentro do watchdog (sem closure stale)
    const menuRef = useRef(false);
    const extraRef = useRef<string | null>(null); // extra tocando agora (modo menu)
    const narrActiveRef = useRef(false);
    const reconnectsRef = useRef(0);      // total de reconexões do Live (anti-loop)
    const live = useGeminiLive();
    // narracao PRE-GERADA (ElevenLabs) das cenas do tour: o Live nao narra mais
    // o roteiro; ele fica com a saudacao, o menu e o Q&A.
    const narr = useTourNarration(muted);

    const greetingRef = useRef(false);
    useEffect(() => { narrActiveRef.current = narr.active; }, [narr.active]);
    // pessoa abriu o chat no meio da cena: pausa a narração; fechou, retoma.
    useEffect(() => { if (chatOpen) narr.pause(); else narr.resume(); }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
    useEffect(() => { menuRef.current = menu; }, [menu]);
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

    // reconecta o Live numa sessão fresca (recupera de 1011). A narração do
    // tour é ESTÁTICA e não depende dele; reconectamos só pra ter a EVA viva
    // no menu e no Q&A.
    const doReconnect = () => {
        reconnectsRef.current += 1;
        live.reconnect();
    };

    // Toca a narração pré-gerada da cena; sem assets/autoplay bloqueado,
    // conduz por legenda com dwell fixo. O avanço é o onended do áudio.
    const beginNarration = (i: number, screen: string) => {
        const mount = MOUNT_DELAY[screen] ?? 750;
        const t = window.setTimeout(async () => {
            if (tourIdxRef.current !== i) return;
            const ok = await narr.play(screen, () => {
                if (tourIdxRef.current !== i) return;
                const t2 = window.setTimeout(() => {
                    // chat aberto: o backstop (que espera o chat fechar) avança depois
                    if (tourIdxRef.current === i && !chatOpenRef.current) startStep(i + 1);
                }, 450);
                navTimersRef.current.push(t2);
            });
            if (!ok && tourIdxRef.current === i) {
                const t3 = window.setTimeout(() => {
                    if (tourIdxRef.current === i && !chatOpenRef.current) startStep(i + 1);
                }, STEP_DWELL_NOVOICE);
                navTimersRef.current.push(t3);
            }
        }, mount);
        navTimersRef.current.push(t);
    };

    // TOUR CORE: abre a tela i e toca a narração pré-gerada; o avanço é o
    // onended do áudio. O backstop só cobre falha inesperada do player.
    const startStep = (i: number) => {
        clearStepWatch();
        narr.stop();
        if (i < 0 || i >= CORE_ORDER.length) { enterMenu(false); return; }
        if (nudgedStepRef.current >= i) return;  // este passo já foi iniciado (anti-repetição)
        nudgedStepRef.current = i;
        tourIdxRef.current = i;
        setTourMode(true);
        const screen = CORE_ORDER[i];
        lastTargetRef.current = screen;
        // Analytics: a EVA está apresentando esta tela. Marca o passo em GA4 +
        // Clarity (tag eva_step) pra medir onde a pessoa larga o roteiro guiado.
        if (i === 0) trackBehavior(DEMO_EVENTS.DEMO_START, { source: "live_tour" });
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: i, screen });
        claritySet("eva_step", screen);
        // SYNC tela↔fala: a tela (e a legenda) só trocam quando o áudio da cena
        // ANTERIOR terminar de TOCAR (afterSpeech) — senão a narração velha roda
        // por cima da tela nova (ex.: fala da conversa com o pipeline na tela).
        afterSpeech(() => {
            if (tourIdxRef.current !== i) return; // backstop já avançou
            setScreen(screen);
            setCapFallback(SCREEN_CAPTION[screen] || "");
            beginNarration(i, screen);
        });
        // BACKSTOP anti-trava (falha inesperada do player): teto folgado acima
        // da maior cena; espera o chat/áudio antes de forçar o avanço.
        const ceil = STEP_CEIL + (MOUNT_DELAY[screen] ?? 750) + 6000;
        const tick = () => {
            if (tourIdxRef.current !== i) return;
            if (chatOpenRef.current || narrActiveRef.current) { stepWatchRef.current = window.setTimeout(tick, 4000); return; }
            startStep(i + 1);
        };
        stepWatchRef.current = window.setTimeout(tick, ceil);
    };

    // ── MENU ADAPTATIVO (DEMO.B): a pessoa escolhe as áreas extras ──
    // tourIdxRef: -3 = menu aberto, -4 = extra tocando.
    const enterMenu = (returning: boolean) => {
        clearStepWatch();
        narr.stop();
        extraRef.current = null;
        tourIdxRef.current = -3;
        setTourMode(false);
        setMenu(true);
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: returning ? "menu_return" : "menu", screen: "menu" });
        claritySet("eva_step", "menu");
        if (live.status === "live") {
            live.nudge(returning ? MENU_RETURN_PROMPT : MENU_PROMPT);
            live.setMicEnabled(true); // escolha por voz
        }
    };

    // Toca UMA cena extra escolhida no menu (narração pré-gerada) e volta pro
    // menu no onended do áudio.
    const playExtra = (screen: string) => {
        if (!EXTRA_SCREENS.includes(screen) && !CORE_ORDER.includes(screen)) return;
        clearStepWatch();
        narr.stop();
        setMenu(false);
        extraRef.current = screen;
        tourIdxRef.current = -4;
        setTourMode(true);
        setVisited((v) => (v.includes(screen) ? v : [...v, screen]));
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: "extra", screen });
        claritySet("eva_step", screen);
        lastTargetRef.current = screen;
        const mount = MOUNT_DELAY[screen] ?? 750;
        // SYNC: espera a fala do menu (Live) drenar antes de trocar a tela.
        afterSpeech(() => {
            if (extraRef.current !== screen) return;
            setScreen(screen);
            setCapFallback(SCREEN_CAPTION[screen] || "");
            const t = window.setTimeout(async () => {
                if (extraRef.current !== screen) return;
                const ok = await narr.play(screen, () => {
                    if (extraRef.current === screen) enterMenu(true);
                });
                if (!ok && extraRef.current === screen) {
                    const t2 = window.setTimeout(() => { if (extraRef.current === screen) enterMenu(true); }, STEP_DWELL_NOVOICE);
                    navTimersRef.current.push(t2);
                }
            }, mount);
            navTimersRef.current.push(t);
        });
        // backstop: volta pro menu mesmo se o player falhar no meio
        stepWatchRef.current = window.setTimeout(() => {
            if (extraRef.current === screen && !narrActiveRef.current) enterMenu(true);
        }, STEP_CEIL + mount + 8000);
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
            const t = window.setTimeout(() => live.nudge(buildGreeting(siteCtx)), 400);
            navTimersRef.current.push(t);
        }
        clearGreetWatch();
        greetWatchRef.current = window.setTimeout(endGreeting, live.status === "live" ? 17000 : 1100);
    };

    // CONVERSA LIVRE (fim da demo): tela de mesh gradient + Q&A por voz. Abre
    // numa sessão FRESCA (sem o contexto do tour) e liga o microfone pra ela
    // ouvir a pessoa. Sem voz, só mostra a tela (input de texto ainda funciona).
    const openFreeChatTurn = () => {
        if (live.status !== "live") return;
        live.nudge(FREECHAT_PROMPT);
        live.setMicEnabled(true);
    };
    const enterFreeChat = () => {
        if (freeChatRef.current) return;
        freeChatRef.current = true;
        clearStepWatch();
        narr.stop();
        setFreeChat(true);
        if (live.status === "live" && reconnectsRef.current < MAX_RECONNECTS) {
            reconnectsRef.current += 1;
            awaitingFreeChatRef.current = true;
            live.reconnect();          // sessão limpa; o coordenador abre o Q&A ao voltar "live"
        } else {
            openFreeChatTurn();
        }
    };

    // FIM DO TOUR: se o pai quer assumir (ex.: abrir o booking), entrega pra ele
    // e desconecta a voz; senão cai na conversa livre (fallback antigo).
    const finishTour = () => {
        tourIdxRef.current = -2;
        setTourMode(false);
        clearStepWatch();
        narr.stop();
        if (onTourEnd) { try { live.disconnect(); } catch { /* noop */ } onTourEnd(); }
        else enterFreeChat();
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
                    systemInstruction: buildSystem(site, siteCtx),
                    voiceName: "Achernar",
                    tools: TOOLS,
                    onToolCall: (name, args) => {
                        if (name === "navegar") {
                            const tela = String((args as { tela?: string }).tela || "");
                            // DURANTE o tour core o SISTEMA controla as telas (o modelo
                            // às vezes chama navegar mesmo proibido). No MENU (-3) ou
                            // extra (-4) a escolha por voz toca a cena escolhida; no
                            // pós-tour (-2)/Q&A só troca a tela.
                            const tourAtivo = tourIdxRef.current >= 0 && !chatOpenRef.current;
                            if (import.meta.env.DEV) console.debug("[demo] navegar →", tela, tourAtivo ? "(ignorado: tour ativo)" : "");
                            if (tourAtivo || !NAV_ENUM.includes(tela)) return "ok";
                            if (menuRef.current || extraRef.current) playExtra(tela);
                            else scheduleNav(tela);
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
    useEffect(() => () => { live.disconnect(); navTimersRef.current.forEach(clearTimeout); clearStepWatch(); clearGreetWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // quando o Live começa a falar: tira o "pensando" e marca a saudação.
    useEffect(() => {
        if (live.orbState !== "speaking") return;
        setWaiting(false);
        if (greetingRef.current && !greetSpokeRef.current) greetSpokeRef.current = true;
    }, [live.orbState]);

    // COORDENADOR do Live: dispara a saudação na 1ª conexão e reconecta em
    // segundo plano se a sessão cair (a narração do tour é estática e segue
    // sozinha; o Live só precisa estar de pé pro menu e pro Q&A).
    useEffect(() => {
        if (live.status === "live") {
            if (awaitingFreeChatRef.current) { awaitingFreeChatRef.current = false; openFreeChatTurn(); return; }
            if (!tourStartedRef.current) { tourStartedRef.current = true; startGreeting(); } // saúda, depois o tour
            return;
        }
        if (live.status === "ended" || live.status === "error") {
            if (reconnectsRef.current >= MAX_RECONNECTS) return;
            if (freeChatRef.current && !awaitingFreeChatRef.current) {     // caiu na conversa → reabre
                reconnectsRef.current += 1; awaitingFreeChatRef.current = true; live.reconnect(); return;
            }
            if (tourStartedRef.current && tourIdxRef.current !== -2) doReconnect();
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

    // LEGENDA AO VIVO (voz), SINCRONIZADA COM O ÁUDIO — POR MEDIÇÃO, não por
    // estimativa: o transcript chega INTERCALADO com os chunks de áudio, então
    // no instante em que o texto da frase K começa a existir, o áudio já
    // agendado (playbackLeadMs) termina ~exatamente onde a fala de K começa.
    // Cada frase é agendada pra ESSE momento medido; se o texto chegar em
    // rajada (leads iguais), um piso estimado (~62ms/char da frase anterior)
    // garante a ordem. A frase em exibição é um ÍNDICE — o texto dela é
    // derivado do transcript corrente, então completa sozinha enquanto chega.
    const [capShownIdx, setCapShownIdx] = useState(-1);
    const [capKey, setCapKey] = useState(0);
    const [capFading, setCapFading] = useState<{ id: number; text: string }[]>([]);
    const capQueuedRef = useRef(0);      // frases já agendadas neste turno
    const capPlanRef = useRef<number[]>([]); // displayAt (performance.now) por frase
    const capIdRef = useRef(0);
    const capTimersRef = useRef<number[]>([]);
    const clearCapTimers = () => { capTimersRef.current.forEach(clearTimeout); capTimersRef.current = []; };
    const promoteCaption = (idx: number) => {
        setCapShownIdx((prevIdx) => {
            if (idx <= prevIdx) return prevIdx;
            const prevText = splitSentences(live.evaText)[prevIdx];
            if (prevText) {
                const id = ++capIdRef.current;
                setCapFading((f) => [...f.slice(-1), { id, text: prevText }]); // no máx. 1 dissolvendo
                const tm = window.setTimeout(() => setCapFading((f) => f.filter((x) => x.id !== id)), 2300);
                capTimersRef.current.push(tm);
            }
            return idx;
        });
        setCapKey((k) => k + 1); // anima só a entrada de frase nova
    };
    useEffect(() => {
        const full = live.evaText;
        if (!full) {
            // turno novo: zera fila, timers e exibição
            clearCapTimers();
            capQueuedRef.current = 0;
            capPlanRef.current = [];
            setCapShownIdx(-1);
            return;
        }
        const sentences = splitSentences(full);
        const now = performance.now();
        while (capQueuedRef.current < sentences.length) {
            const idx = capQueuedRef.current;
            capQueuedRef.current += 1;
            // MEDIDO: o áudio pendente AGORA termina ~onde a fala desta frase começa
            const measured = now + live.playbackLeadMs();
            const prevAt = capPlanRef.current[idx - 1] ?? 0;
            const prevEst = idx > 0 ? Math.min(6000, Math.max(700, sentences[idx - 1].length * 62)) : 0;
            const at = Math.max(measured, prevAt + prevEst);
            capPlanRef.current[idx] = at;
            const tm = window.setTimeout(() => promoteCaption(idx), Math.max(0, at - now));
            capTimersRef.current.push(tm);
        }
    }, [live.evaText]); // eslint-disable-line react-hooks/exhaustive-deps
    // texto da frase em exibição, derivado do transcript corrente (Live)
    const capCurrent = capShownIdx >= 0 ? (splitSentences(live.evaText)[capShownIdx] ?? "") : "";

    // fading também para a legenda ESTÁTICA: quando a frase da narração muda,
    // a anterior entra em dissolve (mesma lista capFading do Live).
    const prevNarrRef = useRef("");
    useEffect(() => {
        const cur = narr.caption.text;
        const prev = prevNarrRef.current;
        prevNarrRef.current = cur;
        if (prev && cur && prev !== cur) {
            const id = ++capIdRef.current;
            setCapFading((f) => [...f.slice(-1), { id, text: prev }]);
            const tm = window.setTimeout(() => setCapFading((f) => f.filter((x) => x.id !== id)), 2300);
            capTimersRef.current.push(tm);
        }
    }, [narr.caption.key]); // eslint-disable-line react-hooks/exhaustive-deps
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
        // (o avanço das cenas core/extras agora é o onended da narração estática)
    }, [live.orbState, chatOpen, live.userText, greeting]); // eslint-disable-line react-hooks/exhaustive-deps

    // envia a pergunta por texto (a EVA responde por voz + texto)
    const sendChat = () => {
        const t = draft.trim();
        if (!t || live.status !== "live") return;
        setDraft("");
        setWaiting(true);
        live.sendText(t);
    };

    const activeIdx = Math.max(0, CORE_ORDER.indexOf(active));
    const inMenuPhase = menu || !!extraRef.current;
    const manual = live.status === "error" || (appReady && live.status === "idle");
    const goManual = (i: number) => { if (i >= CORE_ORDER.length) enterMenu(false); else { nudgedStepRef.current = i - 1; startStep(i); } };
    const toggleMute = () => { primeEvaAudio(); const m = !muted; setMuted(m); live.setMuted(m); };
    const toggleMic = () => { primeEvaAudio(); live.setMicEnabled(!live.micOn); };
    const endCall = () => { tourIdxRef.current = -2; narr.stop(); live.disconnect(); onDone(); };
    const voiceLive = live.status === "live";
    // estado do orbe: reflete o que a EVA está fazendo (fala/escuta/pensa).
    const liveOrb = live.status === "live" ? live.orbState : live.status === "connecting" ? "thinking" : "idle";
    // legenda do palco: narração estática (tour) > pré-escrita (gaps do tour) >
    // fala do Live (menu/Q&A) > pré-escrita. Durante o roteiro a legenda do
    // Live NUNCA entra (senão sobra fala velha da saudação nos gaps).
    const stageCaption = (narr.active && narr.caption.text)
        ? narr.caption.text
        : tourMode ? capFallback
        : (voiceLive && capCurrent) ? capCurrent : capFallback;

    return (
        <div className="relative flex h-full flex-1 flex-col">
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
                {appReady && !greeting && !chatOpen && !menu && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2.5 px-4 pb-5 pt-20"
                        style={{ background: "linear-gradient(to top, rgba(8,9,12,0.62), rgba(8,9,12,0.18) 55%, transparent)" }}>
                        {/* orbe da EVA: anima quando ela fala (narração estática ou Live) */}
                        <div className={(narr.active || live.orbState === "speaking") ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb webgl state={narr.active ? "speaking" : liveOrb} size={58} />
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
                            <p key={`${capKey}-${narr.caption.key}-${active}`} className="vz-cap-in line-clamp-2 text-[14.5px] font-medium leading-snug text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>
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

            {/* MENU ADAPTATIVO (DEMO.B): a pessoa escolhe o que ver em seguida —
                por clique ou falando com a EVA (mic ligado). */}
            {menu && !chatOpen && (
                <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pb-6 pt-24"
                    style={{ background: "linear-gradient(to top, rgba(8,9,12,0.78), rgba(8,9,12,0.30) 60%, transparent)" }}>
                    <div className={live.orbState === "speaking" ? "vz-orb-speaking" : "vz-orb-calm"}>
                        <EvaOrb webgl state={liveOrb} size={58} />
                    </div>
                    <p className="text-center text-[15px] font-medium text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }} aria-live="polite">
                        {(voiceLive && capCurrent) ? capCurrent : "O que você quer ver de perto agora?"}
                    </p>
                    <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
                        {EXTRA_SCREENS.map((sc) => (
                            <button
                                key={sc}
                                type="button"
                                onClick={() => playExtra(sc)}
                                className="rounded-full px-3.5 py-2 text-[13px] font-medium transition-transform hover:scale-[1.04] active:scale-95"
                                style={{
                                    background: visited.includes(sc) ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.92)",
                                    color: "#0D1421",
                                }}
                            >
                                {visited.includes(sc) ? "✓ " : ""}{SCREEN_LABEL[sc]}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={finishTour}
                        className="mt-1 rounded-full px-6 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
                        style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.25)" }}
                    >
                        Continuar → agendar minha demo
                    </button>
                </div>
            )}
            </div>

            {/* BARRA HANDHOLD: progresso à esquerda, controles circulares no centro
                (conversar · mic · áudio · desligar), CTA "Falar com a gente" à direita */}
            <div className="flex shrink-0 items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                {/* esquerda: progresso do tour (some no mobile estreito) */}
                <div className="hidden min-w-0 flex-1 items-center gap-1.5 sm:flex">
                    {CORE_ORDER.map((s, i) => (
                        <span key={s} className="h-1.5 rounded-full transition-all" style={{ width: !inMenuPhase && i === activeIdx ? 18 : 6, background: inMenuPhase || i <= activeIdx ? "var(--lp-blue)" : "var(--lp-line)" }} />
                    ))}
                    <span className="h-1.5 rounded-full transition-all" style={{ width: inMenuPhase ? 18 : 6, background: inMenuPhase ? "var(--lp-blue)" : "var(--lp-line)" }} />
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
                            {activeIdx >= CORE_ORDER.length - 1 ? "Concluir" : "Próximo"}
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

            {/* CONVERSA LIVRE (fim da demo): tela imersiva de MESH GRADIENT + Q&A
                por voz. A EVA convida a perguntar; mic ligado + input de texto. */}
            {freeChat && (
                <div className="vz-meshchat-in absolute inset-0 z-50 flex flex-col" style={{ background: "var(--lp-paper)" }}>
                    <div className="relative z-10 flex items-center justify-between px-5 py-3.5">
                        <span className="lp-mono inline-flex items-center gap-1.5" style={{ color: "var(--lp-ink-55)" }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: voiceLive ? "var(--lp-live)" : "var(--lp-ink-40)" }} />
                            EVA · ao vivo
                        </span>
                        <button type="button" onClick={endCall} className="rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)", fontWeight: 500 }}>
                            Encerrar
                        </button>
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center">
                        <div className={live.orbState === "speaking" ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb state={liveOrb} size={232} />
                        </div>
                        {/* Legenda frase-a-frase (MESMO padrão do tour: a anterior dissolve) */}
                        <div className="relative w-full text-center" style={{ minHeight: 56, maxWidth: 560 }} aria-live="polite">
                            {voiceLive && capFading.map((f) => (
                                <p key={f.id} className="vz-cap-out pointer-events-none absolute inset-x-0 top-0 line-clamp-2 font-medium leading-snug" style={{ color: "var(--lp-ink-90)", fontSize: "clamp(1rem,2.4vw,1.15rem)" }}>
                                    {f.text}
                                </p>
                            ))}
                            <p key={`free-${capKey}`} className="vz-cap-in line-clamp-3 font-medium leading-snug" style={{ color: "var(--lp-ink-90)", fontSize: "clamp(1rem,2.4vw,1.15rem)" }}>
                                {waiting ? "pensando…" : (live.userText.trim() ? `Você: ${live.userText}` : (capCurrent || "Pode me perguntar o que quiser sobre a Vyzon."))}
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 mx-auto flex w-full max-w-xl items-center gap-2 px-4">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
                            placeholder={voiceLive ? "Pergunte à EVA…" : "Conectando…"}
                            disabled={!voiceLive}
                            aria-label="Sua pergunta pra EVA"
                            className="vz-meshchat-input flex-1 rounded-full px-4 py-3 text-[14px] outline-none"
                            style={{ background: "rgba(5,5,5,0.04)", border: "1px solid var(--lp-line)", color: "var(--lp-ink-90)" }}
                        />
                        <button type="button" onClick={sendChat} disabled={!draft.trim() || !voiceLive} aria-label="Enviar pergunta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40" style={{ background: "var(--lp-blue)" }}>
                            <ArrowUp size={18} strokeWidth={2.6} />
                        </button>
                        <button type="button" onClick={toggleMic} disabled={!voiceLive} aria-pressed={live.micOn} aria-label={live.micOn ? "Desligar microfone" : "Falar com a EVA"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40" style={{ background: live.micOn ? "var(--lp-blue)" : "rgba(5,5,5,0.05)", color: live.micOn ? "#fff" : "var(--lp-ink-90)" }}>
                            {live.micOn ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                    </div>

                    <div className="relative z-10 mb-5 mt-3 flex justify-center">
                        <button type="button" onClick={endCall} className="rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95" style={{ background: "var(--lp-ink)" }}>
                            Concluir e agendar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
