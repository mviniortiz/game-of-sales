import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, SceneBG, SectionHeader, fadeInOut, formatBRL, useIsVertical } from "./lib";
import { Icon } from "../sales/icons";

// ============================================
// PULSE SCENE — 6s / 180 frames
// WhatsApp → Pipeline automatically.
// Left: WA conversation. Right: card materializing in Kanban.
// ============================================
export const PulseScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 10, 14);

    // WhatsApp panel slides from left
    const waSpring = spring({ frame: frame - 20, fps, config: { damping: 110, stiffness: 90, mass: 1 } });
    const waX = interpolate(waSpring, [0, 1], [-40, 0]);
    const waOpacity = interpolate(frame, [20, 44], [0, 1], { extrapolateRight: "clamp" });

    // Kanban panel slides from right
    const kbSpring = spring({ frame: frame - 28, fps, config: { damping: 110, stiffness: 90, mass: 1 } });
    const kbX = interpolate(kbSpring, [0, 1], [40, 0]);
    const kbOpacity = interpolate(frame, [28, 52], [0, 1], { extrapolateRight: "clamp" });

    // Messages
    const messages = [
        { from: "in", text: "Oi, vi o anúncio! Quanto custa?", at: 40 },
        { from: "out", text: "Oi Ana! 😊 O Plus tá R$ 149/mês. Quer testar 14 dias grátis?", at: 60 },
        { from: "in", text: "Quero! Manda o link", at: 85 },
    ];

    // Arrow / flow animation (WA → Kanban)
    const arrowOpacity = interpolate(frame, [90, 105], [0, 1], { extrapolateRight: "clamp" });
    const arrowProgress = interpolate(frame, [95, 130], [0, 1], { extrapolateRight: "clamp" });

    // Card materializing in Kanban (after arrow)
    const cardSpring = spring({ frame: frame - 115, fps, config: { damping: 100, stiffness: 120, mass: 1 } });
    const cardScale = interpolate(cardSpring, [0, 1], [0.6, 1]);
    const cardOpacity = interpolate(frame, [115, 140], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="brand" />

            <AbsoluteFill style={{ padding: vert ? "90px 60px" : "60px 90px", display: "flex", flexDirection: "column", gap: vert ? 24 : 32 }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Pulse • WhatsApp nativo"
                    title="Conversa vira pipeline."
                    accent={C.brand}
                    align="left"
                />

                <div style={{ display: "flex", flexDirection: vert ? "column" : "row", gap: vert ? 20 : 40, flex: 1, alignItems: "stretch", position: "relative" }}>
                    {/* LEFT: WhatsApp conversation */}
                    <div
                        style={{
                            flex: 1,
                            opacity: waOpacity,
                            transform: `translateX(${waX}px)`,
                            background: C.waBg,
                            borderRadius: 20,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "0 40px 100px -25px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
                        }}
                    >
                        {/* WA Header */}
                        <div
                            style={{
                                background: C.waPanel,
                                padding: "16px 20px",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}
                        >
                            <div
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontWeight: 700,
                                    fontFamily: FONTS.sans,
                                    fontSize: 16,
                                }}
                            >
                                AS
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: FONTS.sans, fontSize: 16, fontWeight: 600, color: C.waText }}>
                                    Ana Souza
                                </div>
                                <div style={{ fontFamily: FONTS.sans, fontSize: 12, color: C.waMute }}>
                                    online
                                </div>
                            </div>
                            <div style={{ color: C.waMute }}>
                                <Icon.Phone s={20} c={C.waMute} />
                            </div>
                        </div>
                        {/* Bubbles */}
                        <div
                            style={{
                                flex: 1,
                                padding: 20,
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                backgroundImage: `radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)`,
                                backgroundSize: "30px 30px",
                                justifyContent: "flex-end",
                            }}
                        >
                            {messages.map((m, i) => {
                                const op = interpolate(frame, [m.at, m.at + 10], [0, 1], { extrapolateRight: "clamp" });
                                const y = interpolate(frame, [m.at, m.at + 14], [10, 0], { extrapolateRight: "clamp" });
                                const isOut = m.from === "out";
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            alignSelf: isOut ? "flex-end" : "flex-start",
                                            opacity: op,
                                            transform: `translateY(${y}px)`,
                                            background: isOut ? C.waBubbleOut : C.waBubbleIn,
                                            color: C.waText,
                                            fontFamily: FONTS.sans,
                                            fontSize: 15,
                                            fontWeight: 500,
                                            padding: "10px 14px",
                                            borderRadius: isOut ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                                            maxWidth: "82%",
                                            lineHeight: 1.35,
                                            boxShadow: "0 1px 1px rgba(0,0,0,0.3)",
                                            display: "flex",
                                            alignItems: "flex-end",
                                            gap: 8,
                                        }}
                                    >
                                        <span>{m.text}</span>
                                        {isOut && (
                                            <span style={{ color: "#53bdeb", flexShrink: 0, opacity: 0.9 }}>
                                                <Icon.CheckCheck s={14} c="#53bdeb" />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CENTER: Arrow / flow indicator */}
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 10,
                            opacity: arrowOpacity,
                            zIndex: 10,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            style={{
                                width: 70,
                                height: 70,
                                borderRadius: "50%",
                                background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: C.bg,
                                boxShadow: `0 0 60px ${C.brand}99, 0 8px 24px rgba(0,0,0,0.4)`,
                                transform: `scale(${0.8 + 0.2 * arrowProgress}) rotate(${vert ? 90 : 0}deg)`,
                            }}
                        >
                            <Icon.ArrowRight s={32} c={C.bg} />
                        </div>
                        <div
                            style={{
                                fontFamily: FONTS.mono,
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.brand,
                                letterSpacing: 2,
                                textTransform: "uppercase",
                            }}
                        >
                            auto
                        </div>
                    </div>

                    {/* RIGHT: Kanban column */}
                    <div
                        style={{
                            flex: 1,
                            opacity: kbOpacity,
                            transform: `translateX(${kbX}px)`,
                            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                            borderRadius: 20,
                            padding: 22,
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            border: `1px solid ${C.border}`,
                            boxShadow: "0 40px 100px -25px rgba(0,0,0,0.6)",
                        }}
                    >
                        {/* Column header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingBottom: 14,
                                borderBottom: `1px solid ${C.border}`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: C.brand }} />
                                <div style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: C.text }}>
                                    Novo lead
                                </div>
                            </div>
                            <div
                                style={{
                                    fontFamily: FONTS.mono,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: C.text3,
                                    background: C.surface,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                }}
                            >
                                {cardOpacity > 0.2 ? "4" : "3"}
                            </div>
                        </div>

                        {/* Existing cards (muted) */}
                        {["Carlos Mendes", "Juliana Paes", "Ricardo Lima"].map((n, i) => (
                            <div
                                key={i}
                                style={{
                                    background: C.surface,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 12,
                                    padding: 14,
                                    opacity: 0.55,
                                }}
                            >
                                <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 600, color: C.text2 }}>
                                    {n}
                                </div>
                                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.text3, marginTop: 4 }}>
                                    {formatBRL([8500, 12400, 6200][i])}
                                </div>
                            </div>
                        ))}

                        {/* NEW CARD (materializing) */}
                        <div
                            style={{
                                background: `linear-gradient(135deg, ${C.brand}22 0%, ${C.brand}0a 100%)`,
                                border: `1.5px solid ${C.brand}`,
                                borderRadius: 12,
                                padding: 16,
                                opacity: cardOpacity,
                                transform: `scale(${cardScale})`,
                                boxShadow: `0 12px 40px -10px ${C.brand}55, inset 0 1px 0 rgba(255,255,255,0.08)`,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700, color: C.text }}>
                                    Ana Souza
                                </div>
                                <div
                                    style={{
                                        fontFamily: FONTS.mono,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: C.brand,
                                        background: `${C.brand}22`,
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        letterSpacing: 0.5,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Novo
                                </div>
                            </div>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 12, color: C.text3, marginBottom: 10 }}>
                                WhatsApp • há poucos segundos
                            </div>
                            <div
                                style={{
                                    fontFamily: FONTS.mono,
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: C.brand,
                                    letterSpacing: -0.5,
                                }}
                            >
                                {formatBRL(149)}
                                <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}> /mês</span>
                            </div>
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
