import { AnimatedMeshAsset } from "./AnimatedMeshAsset";
import { CloudWaveOrb } from "./CloudWaveOrb";
import loginMesh from "@/assets/landing-v2/login-mesh.webp";
import meshBlue from "@/assets/landing-v2/mesh-blue.webp";
import meshAqua from "@/assets/landing-v2/mesh-aqua.webp";
import meshViolet from "@/assets/landing-v2/mesh-violet.webp";
import meshWarm from "@/assets/landing-v2/mesh-warm.webp";

// LP.7 (v2) — orb da EVA: entidade abstrata que substitui o avatar. Dentro do
// orb, o fluido: nos orbs GRANDES (≥90px) roda o CloudWaveOrb (WebGL); nos
// pequenos, o mesh de imagem de sempre (WebGL context por instância estoura o
// limite do browser em telas com muitos orbs, ex. chat do Studio). Por cima,
// tracinhos de voz que animam por estado. Estados: idle / thinking / speaking
// / listening / analyzing. `variant` escolhe a cor do fluido + do halo (azul
// é o padrão da EVA; cores diferentes p/ cada agente especialista). Animação
// 100% CSS (.vz-eorb*), respeita prefers-reduced-motion.
export type EvaOrbState = "idle" | "thinking" | "speaking" | "listening" | "analyzing";
export type EvaOrbVariant = "blue" | "aqua" | "violet" | "warm";

const VARIANT_MESH: Record<EvaOrbVariant, string> = {
    blue: meshBlue,
    aqua: meshAqua,
    violet: meshViolet,
    warm: meshWarm,
};

// ponytail: abaixo disso o detalhe do shader nem aparece; sobe se sobrar contexto WebGL
const WEBGL_MIN_SIZE = 90;

const BARS = [0, 1, 2, 3, 4];

interface EvaOrbProps {
    state?: EvaOrbState;
    /** Cor do mesh + halo. Sem variant = mesh do login (uso original da demo). */
    variant?: EvaOrbVariant;
    size?: number;
    className?: string;
    /** Barras de voz por cima do mesh. false = só a esfera de cor (ex.: selo de card). */
    showVoice?: boolean;
    /** Força o CloudWaveOrb (WebGL) mesmo abaixo do threshold — usar SÓ onde há
     *  poucas instâncias simultâneas (demo/landing); cada uma custa 1 contexto GPU. */
    webgl?: boolean;
}

export const EvaOrb = ({ state = "idle", variant, size = 200, className = "", showVoice = true, webgl = false }: EvaOrbProps) => {
    const src = variant ? VARIANT_MESH[variant] : loginMesh;
    const variantClass = variant ? ` vz-eorb--${variant}` : "";
    return (
        <div
            className={`vz-eorb vz-eorb--${state}${variantClass} ${className}`.trim()}
            style={{ width: size, height: size }}
            role="img"
            aria-label={`EVA, ${state}`}
        >
            <div className="vz-eorb__halo" aria-hidden="true" />
            <div className="vz-eorb__core">
                {webgl || size >= WEBGL_MIN_SIZE ? (
                    <CloudWaveOrb palette={variant ?? "login"} className="vz-eorb__mesh" />
                ) : (
                    <AnimatedMeshAsset src={src} className="vz-eorb__mesh" />
                )}
                <div className="vz-eorb__sheen" aria-hidden="true" />
                {showVoice && (
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
                )}
            </div>
        </div>
    );
};
