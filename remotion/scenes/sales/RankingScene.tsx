import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONTS, fadeInOut, SceneBG, SectionHeader, Glass, Avatar, useCountUp, clamp01 } from "./lib";
import { Icon } from "./icons";

const compactCurrency = (n: number): string => {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2).replace(".", ",")} M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace(".", ",")} k`;
    return `R$ ${n}`;
};

export const RankingScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    // Podium data (order: 2nd, 1st, 3rd visually)
    const podium = [
        {
            place: 2,
            name: "Mariana T.",
            lastName: "Torres",
            value: 118650,
            vs: "+8%",
            avatar: [C.vio500, C.vio600] as [string, string],
            height: 180,
            color: "#94a3b8", // silver
            delay: 28,
        },
        {
            place: 1,
            name: "Carlos R.",
            lastName: "Ribeiro",
            value: 142800,
            vs: "+24%",
            avatar: [C.gold500, C.gold600] as [string, string],
            height: 230,
            color: C.gold500,
            delay: 22,
        },
        {
            place: 3,
            name: "Bia M.",
            lastName: "Mendes",
            value: 87420,
            vs: "+3%",
            avatar: [C.pink, "#be185d"] as [string, string],
            height: 140,
            color: "#d97706", // bronze
            delay: 34,
        },
    ];

    // Sidebar: leaderboard continuation
    const list = [
        { rank: 4, name: "Felipe S.", value: 76200, vs: "+2", avatar: [C.blue, "#1d4ed8"] as [string, string], level: 11 },
        { rank: 5, name: "Júlia P.", value: 68950, vs: "+1", avatar: [C.em500, C.em600] as [string, string], level: 10 },
        { rank: 6, name: "Rafael C.", value: 54300, vs: "—", avatar: [C.gold500, C.gold600] as [string, string], level: 10 },
        { rank: 7, name: "Larissa F.", value: 49800, vs: "-1", avatar: [C.pink, "#be185d"] as [string, string], level: 9 },
    ];

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="gold" />

            <AbsoluteFill style={{ padding: "50px 80px 50px", display: "flex", flexDirection: "column" }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Ranking em Tempo Real"
                    title="Competição saudável. Performance mensurável."
                    accent={C.gold600}
                />

                <div style={{ marginTop: 28, flex: 1, display: "flex", gap: 26 }}>
                    {/* PODIUM */}
                    <div
                        style={{
                            flex: 1.6,
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                        }}
                    >
                        {/* Spotlight from above */}
                        <div
                            style={{
                                position: "absolute",
                                top: -20,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: 700,
                                height: 500,
                                background:
                                    "radial-gradient(ellipse at top, rgba(251,191,36,0.28) 0%, transparent 55%)",
                                pointerEvents: "none",
                            }}
                        />

                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "center",
                                gap: 30,
                                paddingBottom: 20,
                                position: "relative",
                            }}
                        >
                            {podium.map((p, i) => {
                                const t = clamp01((frame - p.delay) / 30);
                                const podiumH = t * p.height;
                                const ePodium = 1 - Math.pow(1 - t, 3);
                                const userOp = interpolate(frame, [p.delay + 22, p.delay + 42], [0, 1], {
                                    extrapolateLeft: "clamp",
                                    extrapolateRight: "clamp",
                                });
                                const userY = interpolate(frame, [p.delay + 22, p.delay + 42], [-15, 0], {
                                    extrapolateLeft: "clamp",
                                    extrapolateRight: "clamp",
                                });
                                const isFirst = p.place === 1;
                                const valueAnim = useCountUp(frame, p.value, p.delay + 34, p.delay + 74);

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 14,
                                            zIndex: isFirst ? 2 : 1,
                                        }}
                                    >
                                        {/* Crown for first */}
                                        {isFirst && (
                                            <div
                                                style={{
                                                    opacity: interpolate(frame, [p.delay + 34, p.delay + 54], [0, 1], {
                                                        extrapolateRight: "clamp",
                                                    }),
                                                    transform: `translateY(${interpolate(
                                                        frame,
                                                        [p.delay + 34, p.delay + 54],
                                                        [-8, 0],
                                                        { extrapolateRight: "clamp" }
                                                    )}px)`,
                                                    filter: `drop-shadow(0 6px 16px ${C.gold400}80)`,
                                                }}
                                            >
                                                <Icon.Crown s={36} c={C.gold500} />
                                            </div>
                                        )}

                                        {/* Avatar + name */}
                                        <div
                                            style={{
                                                opacity: userOp,
                                                transform: `translateY(${userY}px)`,
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 7,
                                                position: "relative",
                                            }}
                                        >
                                            <div style={{ position: "relative" }}>
                                                <Avatar
                                                    name={p.name}
                                                    size={isFirst ? 78 : 64}
                                                    gradient={p.avatar}
                                                />
                                                {/* Glow ring */}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        inset: -4,
                                                        borderRadius: "50%",
                                                        border: `2.5px solid ${p.color}`,
                                                        boxShadow: `0 0 22px ${p.color}60`,
                                                    }}
                                                />
                                            </div>
                                            <div
                                                style={{
                                                    color: C.text,
                                                    fontSize: isFirst ? 19 : 16,
                                                    fontWeight: 800,
                                                    fontFamily: FONTS.sans,
                                                    textShadow: "0 2px 8px rgba(255,255,255,0.5)",
                                                }}
                                            >
                                                {p.name}
                                            </div>
                                            <div
                                                style={{
                                                    color: p.color,
                                                    fontSize: isFirst ? 22 : 19,
                                                    fontWeight: 800,
                                                    fontFamily: FONTS.heading,
                                                    letterSpacing: -0.5,
                                                    fontFeatureSettings: '"tnum"',
                                                }}
                                            >
                                                {compactCurrency(valueAnim)}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: C.em700,
                                                    background: "rgba(16,185,129,0.15)",
                                                    border: "1px solid rgba(16,185,129,0.4)",
                                                    padding: "2px 8px",
                                                    borderRadius: 100,
                                                    fontFamily: FONTS.sans,
                                                }}
                                            >
                                                ↑ {p.vs} vs mês anterior
                                            </div>
                                        </div>

                                        {/* Podium bar */}
                                        <div
                                            style={{
                                                width: isFirst ? 160 : 130,
                                                height: podiumH,
                                                background: `linear-gradient(180deg, ${p.color} 0%, ${p.color}99 55%, ${p.color}44 100%)`,
                                                borderRadius: "10px 10px 0 0",
                                                position: "relative",
                                                overflow: "hidden",
                                                boxShadow: `0 30px 60px -15px ${p.color}50, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.3)`,
                                                transform: `translateY(${(1 - ePodium) * 40}px)`,
                                                transformOrigin: "bottom",
                                            }}
                                        >
                                            {/* Shine */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 10,
                                                    right: 10,
                                                    height: "30%",
                                                    background:
                                                        "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)",
                                                    borderRadius: "8px 8px 0 0",
                                                }}
                                            />
                                            {/* Place number */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    bottom: 14,
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                    fontSize: isFirst ? 54 : 42,
                                                    fontWeight: 900,
                                                    fontFamily: FONTS.heading,
                                                    color: "#ffffff",
                                                    textShadow: "0 3px 10px rgba(15,23,42,0.35), 0 1px 2px rgba(15,23,42,0.4)",
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {p.place}º
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: leaderboard */}
                    <Glass
                        style={{
                            flex: 1,
                            padding: 22,
                            display: "flex",
                            flexDirection: "column",
                            opacity: interpolate(frame, [55, 78], [0, 1], { extrapolateRight: "clamp" }),
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 16,
                                paddingBottom: 14,
                                borderBottom: "1px solid rgba(15,23,42,0.08)",
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 800,
                                        color: C.text,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    Leaderboard · Mês
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: C.text3,
                                        fontFamily: FONTS.sans,
                                        marginTop: 2,
                                    }}
                                >
                                    Abril de 2026
                                </div>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    background: "rgba(16,185,129,0.12)",
                                    padding: "4px 10px",
                                    borderRadius: 100,
                                    border: "1px solid rgba(16,185,129,0.35)",
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
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: C.em700,
                                        fontFamily: FONTS.sans,
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                    }}
                                >
                                    Ao vivo
                                </span>
                            </div>
                        </div>

                        {list.map((p, i) => {
                            const delay = 75 + i * 8;
                            const op = interpolate(frame, [delay, delay + 18], [0, 1], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                            });
                            const tX = interpolate(frame, [delay, delay + 18], [20, 0], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                            });
                            const changeColor = p.vs.startsWith("+") ? C.em700 : p.vs.startsWith("-") ? "#e11d48" : C.text3;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "11px 4px",
                                        borderBottom: i < list.length - 1 ? `1px solid rgba(15,23,42,0.06)` : "none",
                                        opacity: op,
                                        transform: `translateX(${tX}px)`,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 24,
                                            color: C.text3,
                                            fontSize: 14,
                                            fontWeight: 800,
                                            fontFamily: FONTS.heading,
                                            textAlign: "center",
                                        }}
                                    >
                                        {p.rank}
                                    </div>
                                    <Avatar name={p.name} size={34} gradient={p.avatar} />
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                color: C.text,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            {p.name}
                                        </div>
                                        <div
                                            style={{
                                                color: C.text3,
                                                fontSize: 10,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            Nível {p.level} · {(p.level * 200 + 120).toLocaleString("pt-BR")} XP
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div
                                            style={{
                                                color: C.text,
                                                fontSize: 14,
                                                fontWeight: 800,
                                                fontFamily: FONTS.sans,
                                                fontFeatureSettings: '"tnum"',
                                            }}
                                        >
                                            {compactCurrency(p.value)}
                                        </div>
                                        <div
                                            style={{
                                                color: changeColor,
                                                fontSize: 10,
                                                fontWeight: 700,
                                                fontFamily: FONTS.mono,
                                            }}
                                        >
                                            {p.vs}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Bottom: achievements */}
                        <div
                            style={{
                                marginTop: "auto",
                                paddingTop: 16,
                                borderTop: "1px solid rgba(15,23,42,0.08)",
                                display: "flex",
                                gap: 8,
                                opacity: interpolate(frame, [120, 140], [0, 1], { extrapolateRight: "clamp" }),
                            }}
                        >
                            {[
                                { icon: <Icon.Trophy s={12} c={C.gold600} />, label: "5 metas batidas" },
                                { icon: <Icon.Flame s={12} c="#e11d48" />, label: "12 dias em streak" },
                                { icon: <Icon.Star s={12} c={C.vio600} />, label: "Nível 12" },
                            ].map((b, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "10px 6px",
                                        background: "#ffffff",
                                        border: "1px solid rgba(15,23,42,0.08)",
                                        borderRadius: 10,
                                        boxShadow: "0 2px 6px rgba(15,23,42,0.05)",
                                    }}
                                >
                                    {b.icon}
                                    <div
                                        style={{
                                            fontSize: 10,
                                            color: C.text2,
                                            fontFamily: FONTS.sans,
                                            fontWeight: 600,
                                            textAlign: "center",
                                        }}
                                    >
                                        {b.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Glass>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
