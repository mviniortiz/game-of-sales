import { AnimatedMeshAsset } from "./AnimatedMeshAsset";
import loginMesh from "@/assets/landing-v2/login-mesh.webp";

// LP.7 (v2) — orb da EVA: entidade abstrata que substitui o avatar na demo por
// voz. Dentro do orb roda o MESH fluido do login v2 (AnimatedMeshAsset); por
// cima, tracinhos de voz (a "boca"/pensamento dela) que animam por estado.
// Estados: idle / thinking / speaking / listening. Animação 100% CSS (.vz-orb*),
// respeita prefers-reduced-motion.
export type EvaOrbState = "idle" | "thinking" | "speaking" | "listening";

const BARS = [0, 1, 2, 3, 4];

interface EvaOrbProps {
    state?: EvaOrbState;
    size?: number;
    className?: string;
}

export const EvaOrb = ({ state = "idle", size = 200, className = "" }: EvaOrbProps) => {
    return (
        <div
            className={`vz-eorb vz-eorb--${state} ${className}`.trim()}
            style={{ width: size, height: size }}
            role="img"
            aria-label={`EVA, ${state}`}
        >
            <div className="vz-eorb__halo" aria-hidden="true" />
            <div className="vz-eorb__core">
                <AnimatedMeshAsset src={loginMesh} className="vz-eorb__mesh" />
                <div className="vz-eorb__sheen" aria-hidden="true" />
                <svg className="vz-eorb__voice" viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                    {BARS.map((i) => (
                        <rect
                            key={i}
                            className="vz-eorb__bar"
                            x={18 + i * 14}
                            y={6}
                            width={8}
                            height={28}
                            rx={4}
                            style={{ animationDelay: `${i * 0.11}s` }}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};
