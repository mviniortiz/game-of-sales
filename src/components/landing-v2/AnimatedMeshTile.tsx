import type { ReactNode } from "react";
import { AnimatedMeshAsset } from "./AnimatedMeshAsset";
import meshWarm from "@/assets/landing-v2/mesh-warm.webp";
import meshViolet from "@/assets/landing-v2/mesh-violet.webp";
import meshBlue from "@/assets/landing-v2/mesh-blue.webp";
import meshAqua from "@/assets/landing-v2/mesh-aqua.webp";

// LP.9 (v2) — tile com a IMAGEM de mesh (fornecida pelo Markus) animada de
// verdade (mesmo filtro de distorção do orb da EVA: feTurbulence +
// feDisplacementMap via AnimatedMeshAsset) + grain por cima. O conteúdo
// (mini-UI) flutua no `.vz-tilecard`. Respeita prefers-reduced-motion.
interface AnimatedMeshTileProps {
    variant: "blue" | "cyan" | "lilac" | "green" | "mix";
    className?: string;
    children: ReactNode;
}

// Variações de cor do mesh, na paleta da marca (azul/ciano-verde/roxo).
const VARIANT_IMAGE: Record<string, string> = {
    cyan: meshAqua,
    blue: meshBlue,
    lilac: meshViolet,
    green: meshAqua,
    mix: meshWarm,
};

export const AnimatedMeshTile = ({ variant, className = "", children }: AnimatedMeshTileProps) => {
    const image = VARIANT_IMAGE[variant] || meshWarm;
    return (
        <div className={`relative isolate flex items-center justify-center overflow-hidden ${className}`}>
            <div className="absolute inset-0">
                <AnimatedMeshAsset src={image} className="h-full w-full" />
            </div>
            <div className="vz-tile-grain" aria-hidden="true" />
            <div className="vz-tilecard relative z-[2]">{children}</div>
        </div>
    );
};
