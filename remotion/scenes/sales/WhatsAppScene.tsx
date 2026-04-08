import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, fadeInOut, SceneBG, SectionHeader, Glass, Avatar, clamp01 } from "./lib";
import { Icon } from "./icons";

interface Msg {
    side: "in" | "out";
    text?: string;
    type?: "text" | "audio" | "image";
    appearAt: number;
    duration?: string;
}

const messages: Msg[] = [
    { side: "in", type: "text", text: "Oi! Atendem qual tipo de time?", appearAt: 30 },
    { side: "out", type: "text", text: "Atendemos times de vendas. Posso te ligar?", appearAt: 60 },
    { side: "in", type: "audio", duration: "0:12", appearAt: 95 },
    { side: "out", type: "image", appearAt: 135 },
];

export const WhatsAppScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const opacity = fadeInOut(frame, durationInFrames, 12, 18);

    // Phone slide-in
    const phoneSpring = spring({ frame: frame - 8, fps, config: { damping: 95, stiffness: 110, mass: 1 } });
    const phoneScale = interpolate(phoneSpring, [0, 1], [0.85, 1]);
    const phoneOpacity = interpolate(frame, [8, 32], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="emerald" />

            <AbsoluteFill style={{ padding: "50px 80px 60px", display: "flex", alignItems: "center", gap: 50 }}>
                {/* LEFT: WhatsApp UI */}
                <div
                    style={{
                        flex: "0 0 660px",
                        opacity: phoneOpacity,
                        transform: `scale(${phoneScale}) perspective(1500px) rotateY(-3deg)`,
                        transformOrigin: "left center",
                    }}
                >
                    <Glass
                        style={{
                            background: C.waBg,
                            borderRadius: 24,
                            border: "1px solid rgba(15,23,42,0.1)",
                            overflow: "hidden",
                            boxShadow: "0 60px 120px -25px rgba(15,23,42,0.3), 0 0 0 1px rgba(15,23,42,0.06), 0 0 100px -30px rgba(37,211,102,0.35)",
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                background: C.waPanel,
                                padding: "16px 20px",
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                borderBottom: "1px solid rgba(15,23,42,0.06)",
                            }}
                        >
                            <Avatar name="Ana Silva" size={48} gradient={[C.pink, "#be185d"]} />
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        color: C.waText,
                                        fontSize: 17,
                                        fontWeight: 600,
                                        fontFamily: FONTS.sans,
                                    }}
                                >
                                    Ana Silva
                                </div>
                                <div
                                    style={{
                                        color: C.em600,
                                        fontSize: 13,
                                        fontFamily: FONTS.sans,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
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
                                    online · digitando...
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 16, color: "rgba(15,23,42,0.55)" }}>
                                <Icon.Phone s={20} c="rgba(15,23,42,0.55)" />
                                <Icon.Search s={20} c="rgba(15,23,42,0.55)" />
                            </div>
                        </div>

                        {/* Chat area with subtle bg pattern */}
                        <div
                            style={{
                                height: 420,
                                padding: "20px 22px",
                                background: `${C.waBg} radial-gradient(circle at 30% 20%, rgba(37,211,102,0.04) 0%, transparent 50%)`,
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                justifyContent: "flex-end",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            {messages.map((m, i) => {
                                const op = interpolate(frame, [m.appearAt, m.appearAt + 14], [0, 1], {
                                    extrapolateLeft: "clamp",
                                    extrapolateRight: "clamp",
                                });
                                const tY = interpolate(frame, [m.appearAt, m.appearAt + 14], [16, 0], {
                                    extrapolateLeft: "clamp",
                                    extrapolateRight: "clamp",
                                });
                                const isOut = m.side === "out";

                                if (m.type === "audio") {
                                    const wave = Array.from({ length: 28 }).map((_, j) => {
                                        const phase = frame / 6 + j * 0.5;
                                        const h = 4 + Math.abs(Math.sin(phase)) * 16;
                                        return h;
                                    });
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                alignSelf: isOut ? "flex-end" : "flex-start",
                                                maxWidth: "72%",
                                                opacity: op,
                                                transform: `translateY(${tY}px)`,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: isOut ? C.waBubbleOut : C.waBubbleIn,
                                                    padding: "12px 14px",
                                                    borderRadius: isOut ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: "50%",
                                                        background: "rgba(16,185,129,0.18)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <Icon.PlayCircle s={28} c={C.em600} />
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 2, height: 24 }}>
                                                    {wave.map((h, k) => (
                                                        <div
                                                            key={k}
                                                            style={{
                                                                width: 2.5,
                                                                height: h,
                                                                borderRadius: 2,
                                                                background: k < 14 ? C.em600 : "rgba(15,23,42,0.25)",
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <div
                                                    style={{
                                                        color: "rgba(15,23,42,0.55)",
                                                        fontSize: 12,
                                                        fontFamily: FONTS.sans,
                                                    }}
                                                >
                                                    {m.duration}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (m.type === "image") {
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                alignSelf: isOut ? "flex-end" : "flex-start",
                                                maxWidth: "60%",
                                                opacity: op,
                                                transform: `translateY(${tY}px)`,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: isOut ? C.waBubbleOut : C.waBubbleIn,
                                                    padding: 6,
                                                    borderRadius: isOut ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                                                    boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 200,
                                                        height: 120,
                                                        borderRadius: 8,
                                                        background:
                                                            "linear-gradient(135deg, #10b981 0%, #059669 50%, #f59e0b 100%)",
                                                        position: "relative",
                                                        overflow: "hidden",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            inset: 0,
                                                            background:
                                                                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            color: "white",
                                                            fontSize: 14,
                                                            fontFamily: FONTS.sans,
                                                            fontWeight: 600,
                                                            textAlign: "center",
                                                            zIndex: 1,
                                                        }}
                                                    >
                                                        📊 Proposta
                                                        <br />
                                                        Comercial
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        marginTop: 6,
                                                        padding: "0 6px 4px",
                                                        display: "flex",
                                                        justifyContent: "flex-end",
                                                        gap: 4,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "rgba(15,23,42,0.55)",
                                                            fontSize: 11,
                                                            fontFamily: FONTS.sans,
                                                        }}
                                                    >
                                                        14:28
                                                    </span>
                                                    <Icon.CheckCheck s={14} c={C.blue} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            alignSelf: isOut ? "flex-end" : "flex-start",
                                            maxWidth: "75%",
                                            opacity: op,
                                            transform: `translateY(${tY}px)`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                background: isOut ? C.waBubbleOut : C.waBubbleIn,
                                                padding: "10px 14px 8px",
                                                borderRadius: isOut ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                                                color: C.waText,
                                                fontSize: 15,
                                                lineHeight: 1.4,
                                                fontFamily: FONTS.sans,
                                                boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
                                            }}
                                        >
                                            {m.text}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    marginTop: 2,
                                                    fontSize: 11,
                                                    color: "rgba(15,23,42,0.5)",
                                                }}
                                            >
                                                14:2{i + 5}
                                                {isOut && <Icon.CheckCheck s={14} c={C.blue} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Composer */}
                        <div
                            style={{
                                padding: "12px 16px",
                                background: C.waPanel,
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    background: "#ffffff",
                                    border: "1px solid rgba(15,23,42,0.06)",
                                    borderRadius: 100,
                                    padding: "10px 16px",
                                    color: "rgba(15,23,42,0.4)",
                                    fontSize: 14,
                                    fontFamily: FONTS.sans,
                                }}
                            >
                                Mensagem
                            </div>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    background: C.wa,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: `0 4px 16px -2px ${C.wa}80`,
                                }}
                            >
                                <Icon.Mic s={20} c="white" />
                            </div>
                        </div>
                    </Glass>
                </div>

                {/* RIGHT: text content — clean title + subtitle */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <SectionHeader
                        frame={frame}
                        eyebrow="WhatsApp Nativo"
                        title="Toda conversa. Todo contexto. Em um só lugar."
                        accent="#128c7e"
                    />
                    <div
                        style={{
                            marginTop: 26,
                            fontSize: 22,
                            lineHeight: 1.5,
                            color: C.text2,
                            fontFamily: FONTS.sans,
                            maxWidth: 620,
                            opacity: interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" }),
                            transform: `translateY(${interpolate(frame, [35, 55], [18, 0], { extrapolateRight: "clamp" })}px)`,
                        }}
                    >
                        Áudios, imagens, vídeos e documentos.{" "}
                        <span style={{ color: "#128c7e", fontWeight: 700 }}>Tudo dentro do CRM</span>
                        , com a EVA sugerindo a próxima resposta em tempo real.
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
