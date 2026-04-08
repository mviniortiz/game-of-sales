import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, fadeInOut, SceneBG, SectionHeader, Avatar, clamp01 } from "./lib";
import { Icon } from "./icons";

// Typewriter helper
const typed = (frame: number, text: string, startFrame: number, charsPerFrame = 1.0) => {
    const chars = Math.floor(Math.max(0, frame - startFrame) * charsPerFrame);
    return text.substring(0, Math.min(chars, text.length));
};

export const EvaScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    // Chat panel slide-in
    const chatSpring = spring({ frame: frame - 8, fps, config: { damping: 90, stiffness: 100, mass: 1 } });
    const chatX = interpolate(chatSpring, [0, 1], [-40, 0]);
    const chatOpacity = interpolate(frame, [8, 30], [0, 1], { extrapolateRight: "clamp" });

    // EVA sidebar slide-in
    const sidebarSpring = spring({ frame: frame - 28, fps, config: { damping: 90, stiffness: 100, mass: 1 } });
    const sidebarX = interpolate(sidebarSpring, [0, 1], [60, 0]);
    const sidebarOpacity = interpolate(frame, [28, 50], [0, 1], { extrapolateRight: "clamp" });

    // Suggested reply typewriter
    const suggestedReplyText =
        "Ana, que bom falar com você! Entendo a urgência. Posso te ligar agora às 14:30 pra alinhar valores e fechar ainda hoje?";
    const suggestedReply = typed(frame, suggestedReplyText, 80, 1.4);

    // Context chips appear
    const chipsOpacity = interpolate(frame, [65, 85], [0, 1], { extrapolateRight: "clamp" });

    // Button
    const buttonOpacity = interpolate(frame, [170, 190], [0, 1], { extrapolateRight: "clamp" });
    const buttonY = interpolate(frame, [170, 190], [15, 0], { extrapolateRight: "clamp" });

    // Pulsing AI glow
    const aiGlow = 0.4 + Math.sin(frame / 10) * 0.25;

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="violet" />

            <AbsoluteFill style={{ padding: "50px 80px 60px", display: "flex", flexDirection: "column" }}>
                <SectionHeader
                    frame={frame}
                    eyebrow="EVA · Copiloto de IA"
                    title="Uma IA que conversa pelo seu time."
                    accent={C.vio600}
                />

                {/* Main: chat (left) + EVA sidebar (right) */}
                <div style={{ marginTop: 30, flex: 1, display: "flex", gap: 22 }}>
                    {/* LEFT: compact WhatsApp chat */}
                    <div
                        style={{
                            flex: "0 0 520px",
                            opacity: chatOpacity,
                            transform: `translateX(${chatX}px)`,
                        }}
                    >
                        <div
                            style={{
                                background: C.waBg,
                                borderRadius: 20,
                                border: "1px solid rgba(15,23,42,0.08)",
                                overflow: "hidden",
                                boxShadow: "0 40px 100px -20px rgba(15,23,42,0.25), 0 0 0 1px rgba(15,23,42,0.04)",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    background: C.waPanel,
                                    padding: "14px 18px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    borderBottom: "1px solid rgba(15,23,42,0.06)",
                                }}
                            >
                                <Avatar name="Ana Silva" size={42} gradient={[C.pink, "#be185d"]} />
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            color: C.waText,
                                            fontSize: 15,
                                            fontWeight: 600,
                                            fontFamily: FONTS.sans,
                                        }}
                                    >
                                        Ana Silva
                                    </div>
                                    <div
                                        style={{
                                            color: C.em600,
                                            fontSize: 12,
                                            fontFamily: FONTS.sans,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 5,
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
                                        online
                                    </div>
                                </div>
                            </div>

                            {/* Chat messages */}
                            <div
                                style={{
                                    flex: 1,
                                    padding: "16px 18px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                    justifyContent: "flex-end",
                                    background: C.waBg,
                                }}
                            >
                                {[
                                    {
                                        side: "in",
                                        text: "Oi! Vi a proposta, gostei do que vi. Mas preciso fechar ainda hoje, tem como?",
                                        at: 15,
                                    },
                                    {
                                        side: "in",
                                        text: "Qual é o melhor horário pra gente conversar?",
                                        at: 40,
                                    },
                                    {
                                        side: "in",
                                        text: "Preciso mostrar pro meu sócio antes do fim do dia 🙏",
                                        at: 65,
                                    },
                                ].map((m, i) => {
                                    const op = interpolate(frame, [m.at, m.at + 14], [0, 1], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });
                                    const tY = interpolate(frame, [m.at, m.at + 14], [12, 0], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                alignSelf: "flex-start",
                                                maxWidth: "80%",
                                                opacity: op,
                                                transform: `translateY(${tY}px)`,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: C.waBubbleIn,
                                                    padding: "10px 13px 8px",
                                                    borderRadius: "4px 12px 12px 12px",
                                                    color: C.waText,
                                                    fontSize: 14,
                                                    lineHeight: 1.4,
                                                    fontFamily: FONTS.sans,
                                                    boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
                                                }}
                                            >
                                                {m.text}
                                                <div
                                                    style={{
                                                        marginTop: 2,
                                                        fontSize: 10,
                                                        color: "rgba(15,23,42,0.5)",
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    14:2{i + 6}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Composer with EVA draft injected */}
                            <div
                                style={{
                                    padding: "14px 14px 12px",
                                    background: C.waPanel,
                                    borderTop: `1px solid rgba(167,139,250,0.3)`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }}
                            >
                                {/* EVA indicator — inline above input */}
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignSelf: "flex-start",
                                        alignItems: "center",
                                        gap: 5,
                                        padding: "4px 11px",
                                        borderRadius: 100,
                                        background: `linear-gradient(135deg, ${C.vio500} 0%, ${C.vio600} 100%)`,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "white",
                                        fontFamily: FONTS.sans,
                                        boxShadow: `0 4px 12px -2px ${C.vio500}80`,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    <Icon.Sparkles s={10} c="white" />
                                    EVA sugere
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                    style={{
                                        flex: 1,
                                        background: "rgba(139,92,246,0.06)",
                                        border: `1.5px solid rgba(139,92,246,0.35)`,
                                        borderRadius: 12,
                                        padding: "11px 14px",
                                        color: C.text,
                                        fontSize: 13,
                                        fontFamily: FONTS.sans,
                                        minHeight: 54,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {suggestedReply}
                                    {suggestedReply.length < suggestedReplyText.length && frame > 80 && (
                                        <span
                                            style={{
                                                display: "inline-block",
                                                width: 6,
                                                height: 14,
                                                background: C.vio400,
                                                marginLeft: 2,
                                                verticalAlign: "middle",
                                                opacity: Math.sin(frame / 6) > 0 ? 1 : 0.2,
                                            }}
                                        />
                                    )}
                                </div>
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${C.vio500} 0%, ${C.vio600} 100%)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 4px 16px -2px ${C.vio500}80`,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon.Send s={18} c="white" />
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: EVA sidebar */}
                    <div
                        style={{
                            flex: 1,
                            opacity: sidebarOpacity,
                            transform: `translateX(${sidebarX}px)`,
                        }}
                    >
                        <div
                            style={{
                                background:
                                    "linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(243,232,255,0.85) 60%, rgba(237,233,254,0.9) 100%)",
                                border: "1.5px solid rgba(139,92,246,0.3)",
                                borderRadius: 18,
                                padding: 24,
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                backdropFilter: "blur(20px)",
                                boxShadow: `0 30px 80px -18px rgba(139,92,246,0.35), 0 4px 14px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
                            }}
                        >
                            {/* EVA header */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginBottom: 22,
                                    paddingBottom: 16,
                                    borderBottom: "1px solid rgba(139,92,246,0.18)",
                                }}
                            >
                                <div style={{ position: "relative" }}>
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 13,
                                            background: `linear-gradient(135deg, ${C.vio500} 0%, ${C.vio600} 100%)`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: `0 8px 24px -4px ${C.vio500}80`,
                                        }}
                                    >
                                        <Icon.Sparkles s={22} c="white" />
                                    </div>
                                    {/* Pulsing ring */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: -4,
                                            borderRadius: 16,
                                            border: `2px solid ${C.vio400}`,
                                            opacity: aiGlow,
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: C.text,
                                                fontSize: 19,
                                                fontWeight: 800,
                                                fontFamily: FONTS.heading,
                                                letterSpacing: -0.3,
                                            }}
                                        >
                                            EVA
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                color: C.vio600,
                                                background: "rgba(139,92,246,0.15)",
                                                border: "1px solid rgba(139,92,246,0.4)",
                                                padding: "2px 7px",
                                                borderRadius: 100,
                                                fontFamily: FONTS.mono,
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            AI
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: C.vio600,
                                            fontFamily: FONTS.sans,
                                            marginTop: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 5,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 5,
                                                height: 5,
                                                borderRadius: "50%",
                                                background: C.vio500,
                                                boxShadow: `0 0 6px ${C.vio500}`,
                                            }}
                                        />
                                        analisando conversa
                                    </div>
                                </div>
                            </div>

                            {/* Section: Contexto */}
                            <div
                                style={{
                                    marginBottom: 20,
                                    opacity: chipsOpacity,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: C.vio600,
                                        textTransform: "uppercase",
                                        letterSpacing: 1.5,
                                        fontFamily: FONTS.sans,
                                        marginBottom: 10,
                                    }}
                                >
                                    Contexto detectado
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {[
                                        { icon: "🔥", label: "Alta urgência", col: "#e11d48" },
                                        { icon: "✓", label: "Intenção de compra", col: C.em600 },
                                        { icon: "⏱", label: "Prazo apertado", col: C.gold600 },
                                        { icon: "👥", label: "Decisão compartilhada", col: "#2563eb" },
                                    ].map((tag, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                padding: "6px 11px",
                                                background: "#ffffff",
                                                border: `1.5px solid ${tag.col}55`,
                                                borderRadius: 8,
                                                fontSize: 11,
                                                color: tag.col,
                                                fontFamily: FONTS.sans,
                                                fontWeight: 700,
                                                boxShadow: `0 2px 6px ${tag.col}20`,
                                            }}
                                        >
                                            <span>{tag.icon}</span>
                                            {tag.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Resumo da conversa */}
                            <div
                                style={{
                                    background: "rgba(255,255,255,0.85)",
                                    border: "1px solid rgba(139,92,246,0.2)",
                                    borderRadius: 12,
                                    padding: "14px 16px",
                                    marginBottom: 18,
                                    opacity: interpolate(frame, [75, 95], [0, 1], { extrapolateRight: "clamp" }),
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: C.vio600,
                                        textTransform: "uppercase",
                                        letterSpacing: 1.5,
                                        fontFamily: FONTS.sans,
                                        marginBottom: 6,
                                    }}
                                >
                                    Resumo em 1 linha
                                </div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: C.text2,
                                        fontFamily: FONTS.sans,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Lead quer fechar <strong style={{ color: C.text }}>hoje</strong> e precisa alinhar
                                    com o sócio. Melhor ação: ligar imediatamente pra manter o ritmo.
                                </div>
                            </div>

                            {/* Section: Próximas ações sugeridas */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: C.vio600,
                                        textTransform: "uppercase",
                                        letterSpacing: 1.5,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    Próximas ações
                                </div>
                                {[
                                    { icon: <Icon.Phone s={14} c={C.em600} />, label: "Ligar agora · 14:30", col: C.em600 },
                                    { icon: <Icon.Mail s={14} c="#2563eb" />, label: "Reenviar proposta em PDF", col: "#2563eb" },
                                    { icon: <Icon.Calendar s={14} c={C.gold600} />, label: "Follow-up amanhã 9h", col: C.gold600 },
                                ].map((a, i) => {
                                    const delay = 130 + i * 10;
                                    const op = interpolate(frame, [delay, delay + 16], [0, 1], {
                                        extrapolateLeft: "clamp",
                                        extrapolateRight: "clamp",
                                    });
                                    const tX = interpolate(frame, [delay, delay + 16], [18, 0], {
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
                                                padding: "11px 13px",
                                                background: "#ffffff",
                                                border: "1px solid rgba(15,23,42,0.08)",
                                                borderRadius: 10,
                                                opacity: op,
                                                transform: `translateX(${tX}px)`,
                                                boxShadow: "0 2px 6px rgba(15,23,42,0.05)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 7,
                                                    background: `${a.col}15`,
                                                    border: `1px solid ${a.col}40`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {a.icon}
                                            </div>
                                            <span
                                                style={{
                                                    flex: 1,
                                                    color: C.text,
                                                    fontSize: 13,
                                                    fontFamily: FONTS.sans,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {a.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* "Usar sugestão" button */}
                            <div
                                style={{
                                    marginTop: 16,
                                    opacity: buttonOpacity,
                                    transform: `translateY(${buttonY}px)`,
                                }}
                            >
                                <div
                                    style={{
                                        background: `linear-gradient(135deg, ${C.vio500} 0%, ${C.vio600} 100%)`,
                                        padding: "12px 18px",
                                        borderRadius: 12,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        color: "white",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        fontFamily: FONTS.sans,
                                        boxShadow: `0 10px 30px -5px ${C.vio500}80`,
                                    }}
                                >
                                    <Icon.Sparkles s={16} c="white" />
                                    Enviar com EVA
                                    <Icon.ArrowRight s={15} c="white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
