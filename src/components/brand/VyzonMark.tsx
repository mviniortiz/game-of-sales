import { useId } from "react";

// Marca Vyzon "Encontro" (out/2026): duas peças que se cruzam e formam o V,
// o cliente e a empresa; onde se sobrepõem, a conversa voltou.
// Geometria única para o app, a landing, o favicon e o loader: viewBox 0 0 100 100,
// peças de 26x72 com cantos de 13, giradas 22° em torno do próprio centro.
export const VYZON_BLUE = "#2563EB";

export const PIECE = { x: 25, y: 13, width: 26, height: 72, rx: 13 } as const;
export const LEFT_ROTATION = "rotate(-22 38 49)";
export const RIGHT_X = 49;
export const RIGHT_ROTATION = "rotate(22 62 49)";

/** Recorte justo da marca (sem o respiro do ícone), para alinhar com o texto. */
const MARK_VIEWBOX = "16 14.5 68 69";

type Variant =
    /** Peça esquerda na cor do texto, direita em azul. Padrão em telas. */
    | "duo"
    /** As duas na cor atual (currentColor): uso em uma cor só. */
    | "mono"
    /** Ícone de app em camadas, com fundo. Favicon, avatar, sidebar recolhida. */
    | "icon";

interface VyzonMarkProps {
    variant?: Variant;
    size?: number | string;
    className?: string;
    /** Sem título, a marca é decorativa (aria-hidden). */
    title?: string;
}

export function VyzonMark({ variant = "duo", size = 24, className, title }: VyzonMarkProps) {
    const uid = useId().replace(/:/g, "");
    const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };

    if (variant === "icon") {
        return (
            <svg width={size} height={size} viewBox="0 0 100 100" className={className} {...a11y}>
                <defs>
                    <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0.4" y2="1">
                        <stop offset="0" stopColor="#1e3a8a" />
                        <stop offset="1" stopColor="#0b1220" />
                    </linearGradient>
                    <linearGradient id={`${uid}sheen`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
                        <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`${uid}l`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="1" stopColor="#dfe7f5" />
                    </linearGradient>
                    <linearGradient id={`${uid}r`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#7cb0ff" />
                        <stop offset="1" stopColor="#2f6bf0" />
                    </linearGradient>
                    <clipPath id={`${uid}clip`}>
                        <rect {...PIECE} transform={LEFT_ROTATION} />
                    </clipPath>
                </defs>
                <rect width="100" height="100" rx="22.5" fill={`url(#${uid}bg)`} />
                <rect width="100" height="100" rx="22.5" fill={`url(#${uid}sheen)`} />
                <rect {...PIECE} x={RIGHT_X} y={15.5} transform="rotate(22 62 51.5)" fill="#000000" fillOpacity="0.3" />
                <rect {...PIECE} x={RIGHT_X} transform={RIGHT_ROTATION} fill={`url(#${uid}r)`} fillOpacity="0.92" />
                <rect {...PIECE} transform={LEFT_ROTATION} fill={`url(#${uid}l)`} fillOpacity="0.9" />
                <g clipPath={`url(#${uid}clip)`}>
                    <rect {...PIECE} x={RIGHT_X} transform={RIGHT_ROTATION} fill="#bcd5ff" />
                </g>
                <rect {...PIECE} transform={LEFT_ROTATION} fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.2" />
            </svg>
        );
    }

    return (
        <svg width={size} height={size} viewBox={MARK_VIEWBOX} className={className} {...a11y}>
            <MarkPieces uid={uid} duo={variant === "duo"} />
        </svg>
    );
}

/** As duas peças chapadas, no sistema de coordenadas 0-100. Reusado pela assinatura. */
export function MarkPieces({ uid, duo }: { uid: string; duo: boolean }) {
    return (
        <>
            <defs>
                {/* Vão entre as peças: a direita perde uma faixa em volta da esquerda. */}
                <mask id={`${uid}gap`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                    <rect width="100" height="100" fill="#ffffff" />
                    <rect {...PIECE} transform={LEFT_ROTATION} fill="#000000" stroke="#000000" strokeWidth="9" />
                </mask>
            </defs>
            <rect {...PIECE} x={RIGHT_X} transform={RIGHT_ROTATION} fill={duo ? VYZON_BLUE : "currentColor"} mask={`url(#${uid}gap)`} />
            <rect {...PIECE} transform={LEFT_ROTATION} fill="currentColor" />
        </>
    );
}
