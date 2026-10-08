// Progresso dos primeiros passos com a marca "Encontro": as duas peças (o
// cliente e a empresa) começam afastadas e se aproximam a cada passo; no último
// se cruzam e a interseção acende, como na marca.
import { useId } from "react";
import { LEFT_ROTATION, PIECE, RIGHT_ROTATION, RIGHT_X, VYZON_BLUE } from "./VyzonMark";

const GAP = 22;

export function EncontroProgress({ step, total, size = 40 }: { step: number; total: number; size?: number }) {
    const uid = useId().replace(/:/g, "");
    const p = Math.min(1, Math.max(0, step / total));
    const off = GAP * (1 - p);
    const lit = p >= 1;
    const move = "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
    return (
        <svg width={size} height={size} viewBox="-10 4 120 90" aria-hidden className="shrink-0 overflow-visible">
            <defs>
                <clipPath id={`${uid}l`}>
                    <rect {...PIECE} transform={LEFT_ROTATION} />
                </clipPath>
            </defs>
            <g className={move} style={{ transform: `translateX(${-off}px)` }}>
                <rect {...PIECE} transform={LEFT_ROTATION} fill="#0B1220" />
            </g>
            <g className={move} style={{ transform: `translateX(${off}px)` }}>
                <rect {...PIECE} x={RIGHT_X} transform={RIGHT_ROTATION} fill={VYZON_BLUE} />
            </g>
            <g clipPath={`url(#${uid}l)`} className="transition-opacity duration-500 motion-reduce:transition-none" style={{ opacity: lit ? 1 : 0 }}>
                <rect {...PIECE} x={RIGHT_X} transform={RIGHT_ROTATION} fill="#9CC2FF" />
            </g>
        </svg>
    );
}
