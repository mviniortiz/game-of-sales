import React, { useId } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";

// orbe da EVA = core circular com o MESH (mesh-*.webp) ondulando dentro,
// via filtro feTurbulence+feDisplacementMap dirigido por frame (igual AnimatedMeshAsset),
// + sheen (brilho de vidro) + halo. Cor por agente via `variant`.
export type OrbVariant = "eva" | "blue" | "aqua" | "violet" | "warm";

export const MESH: Record<OrbVariant, string> = {
    eva: "eva/login-mesh.webp",
    blue: "eva/mesh-blue.webp",
    aqua: "eva/mesh-aqua.webp",
    violet: "eva/mesh-violet.webp",
    warm: "eva/mesh-warm.webp",
};
export const ORB_ACCENT: Record<OrbVariant, string> = {
    eva: "#6d28d9", blue: "#2563EB", aqua: "#0E9DA8", violet: "#7C3AED", warm: "#E0703A",
};
const HALO: Record<OrbVariant, string> = {
    eva: "radial-gradient(circle, rgba(124,58,237,0.32), rgba(37,99,235,0.14) 45%, transparent 70%)",
    blue: "radial-gradient(circle, rgba(21,86,192,0.34), rgba(37,99,235,0.12) 45%, transparent 70%)",
    aqua: "radial-gradient(circle, rgba(13,211,122,0.30), rgba(34,211,238,0.13) 45%, transparent 70%)",
    violet: "radial-gradient(circle, rgba(124,58,237,0.32), rgba(99,102,241,0.12) 45%, transparent 70%)",
    warm: "radial-gradient(circle, rgba(244,114,93,0.30), rgba(245,158,11,0.12) 45%, transparent 70%)",
};

export const EvaOrb: React.FC<{ size: number; variant?: OrbVariant; analyzing?: boolean; showVoice?: boolean; frameOffset?: number }> = ({ size, variant = "eva", analyzing = false, showVoice = false, frameOffset = 0 }) => {
    const f0 = useCurrentFrame();
    const f = f0 + frameOffset;
    const fid = "vzm-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const t = f * 2; // ~equivale ao RAF 60fps

    const amp = analyzing ? 9 : 6;
    const bfx = (0.013 + Math.sin(t * 0.0065) * 0.005).toFixed(4);
    const bfy = (0.016 + Math.cos(t * 0.0052) * 0.005).toFixed(4);
    const scale = (18 + Math.sin(t * 0.009) * amp).toFixed(1);
    const breath = 1 + (analyzing ? 0.03 : 0.018) * Math.sin(f / (analyzing ? 14 : 26) * Math.PI);

    return (
        <div style={{ position: "relative", width: size, height: size, transform: `scale(${breath})` }}>
            {/* halo */}
            <div style={{ position: "absolute", inset: -size * 0.14, borderRadius: "50%", background: HALO[variant], filter: `blur(${size * 0.05}px)` }} />

            {/* filtro de turbulência (único por instância) */}
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
                <defs>
                    <filter id={fid} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                        <feTurbulence type="fractalNoise" baseFrequency={`${bfx} ${bfy}`} numOctaves={2} seed={7} result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            {/* core circular com o mesh */}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", boxShadow: `inset 0 ${size * 0.02}px ${size * 0.06}px rgba(255,255,255,0.35), inset 0 -${size * 0.04}px ${size * 0.1}px rgba(13,20,33,0.18), 0 ${size * 0.04}px ${size * 0.12}px -${size * 0.04}px ${ORB_ACCENT[variant]}66` }}>
                <Img src={staticFile(MESH[variant])} style={{ width: "112%", height: "112%", marginLeft: "-6%", marginTop: "-6%", objectFit: "cover", filter: `url(#${fid})` }} />
                {/* sheen / vidro */}
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 26%, transparent 50%)", mixBlendMode: "screen" }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }} />
                {/* barras de voz */}
                {showVoice && (
                    <svg viewBox="0 0 100 40" style={{ position: "absolute", left: "50%", top: "50%", width: "46%", height: "auto", transform: "translate(-50%,-50%)" }} aria-hidden>
                        {[0, 1, 2, 3, 4].map((i) => {
                            const h = 10 + (analyzing ? 18 : 10) * Math.abs(Math.sin(f / 5 - i * 0.5));
                            return <rect key={i} x={18 + i * 14} y={20 - h / 2} width={8} height={h} rx={4} fill="rgba(255,255,255,0.92)" />;
                        })}
                    </svg>
                )}
            </div>
        </div>
    );
};
