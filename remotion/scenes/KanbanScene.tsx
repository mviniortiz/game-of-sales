import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

// Dados mock para o Kanban
const columns = [
    {
        title: "Leads",
        color: "#6366f1",
        cards: [
            { name: "Tech Corp", value: "R$ 15.000" },
            { name: "StartupXYZ", value: "R$ 8.500" },
        ],
    },
    {
        title: "Qualificação",
        color: "#8b5cf6",
        cards: [
            { name: "Empresa ABC", value: "R$ 25.000" },
        ],
    },
    {
        title: "Proposta",
        color: "#a855f7",
        cards: [
            { name: "Global Inc", value: "R$ 45.000" },
            { name: "MegaStore", value: "R$ 32.000" },
        ],
    },
    {
        title: "Negociação",
        color: "#d946ef",
        cards: [
            { name: "Prime Ltd", value: "R$ 67.000" },
        ],
    },
    {
        title: "Fechado ✓",
        color: "#22c55e",
        cards: [
            { name: "Alpha Corp", value: "R$ 120.000" },
        ],
    },
];

export const KanbanScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Animação do card sendo arrastado (simula drag)
    const dragProgress = interpolate(frame, [60, 120], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Posição do card arrastado
    const dragX = interpolate(dragProgress, [0, 0.5, 1], [0, 180, 360]);
    const dragY = interpolate(dragProgress, [0, 0.25, 0.5, 0.75, 1], [0, -30, -20, -30, 0]);
    const dragScale = interpolate(dragProgress, [0, 0.1, 0.9, 1], [1, 1.05, 1.05, 1]);
    const dragRotate = interpolate(dragProgress, [0, 0.5, 1], [0, -3, 0]);
    const dragOpacity = dragProgress > 0 && dragProgress < 1 ? 0.9 : 1;

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(180deg, #0f0a1e 0%, #1a0f2e 100%)",
                padding: 60,
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 40,
                    opacity: interpolate(frame, [0, 15], [0, 1]),
                }}
            >
                <h2
                    style={{
                        fontSize: 42,
                        fontWeight: 700,
                        color: "white",
                        margin: 0,
                    }}
                >
                    🎯 Deal Command Center
                </h2>
                <div
                    style={{
                        background: "rgba(34, 197, 94, 0.2)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: 12,
                        padding: "12px 24px",
                        color: "#22c55e",
                        fontSize: 18,
                        fontWeight: 600,
                    }}
                >
                    Pipeline: R$ 312.500
                </div>
            </div>

            {/* Kanban Board */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 20,
                    height: "calc(100% - 140px)",
                }}
            >
                {columns.map((column, colIndex) => {
                    const columnDelay = 15 + colIndex * 8;
                    const columnOpacity = interpolate(frame - columnDelay, [0, 15], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });
                    const columnY = interpolate(frame - columnDelay, [0, 15], [40, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                    });

                    return (
                        <div
                            key={colIndex}
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: 16,
                                padding: 16,
                                border: "1px solid rgba(255,255,255,0.08)",
                                opacity: columnOpacity,
                                transform: `translateY(${columnY}px)`,
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {/* Header da coluna */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 16,
                                    paddingBottom: 12,
                                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                                }}
                            >
                                <div
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: "50%",
                                        background: column.color,
                                        boxShadow: `0 0 12px ${column.color}80`,
                                    }}
                                />
                                <span style={{ color: "white", fontWeight: 600, fontSize: 16 }}>
                                    {column.title}
                                </span>
                                <span
                                    style={{
                                        marginLeft: "auto",
                                        background: "rgba(255,255,255,0.1)",
                                        borderRadius: 8,
                                        padding: "4px 10px",
                                        fontSize: 13,
                                        color: "rgba(255,255,255,0.6)",
                                    }}
                                >
                                    {column.cards.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {column.cards.map((card, cardIndex) => {
                                    const cardDelay = columnDelay + 20 + cardIndex * 6;
                                    const cardScale = spring({
                                        frame: frame - cardDelay,
                                        fps,
                                        from: 0.9,
                                        to: 1,
                                        config: { damping: 15, stiffness: 150 },
                                    });
                                    const cardOpacity = interpolate(frame - cardDelay, [0, 8], [0, 1], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });

                                    // Card especial sendo arrastado (terceira coluna, primeiro card)
                                    const isDragging = colIndex === 2 && cardIndex === 0;
                                    const cardStyle = isDragging
                                        ? {
                                            transform: `translateX(${dragX}px) translateY(${dragY}px) scale(${dragScale}) rotate(${dragRotate}deg)`,
                                            opacity: dragOpacity,
                                            zIndex: 100,
                                            boxShadow: dragProgress > 0 ? "0 20px 50px rgba(0,0,0,0.5)" : "none",
                                        }
                                        : {
                                            transform: `scale(${cardScale})`,
                                            opacity: cardOpacity,
                                        };

                                    return (
                                        <div
                                            key={cardIndex}
                                            style={{
                                                background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
                                                borderRadius: 12,
                                                padding: 16,
                                                border: `1px solid ${isDragging && dragProgress > 0 ? column.color : "rgba(255,255,255,0.1)"}`,
                                                position: "relative",
                                                ...cardStyle,
                                            }}
                                        >
                                            <p
                                                style={{
                                                    color: "white",
                                                    fontSize: 15,
                                                    fontWeight: 600,
                                                    margin: 0,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                {card.name}
                                            </p>
                                            <p
                                                style={{
                                                    color: "#22c55e",
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    margin: 0,
                                                }}
                                            >
                                                {card.value}
                                            </p>
                                            {/* Avatar fake */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    right: 12,
                                                    bottom: 12,
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: "50%",
                                                    background: `linear-gradient(135deg, ${column.color} 0%, ${column.color}80 100%)`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 12,
                                                    color: "white",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {card.name.charAt(0)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Texto animado no final */}
            {frame > 120 && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 40,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        opacity: interpolate(frame, [120, 140], [0, 1]),
                    }}
                >
                    <p
                        style={{
                            fontSize: 24,
                            color: "rgba(255,255,255,0.8)",
                            margin: 0,
                            fontWeight: 500,
                        }}
                    >
                        Arraste e solte seus deals pelo pipeline 🚀
                    </p>
                </div>
            )}
        </AbsoluteFill>
    );
};
