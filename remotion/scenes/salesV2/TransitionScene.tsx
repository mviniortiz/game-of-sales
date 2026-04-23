import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, LogoMark, fadeInOut, useIsVertical } from "./lib";

// ============================================
// TRANSITION SCENE — 2s / 60 frames
// Bridge: caos → brand. Logo Vyzon emerge.
// ============================================
export const TransitionScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 6, 10);

    // Logo spring (scale + glow)
    const logoSpring = spring({ frame: frame - 5, fps, config: { damping: 90, stiffness: 110, mass: 1 } });
    const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);
    const logoOpacity = interpolate(frame, [5, 26], [0, 1], { extrapolateRight: "clamp" });

    // Glow pulsing
    const glow = 0.6 + 0.4 * Math.sin(frame / 8);

    // Tagline entrance
    const tagOpacity = interpolate(frame, [26, 44], [0, 1], { extrapolateRight: "clamp" });
    const tagY = interpolate(frame, [26, 44], [10, 0], { extrapolateRight: "clamp" });

    // Expanding ring (radar pulse)
    const ringRadius = interpolate(frame, [12, 50], [0, 900], { extrapolateRight: "clamp" });
    const ringOpacity = interpolate(frame, [12, 50], [0.5, 0], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity, background: C.bg }}>
            {/* Ambient gradient swelling with brand */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at 50% 50%, rgba(0,227,122,${0.08 + 0.12 * logoOpacity}) 0%, transparent 55%)`,
                }}
            />

            {/* Dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
                }}
            />

            {/* Expanding ring */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: ringRadius,
                    height: ringRadius,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    border: `2px solid ${C.brand}`,
                    opacity: ringOpacity,
                }}
            />

            {/* Logo center */}
            <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28 }}>
                <div
                    style={{
                        opacity: logoOpacity,
                        transform: `scale(${logoScale})`,
                    }}
                >
                    <LogoMark size={vert ? 120 : 160} glow={glow} showWordmark={true} />
                </div>

                <div
                    style={{
                        opacity: tagOpacity,
                        transform: `translateY(${tagY}px)`,
                        fontFamily: FONTS.sans,
                        fontSize: 22,
                        fontWeight: 500,
                        color: C.text3,
                        letterSpacing: 3,
                        textTransform: "uppercase",
                    }}
                >
                    CRM de vendas. Sem fricção.
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
