import type { ReactNode } from "react";
import { CloudWaveOrb, type CloudWavePalette } from "./CloudWaveOrb";

// LP.9 (v2) — tile com o fluido "cloud wave" (WebGL, CloudWaveOrb) nas cores
// da marca + grain por cima. O conteúdo (mini-UI) flutua no `.vz-tilecard`.
// Respeita prefers-reduced-motion (frame estático no shader).
interface AnimatedMeshTileProps {
    variant: "blue" | "cyan" | "lilac" | "green" | "mix";
    className?: string;
    children: ReactNode;
}

// Variações de cor do fluido, na paleta da marca (azul/ciano-verde/roxo).
const VARIANT_PALETTE: Record<string, CloudWavePalette> = {
    cyan: "aqua",
    blue: "blue",
    lilac: "violet",
    green: "aqua",
    mix: "warm",
};

export const AnimatedMeshTile = ({ variant, className = "", children }: AnimatedMeshTileProps) => {
    const palette = VARIANT_PALETTE[variant] || "warm";
    return (
        <div className={`relative isolate flex items-center justify-center overflow-hidden ${className}`}>
            <div className="absolute inset-0">
                <CloudWaveOrb palette={palette} className="h-full w-full" />
            </div>
            <div className="vz-tile-grain" aria-hidden="true" />
            <div className="vz-tilecard relative z-[2]">{children}</div>
        </div>
    );
};
