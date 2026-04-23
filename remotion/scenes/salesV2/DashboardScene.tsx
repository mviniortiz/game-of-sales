import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, SceneBG, SectionHeader, fadeInOut, useCountUp, useIsVertical } from "./lib";

// ============================================
// DASHBOARD PAYOFF — 8s / 240 frames
// Meta batida, KPIs contando, chart crescendo
// ============================================
const compactCurrency = (n: number): string => {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2).replace(".", ",")} M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace(".", ",")} k`;
    return `R$ ${n}`;
};

export const DashboardScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    // Panel entrance
    const panelOpacity = interpolate(frame, [12, 40], [0, 1], { extrapolateRight: "clamp" });
    const panelY = interpolate(frame, [12, 40], [30, 0], { extrapolateRight: "clamp" });

    // Hero KPI: meta batida
    const metaProgress = useCountUp(frame, 127, 40, 160);
    const metaBadgeSpring = spring({ frame: frame - 160, fps, config: { damping: 80, stiffness: 180 } });
    const metaBadgeScale = interpolate(metaBadgeSpring, [0, 1], [0.5, 1]);

    // KPIs
    const faturamento = useCountUp(frame, 1247850, 50, 170);
    const ticketMedio = useCountUp(frame, 1473, 60, 170);
    const transacoes = useCountUp(frame, 847, 70, 170);
    const convRate = useCountUp(frame, 34, 80, 170);

    // Chart data (growth)
    const chartData = [12, 18, 15, 24, 31, 28, 38, 35, 45, 52, 48, 61, 58, 72, 68, 81, 78, 89, 94, 88, 102, 98, 115, 108, 124];
    const maxData = Math.max(...chartData);

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="brand" />

            <AbsoluteFill style={{ padding: vert ? "90px 50px" : "60px 90px", display: "flex", flexDirection: "column", gap: vert ? 22 : 28 }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Dashboard"
                    title="Quando o time bate meta, todo mundo vê."
                    accent={C.brand}
                    align="left"
                />

                <div
                    style={{
                        flex: 1,
                        opacity: panelOpacity,
                        transform: `translateY(${panelY}px)`,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                        border: `1px solid ${C.border}`,
                        borderRadius: 20,
                        padding: 28,
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                        boxShadow: "0 40px 100px -25px rgba(0,0,0,0.6)",
                    }}
                >
                    {/* Top bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingBottom: 16,
                            borderBottom: `1px solid ${C.border}`,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>
                                Abril / 2026
                            </div>
                            <div
                                style={{
                                    fontFamily: FONTS.mono,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: C.brand,
                                    background: `${C.brand}22`,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                                ao vivo
                            </div>
                        </div>
                        <div
                            style={{
                                opacity: interpolate(frame, [160, 180], [0, 1], { extrapolateRight: "clamp" }),
                                transform: `scale(${metaBadgeScale})`,
                                fontFamily: FONTS.sans,
                                fontSize: 13,
                                fontWeight: 800,
                                color: C.bg,
                                background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                                padding: "8px 16px",
                                borderRadius: 999,
                                boxShadow: `0 8px 24px -6px ${C.brand}99, 0 0 0 3px ${C.brand}22`,
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                            }}
                        >
                            Meta batida ✓
                        </div>
                    </div>

                    {/* KPI Row */}
                    <div style={{ display: "grid", gridTemplateColumns: vert ? "1fr 1fr" : "1.5fr 1fr 1fr 1fr", gap: vert ? 12 : 16 }}>
                        {/* Hero KPI: progresso meta */}
                        <div
                            style={{
                                background: `linear-gradient(135deg, ${C.brand}14, ${C.brand}04)`,
                                border: `1px solid ${C.brand}44`,
                                borderRadius: 14,
                                padding: 20,
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                gridColumn: vert ? "1 / -1" : "auto",
                            }}
                        >
                            <div style={{ fontFamily: FONTS.sans, fontSize: 12, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>
                                Progresso da meta
                            </div>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 48, fontWeight: 800, color: C.brand, letterSpacing: -2, lineHeight: 1 }}>
                                {metaProgress}%
                            </div>
                            <div
                                style={{
                                    height: 8,
                                    borderRadius: 4,
                                    background: C.surface,
                                    overflow: "hidden",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: `${Math.min(100, metaProgress)}%`,
                                        background: `linear-gradient(90deg, ${C.brand}, ${C.brandDim})`,
                                        borderRadius: 4,
                                        boxShadow: `0 0 12px ${C.brand}88`,
                                    }}
                                />
                            </div>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: C.text3 }}>
                                R$ 1,25M <span style={{ color: C.text4 }}>/ R$ 980k</span>
                            </div>
                        </div>

                        {/* Faturamento */}
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>
                                Faturamento
                            </div>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -1 }}>
                                {compactCurrency(faturamento)}
                            </div>
                            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.brand, fontWeight: 700 }}>
                                +34% vs mar
                            </div>
                        </div>

                        {/* Ticket médio */}
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>
                                Ticket médio
                            </div>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -1 }}>
                                R$ {ticketMedio.toLocaleString("pt-BR")}
                            </div>
                            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.brand, fontWeight: 700 }}>
                                +12%
                            </div>
                        </div>

                        {/* Conversão */}
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>
                                Conversão
                            </div>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -1 }}>
                                {convRate}%
                            </div>
                            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.brand, fontWeight: 700 }}>
                                {transacoes} vendas
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div
                        style={{
                            flex: 1,
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 14,
                            padding: 22,
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: C.text }}>
                                Evolução diária
                            </div>
                            <div style={{ display: "flex", gap: 14, fontFamily: FONTS.mono, fontSize: 11, color: C.text3 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ width: 10, height: 2, background: C.brand }} />
                                    Vendas
                                </span>
                            </div>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 4, position: "relative", minHeight: 140 }}>
                            {chartData.map((v, i) => {
                                const barDelay = 90 + i * 2;
                                const barProgress = interpolate(frame, [barDelay, barDelay + 20], [0, v / maxData], { extrapolateRight: "clamp" });
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            flex: 1,
                                            height: `${barProgress * 100}%`,
                                            background: `linear-gradient(180deg, ${C.brand} 0%, ${C.brandDim} 100%)`,
                                            borderRadius: "4px 4px 2px 2px",
                                            opacity: 0.85 + 0.15 * (i / chartData.length),
                                            boxShadow: i === chartData.length - 1 ? `0 -4px 16px ${C.brand}66` : "none",
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
