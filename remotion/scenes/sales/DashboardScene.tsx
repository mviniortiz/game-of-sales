import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, fadeInOut, SceneBG, SectionHeader, useCountUp, easeOut, clamp01 } from "./lib";
import { Icon } from "./icons";

// Compact currency (matches src/pages/Dashboard.tsx formatCurrencyCompact)
const compactCurrency = (n: number): string => {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2).replace(".", ",")} M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace(".", ",")} k`;
    return `R$ ${n}`;
};

export const DashboardScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    const panelSpring = spring({ frame: frame - 10, fps, config: { damping: 100, stiffness: 110, mass: 1 } });
    const panelY = interpolate(panelSpring, [0, 1], [50, 0]);
    const panelOpacity = interpolate(frame, [10, 32], [0, 1], { extrapolateRight: "clamp" });

    // KPI animated values
    const faturamento = useCountUp(frame, 1247850, 28, 110);
    const ticketMedio = useCountUp(frame, 1473, 35, 110);
    const transacoes = useCountUp(frame, 847, 40, 110);
    const showRate = useCountUp(frame, 87, 45, 110);
    const convRate = useCountUp(frame, 34, 50, 110);

    // Evolution chart
    const chartData = [12, 18, 9, 24, 31, 22, 38, 29, 45, 52, 48, 61, 54, 72, 68, 81, 76, 89, 94, 88, 102, 98, 115, 108, 124];
    const maxData = Math.max(...chartData);

    // Top produtos bars
    const topProdutos = [
        { name: "Mentoria Elite 2026", value: 412_500, color: C.em500 },
        { name: "Curso Avançado", value: 287_300, color: C.blue },
        { name: "Consultoria 1:1", value: 198_400, color: C.vio500 },
        { name: "Imersão Presencial", value: 156_200, color: C.gold500 },
        { name: "Comunidade Pro", value: 98_700, color: C.pink },
    ];
    const maxProduto = Math.max(...topProdutos.map((p) => p.value));

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="emerald" />

            <AbsoluteFill style={{ padding: "60px 80px", display: "flex", flexDirection: "column" }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Dashboard em tempo real"
                    title="Cada venda. Cada métrica. Em um só lugar."
                    accent={C.em600}
                />

                {/* Dashboard panel — faithful to production */}
                <div
                    style={{
                        marginTop: 32,
                        flex: 1,
                        opacity: panelOpacity,
                        transform: `translateY(${panelY}px)`,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)",
                        border: "1px solid rgba(15,23,42,0.08)",
                        borderRadius: 18,
                        padding: 28,
                        backdropFilter: "blur(20px)",
                        boxShadow: "0 40px 100px -25px rgba(15,23,42,0.2), 0 4px 12px -2px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                    }}
                >
                    {/* Top bar: Dashboard + Live badge + user */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingBottom: 16,
                            borderBottom: "1px solid rgba(15,23,42,0.08)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 700,
                                    color: C.text,
                                    fontFamily: FONTS.heading,
                                    letterSpacing: -0.5,
                                }}
                            >
                                Dashboard
                            </div>
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "3px 10px",
                                    borderRadius: 100,
                                    background: "rgba(16,185,129,0.12)",
                                    border: "1px solid rgba(16,185,129,0.35)",
                                    color: C.em700,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    fontFamily: FONTS.sans,
                                    textTransform: "uppercase",
                                    letterSpacing: 1.5,
                                }}
                            >
                                <Icon.Sparkles s={11} c={C.em700} />
                                Live
                            </div>
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: C.text3,
                                fontFamily: FONTS.sans,
                                fontWeight: 500,
                            }}
                        >
                            Bem-vindo, <span style={{ color: C.text }}>Carlos</span> · abril de 2026
                        </div>
                    </div>

                    {/* 5 KPI CARDS — matches production */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                        {[
                            {
                                title: "Faturamento",
                                value: compactCurrency(faturamento),
                                sub: "vs mês anterior",
                                icon: <Icon.DollarSign s={14} c={C.em300} />,
                                iconBg: "rgba(16,185,129,0.12)",
                                accent: C.em500,
                                trend: 24,
                            },
                            {
                                title: "Ticket Médio",
                                value: compactCurrency(ticketMedio),
                                sub: "vs mês anterior",
                                icon: <Icon.TrendingUp s={14} c="#7dd3fc" />,
                                iconBg: "rgba(14,165,233,0.12)",
                                accent: "#0ea5e9",
                                trend: 12,
                            },
                            {
                                title: "Transações",
                                value: transacoes.toString(),
                                sub: "vs mês anterior",
                                icon: <Icon.BarChart s={14} c={C.vio400} />,
                                iconBg: "rgba(139,92,246,0.12)",
                                accent: C.vio500,
                                trend: 18,
                            },
                            {
                                title: "Taxa de Show",
                                value: `${showRate}%`,
                                sub: "vs média",
                                icon: <Icon.Users s={14} c={C.gold400} />,
                                iconBg: "rgba(245,158,11,0.12)",
                                accent: C.gold500,
                                trend: 9,
                            },
                            {
                                title: "Taxa de Conversão",
                                value: `${convRate}%`,
                                sub: "vs média",
                                icon: <Icon.Target s={14} c="#fda4af" />,
                                iconBg: "rgba(244,63,94,0.12)",
                                accent: "#f43f5e",
                                trend: 6,
                            },
                        ].map((k, i) => {
                            const delay = 25 + i * 5;
                            const op = interpolate(frame, [delay, delay + 18], [0, 1], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                            });
                            const tY = interpolate(frame, [delay, delay + 18], [22, 0], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                            });
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: "relative",
                                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                        border: "1px solid rgba(15,23,42,0.08)",
                                        borderRadius: 12,
                                        padding: 14,
                                        overflow: "hidden",
                                        opacity: op,
                                        transform: `translateY(${tY}px)`,
                                        boxShadow: "0 4px 14px -4px rgba(15,23,42,0.08)",
                                    }}
                                >
                                    {/* Left accent bar */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: 0,
                                            top: 12,
                                            bottom: 12,
                                            width: 3,
                                            background: k.accent,
                                            borderRadius: "0 3px 3px 0",
                                            boxShadow: `0 0 10px ${k.accent}80`,
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                color: C.text3,
                                                textTransform: "uppercase",
                                                letterSpacing: 1.2,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            {k.title}
                                        </div>
                                        <div
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 6,
                                                background: k.iconBg,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {k.icon}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 800,
                                            color: C.text,
                                            fontFamily: FONTS.sans,
                                            letterSpacing: -0.6,
                                            marginBottom: 6,
                                            fontFeatureSettings: '"tnum"',
                                        }}
                                    >
                                        {k.value}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 2,
                                                padding: "2px 6px",
                                                borderRadius: 4,
                                                background: "rgba(16,185,129,0.15)",
                                                color: C.em700,
                                                fontSize: 10,
                                                fontWeight: 700,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            ↑ {k.trend}%
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: C.text3,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            {k.sub}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts row: Evolution (60%) + Top Produtos (40%) */}
                    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, flex: 1 }}>
                        {/* Evolution chart */}
                        <div
                            style={{
                                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                border: "1px solid rgba(15,23,42,0.08)",
                                borderRadius: 12,
                                padding: 20,
                                display: "flex",
                                flexDirection: "column",
                                boxShadow: "0 4px 14px -4px rgba(15,23,42,0.08)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                <div
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 7,
                                        background: "rgba(16,185,129,0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon.TrendingUp s={14} c={C.em700} />
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: C.text,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    Evolução de Vendas
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: C.text3,
                                    fontFamily: FONTS.sans,
                                    marginLeft: 36,
                                    marginBottom: 16,
                                }}
                            >
                                Mês atual · faturamento diário
                            </div>
                            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, minHeight: 0 }}>
                                {chartData.map((v, i) => {
                                    const delay = 35 + i * 2.5;
                                    const t = clamp01((frame - delay) / 22);
                                    const h = easeOut(t) * (v / maxData) * 100;
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                flex: 1,
                                                height: `${h}%`,
                                                background: `linear-gradient(180deg, ${C.em400} 0%, ${C.em600} 100%)`,
                                                borderRadius: "3px 3px 0 0",
                                                minHeight: 2,
                                                boxShadow: i >= chartData.length - 5 ? `0 0 10px ${C.em400}60` : "none",
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Produtos */}
                        <div
                            style={{
                                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                border: "1px solid rgba(15,23,42,0.08)",
                                borderRadius: 12,
                                padding: 20,
                                display: "flex",
                                flexDirection: "column",
                                boxShadow: "0 4px 14px -4px rgba(15,23,42,0.08)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                <div
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 7,
                                        background: "rgba(16,185,129,0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon.BarChart s={14} c={C.em700} />
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: C.text,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    Top Produtos
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: C.text3,
                                    fontFamily: FONTS.sans,
                                    marginLeft: 36,
                                    marginBottom: 18,
                                }}
                            >
                                Por faturamento no período
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                                {topProdutos.map((p, i) => {
                                    const delay = 60 + i * 7;
                                    const t = clamp01((frame - delay) / 22);
                                    const w = easeOut(t) * (p.value / maxProduto) * 100;
                                    const op = interpolate(frame, [delay, delay + 12], [0, 1], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });
                                    return (
                                        <div key={i} style={{ opacity: op }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    marginBottom: 4,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        color: C.text2,
                                                        fontFamily: FONTS.sans,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {p.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        color: C.text,
                                                        fontWeight: 800,
                                                        fontFamily: FONTS.sans,
                                                        fontFeatureSettings: '"tnum"',
                                                    }}
                                                >
                                                    {compactCurrency(p.value)}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    height: 6,
                                                    background: "rgba(15,23,42,0.08)",
                                                    borderRadius: 100,
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${w}%`,
                                                        height: "100%",
                                                        background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}aa 100%)`,
                                                        borderRadius: 100,
                                                        boxShadow: `0 0 10px ${p.color}60`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
