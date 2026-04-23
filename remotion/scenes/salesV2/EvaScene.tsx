import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, SceneBG, SectionHeader, EvaAvatar, fadeInOut, useIsVertical } from "./lib";

// ============================================
// EVA SCENE — 6s / 180 frames
// Chat com Eva AI: pergunta + resposta estruturada
// ============================================
export const EvaScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 10, 14);

    // Chat panel entrance
    const chatOpacity = interpolate(frame, [14, 40], [0, 1], { extrapolateRight: "clamp" });
    const chatY = interpolate(frame, [14, 40], [30, 0], { extrapolateRight: "clamp" });

    // User question entrance
    const qOpacity = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: "clamp" });
    const qY = interpolate(frame, [30, 48], [12, 0], { extrapolateRight: "clamp" });

    // Typing indicator (Eva thinking)
    const typingStart = 56;
    const typingEnd = 78;
    const typingOpacity =
        frame > typingStart && frame < typingEnd
            ? 1
            : frame >= typingEnd
            ? 0
            : 0;

    // Eva response entrance
    const respOpacity = interpolate(frame, [78, 98], [0, 1], { extrapolateRight: "clamp" });
    const respY = interpolate(frame, [78, 98], [12, 0], { extrapolateRight: "clamp" });

    // Bullet items staggered
    const bullets = [
        { label: "Taxa de show caiu", value: "−18%", sub: "de 87% para 71% na última semana", color: C.red, delay: 104 },
        { label: "Gargalo em Proposta", value: "3,2d", sub: "tempo médio (meta: 1,5d)", color: C.gold, delay: 120 },
        { label: "Recomendação", value: "Follow-up em 24h", sub: "Mariana fez isso e converteu 34% a mais", color: C.brand, delay: 136 },
    ];

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="mixed" />

            <AbsoluteFill style={{ padding: vert ? "90px 50px" : "60px 90px", display: "flex", flexDirection: "column", gap: vert ? 24 : 32 }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Eva AI • Copilot"
                    title="Pergunte. Eva responde com dado e direção."
                    accent={C.brand}
                    align="left"
                />

                <div
                    style={{
                        flex: 1,
                        opacity: chatOpacity,
                        transform: `translateY(${chatY}px)`,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                        border: `1px solid ${C.border}`,
                        borderRadius: 20,
                        padding: 32,
                        display: "flex",
                        flexDirection: "column",
                        gap: 18,
                        boxShadow: "0 40px 100px -25px rgba(0,0,0,0.6)",
                        maxWidth: 1200,
                        margin: "0 auto",
                        width: "100%",
                    }}
                >
                    {/* Header Eva */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                        <EvaAvatar size={52} frame={frame} thinking={true} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 17, fontWeight: 700, color: C.text }}>
                                Eva
                            </div>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: C.text3, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: `0 0 8px #a78bfa` }} />
                                analisando seus dados em tempo real
                            </div>
                        </div>
                    </div>

                    {/* User question */}
                    <div
                        style={{
                            alignSelf: "flex-end",
                            maxWidth: "70%",
                            background: `linear-gradient(135deg, ${C.brand2}22, ${C.brand2}0a)`,
                            border: `1px solid ${C.brand2}44`,
                            borderRadius: "16px 16px 4px 16px",
                            padding: "14px 18px",
                            fontFamily: FONTS.sans,
                            fontSize: 16,
                            fontWeight: 500,
                            color: C.text,
                            lineHeight: 1.5,
                            opacity: qOpacity,
                            transform: `translateY(${qY}px)`,
                        }}
                    >
                        Por que meu funil caiu essa semana?
                    </div>

                    {/* Typing */}
                    {typingOpacity > 0 && (
                        <div
                            style={{
                                alignSelf: "flex-start",
                                background: C.surface,
                                border: `1px solid ${C.border}`,
                                borderRadius: "16px 16px 16px 4px",
                                padding: "14px 18px",
                                display: "flex",
                                gap: 5,
                                opacity: typingOpacity,
                            }}
                        >
                            {[0, 1, 2].map((d) => (
                                <span
                                    key={d}
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: C.text3,
                                        opacity: 0.3 + 0.7 * Math.max(0, Math.sin((frame - d * 4) / 4)),
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Eva response */}
                    <div
                        style={{
                            alignSelf: "flex-start",
                            maxWidth: "80%",
                            background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(139,92,246,0.04))",
                            border: "1px solid rgba(139,92,246,0.44)",
                            borderRadius: "16px 16px 16px 4px",
                            padding: "18px 22px",
                            fontFamily: FONTS.sans,
                            color: C.text,
                            lineHeight: 1.55,
                            opacity: respOpacity,
                            transform: `translateY(${respY}px)`,
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        <div style={{ fontSize: 16, fontWeight: 500 }}>
                            Analisei 847 conversas dos últimos 14 dias. Achei <span style={{ color: "#a78bfa", fontWeight: 700 }}>3 padrões</span> que explicam a queda:
                        </div>

                        {bullets.map((b, i) => {
                            const itemOpacity = interpolate(frame, [b.delay, b.delay + 14], [0, 1], { extrapolateRight: "clamp" });
                            const itemX = interpolate(frame, [b.delay, b.delay + 14], [-8, 0], { extrapolateRight: "clamp" });
                            return (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        gap: 14,
                                        padding: "12px 14px",
                                        background: "rgba(0,0,0,0.25)",
                                        borderRadius: 10,
                                        border: `1px solid ${b.color}33`,
                                        opacity: itemOpacity,
                                        transform: `translateX(${itemX}px)`,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 6,
                                            borderRadius: 3,
                                            background: b.color,
                                            flexShrink: 0,
                                            boxShadow: `0 0 8px ${b.color}88`,
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                                {b.label}
                                            </div>
                                            <div
                                                style={{
                                                    fontFamily: FONTS.mono,
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: b.color,
                                                }}
                                            >
                                                {b.value}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: C.text3, lineHeight: 1.4 }}>
                                            {b.sub}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
