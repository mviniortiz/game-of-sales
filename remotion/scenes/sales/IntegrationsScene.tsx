import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring, staticFile } from "remotion";
import { C, FONTS, fadeInOut, SceneBG, SectionHeader } from "./lib";
import { Icon } from "./icons";

// Real integration assets (copied from src/assets/integrations)
const INTEGRATIONS_AVAILABLE = [
    {
        name: "Hotmart",
        logo: staticFile("integrations/hotmart-logo-png_seeklogo-485917.png"),
        bg: "#ffffff",
    },
    {
        name: "Kiwify",
        logo: staticFile("integrations/kiwify-logo-png_seeklogo-537186.png"),
        bg: "#ffffff",
    },
    {
        name: "Greenn",
        logo: staticFile("integrations/greenn.png"),
        bg: "#ffffff",
    },
    {
        name: "Google Calendar",
        logo: staticFile("integrations/google-calendar.png"),
        bg: "#ffffff",
    },
    {
        name: "RD Station",
        logo: staticFile("integrations/rd-station loog.jpg"),
        bg: "#ffffff",
    },
    {
        name: "WhatsApp",
        logo: staticFile("integrations/whatsapp-loog.png"),
        bg: "#ffffff",
    },
];

const INTEGRATIONS_ROADMAP = [
    {
        name: "Celetus",
        logo: staticFile("integrations/celetus.png"),
        bg: "#ffffff",
    },
    {
        name: "Cakto",
        logo: staticFile("integrations/cakto.png"),
        bg: "#ffffff",
    },
];

interface TileProps {
    name: string;
    logo: string | null;
    letter?: string;
    bg: string;
    textColor?: string;
    delay: number;
    frame: number;
    roadmap?: boolean;
}

const IntegrationTile: React.FC<TileProps> = ({ name, logo, letter, bg, textColor, delay, frame, roadmap }) => {
    const op = interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const scaleT = interpolate(frame, [delay, delay + 25], [0.7, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const ease = 1 - Math.pow(1 - scaleT, 3);

    return (
        <div
            style={{
                opacity: op,
                transform: `scale(${ease})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                filter: roadmap ? "saturate(0.6)" : "none",
            }}
        >
            <div
                style={{
                    width: 108,
                    height: 108,
                    borderRadius: 22,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: roadmap
                        ? "0 12px 30px -10px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.06)"
                        : `0 20px 45px -12px rgba(15,23,42,0.2), 0 4px 12px -2px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06)`,
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {logo ? (
                    <Img
                        src={logo}
                        style={{
                            width: "72%",
                            height: "72%",
                            objectFit: "contain",
                        }}
                    />
                ) : (
                    <span
                        style={{
                            fontSize: 42,
                            fontWeight: 900,
                            color: textColor || "white",
                            fontFamily: FONTS.heading,
                            letterSpacing: -0.5,
                        }}
                    >
                        {letter}
                    </span>
                )}
                {roadmap && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.25)",
                            backdropFilter: "blur(1px)",
                        }}
                    />
                )}
            </div>
            <div
                style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: FONTS.sans,
                }}
            >
                {name}
            </div>
        </div>
    );
};

export const IntegrationsScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    const availableSpring = spring({ frame: frame - 15, fps, config: { damping: 100, stiffness: 110 } });
    const availableY = interpolate(availableSpring, [0, 1], [30, 0]);
    const availableOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });

    const roadmapOpacity = interpolate(frame, [65, 85], [0, 1], { extrapolateRight: "clamp" });
    const roadmapY = interpolate(frame, [65, 85], [25, 0], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="emerald" />

            <AbsoluteFill style={{ padding: "50px 80px 50px", display: "flex", flexDirection: "column" }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Integrações nativas"
                    title="Plug-and-play com quem você já usa."
                    accent={C.em600}
                    align="center"
                />

                {/* Content */}
                <div
                    style={{
                        marginTop: 36,
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: "2.2fr 1fr",
                        gap: 28,
                    }}
                >
                    {/* AVAILABLE NOW */}
                    <div
                        style={{
                            background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(236,253,245,0.85) 100%)",
                            border: "1.5px solid rgba(16,185,129,0.3)",
                            borderRadius: 20,
                            padding: "28px 32px 32px",
                            boxShadow: "0 30px 80px -25px rgba(16,185,129,0.25), 0 4px 12px rgba(15,23,42,0.05)",
                            opacity: availableOpacity,
                            transform: `translateY(${availableY}px)`,
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Decorative glow */}
                        <div
                            style={{
                                position: "absolute",
                                top: -50,
                                right: -50,
                                width: 300,
                                height: 300,
                                background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 60%)",
                                borderRadius: "50%",
                                filter: "blur(30px)",
                                pointerEvents: "none",
                            }}
                        />

                        {/* Section header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 28,
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: `linear-gradient(135deg, ${C.em500} 0%, ${C.em700} 100%)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 8px 20px -4px ${C.em500}80`,
                                    }}
                                >
                                    <Icon.Check s={20} c="white" />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 18,
                                            fontWeight: 800,
                                            color: C.text,
                                            fontFamily: FONTS.sans,
                                        }}
                                    >
                                        Disponível agora
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: C.text3,
                                            fontFamily: FONTS.sans,
                                            marginTop: 1,
                                        }}
                                    >
                                        6 integrações ativas em produção
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "5px 12px",
                                    background: "rgba(16,185,129,0.15)",
                                    border: "1px solid rgba(16,185,129,0.4)",
                                    borderRadius: 100,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: C.em700,
                                    fontFamily: FONTS.sans,
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                <span
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: C.em500,
                                        boxShadow: `0 0 8px ${C.em500}`,
                                    }}
                                />
                                Ativo
                            </div>
                        </div>

                        {/* Tiles grid 3x2 */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 28,
                                flex: 1,
                                alignContent: "center",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            {INTEGRATIONS_AVAILABLE.map((it, i) => (
                                <IntegrationTile
                                    key={it.name}
                                    {...it}
                                    delay={25 + i * 6}
                                    frame={frame}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ROADMAP */}
                    <div
                        style={{
                            background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,243,255,0.85) 100%)",
                            border: "1.5px dashed rgba(139,92,246,0.4)",
                            borderRadius: 20,
                            boxShadow: "0 20px 50px -20px rgba(139,92,246,0.2), 0 3px 10px rgba(15,23,42,0.05)",
                            padding: "28px 24px 32px",
                            opacity: roadmapOpacity,
                            transform: `translateY(${roadmapY}px)`,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Section header */}
                        <div
                            style={{
                                marginBottom: 28,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: `linear-gradient(135deg, ${C.vio500} 0%, ${C.vio600} 100%)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 8px 20px -4px ${C.vio500}80`,
                                    }}
                                >
                                    <Icon.Sparkles s={18} c="white" />
                                </div>
                                <div
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 800,
                                        color: C.text,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    Em breve
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: C.text3,
                                    fontFamily: FONTS.sans,
                                }}
                            >
                                No roadmap, entrando em produção
                            </div>
                        </div>

                        {/* Roadmap tiles */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: 22,
                                flex: 1,
                                alignContent: "center",
                            }}
                        >
                            {INTEGRATIONS_ROADMAP.map((it, i) => (
                                <IntegrationTile
                                    key={it.name}
                                    {...it}
                                    delay={75 + i * 10}
                                    frame={frame}
                                    roadmap
                                />
                            ))}
                        </div>

                        {/* Bottom note */}
                        <div
                            style={{
                                marginTop: 22,
                                padding: "12px 14px",
                                background: "#ffffff",
                                border: "1px solid rgba(15,23,42,0.08)",
                                borderRadius: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                opacity: interpolate(frame, [105, 125], [0, 1], { extrapolateRight: "clamp" }),
                                boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
                            }}
                        >
                            <Icon.Zap s={14} c={C.gold600} />
                            <span
                                style={{
                                    fontSize: 11,
                                    color: C.text2,
                                    fontFamily: FONTS.sans,
                                    lineHeight: 1.4,
                                }}
                            >
                                Vote nas próximas integrações direto no app
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bottom tagline */}
                <div
                    style={{
                        marginTop: 22,
                        display: "flex",
                        justifyContent: "center",
                        opacity: interpolate(frame, [95, 120], [0, 1], { extrapolateRight: "clamp" }),
                    }}
                >
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "11px 22px",
                            background: "#ffffff",
                            border: "1px solid rgba(15,23,42,0.08)",
                            borderRadius: 100,
                            backdropFilter: "blur(20px)",
                            boxShadow: "0 10px 30px -10px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.05)",
                        }}
                    >
                        <Icon.Zap s={14} c={C.em600} />
                        <span
                            style={{
                                color: C.text,
                                fontSize: 14,
                                fontWeight: 600,
                                fontFamily: FONTS.sans,
                            }}
                        >
                            Setup via webhook em segundos. Sem código.
                        </span>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
