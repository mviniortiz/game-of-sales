import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring, staticFile } from "remotion";
import { C, FONTS, fadeInOut } from "./lib";
import { Icon } from "./icons";

const LOGO = staticFile("logo 1 - white.svg");

export const IntroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    // Logo spring scale
    const logoScale = spring({
        frame: frame - 8,
        fps,
        config: { damping: 80, stiffness: 110, mass: 1 },
    });
    const logoOpacity = interpolate(frame, [8, 28], [0, 1], { extrapolateRight: "clamp" });

    // Title
    const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
    const titleY = interpolate(frame, [30, 50], [40, 0], { extrapolateRight: "clamp" });

    // Subtitle
    const subOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
    const subY = interpolate(frame, [50, 70], [20, 0], { extrapolateRight: "clamp" });

    // Badges
    const badgesOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });

    // Floating particles
    const particles = React.useMemo(
        () =>
            Array.from({ length: 80 }).map((_, i) => ({
                seed: i,
                x: Math.sin(i * 0.7) * 800,
                y: Math.cos(i * 0.5) * 500,
                size: 1 + (i % 4) * 0.6,
                color: i % 3 === 0 ? C.gold400 : i % 3 === 1 ? C.em400 : C.vio400,
            })),
        []
    );

    // Slow zoom on whole scene
    const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06]);

    return (
        <AbsoluteFill
            style={{
                background: "radial-gradient(ellipse at 50% 35%, #fef3c7 0%, #fefce8 30%, #f8fafc 65%, #e2e8f0 100%)",
                opacity,
            }}
        >
            {/* Particles drifting */}
            {particles.map((p, i) => {
                const drift = Math.sin(frame / 50 + i) * 30;
                const drift2 = Math.cos(frame / 40 + i * 0.5) * 25;
                const blink = 0.15 + (Math.sin(frame / 30 + i) + 1) * 0.2;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `calc(50% + ${p.x + drift}px)`,
                            top: `calc(50% + ${p.y + drift2}px)`,
                            width: p.size,
                            height: p.size,
                            borderRadius: "50%",
                            background: p.color,
                            opacity: blink,
                            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
                        }}
                    />
                );
            })}

            {/* Central glow orb */}
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 1100,
                    height: 1100,
                    transform: "translate(-50%, -50%)",
                    background:
                        "radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(16,185,129,0.12) 25%, transparent 60%)",
                    borderRadius: "50%",
                    filter: "blur(80px)",
                }}
            />

            {/* Concentric rings */}
            {[0, 1, 2].map((i) => {
                const ringScale = interpolate(frame, [10 + i * 8, 60 + i * 8], [0.4, 1.6], { extrapolateRight: "clamp" });
                const ringOpacity = interpolate(frame, [10 + i * 8, 35 + i * 8, 60 + i * 8], [0, 0.25, 0], {
                    extrapolateRight: "clamp",
                });
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: 400,
                            height: 400,
                            transform: `translate(-50%, -50%) scale(${ringScale})`,
                            border: `2px solid ${C.em500}`,
                            borderRadius: "50%",
                            opacity: ringOpacity,
                        }}
                    />
                );
            })}

            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${zoom})`,
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        opacity: logoOpacity,
                        transform: `scale(${logoScale})`,
                        marginBottom: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        filter: "drop-shadow(0 20px 50px rgba(251,191,36,0.25))",
                    }}
                >
                    <Img src={LOGO} style={{ width: 320, height: "auto", display: "block" }} />
                </div>

                {/* Title */}
                <div
                    style={{
                        opacity: titleOpacity,
                        transform: `translateY(${titleY}px)`,
                        fontSize: 92,
                        fontWeight: 800,
                        fontFamily: FONTS.heading,
                        textAlign: "center",
                        letterSpacing: -2.5,
                        lineHeight: 1.0,
                        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #d97706 80%, #f59e0b 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textShadow: "0 8px 30px rgba(15,23,42,0.15)",
                    }}
                >
                    O CRM que
                    <br />
                    vende com você.
                </div>

                {/* Subtitle */}
                <div
                    style={{
                        opacity: subOpacity,
                        transform: `translateY(${subY}px)`,
                        fontSize: 26,
                        fontWeight: 400,
                        fontFamily: FONTS.sans,
                        color: C.text2,
                        textAlign: "center",
                        marginTop: 28,
                        maxWidth: 860,
                        lineHeight: 1.5,
                    }}
                >
                    <span style={{ color: "#128c7e", fontWeight: 700 }}>WhatsApp</span>,{" "}
                    <span style={{ color: C.vio600, fontWeight: 700 }}>IA</span>,{" "}
                    <span style={{ color: C.em600, fontWeight: 700 }}>pipeline</span> e{" "}
                    <span style={{ color: C.gold600, fontWeight: 700 }}>gamificação</span> num só lugar.
                    <br />
                    Menos trocas de aba. Mais fechamentos.
                </div>

                {/* Badges */}
                <div
                    style={{
                        marginTop: 50,
                        display: "flex",
                        gap: 16,
                        opacity: badgesOpacity,
                    }}
                >
                    {[
                        { icon: <Icon.Bot s={20} c="white" />, text: "EVA AI", color: C.vio500 },
                        { icon: <Icon.MessageCircle s={20} c="white" />, text: "WhatsApp Nativo", color: C.wa },
                        { icon: <Icon.Trophy s={20} c="white" />, text: "Gamificação", color: C.gold500 },
                    ].map((b, i) => {
                        const delay = 70 + i * 8;
                        const bOp = interpolate(frame, [delay, delay + 18], [0, 1], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        });
                        const bY = interpolate(frame, [delay, delay + 18], [25, 0], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        });
                        return (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "14px 26px",
                                    background: "rgba(255,255,255,0.9)",
                                    border: `1.5px solid ${b.color}55`,
                                    borderRadius: 100,
                                    backdropFilter: "blur(20px)",
                                    opacity: bOp,
                                    transform: `translateY(${bY}px)`,
                                    boxShadow: `0 14px 34px -10px ${b.color}55, 0 2px 6px rgba(15,23,42,0.08)`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${b.color} 0%, ${b.color}cc 100%)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 4px 16px -2px ${b.color}80`,
                                    }}
                                >
                                    {b.icon}
                                </div>
                                <span
                                    style={{
                                        color: C.text,
                                        fontSize: 17,
                                        fontWeight: 700,
                                        fontFamily: FONTS.sans,
                                        letterSpacing: 0.2,
                                    }}
                                >
                                    {b.text}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
