import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONTS, fadeInOut, SceneBG, SectionHeader, Glass, Avatar, useCountUp, clamp01 } from "./lib";
import { Icon } from "./icons";

interface Card {
    id: string;
    name: string;
    company: string;
    value: number;
    avatar: [string, string];
    tag?: string;
}

const compactCurrency = (n: number): string => {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2).replace(".", ",")} M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace(".", ",")} k`;
    return `R$ ${n}`;
};

// Animation timing
const MOVE_START = 115;
const MOVE_END = 145;

// Card that moves
const ANA_CARD: Card = {
    id: "ana",
    name: "Ana Silva",
    company: "Agência Boost",
    value: 18500,
    avatar: [C.pink, "#be185d"],
    tag: "Quente",
};

// Static columns
const baseColumns: { id: string; title: string; color: string; cards: Card[] }[] = [
    {
        id: "novo",
        title: "Novo Lead",
        color: C.blue,
        cards: [
            { id: "pedro", name: "Pedro M.", company: "TechCo", value: 4200, avatar: [C.blue, "#1d4ed8"] },
            { id: "larissa", name: "Larissa F.", company: "StartUp X", value: 8500, avatar: [C.pink, "#be185d"] },
            { id: "joao", name: "João S.", company: "Agência Y", value: 3800, avatar: [C.gold500, C.gold600] },
        ],
    },
    {
        id: "qualificado",
        title: "Qualificado",
        color: C.vio500,
        cards: [
            { id: "camila", name: "Camila R.", company: "Ed Tech", value: 12400, avatar: [C.vio500, C.vio600], tag: "Quente" },
            { id: "bruno", name: "Bruno T.", company: "Saúde+", value: 9800, avatar: [C.em500, C.em600] },
        ],
    },
    {
        id: "proposta",
        title: "Proposta",
        color: C.gold500,
        cards: [
            ANA_CARD,
            { id: "felipe", name: "Felipe N.", company: "Comércio", value: 14200, avatar: [C.blue, "#1d4ed8"] },
        ],
    },
    {
        id: "fechamento",
        title: "Fechamento",
        color: C.em500,
        cards: [
            { id: "julia", name: "Júlia P.", company: "Premium", value: 24000, avatar: [C.gold500, C.gold600], tag: "🔥" },
            { id: "rafael", name: "Rafael C.", company: "Pro Inc", value: 19500, avatar: [C.em500, C.em600] },
        ],
    },
];

interface CardViewProps {
    card: Card;
    accent: string;
    opacity?: number;
    translateY?: number;
    highlight?: boolean;
}

const KanbanCard: React.FC<CardViewProps> = ({ card, accent, opacity = 1, translateY = 0, highlight = false }) => (
    <div
        style={{
            background: highlight
                ? "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(255,255,255,0.9) 60%)"
                : "#ffffff",
            border: highlight ? `1.5px solid ${C.em500}` : "1px solid rgba(15,23,42,0.08)",
            borderLeft: `3px solid ${accent}`,
            borderRadius: 12,
            padding: 14,
            opacity,
            transform: `translateY(${translateY}px)`,
            backdropFilter: "blur(10px)",
            boxShadow: highlight
                ? `0 0 30px -5px ${C.em500}55, 0 6px 20px -6px rgba(15,23,42,0.12)`
                : "0 3px 12px -4px rgba(15,23,42,0.1), 0 1px 3px rgba(15,23,42,0.05)",
        }}
    >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar name={card.name} size={32} gradient={card.avatar} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        color: C.text,
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: FONTS.sans,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {card.name}
                </div>
                <div
                    style={{
                        color: C.text3,
                        fontSize: 11,
                        fontFamily: FONTS.sans,
                    }}
                >
                    {card.company}
                </div>
            </div>
            {card.tag && (
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: C.gold600,
                        background: "rgba(251,191,36,0.15)",
                        border: "1px solid rgba(251,191,36,0.4)",
                        padding: "2px 6px",
                        borderRadius: 6,
                        fontFamily: FONTS.sans,
                    }}
                >
                    {card.tag}
                </div>
            )}
        </div>
        <div
            style={{
                fontSize: 17,
                fontWeight: 800,
                color: highlight ? C.em700 : accent,
                fontFamily: FONTS.sans,
                letterSpacing: -0.3,
                fontFeatureSettings: '"tnum"',
            }}
        >
            {compactCurrency(card.value)}
        </div>
    </div>
);

export const KanbanScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    const total = useCountUp(frame, 114900, 90, 160);

    // Movement phase
    const moveT = clamp01((frame - MOVE_START) / (MOVE_END - MOVE_START));
    const moveStarted = frame >= MOVE_START;
    const moveDone = frame >= MOVE_END;
    // Ease move with cubic ease-in-out
    const moveEased = moveT < 0.5 ? 2 * moveT * moveT : 1 - Math.pow(-2 * moveT + 2, 2) / 2;

    // Build active columns based on animation phase
    const columns = baseColumns.map((col) => {
        if (col.id === "proposta") {
            // Remove Ana if movement started
            return {
                ...col,
                cards: moveStarted ? col.cards.filter((c) => c.id !== "ana") : col.cards,
            };
        }
        if (col.id === "fechamento") {
            // Add Ana at the top if movement is done
            return {
                ...col,
                cards: moveDone ? [ANA_CARD, ...col.cards] : col.cards,
            };
        }
        return col;
    });

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="emerald" />

            <AbsoluteFill style={{ padding: "50px 80px 50px", display: "flex", flexDirection: "column" }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="Pipeline Visual"
                    title="Do primeiro contato ao fechamento. Sem atrito."
                    accent={C.em600}
                />

                {/* Kanban */}
                <div
                    style={{
                        marginTop: 30,
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 16,
                        position: "relative",
                    }}
                >
                    {columns.map((col, ci) => {
                        const colDelay = 15 + ci * 5;
                        const colOp = interpolate(frame, [colDelay, colDelay + 18], [0, 1], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        });
                        const colY = interpolate(frame, [colDelay, colDelay + 18], [35, 0], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                        });

                        return (
                            <div
                                key={col.id}
                                style={{
                                    opacity: colOp,
                                    transform: `translateY(${colY}px)`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                }}
                            >
                                {/* Column header */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "10px 14px",
                                        background: `${col.color}12`,
                                        borderRadius: 10,
                                        border: `1px solid ${col.color}40`,
                                        boxShadow: "0 2px 6px rgba(15,23,42,0.05)",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                background: col.color,
                                                boxShadow: `0 0 10px ${col.color}`,
                                            }}
                                        />
                                        <span
                                            style={{
                                                color: C.text,
                                                fontSize: 13,
                                                fontWeight: 800,
                                                fontFamily: FONTS.sans,
                                                textTransform: "uppercase",
                                                letterSpacing: 1,
                                            }}
                                        >
                                            {col.title}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            background: "#ffffff",
                                            color: col.color,
                                            padding: "2px 10px",
                                            borderRadius: 100,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            fontFamily: FONTS.mono,
                                            border: `1px solid ${col.color}55`,
                                        }}
                                    >
                                        {col.cards.length}
                                    </span>
                                </div>

                                {/* Cards */}
                                {col.cards.map((card, cdx) => {
                                    // Special: Ana arriving in Fechamento
                                    if (col.id === "fechamento" && card.id === "ana" && moveDone) {
                                        const landT = clamp01((frame - MOVE_END) / 15);
                                        const landOp = interpolate(frame, [MOVE_END, MOVE_END + 10], [0, 1], {
                                            extrapolateLeft: "clamp",
                                            extrapolateRight: "clamp",
                                        });
                                        return (
                                            <KanbanCard
                                                key={card.id}
                                                card={card}
                                                accent={col.color}
                                                opacity={landOp}
                                                translateY={(1 - landT) * -8}
                                                highlight={landT < 1}
                                            />
                                        );
                                    }

                                    const delay = 25 + ci * 5 + cdx * 6;
                                    const op = interpolate(frame, [delay, delay + 16], [0, 1], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });
                                    const tY = interpolate(frame, [delay, delay + 16], [18, 0], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });

                                    return (
                                        <KanbanCard
                                            key={card.id}
                                            card={card}
                                            accent={col.color}
                                            opacity={op}
                                            translateY={tY}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Flying Ana card during the move */}
                    {moveStarted && !moveDone && (
                        <div
                            style={{
                                position: "absolute",
                                top: 60,
                                left: `calc(${62.5 + moveEased * 25}% - 110px)`,
                                width: 220,
                                transform: `rotate(${(1 - moveT) * 3}deg) scale(${1 + (1 - moveT) * 0.04})`,
                                pointerEvents: "none",
                                zIndex: 10,
                                filter: `drop-shadow(0 30px 50px ${C.em400}50)`,
                            }}
                        >
                            <div
                                style={{
                                    background: "linear-gradient(135deg, #ffffff 0%, rgba(16,185,129,0.12) 100%)",
                                    border: `2px solid ${C.em500}`,
                                    borderLeft: `3px solid ${C.em500}`,
                                    borderRadius: 12,
                                    padding: 14,
                                    backdropFilter: "blur(20px)",
                                    boxShadow: `0 0 60px -8px ${C.em500}, 0 20px 40px -10px rgba(15,23,42,0.2)`,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        marginBottom: 10,
                                    }}
                                >
                                    <Avatar name="Ana Silva" size={32} gradient={[C.pink, "#be185d"]} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                color: C.text,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            Ana Silva
                                        </div>
                                        <div
                                            style={{
                                                color: C.text3,
                                                fontSize: 11,
                                                fontFamily: FONTS.sans,
                                            }}
                                        >
                                            Agência Boost
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: 17,
                                        fontWeight: 800,
                                        color: C.em700,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    R$ 18,5 k
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom bar: total */}
                <Glass
                    style={{
                        marginTop: 20,
                        padding: "16px 26px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        opacity: interpolate(frame, [85, 105], [0, 1], { extrapolateRight: "clamp" }),
                        transform: `translateY(${interpolate(frame, [85, 105], [16, 0], { extrapolateRight: "clamp" })}px)`,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 11,
                                background: `linear-gradient(135deg, ${C.em500} 0%, ${C.em700} 100%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: `0 8px 24px -4px ${C.em500}60`,
                            }}
                        >
                            <Icon.DollarSign s={20} c="white" />
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: C.text3,
                                    textTransform: "uppercase",
                                    letterSpacing: 1.5,
                                    fontFamily: FONTS.sans,
                                    fontWeight: 700,
                                }}
                            >
                                Pipeline total
                            </div>
                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 900,
                                    color: C.text,
                                    fontFamily: FONTS.sans,
                                    letterSpacing: -0.5,
                                    fontFeatureSettings: '"tnum"',
                                }}
                            >
                                {compactCurrency(total)}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 28 }}>
                        {[
                            { l: "Em aberto", v: "9", col: "#2563eb" },
                            { l: "Quentes", v: "3", col: C.gold600 },
                            { l: "Fechando", v: moveDone ? "3" : "2", col: C.em600 },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: "center" }}>
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: C.text3,
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        fontFamily: FONTS.sans,
                                        fontWeight: 700,
                                    }}
                                >
                                    {s.l}
                                </div>
                                <div
                                    style={{
                                        fontSize: 24,
                                        fontWeight: 900,
                                        color: s.col,
                                        fontFamily: FONTS.heading,
                                    }}
                                >
                                    {s.v}
                                </div>
                            </div>
                        ))}
                    </div>
                </Glass>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
