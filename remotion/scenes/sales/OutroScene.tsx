import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring, staticFile, random } from "remotion";
import { C, FONTS, fadeInOut } from "./lib";
import { Icon } from "./icons";

const LOGO = staticFile("logo 1 - white.svg");

export const OutroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 25);

    const contentSpring = spring({ frame: frame - 8, fps, config: { damping: 90, stiffness: 100, mass: 1 } });
    const contentScale = interpolate(contentSpring, [0, 1], [0.92, 1]);
    const contentOpacity = interpolate(frame, [8, 30], [0, 1], { extrapolateRight: "clamp" });

    const titleY = interpolate(frame, [25, 45], [30, 0], { extrapolateRight: "clamp" });
    const titleOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });

    const subOpacity = interpolate(frame, [42, 58], [0, 1], { extrapolateRight: "clamp" });

    const buttonSpring = spring({ frame: frame - 55, fps, config: { damping: 80, stiffness: 120, mass: 1 } });
    const buttonScale = interpolate(buttonSpring, [0, 1], [0.85, 1]);
    const buttonOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });
    const buttonPulse = 1 + Math.sin(frame / 10) * 0.025;

    const urlOpacity = interpolate(frame, [75, 90], [0, 1], { extrapolateRight: "clamp" });

    // Confetti burst at frame 0 — deterministic via Remotion's random()
    const confetti = React.useMemo(
        () =>
            Array.from({ length: 60 }).map((_, i) => ({
                seed: i,
                angle: (i / 60) * Math.PI * 2 + random(`confetti-angle-${i}`) * 0.3,
                dist: 250 + (i % 5) * 80,
                color: [C.gold400, C.em400, C.vio400, C.pink, C.blue][i % 5],
                size: 4 + (i % 3) * 2,
            })),
        []
    );

    return (
        <AbsoluteFill
            style={{
                background: "radial-gradient(ellipse at 50% 50%, #fef3c7 0%, #fefce8 35%, #f8fafc 70%, #e2e8f0 100%)",
                opacity,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Background ambient orbs */}
            <div
                style={{
                    position: "absolute",
                    width: 1200,
                    height: 1200,
                    background: "radial-gradient(circle, rgba(251,191,36,0.32) 0%, rgba(16,185,129,0.15) 30%, transparent 60%)",
                    borderRadius: "50%",
                    filter: "blur(100px)",
                }}
            />

            {/* Confetti */}
            {confetti.map((p, i) => {
                const t = Math.max(0, Math.min(1, frame / 50));
                const ease = 1 - Math.pow(1 - t, 2);
                const x = Math.cos(p.angle) * p.dist * ease;
                const y = Math.sin(p.angle) * p.dist * ease + Math.pow(t, 2) * 80;
                const rot = frame * 6 + i * 20;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: p.size,
                            height: p.size * 1.6,
                            background: p.color,
                            transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
                            opacity: (1 - t) * 0.85,
                            borderRadius: 2,
                            boxShadow: `0 0 8px ${p.color}80`,
                        }}
                    />
                );
            })}

            {/* Floating particles */}
            {Array.from({ length: 60 }).map((_, i) => {
                const x = Math.sin(i * 0.5 + frame / 60) * 700;
                const y = Math.cos(i * 0.4 + frame / 50) * 450;
                const opC = 0.1 + Math.sin(frame / 40 + i) * 0.1;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            width: 2.5,
                            height: 2.5,
                            borderRadius: "50%",
                            background: C.gold400,
                            opacity: opC,
                            boxShadow: `0 0 8px ${C.gold400}`,
                        }}
                    />
                );
            })}

            <div
                style={{
                    opacity: contentOpacity,
                    transform: `scale(${contentScale})`,
                    textAlign: "center",
                    zIndex: 5,
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 32,
                        filter: "drop-shadow(0 18px 45px rgba(251,191,36,0.22))",
                    }}
                >
                    <Img
                        src={LOGO}
                        style={{
                            width: 220,
                            height: "auto",
                            display: "block",
                        }}
                    />
                </div>

                {/* Headline */}
                <div
                    style={{
                        fontSize: 92,
                        fontWeight: 800,
                        fontFamily: FONTS.heading,
                        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #d97706 90%, #f59e0b 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        letterSpacing: -2.5,
                        lineHeight: 1.0,
                        opacity: titleOpacity,
                        transform: `translateY(${titleY}px)`,
                    }}
                >
                    Comece agora.
                </div>

                <div
                    style={{
                        fontSize: 26,
                        color: C.text2,
                        fontFamily: FONTS.sans,
                        marginTop: 18,
                        marginBottom: 44,
                        opacity: subOpacity,
                        maxWidth: 760,
                        marginLeft: "auto",
                        marginRight: "auto",
                        lineHeight: 1.5,
                    }}
                >
                    14 dias pra transformar seu time em uma{" "}
                    <span style={{ color: C.gold600, fontWeight: 700 }}>máquina de vendas</span>.
                </div>

                {/* CTA button */}
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 14,
                        background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                        padding: "22px 56px",
                        borderRadius: 100,
                        fontSize: 26,
                        fontWeight: 700,
                        fontFamily: FONTS.sans,
                        color: "white",
                        opacity: buttonOpacity,
                        transform: `scale(${buttonScale * buttonPulse})`,
                        boxShadow: "0 30px 80px -10px rgba(16,185,129,0.6), 0 0 60px -10px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Shine sweep */}
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: `${(((frame - 60) * 4) % 200) - 50}%`,
                            width: "30%",
                            height: "100%",
                            background:
                                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                            transform: "skewX(-20deg)",
                        }}
                    />
                    <Icon.Rocket s={26} c="white" />
                    <span style={{ position: "relative", zIndex: 1 }}>Teste grátis por 14 dias</span>
                    <Icon.ArrowRight s={22} c="white" />
                </div>

                {/* URL */}
                <div
                    style={{
                        marginTop: 36,
                        fontSize: 22,
                        fontFamily: FONTS.sans,
                        color: C.text3,
                        letterSpacing: 1,
                        opacity: urlOpacity,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                    }}
                >
                    <Icon.Lock s={16} c={C.text3} />
                    vyzon.com.br
                </div>
            </div>
        </AbsoluteFill>
    );
};
