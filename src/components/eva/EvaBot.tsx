import { useEffect, useRef, useState, type ReactNode } from "react";
import "./evaBot.css";

// A Lume como bot montado por peças: corpo, topo, olhos e cor. O padrão é a
// cápsula azul com placa solar. Desenho e loops em CSS; aqui fica só o que precisa
// de JS: encaixe no tamanho, olhos seguindo o ponteiro e o pulinho de troca de estado.
//   idle      esperando, respira, pisca e olha em volta (sorri com o mouse em cima)
//   thinking  lendo as conversas, olhos varrem e uma onda passa pelo painel
//   pondering pensando: olha pra cima e solta bolinhas de pensamento
//   alert     achou proposta parada, pulinho e células do painel acesas
//   talking   escrevendo a retomada, boquinha de digitando
//   happy     retomada enviada ou negócio fechado, olhos em arco e painel aceso
export type EvaBotState = "idle" | "thinking" | "pondering" | "alert" | "talking" | "happy";
export type EvaBotCorpo = "capsula" | "bolinha" | "tela";
export type EvaBotTopo = "placa" | "capacete" | "fone" | "antena" | "nada";
export type EvaBotOlhos = "pilula" | "bolinha" | "pixel";
export type EvaBotTema = "vyzon" | "noite" | "sol" | "empresa";

// Largura do corpo e centro dele na caixa de 240 do desenho (ver evaBot.css).
const CORPOS: Record<EvaBotCorpo, { w: number; cx: number; cy: number }> = {
    capsula: { w: 192, cx: 120, cy: 150 },
    bolinha: { w: 168, cx: 120, cy: 148 },
    tela: { w: 200, cx: 120, cy: 140 },
};

// Abaixo de 48px topo e orelhas viram ruído; abaixo de 28px o visor também. Nesses
// tamanhos o corpo ocupa o quadro inteiro.
function encaixe(size: number, corpo: EvaBotCorpo) {
    const tam = size <= 28 ? "minimo" : size <= 48 ? "pequeno" : "cheio";
    if (tam === "cheio") return { tam, k: size / 240, tx: 0, ty: 0 };
    const b = CORPOS[corpo];
    const k = size / (b.w + 8);
    return { tam, k, tx: size / 2 - b.cx * k, ty: size / 2 - b.cy * k };
}

// Nomes de estado que telas e hooks mais antigos ainda usam.
const LEGACY: Record<string, EvaBotState> = {
    listening: "idle",
    working: "thinking",
    searching: "thinking",
    solving: "thinking",
    shaping: "thinking",
    analyzing: "thinking",
    composing: "talking",
    speaking: "talking",
    done: "happy",
};
export function evaBotFrom(state: string | null | undefined): EvaBotState {
    if (!state) return "idle";
    if (state in LEGACY) return LEGACY[state];
    return (["idle", "thinking", "pondering", "alert", "talking", "happy"] as const).includes(state as EvaBotState) ? (state as EvaBotState) : "idle";
}

// Um só ouvinte de ponteiro para todas as EVAs da tela.
const pointer = { x: 0, y: 0, t: 0 };
let listening = false;
function listenPointer() {
    if (listening || typeof window === "undefined") return;
    listening = true;
    window.addEventListener(
        "pointermove",
        (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            pointer.t = performance.now();
        },
        { passive: true },
    );
}

const canMove = () =>
    typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function EvaBot({
    state = "idle",
    size = 40,
    still = false,
    className = "",
    label,
    corpo = "capsula",
    topo = "placa",
    olhos = "pilula",
    tema = "vyzon",
    corEmpresa,
}: {
    state?: EvaBotState;
    size?: number;
    /** Sem loop nem olhar seguindo: para listas com muitos itens. */
    still?: boolean;
    className?: string;
    /** Texto para leitor de tela; sem ele o ícone é decorativo. */
    label?: string;
    corpo?: EvaBotCorpo;
    topo?: EvaBotTopo;
    olhos?: EvaBotOlhos;
    tema?: EvaBotTema;
    /** Cor do corpo com tema="empresa". Ainda não é opção do produto: nenhuma tela usa. */
    corEmpresa?: string;
}) {
    const rootRef = useRef<HTMLSpanElement>(null);
    const faceRef = useRef<HTMLSpanElement>(null);
    const mounted = useRef(false);

    // Pulinho de entrada e de troca de estado (squash and stretch).
    useEffect(() => {
        const el = rootRef.current;
        if (!el || still || !canMove() || typeof el.animate !== "function") return;
        const first = !mounted.current;
        mounted.current = true;
        el.animate(
            first
                ? [
                      { transform: "scale(0.6)", opacity: 0 },
                      { transform: "scale(1.08, 0.94)", opacity: 1, offset: 0.6 },
                      { transform: "scale(1)", opacity: 1 },
                  ]
                : [
                      { transform: "scale(1)" },
                      { transform: "scale(0.9, 1.08)", offset: 0.35 },
                      { transform: "scale(1.05, 0.96)", offset: 0.7 },
                      { transform: "scale(1)" },
                  ],
            { duration: first ? 520 : 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
    }, [state, still]);

    // Antes de mudar de expressão ela pisca: a troca de forma some dentro da piscada
    // e parece uma reação, não uma transição.
    const estadoAnterior = useRef(state);
    useEffect(() => {
        if (estadoAnterior.current === state) return;
        estadoAnterior.current = state;
        const eyes = faceRef.current?.querySelector<HTMLElement>(".eva-bot__eyes");
        if (!eyes || still || !canMove() || typeof eyes.animate !== "function") return;
        eyes.animate(
            [{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)", offset: 0.4 }, { transform: "scaleY(1)" }],
            { duration: 200, easing: "ease-in-out", composite: "add" },
        );
    }, [state, still]);

    // Olhos seguindo o ponteiro, com atraso suave. Só roda enquanto a Lume está
    // visível, em tela com mouse, e solta o olhar 2,5 s depois do mouse parar.
    useEffect(() => {
        const el = rootRef.current;
        const face = faceRef.current;
        if (!el || !face || still || !canMove() || !window.matchMedia("(pointer: fine)").matches) return;
        listenPointer();
        let raf = 0;
        let visible = false;
        let cx = 0;
        let cy = 0;
        // O rosto mora na caixa de 240, então o alcance do olhar é medido nela.
        const max = 19;
        const tick = () => {
            const r = el.getBoundingClientRect();
            const active = performance.now() - pointer.t < 2500;
            let tx = 0;
            let ty = 0;
            if (active) {
                const dx = pointer.x - (r.left + r.width / 2);
                const dy = pointer.y - (r.top + r.height / 2);
                const dist = Math.hypot(dx, dy) || 1;
                const reach = Math.min(1, dist / (size * 2.5));
                tx = (dx / dist) * max * reach;
                ty = (dy / dist) * max * 0.7 * reach;
            }
            cx += (tx - cx) * 0.12;
            cy += (ty - cy) * 0.12;
            face.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
            if (active) el.setAttribute("data-tracking", "");
            else if (Math.abs(cx) < 0.1 && Math.abs(cy) < 0.1) el.removeAttribute("data-tracking");
            if (visible) raf = requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            cancelAnimationFrame(raf);
            if (visible) raf = requestAnimationFrame(tick);
        });
        io.observe(el);
        return () => {
            io.disconnect();
            cancelAnimationFrame(raf);
        };
    }, [size, still]);

    const { tam, k, tx, ty } = encaixe(size, corpo);
    const cheio = tam === "cheio";

    return (
        <span
            ref={rootRef}
            className={`eva-bot ${className}`}
            data-state={state}
            data-still={still || undefined}
            data-corpo={corpo}
            data-topo={topo}
            data-olhos={olhos}
            data-tema={tema}
            data-tam={tam}
            style={{
                ["--s" as string]: `${size}px`,
                ["--k" as string]: k,
                ["--tx" as string]: `${tx}px`,
                ["--ty" as string]: `${ty}px`,
                ...(corEmpresa ? { ["--cor-empresa" as string]: corEmpresa } : {}),
            }}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            <span className="eva-bot__thought">
                <i />
                <i />
                <i />
            </span>
            <span className="eva-bot__palco">
                <span className="eva-bot__body">
                    {cheio && topo === "placa" && (
                        <span className="eva-bot__topo">
                            <span className="eva-bot__haste" />
                            <span className="eva-bot__placa">
                                {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
                            </span>
                        </span>
                    )}
                    {cheio && topo === "antena" && (
                        <span className="eva-bot__topo">
                            <span className="eva-bot__haste" />
                            <span className="eva-bot__lampada" />
                        </span>
                    )}
                    {cheio && topo === "fone" && <span className="eva-bot__arco" />}
                    {cheio && corpo === "tela" && <span className="eva-bot__base" />}
                    {cheio && <span className="eva-bot__orelha" />}
                    {cheio && <span className="eva-bot__orelha" />}
                    <span className="eva-bot__casco" />
                    {tam !== "minimo" && <span className="eva-bot__visor" />}
                    <span ref={faceRef} className="eva-bot__face">
                        <span className="eva-bot__eyes">
                            <span className="eva-bot__eye" />
                            <span className="eva-bot__eye" />
                        </span>
                        {tam !== "minimo" && (
                            <span className="eva-bot__mouth">
                                <i />
                                <i />
                                <i />
                            </span>
                        )}
                    </span>
                    {cheio && topo === "capacete" && <span className="eva-bot__capacete"><i /></span>}
                    {cheio && topo === "fone" && <span className="eva-bot__microfone" />}
                </span>
            </span>
            {!cheio && <span className="eva-bot__dot" />}
        </span>
    );
}

export type EvaBotStep = { state: EvaBotState; text: string };

/** A Lume passando pelo trabalho dela, com a legenda de cada estado. Só anda
 *  enquanto está na tela; com movimento reduzido, fica no primeiro passo. */
export function EvaBotStage({ steps, size = 120, interval = 2400, renderText }: {
    steps: EvaBotStep[];
    size?: number;
    interval?: number;
    renderText: (text: string) => ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [i, setI] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || !canMove()) return;
        const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        const id = window.setInterval(() => setI((n) => (n + 1) % steps.length), interval);
        return () => window.clearInterval(id);
    }, [visible, steps.length, interval]);

    const step = steps[i];
    return (
        <div ref={ref} className="flex flex-col items-center gap-5">
            <div className="flex flex-col items-center">
                <EvaBot state={step.state} size={size} />
                <span className="eva-bot-floor" style={{ ["--s" as string]: `${size}px` }} aria-hidden />
            </div>
            <div aria-live="polite">{renderText(step.text)}</div>
        </div>
    );
}
