import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, SceneBG, SectionHeader, fadeInOut, formatBRL, useCountUp, useIsVertical } from "./lib";
import { Icon } from "../sales/icons";

// ============================================
// PIPELINE + RANKING — 7s / 210 frames
// Split: Kanban (left) + Ranking (right)
// Cards movendo entre colunas + ranking ao vivo
// ============================================
export const PipelineRankingScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 10, 16);

    // Panels entrance
    const kbOpacity = interpolate(frame, [14, 40], [0, 1], { extrapolateRight: "clamp" });
    const kbY = interpolate(frame, [14, 40], [30, 0], { extrapolateRight: "clamp" });
    const rkOpacity = interpolate(frame, [24, 50], [0, 1], { extrapolateRight: "clamp" });
    const rkY = interpolate(frame, [24, 50], [30, 0], { extrapolateRight: "clamp" });

    // Card movement: from "Proposta" to "Fechado" between frames 80-130
    const moveProgress = interpolate(frame, [80, 130], [0, 1], { extrapolateRight: "clamp" });
    const moveX = moveProgress * 320;
    const moveY = moveProgress * 40;
    const cardScale = interpolate(moveProgress, [0, 0.5, 1], [1, 1.06, 1]);

    // Kanban columns
    const columns = [
        { name: "Qualificado", count: 12, color: C.brand2, cards: [
            { name: "Lucas Ferreira", v: 4800 },
            { name: "Amanda Reis", v: 7200 },
        ]},
        { name: "Proposta", count: 8, color: C.gold, cards: [
            { name: "Marco Silva", v: 18500, moving: true },
            { name: "Patrícia Melo", v: 9300 },
        ]},
        { name: "Fechado", count: 24, color: C.brand, cards: [
            { name: "Clara Nunes", v: 12400 },
            { name: "Pedro Antunes", v: 6800 },
        ]},
    ];

    // Ranking
    const leaders = [
        { name: "Mariana Costa", value: 287500, avatar: ["#00E37A", "#00B266"], medal: "gold" },
        { name: "Rafael Duarte", value: 198300, avatar: ["#1556C0", "#0F3F8F"], medal: "silver" },
        { name: "Beatriz Alves", value: 164200, avatar: ["#8b5cf6", "#6d28d9"], medal: "bronze" },
        { name: "Thiago Nunes", value: 132800, avatar: ["#f59e0b", "#d97706"], medal: null },
        { name: "Você", value: 108400, avatar: ["#f43f5e", "#be123c"], medal: null, me: true },
    ];
    const maxValue = leaders[0].value;

    // Animated value for "Você" counter
    const meValue = useCountUp(frame, 108400, 50, 160);

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="brand" />

            <AbsoluteFill style={{ padding: vert ? "90px 60px" : "60px 90px", display: "flex", flexDirection: "column", gap: vert ? 22 : 32 }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Pipeline + Ranking"
                    title={vert ? "Pipeline que se move." : "Pipeline que se move. Ranking ao vivo."}
                    accent={C.brand}
                    align="left"
                />

                <div style={{ display: "flex", flexDirection: vert ? "column" : "row", gap: vert ? 20 : 36, flex: 1 }}>
                    {/* LEFT: Kanban */}
                    <div
                        style={{
                            flex: 1.6,
                            opacity: kbOpacity,
                            transform: `translateY(${kbY}px)`,
                            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                            border: `1px solid ${C.border}`,
                            borderRadius: 18,
                            padding: 22,
                            display: "flex",
                            gap: 14,
                            boxShadow: "0 40px 100px -25px rgba(0,0,0,0.6)",
                        }}
                    >
                        {columns.map((col, ci) => (
                            <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: col.color }} />
                                        <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                            {col.name}
                                        </div>
                                    </div>
                                    <div style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: 700, color: C.text3 }}>
                                        {col.name === "Proposta" && frame > 120 ? col.count - 1 : col.name === "Fechado" && frame > 120 ? col.count + 1 : col.count}
                                    </div>
                                </div>
                                {col.cards.map((card, i) => {
                                    const isMoving = (card as typeof card & { moving?: boolean }).moving;
                                    const hide = isMoving && frame > 128 && ci === 1;
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                background: isMoving ? `linear-gradient(135deg, ${C.gold}22, ${C.gold}0a)` : C.surface,
                                                border: `1px solid ${isMoving ? C.gold : C.border}`,
                                                borderRadius: 10,
                                                padding: 12,
                                                transform: isMoving ? `translate(${moveX}px, ${moveY}px) scale(${cardScale})` : "none",
                                                opacity: hide ? 0 : 1,
                                                boxShadow: isMoving ? `0 12px 32px -8px ${C.gold}55` : "none",
                                                zIndex: isMoving ? 10 : 1,
                                                position: "relative",
                                            }}
                                        >
                                            <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 600, color: C.text }}>
                                                {card.name}
                                            </div>
                                            <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: isMoving ? C.gold : C.text3, marginTop: 4, fontWeight: 700 }}>
                                                {formatBRL(card.v)}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Ghost card appearing in Fechado */}
                                {ci === 2 && frame > 130 && (
                                    <div
                                        style={{
                                            background: `linear-gradient(135deg, ${C.brand}22, ${C.brand}0a)`,
                                            border: `1.5px solid ${C.brand}`,
                                            borderRadius: 10,
                                            padding: 12,
                                            opacity: interpolate(frame, [130, 145], [0, 1], { extrapolateRight: "clamp" }),
                                            boxShadow: `0 12px 32px -8px ${C.brand}55`,
                                        }}
                                    >
                                        <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 600, color: C.text }}>
                                            Marco Silva
                                        </div>
                                        <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.brand, marginTop: 4, fontWeight: 700 }}>
                                            {formatBRL(18500)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* RIGHT: Ranking */}
                    <div
                        style={{
                            flex: 1,
                            opacity: rkOpacity,
                            transform: `translateY(${rkY}px)`,
                            background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                            border: `1px solid ${C.border}`,
                            borderRadius: 18,
                            padding: 22,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            boxShadow: "0 40px 100px -25px rgba(0,0,0,0.6)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingBottom: 12,
                                borderBottom: `1px solid ${C.border}`,
                                marginBottom: 4,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Icon.Trophy s={18} c={C.gold} />
                                <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    Ranking do mês
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                                <div style={{ fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 1 }}>
                                    ao vivo
                                </div>
                            </div>
                        </div>

                        {leaders.map((l, i) => {
                            const barProgress = interpolate(frame, [50 + i * 8, 110 + i * 8], [0, l.value / maxValue], { extrapolateRight: "clamp" });
                            const rowIn = interpolate(frame, [44 + i * 6, 70 + i * 6], [0, 1], { extrapolateRight: "clamp" });
                            const rowY = interpolate(frame, [44 + i * 6, 70 + i * 6], [10, 0], { extrapolateRight: "clamp" });
                            const displayValue = l.me ? meValue : l.value;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        background: l.me ? `linear-gradient(90deg, ${C.brand}14, transparent)` : "transparent",
                                        border: l.me ? `1px solid ${C.brand}44` : "1px solid transparent",
                                        opacity: rowIn,
                                        transform: `translateY(${rowY}px)`,
                                        position: "relative",
                                    }}
                                >
                                    {/* Progress bar background */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${barProgress * 100}%`,
                                            background: `linear-gradient(90deg, ${l.avatar[0]}18 0%, ${l.avatar[0]}04 100%)`,
                                            borderRadius: 10,
                                            zIndex: 0,
                                        }}
                                    />
                                    {/* Position */}
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: "50%",
                                            background: l.medal === "gold" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" :
                                                       l.medal === "silver" ? "linear-gradient(135deg, #cbd5e1, #94a3b8)" :
                                                       l.medal === "bronze" ? "linear-gradient(135deg, #d97706, #92400e)" :
                                                       C.surface,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: l.medal ? "#06080a" : C.text3,
                                            fontFamily: FONTS.sans,
                                            fontSize: 13,
                                            fontWeight: 800,
                                            flexShrink: 0,
                                            zIndex: 1,
                                            border: l.medal ? "none" : `1px solid ${C.border}`,
                                        }}
                                    >
                                        {i + 1}
                                    </div>
                                    {/* Avatar */}
                                    <div
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            background: `linear-gradient(135deg, ${l.avatar[0]}, ${l.avatar[1]})`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#06080a",
                                            fontFamily: FONTS.sans,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            flexShrink: 0,
                                            zIndex: 1,
                                        }}
                                    >
                                        {l.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                                        <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: l.me ? 800 : 600, color: l.me ? C.brand : C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {l.name}
                                        </div>
                                    </div>
                                    <div style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: 700, color: l.me ? C.brand : C.text2, zIndex: 1 }}>
                                        {formatBRL(displayValue)}
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
