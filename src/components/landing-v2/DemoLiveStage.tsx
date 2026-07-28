import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Volume2, VolumeX, MessageSquare, PhoneOff } from "lucide-react";
import { EvaOrb } from "./EvaOrb";
import { useTourNarration } from "./useTourNarration";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/config/contact";
import { WhatsappGlyph } from "@/components/icons/WhatsappGlyph";
import { trackBehavior, claritySet, DEMO_EVENTS } from "@/lib/analytics";

// DEMO.C — contexto do site do visitante (edge demo-site-context), usado pra
// personalizar a saudação da EVA. Tudo opcional: sem contexto, demo genérica.
export interface DemoSiteContext {
    name: string | null;
    segment: string | null;
    oneliner: string | null;
}

// DEMO.NOLIVE.1 (2026-07-28) — o Gemini Live (voz conversacional que ESCUTA o
// lead) saiu da demo por decisão de produto: a escuta era a maior fonte de erro
// (sessão que cai, engasgo, mic bloqueado) e o custo de um agente conversacional
// não se paga numa demo pública. A EVA continua FALANDO, agora 100% ElevenLabs:
//   · cenas do tour → narração PRÉ-GERADA (public/demo-tour/, voz Sarah);
//   · saudação personalizada → edge eva-tts em runtime (mesma voz);
//   · perguntas do lead → TEXTO via edge eva-landing-chat (anônima, rate-limit),
//     com a resposta exibida e FALADA por TTS. Determinístico de ponta a ponta.
interface DemoLiveStageProps {
    onDone: () => void;
    site: string;
    siteCtx?: DemoSiteContext | null;
    // Quando o tour CONCLUI naturalmente, o pai assume (ex.: abrir o booking).
    // Se não vier, cai na conversa livre (fallback antigo).
    onTourEnd?: () => void;
}

// DEMO.A+B — tour em duas fases: 4 cenas CORE curtas e fixas (contexto → canal
// → diferencial → resultado), depois um MENU onde o visitante escolhe as áreas
// extras pelos chips. Ninguém assiste 9 cenas.
const CORE_ORDER = ["inicio", "inbox", "inbox-analise", "pipeline"];
const EXTRA_SCREENS = ["lead", "eva-studio", "eva-studio-criar", "metas", "ranking"];
const SCREEN_LABEL: Record<string, string> = { inicio: "Central de Comando", inbox: "Inbox", "inbox-analise": "Análise da EVA", pipeline: "Pipeline", lead: "Detalhe do lead", "eva-studio": "EVA Studio", "eva-studio-criar": "Criar agente", metas: "Metas", ranking: "Ranking" };

// telas pesadas demoram a montar — espera mais antes da narração começar,
// pra EVA não falar sobre uma tela ainda em loading/spinner.
const MOUNT_DELAY: Record<string, number> = { "eva-studio": 2000, "eva-studio-criar": 2600, "inbox-analise": 1100, lead: 1100 };

// Legenda pré-escrita por tela: mostrada imediatamente ao abrir a tela e usada
// como NARRAÇÃO de fallback quando o áudio não toca (sem assets/autoplay).
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

// Saudação FALADA (eva-tts em runtime): com contexto do site, ela cita o
// negócio da pessoa — o momento "ela me conhece". Sem contexto, genérica.
function buildGreetingText(ctx?: DemoSiteContext | null): string {
    if (ctx?.name) {
        return `Oi! Eu sou a EVA, a inteligência da Vyzon. Dei uma olhada no site da ${ctx.name} e preparei este tour pensando numa operação como a de vocês. Vem comigo!`;
    }
    return "Oi! Eu sou a EVA, a inteligência da Vyzon. Vou te mostrar rapidinho como a plataforma organiza o comercial de uma agência que vende por conversa. Vem comigo!";
}

const MENU_SPOKEN = "O que você quer ver de perto agora? É só tocar numa das áreas.";
const FREECHAT_WELCOME = "Adorei te mostrar a Vyzon! Me pergunta qualquer coisa aqui embaixo que eu respondo na hora.";

// teto absoluto de uma cena (anti-trava; o avanço normal é o onended do áudio)
const STEP_CEIL = 16000;
// dwell de cada tela quando o áudio não toca (fallback legenda)
const STEP_DWELL_NOVOICE = 7000;
// teto da saudação e piso de leitura quando o TTS falha
const GREET_CEIL = 11000;
const GREET_MIN_READ = 2600;

// botão de controle circular estilo Handhold (conversar · áudio · desligar)
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

interface ChatMsg { role: "user" | "assistant"; content: string }

export const DemoLiveStage = ({ onDone, site, siteCtx, onTourEnd }: DemoLiveStageProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [active, setActive] = useState("inicio");
    const [appReady, setAppReady] = useState(false);
    const [muted, setMuted] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [waiting, setWaiting] = useState(false);
    const [menu, setMenu] = useState(false);            // menu pós-core
    const [tourMode, setTourMode] = useState(false);    // cena roteirizada no ar
    const [visited, setVisited] = useState<string[]>([]); // extras já vistas (chips)
    const [capFallback, setCapFallback] = useState(SCREEN_CAPTION.inicio);
    const [greeting, setGreeting] = useState(false);   // saudação (orbe grande) antes do tour
    const [greetText, setGreetText] = useState("");
    const [greetExit, setGreetExit] = useState(false); // saudação dissolvendo
    const [stageIn, setStageIn] = useState(false);     // demo "entrando" (zoom sutil)
    const [freeChat, setFreeChat] = useState(false);   // conversa por texto no fim da demo
    const [speaking, setSpeaking] = useState(false);   // TTS tocando (anima o orbe)
    const [evaAnswer, setEvaAnswer] = useState("");    // última resposta do chat
    const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);

    const greetExitRef = useRef(false);
    const greetWatchRef = useRef<number | null>(null);
    const freeChatRef = useRef(false);
    const activeRef = useRef("inicio");
    const navTimersRef = useRef<number[]>([]);
    const lastTargetRef = useRef("inicio");
    const tourIdxRef = useRef(-1);      // -1 = não começou, -2 = concluído, -3 = menu, -4 = extra
    const tourStartedRef = useRef(false);
    const nudgedStepRef = useRef(-1);   // último passo já iniciado (anti-duplicação)
    const stepWatchRef = useRef<number | null>(null); // backstop do passo atual
    const chatOpenRef = useRef(false);
    const menuRef = useRef(false);
    const extraRef = useRef<string | null>(null);
    const narrActiveRef = useRef(false);
    const greetingRef = useRef(false);
    const chatMsgsRef = useRef<ChatMsg[]>([]);
    const mutedRef = useRef(false);
    const speakerRef = useRef<HTMLAudioElement | null>(null);
    const speakSeqRef = useRef(0);

    // narração PRÉ-GERADA (ElevenLabs) das cenas do tour
    const narr = useTourNarration(muted);

    useEffect(() => { narrActiveRef.current = narr.active; }, [narr.active]);
    // pessoa abriu o chat no meio da cena: pausa a narração; fechou, retoma.
    useEffect(() => { if (chatOpen) narr.pause(); else narr.resume(); }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
    useEffect(() => { menuRef.current = menu; }, [menu]);
    useEffect(() => { greetingRef.current = greeting; }, [greeting]);
    useEffect(() => { chatMsgsRef.current = chatMsgs; }, [chatMsgs]);
    useEffect(() => {
        mutedRef.current = muted;
        if (speakerRef.current) speakerRef.current.muted = muted;
    }, [muted]);

    // ── TTS em runtime (eva-tts, mesma voz Sarah da narração) ──
    const stopSpeak = () => {
        speakSeqRef.current += 1;
        const a = speakerRef.current;
        if (a) { a.onended = null; a.onerror = null; a.pause(); }
        setSpeaking(false);
    };
    /** Fala o texto pela edge eva-tts; resolve quando o áudio termina (ou de
     *  imediato se a voz falhar — a legenda sempre carrega o conteúdo). */
    const speak = async (text: string): Promise<boolean> => {
        const seq = ++speakSeqRef.current;
        try {
            const { data } = await supabase.functions.invoke("eva-tts", { body: { text: text.slice(0, 650) } });
            const b64 = (data as { ok?: boolean; audio_base64?: string } | null)?.audio_base64;
            if (!b64 || seq !== speakSeqRef.current) return false;
            const a = speakerRef.current ?? (speakerRef.current = new Audio());
            a.src = `data:audio/mp3;base64,${b64}`;
            a.muted = mutedRef.current;
            const played = await new Promise<boolean>((resolve) => {
                a.onended = () => resolve(true);
                a.onerror = () => resolve(false);
                a.play().then(() => setSpeaking(true)).catch(() => resolve(false));
            });
            if (seq === speakSeqRef.current) setSpeaking(false);
            return played;
        } catch {
            if (seq === speakSeqRef.current) setSpeaking(false);
            return false;
        }
    };

    const sendGoto = (screen: string) => {
        try { iframeRef.current?.contentWindow?.postMessage({ source: "vyzon-demo", action: "goto", screen }, window.location.origin); } catch { /* noop */ }
    };
    const sendInteractionLock = (locked: boolean) => {
        try {
            iframeRef.current?.contentWindow?.postMessage(
                { source: "vyzon-demo", action: "interaction-lock", locked },
                window.location.origin,
            );
        } catch { /* noop */ }
    };
    // Tour core (tourIdx >= 0): trava cliques do usuário no iframe. Menu/extras/pós-tour liberam.
    const setTourIdx = (i: number) => {
        tourIdxRef.current = i;
        sendInteractionLock(i >= 0);
    };
    const setScreen = (screen: string) => { activeRef.current = screen; setActive(screen); sendGoto(screen); };

    const clearStepWatch = () => { if (stepWatchRef.current) { clearTimeout(stepWatchRef.current); stepWatchRef.current = null; } };

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

    // TOUR CORE: abre a tela i e toca a narração pré-gerada.
    const startStep = (i: number) => {
        clearStepWatch();
        narr.stop();
        if (i < 0 || i >= CORE_ORDER.length) { enterMenu(false); return; }
        if (nudgedStepRef.current >= i) return;  // este passo já foi iniciado (anti-repetição)
        nudgedStepRef.current = i;
        setTourIdx(i);
        setTourMode(true);
        const screen = CORE_ORDER[i];
        lastTargetRef.current = screen;
        if (i === 0) trackBehavior(DEMO_EVENTS.DEMO_START, { source: "live_tour" });
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: i, screen });
        claritySet("eva_step", screen);
        setScreen(screen);
        setCapFallback(SCREEN_CAPTION[screen] || "");
        beginNarration(i, screen);
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

    // ── MENU (DEMO.B): a pessoa escolhe as áreas extras pelos chips ──
    const enterMenu = (returning: boolean) => {
        clearStepWatch();
        narr.stop();
        stopSpeak();
        extraRef.current = null;
        setTourIdx(-3);
        setTourMode(false);
        setMenu(true);
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: returning ? "menu_return" : "menu", screen: "menu" });
        claritySet("eva_step", "menu");
        if (!returning) void speak(MENU_SPOKEN);
    };

    // Toca UMA cena extra escolhida no menu e volta pro menu no onended.
    const playExtra = (screen: string) => {
        if (!EXTRA_SCREENS.includes(screen) && !CORE_ORDER.includes(screen)) return;
        clearStepWatch();
        narr.stop();
        stopSpeak();
        setMenu(false);
        extraRef.current = screen;
        setTourIdx(-4);
        setTourMode(true);
        setVisited((v) => (v.includes(screen) ? v : [...v, screen]));
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: "extra", screen });
        claritySet("eva_step", screen);
        lastTargetRef.current = screen;
        setScreen(screen);
        setCapFallback(SCREEN_CAPTION[screen] || "");
        const mount = MOUNT_DELAY[screen] ?? 750;
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
        // backstop: volta pro menu mesmo se o player falhar no meio
        stepWatchRef.current = window.setTimeout(() => {
            if (extraRef.current === screen && !narrActiveRef.current) enterMenu(true);
        }, STEP_CEIL + mount + 8000);
    };

    const clearGreetWatch = () => { if (greetWatchRef.current) { clearTimeout(greetWatchRef.current); greetWatchRef.current = null; } };
    // `target` permite pular a saudação DIRETO pra uma cena (clique no
    // progresso durante a apresentação); o padrão segue sendo a cena 0.
    const endGreeting = (target = 0) => {
        clearGreetWatch();
        if (greetExitRef.current) return; // já transicionando
        greetExitRef.current = true;
        stopSpeak();
        setGreetExit(true);
        const t = window.setTimeout(() => {
            setGreeting(false);
            setGreetExit(false);
            greetExitRef.current = false;
            setStageIn(true);
            const t2 = window.setTimeout(() => setStageIn(false), 950);
            navTimersRef.current.push(t2);
            if (target >= CORE_ORDER.length) enterMenu(false);
            else startStep(target);
        }, 640); // dura a dissolução do overlay
        navTimersRef.current.push(t);
    };
    // SAUDAÇÃO: a EVA se apresenta com o orbe grande (TTS em runtime, texto
    // personalizado pelo site). Ao terminar de falar (ou no teto), o tour começa.
    const startGreeting = () => {
        setGreeting(true);
        const text = buildGreetingText(siteCtx);
        setGreetText(text);
        clearGreetWatch();
        greetWatchRef.current = window.setTimeout(() => endGreeting(), GREET_CEIL);
        const startedAt = performance.now();
        void speak(text).then(() => {
            if (!greetingRef.current) return;
            // TTS falhou ou terminou: garante tempo mínimo de leitura da legenda
            const wait = Math.max(0, GREET_MIN_READ - (performance.now() - startedAt));
            const t = window.setTimeout(() => { if (greetingRef.current) endGreeting(); }, wait);
            navTimersRef.current.push(t);
        });
    };

    // CONVERSA por TEXTO (fim da demo): Q&A pela edge eva-landing-chat, com a
    // resposta exibida e falada por TTS. Sem escuta: zero chance de erro de mic.
    const enterFreeChat = () => {
        if (freeChatRef.current) return;
        freeChatRef.current = true;
        clearStepWatch();
        narr.stop();
        setFreeChat(true);
        setEvaAnswer(FREECHAT_WELCOME);
        void speak(FREECHAT_WELCOME);
    };

    // FIM DO TOUR: se o pai quer assumir (ex.: abrir o booking), entrega pra ele.
    const finishTour = () => {
        setTourIdx(-2);
        setTourMode(false);
        clearStepWatch();
        narr.stop();
        stopSpeak();
        if (onTourEnd) onTourEnd();
        else enterFreeChat();
    };

    // handshake: quando o app real fica pronto, saúda e o tour começa.
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const d = e.data;
            if (d?.source !== "vyzon-demo" || d?.event !== "ready") return;
            if (d.path && String(d.path).startsWith("/embed-demo")) return;
            setAppReady(true);
            setScreen(activeRef.current); // posiciona em "inicio"; o tour é dirigido pelo cliente
            sendInteractionLock(tourIdxRef.current >= 0); // re-sincroniza se o iframe remonta no meio do tour
            if (!tourStartedRef.current) { tourStartedRef.current = true; startGreeting(); }
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // limpa áudio e timers ao desmontar
    useEffect(() => () => { stopSpeak(); navTimersRef.current.forEach(clearTimeout); clearStepWatch(); clearGreetWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // fading da legenda ESTÁTICA: quando a frase da narração muda, a anterior
    // entra em dissolve.
    const [capFading, setCapFading] = useState<{ id: number; text: string }[]>([]);
    const capIdRef = useRef(0);
    const capTimersRef = useRef<number[]>([]);
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

    // envia a pergunta por texto (a EVA responde por texto + voz TTS)
    const sendChat = async () => {
        const q = draft.trim();
        if (!q || waiting) return;
        setDraft("");
        setWaiting(true);
        stopSpeak();
        const history = chatMsgsRef.current.slice(-6);
        setChatMsgs((m) => [...m, { role: "user", content: q }]);
        trackBehavior(DEMO_EVENTS.DEMO_CTA, { cta: "demo_chat_question" });
        try {
            const { data, error } = await supabase.functions.invoke("eva-landing-chat", {
                body: { question: q, history },
            });
            const answer = (!error && data && typeof (data as { answer?: string }).answer === "string")
                ? (data as { answer: string }).answer
                : "Não consegui responder agora. Me chama no WhatsApp que a gente te ajuda rapidinho.";
            setChatMsgs((m) => [...m, { role: "assistant", content: answer }]);
            setEvaAnswer(answer);
            setWaiting(false);
            void speak(answer);
        } catch {
            setWaiting(false);
            setEvaAnswer("Tive um problema pra responder. Tenta de novo em instantes.");
        }
    };

    const activeIdx = Math.max(0, CORE_ORDER.indexOf(active));
    const inMenuPhase = menu || !!extraRef.current;
    // Pulo dirigido pelo visitante (botão Pular ou clique no progresso).
    // Funciona de QUALQUER fase: dissolve a saudação se estiver na frente,
    // reseta menu/extra e posiciona na cena (ou abre o menu, no último ponto).
    const goManual = (i: number) => {
        setMenu(false);
        extraRef.current = null;
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: "skip_to", screen: CORE_ORDER[i] ?? "menu" });
        if (i < CORE_ORDER.length) nudgedStepRef.current = i - 1;
        if (greetingRef.current) { endGreeting(i); return; }
        if (i >= CORE_ORDER.length) { enterMenu(false); return; }
        startStep(i);
    };
    const toggleMute = () => setMuted((m) => !m);
    const endCall = () => { setTourIdx(-2); narr.stop(); stopSpeak(); onDone(); };
    // estado do orbe: fala (narração ou TTS) > pensando (chat) > repouso
    const orbState = (narr.active || speaking) ? "speaking" : waiting ? "thinking" : "idle";
    // legenda do palco: narração estática > pré-escrita
    const stageCaption = (narr.active && narr.caption.text) ? narr.caption.text : capFallback;

    return (
        <div className="relative flex h-full flex-1 flex-col">
            <div className={`relative flex-1 ${stageIn ? "vz-stage-in" : ""}`} style={{ background: "#0b0d12" }}>
                <iframe ref={iframeRef} src="/embed-demo" title="Demonstração da Vyzon" className="h-full w-full" style={{ border: 0, display: "block" }} />
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
                        <div className={speaking ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb state={speaking ? "speaking" : "thinking"} size={210} />
                        </div>
                        <div className="max-w-xl">
                            <p className="lp-display" style={{ fontSize: "clamp(1.8rem,3.4vw,2.4rem)", color: "var(--lp-ink)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>EVA</p>
                            {/* DEMO.PERSONAL.1: a leitura do site vira sinal VISÍVEL,
                                não só narração ("ela me conhece" na tela). */}
                            {siteCtx?.name && (
                                <p className="lp-mono mt-2" style={{ color: "var(--lp-blue)", fontSize: 11.5, letterSpacing: "0.14em" }}>
                                    TOUR PREPARADO PRA {siteCtx.name.toUpperCase()}
                                </p>
                            )}
                            <p className="mx-auto mt-3 text-[16px]" style={{ color: "rgba(8,10,15,0.92)", lineHeight: 1.55, minHeight: 50, maxWidth: 520 }} aria-live="polite">
                                {greetText || "Oi! Só um instante, já começo…"}
                            </p>
                        </div>
                        {/* DEMO.RITMO.1: quem tem pressa pula a apresentação */}
                        <button
                            type="button"
                            onClick={() => endGreeting()}
                            className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
                            style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)" }}
                        >
                            Pular apresentação →
                        </button>
                    </div>
                )}

                {/* LEGENDA + estado sobre o palco: a EVA "narra" o que está na tela. */}
                {appReady && !greeting && !chatOpen && !menu && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2.5 px-4 pb-5 pt-20"
                        style={{ background: "linear-gradient(to top, rgba(8,9,12,0.62), rgba(8,9,12,0.18) 55%, transparent)" }}>
                        <div className={(narr.active || speaking) ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb theme="dark" state={(narr.active || speaking) ? "speaking" : "idle"} size={58} />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="lp-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white"
                                style={{ background: "rgba(8,9,12,0.55)", backdropFilter: "blur(6px)", fontSize: 10.5, letterSpacing: "0.04em" }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--lp-live)" }} />
                                EVA · {SCREEN_LABEL[active] || active}
                            </span>
                            {/* DEMO.PERSONAL.1: leitura do site visível no palco inteiro */}
                            {siteCtx?.name && (
                                <span className="lp-mono hidden rounded-full px-2.5 py-1 sm:inline-flex"
                                    style={{ background: "rgba(21,86,192,0.75)", backdropFilter: "blur(6px)", color: "#fff", fontSize: 10.5, letterSpacing: "0.04em" }}>
                                    pra {siteCtx.name}
                                </span>
                            )}
                        </div>
                        <div className="relative w-full max-w-2xl text-center" style={{ minHeight: "2.7em" }} aria-live="polite">
                            {capFading.map((f) => (
                                <p key={f.id} className="vz-cap-out pointer-events-none absolute inset-x-0 top-0 line-clamp-2 text-[14.5px] font-medium leading-snug text-white">
                                    {f.text}
                                </p>
                            ))}
                            <p key={`${narr.caption.key}-${active}`} className="vz-cap-in line-clamp-2 text-[14.5px] font-medium leading-snug text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>
                                {stageCaption}
                            </p>
                        </div>
                    </div>
                )}

                {/* Modo conversa: a EVA "sai da demo" e responde POR TEXTO + voz TTS. */}
                {chatOpen && (
                    <div className="vz-demochat-in absolute inset-0 z-20 flex flex-col" style={{ background: "var(--lp-paper)" }}>
                        <div className="flex items-center justify-between px-5 py-3.5">
                            <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>EVA · tira-dúvidas</span>
                            <button type="button" onClick={() => setChatOpen(false)} className="rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)", fontWeight: 500 }}>
                                Voltar pra demo
                            </button>
                        </div>

                        {/* Palco: orb grande de frente + nome + resposta */}
                        <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center">
                            <div className={speaking ? "vz-orb-speaking" : "vz-orb-calm"}>
                                <EvaOrb state={orbState} size={232} />
                            </div>
                            <div className="max-w-xl">
                                <p className="lp-display" style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", color: "var(--lp-ink)", letterSpacing: "-0.025em", lineHeight: 1.1 }}>EVA</p>
                                <p className="mx-auto mt-3 text-[15.5px]" style={{ color: "rgba(8,10,15,0.92)", lineHeight: 1.55, minHeight: 50, maxWidth: 520 }} aria-live="polite">
                                    {waiting ? "pensando…" : (evaAnswer || "Digite sua dúvida aqui embaixo que eu respondo na hora.")}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendChat(); } }}
                                placeholder="Pergunte à EVA…"
                                className="vz-input-light flex-1"
                                aria-label="Sua pergunta pra EVA"
                            />
                            <button
                                type="button"
                                onClick={() => void sendChat()}
                                disabled={!draft.trim() || waiting}
                                aria-label="Enviar pergunta"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                                style={{ background: "var(--lp-blue)" }}
                            >
                                <ArrowUp size={18} strokeWidth={2.6} />
                            </button>
                        </div>
                    </div>
                )}

                {/* MENU (DEMO.B): a pessoa escolhe o que ver em seguida, por clique. */}
                {menu && !chatOpen && (
                    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pb-6 pt-24"
                        style={{ background: "linear-gradient(to top, rgba(8,9,12,0.78), rgba(8,9,12,0.30) 60%, transparent)" }}>
                        <div className={speaking ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb theme="dark" state={speaking ? "speaking" : "idle"} size={58} />
                        </div>
                        <p className="text-center text-[15px] font-medium text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.45)" }} aria-live="polite">
                            O que você quer ver de perto agora?
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

            {/* BARRA: progresso à esquerda, controles no centro, CTA à direita */}
            <div className="flex shrink-0 items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3" style={{ borderTop: "1px solid var(--lp-line)", background: "#fff" }}>
                {/* esquerda: progresso do tour CLICÁVEL (DEMO.RITMO.1) — cada ponto
                    pula pra cena; o último abre o menu. Some no mobile estreito. */}
                <div className="hidden min-w-0 flex-1 items-center sm:flex">
                    {CORE_ORDER.map((s, i) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => goManual(i)}
                            aria-label={`Ir pra ${SCREEN_LABEL[s]}`}
                            title={SCREEN_LABEL[s]}
                            className="group flex items-center px-[3px] py-2"
                        >
                            <span className="h-1.5 rounded-full transition-all group-hover:opacity-70" style={{ width: !inMenuPhase && i === activeIdx ? 18 : 6, background: inMenuPhase || i <= activeIdx ? "var(--lp-blue)" : "var(--lp-line)" }} />
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => goManual(CORE_ORDER.length)}
                        aria-label="Ir pro menu de áreas"
                        title="Escolher o que ver"
                        className="group flex items-center px-[3px] py-2"
                    >
                        <span className="h-1.5 rounded-full transition-all group-hover:opacity-70" style={{ width: inMenuPhase ? 18 : 6, background: inMenuPhase ? "var(--lp-blue)" : "var(--lp-line)" }} />
                    </button>
                </div>

                {/* centro: pílula de controles (conversar · áudio · encerrar) */}
                <div className="flex items-center gap-1 rounded-full px-1.5 py-1" style={{ background: "rgba(5,5,5,0.035)", border: "1px solid var(--lp-line)" }}>
                    <CtrlBtn onClick={() => setChatOpen(true)} label="Perguntar à EVA">
                        <MessageSquare size={18} />
                    </CtrlBtn>
                    <CtrlBtn onClick={toggleMute} active={muted} label={muted ? "Ativar som da EVA" : "Silenciar a EVA"}>
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </CtrlBtn>
                    <span className="mx-0.5 h-6 w-px" style={{ background: "var(--lp-line)" }} />
                    <CtrlBtn onClick={endCall} danger label="Encerrar demo">
                        <PhoneOff size={17} />
                    </CtrlBtn>
                </div>

                {/* direita: pular cena + CTA WhatsApp */}
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                    {/* DEMO.RITMO.1: o avanço manual fica SEMPRE disponível durante o
                        roteiro — ritmo é do visitante. */}
                    {tourMode && !inMenuPhase && (
                        <button type="button" onClick={() => goManual(activeIdx + 1)} className="hidden rounded-full px-4 py-1.5 text-[13px] text-white sm:inline-flex" style={{ background: "var(--lp-ink)", fontWeight: 600 }}>
                            Pular cena →
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

            {/* CONVERSA LIVRE (fim da demo): Q&A por texto com resposta falada. */}
            {freeChat && (
                <div className="vz-meshchat-in absolute inset-0 z-50 flex flex-col" style={{ background: "var(--lp-paper)" }}>
                    <div className="relative z-10 flex items-center justify-between px-5 py-3.5">
                        <span className="lp-mono inline-flex items-center gap-1.5" style={{ color: "var(--lp-ink-55)" }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--lp-live)" }} />
                            EVA · tira-dúvidas
                        </span>
                        <button type="button" onClick={endCall} className="rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)", fontWeight: 500 }}>
                            Encerrar
                        </button>
                    </div>

                    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center">
                        <div className={speaking ? "vz-orb-speaking" : "vz-orb-calm"}>
                            <EvaOrb state={orbState} size={232} />
                        </div>
                        <div className="relative w-full text-center" style={{ minHeight: 56, maxWidth: 560 }} aria-live="polite">
                            <p className="line-clamp-4 font-medium leading-snug" style={{ color: "var(--lp-ink-90)", fontSize: "clamp(1rem,2.4vw,1.15rem)" }}>
                                {waiting ? "pensando…" : (evaAnswer || "Pode me perguntar o que quiser sobre a Vyzon.")}
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 mx-auto flex w-full max-w-xl items-center gap-2 px-4 pb-6">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendChat(); } }}
                            placeholder="Pergunte à EVA…"
                            className="vz-input-light flex-1"
                            aria-label="Sua pergunta pra EVA"
                        />
                        <button
                            type="button"
                            onClick={() => void sendChat()}
                            disabled={!draft.trim() || waiting}
                            aria-label="Enviar pergunta"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
                            style={{ background: "var(--lp-blue)" }}
                        >
                            <ArrowUp size={18} strokeWidth={2.6} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
