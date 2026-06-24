import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, SERIF, MONO, useSentient, fadeUp, Shimmer, CineCamera, SceneBGLight, GlassCard } from "./lib-light";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const circ = (t: number) => 1 - Math.pow(1 - t, 3);

export const CTALight: React.FC = () => {
    useSentient();
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const l1 = fadeUp(f, 8, 26, 18);
    const l2 = fadeUp(f, 22, 26, 18);

    // logo entra com presença (escala + leve aproximação 3D)
    const logoOp = interpolate(f, [44, 64], [0, 1], clamp);
    const logoScale = interpolate(f, [44, 78], [0.82, 1], { ...clamp, easing: circ });
    const logoY = interpolate(f, [44, 78], [40, 0], { ...clamp, easing: circ });
    const logoFloat = Math.sin((f - 60) / 48) * 5;

    const pillScale = interpolate(f, [70, 88], [0.9, 1], { ...clamp, easing: circ });
    const pillOp = interpolate(f, [70, 84], [0, 1], clamp);
    const urlOp = interpolate(f, [92, 108], [0, 1], clamp);

    // light sweep no wordmark (efeito CSS)
    const sweep = interpolate(f, [78, 110], [-140, 240], clamp);
    const sweepOp = interpolate(f, [78, 90, 110], [0, 0.5, 0], clamp);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD }}>
            <SceneBGLight frame={f} tint="eva" />

            <CineCamera frame={f} total={durationInFrames} origin="50% 46%">
                <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: "50% 44%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center", padding: "0 100px", marginBottom: 96 }}>
                        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.035em", color: LC.ink, lineHeight: 1.06, textShadow: "0 2px 30px rgba(13,20,33,0.08)", ...l1 }}>A EVA sugere.</div>
                        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 84, letterSpacing: "-0.01em", color: LC.blue, lineHeight: 1.1, ...l2 }}>Você aprova.</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
                        {/* logo real + wordmark, com profundidade */}
                        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden", padding: "8px 14px", opacity: logoOp, transform: `translateY(${logoY + logoFloat}px) scale(${logoScale})`, transformStyle: "preserve-3d" }}>
                            <Img src={staticFile("logo-vyzon-new.png")} style={{ width: 108, height: 108, objectFit: "contain", filter: "drop-shadow(0 14px 30px rgba(0,160,90,0.32))" }} />
                            <div style={{ fontWeight: 900, fontSize: 84, letterSpacing: "-0.02em" }}><Shimmer frame={f} period={85}>Vyzon</Shimmer></div>
                            {/* light sweep */}
                            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sweep}px`, width: 90, background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.85), transparent)", opacity: sweepOp, transform: "skewX(-18deg)", pointerEvents: "none" }} />
                        </div>

                        {/* CTA em vidro premium */}
                        <div style={{ opacity: pillOp, transform: `scale(${pillScale})` }}>
                            <GlassCard frame={f} padding="20px 46px" radius={999} float>
                                <span style={{ fontSize: 28, fontWeight: 700, color: LC.ink }}>Comece grátis · 14 dias</span>
                            </GlassCard>
                        </div>

                        <div style={{ fontFamily: MONO, fontSize: 25, letterSpacing: "0.14em", color: LC.ink45, opacity: urlOp }}>vyzon.com.br</div>
                    </div>
                </AbsoluteFill>
            </CineCamera>
        </AbsoluteFill>
    );
};
