// ─────────────────────────────────────────────────────────────────────────────
// EvaEntity — entidade visual abstrata da EVA (malha de nós / rede neural).
//
// Substitui o avatar fotográfico por uma forma simples e simétrica que "respira"
// e reage ao estado da operação. A FORMA é simples; o MOVIMENTO é a personalidade.
//
// Animação 100% CSS (convenção do projeto — classes vz-* no index.css), sem
// framer-motion. Cores por estado via CSS vars (.vz-eva--<state>), então em
// reduced-motion a malha fica estática mas AINDA muda de cor (cor ≠ movimento).
//
// NÃO está plugado na lógica real ainda: `state` é prop manual (calibrar no
// browser via /eva-entity-test antes de conectar a criticalCount/refetch).
// ─────────────────────────────────────────────────────────────────────────────

export type EvaEntityState = "idle" | "thinking" | "alert" | "done" | "listening";

type Node = { x: number; y: number; r: number; c: string };

// Malha COMPLETA (≥40px): pentágono simétrico em torno do centro (30,30), raio
// ~20. Cores em "camadas" espelhadas esquerda↔direita: topo c1, laterais c2, base c3.
const NODES_FULL: Node[] = [
    { x: 30.0, y: 9.5, r: 3.8, c: "var(--eva-c1)" }, // topo
    { x: 49.0, y: 23.8, r: 3.4, c: "var(--eva-c2)" }, // sup. direita
    { x: 41.8, y: 46.2, r: 3.1, c: "var(--eva-c3)" }, // inf. direita
    { x: 18.2, y: 46.2, r: 3.1, c: "var(--eva-c3)" }, // inf. esquerda
    { x: 11.0, y: 23.8, r: 3.4, c: "var(--eva-c2)" }, // sup. esquerda
];

// Malha SIMPLIFICADA (<40px, ex: header da EVA a 28px): ícone responsivo, não só
// escalado. Esconde os nós da base, mantém núcleo + 3 nós maiores, mais espaçados.
// Menos detalhe = mais legível no pequeno (a malha completa borra a 28px).
const NODES_SIMPLE: Node[] = [
    { x: 30.0, y: 13.0, r: 5.2, c: "var(--eva-c1)" }, // topo
    { x: 46.0, y: 25.5, r: 4.6, c: "var(--eva-c2)" }, // sup. direita
    { x: 14.0, y: 25.5, r: 4.6, c: "var(--eva-c2)" }, // sup. esquerda
];

const SIMPLE_BELOW = 40; // px

const STATE_LABEL: Record<EvaEntityState, string> = {
    idle: "ocioso",
    thinking: "pensando",
    alert: "alerta",
    done: "concluído",
    listening: "em escuta",
};

export interface EvaEntityProps {
    /** Lado do SVG em px (viewBox é sempre 60). Legível a partir de ~24px. */
    size?: number;
    state?: EvaEntityState;
    className?: string;
}

export function EvaEntity({ size = 28, state = "idle", className = "" }: EvaEntityProps) {
    const label = `Assistente EVA, estado: ${STATE_LABEL[state]}`;
    const simple = size < SIMPLE_BELOW;
    const nodes = simple ? NODES_SIMPLE : NODES_FULL;
    const coreR = simple ? 8 : 6.8;
    const coreHiR = simple ? 3.2 : 2.6;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 60 60"
            role="img"
            aria-label={label}
            className={`vz-eva vz-eva--${state} ${simple ? "vz-eva--sm" : ""} ${className}`}
        >
            <title>{label}</title>
            <circle className="vz-eva-bg" cx={30} cy={30} r={29} fill="var(--eva-bg)" />
            <g className="vz-eva-mesh">
                {nodes.map((n, i) => (
                    <line
                        key={`l${i}`}
                        className="vz-eva-line"
                        x1={30}
                        y1={30}
                        x2={n.x}
                        y2={n.y}
                        style={{ animationDelay: `${i * 0.14}s` }}
                    />
                ))}
                {nodes.map((n, i) => (
                    <circle
                        key={`n${i}`}
                        className="vz-eva-node"
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        fill={n.c}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    />
                ))}
                <circle className="vz-eva-core" cx={30} cy={30} r={coreR} fill="var(--eva-core)" />
                <circle className="vz-eva-core-hi" cx={30} cy={30} r={coreHiR} fill="var(--eva-c2)" opacity={0.7} />
            </g>
        </svg>
    );
}
