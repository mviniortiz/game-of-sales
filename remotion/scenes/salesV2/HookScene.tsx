import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, SceneBG, fadeInOut, useIsVertical } from "./lib";

// ============================================
// HOOK SCENE — 4s / 120 frames
// Arco: "toda segunda é a mesma história"
// Left : planilha caótica
// Right: WhatsApp cobrança empilhada
// Bottom: headline brand
// ============================================
export const HookScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 8, 12);

    // Spreadsheet entrance (tilt + slide up)
    const sheetSpring = spring({ frame: frame - 6, fps, config: { damping: 120, stiffness: 90, mass: 1 } });
    const sheetY = interpolate(sheetSpring, [0, 1], [40, 0]);
    const sheetOpacity = interpolate(frame, [6, 30], [0, 1], { extrapolateRight: "clamp" });
    const sheetRot = interpolate(sheetSpring, [0, 1], [-3, -1.5]);

    // WhatsApp panel entrance (slide from right)
    const waSpring = spring({ frame: frame - 24, fps, config: { damping: 120, stiffness: 90, mass: 1 } });
    const waX = interpolate(waSpring, [0, 1], [80, 0]);
    const waOpacity = interpolate(frame, [24, 48], [0, 1], { extrapolateRight: "clamp" });
    const waRot = interpolate(waSpring, [0, 1], [3, 1.2]);

    // Headline entrance
    const headOpacity = interpolate(frame, [68, 92], [0, 1], { extrapolateRight: "clamp" });
    const headY = interpolate(frame, [68, 92], [18, 0], { extrapolateRight: "clamp" });

    // Subtle ambient shake on the chaos feel
    const shake = Math.sin(frame / 6) * 0.6;

    // Spreadsheet rows — intencionalmente caóticas
    const rows = [
        { cliente: "Cliente A", valor: "R$ 12.500", status: "Fechado?", chaos: false, strike: false },
        { cliente: "Maria (?)", valor: "R$ 8k", status: "ver depois", chaos: true, strike: false },
        { cliente: "Lead #447", valor: "?", status: "?", chaos: true, strike: false },
        { cliente: "João Silva", valor: "R$ 3.200", status: "Ganho", chaos: false, strike: false },
        { cliente: "??", valor: "15k??", status: "perdido", chaos: true, strike: false },
        { cliente: "Pedro Costa", valor: "R$ 9.800", status: "Negoci.", chaos: false, strike: false },
        { cliente: "duplicado", valor: "R$ 3.200", status: "Ganho", chaos: true, strike: true },
    ];

    // Messages que aparecem sequencialmente
    const messages = [
        { text: "E aí, como tá a meta?", at: 32 },
        { text: "Me atualiza o grupo", at: 50 },
        { text: "Cadê o fechamento de ontem?", at: 68 },
    ];

    return (
        <AbsoluteFill style={{ opacity }}>
            <SceneBG frame={frame} tint="red" />

            <AbsoluteFill style={{ padding: vert ? "90px 60px" : "70px 100px", display: "flex", flexDirection: "column", gap: vert ? 36 : 44 }}>
                {/* Main stage */}
                <div style={{ display: "flex", flexDirection: vert ? "column" : "row", gap: vert ? 28 : 40, flex: 1, alignItems: vert ? "stretch" : "center" }}>
                    {/* LEFT: Messy spreadsheet */}
                    <div
                        style={{
                            flex: 1.35,
                            opacity: sheetOpacity,
                            transform: `translate(${shake}px, ${sheetY}px) rotate(${sheetRot}deg)`,
                            background: "linear-gradient(180deg, #ffffff 0%, #f1f3f4 100%)",
                            borderRadius: 12,
                            boxShadow:
                                "0 50px 120px -25px rgba(0,0,0,0.75), 0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                    >
                        {/* Title bar */}
                        <div
                            style={{
                                background: "#e8eaed",
                                padding: "12px 18px",
                                borderBottom: "1px solid #dadce0",
                                fontFamily: FONTS.sans,
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#5f6368",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <div style={{ display: "flex", gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
                            </div>
                            <span style={{ marginLeft: 8 }}>vendas_abril_FINAL_v3_REAL_usaESSE.xlsx</span>
                        </div>
                        {/* Header row */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1.8fr 1.1fr 1fr 0.4fr",
                                background: "#f1f3f4",
                                padding: "10px 14px",
                                borderBottom: "1px solid #dadce0",
                                fontFamily: FONTS.mono,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#3c4043",
                                letterSpacing: 0.5,
                            }}
                        >
                            <div>CLIENTE</div>
                            <div>VALOR</div>
                            <div>STATUS</div>
                            <div />
                        </div>
                        {rows.map((r, i) => {
                            const rowIn = interpolate(frame, [16 + i * 3, 30 + i * 3], [0, 1], {
                                extrapolateRight: "clamp",
                            });
                            const rowY = interpolate(frame, [16 + i * 3, 30 + i * 3], [8, 0], {
                                extrapolateRight: "clamp",
                            });
                            return (
                                <div
                                    key={i}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1.8fr 1.1fr 1fr 0.4fr",
                                        padding: "12px 14px",
                                        borderBottom: "1px solid #e8eaed",
                                        fontFamily: FONTS.mono,
                                        fontSize: 14,
                                        color: r.chaos ? "#9aa0a6" : "#202124",
                                        background: r.chaos ? "rgba(239,68,68,0.05)" : "transparent",
                                        opacity: rowIn,
                                        transform: `translateY(${rowY}px)`,
                                        textDecoration: r.strike ? "line-through" : "none",
                                    }}
                                >
                                    <div>{r.cliente}</div>
                                    <div style={{ color: r.chaos ? "#c5221f" : "#137333", fontWeight: 600 }}>
                                        {r.valor}
                                    </div>
                                    <div style={{ fontStyle: r.chaos ? "italic" : "normal" }}>{r.status}</div>
                                    <div style={{ color: "#c5221f", fontWeight: 700, textAlign: "center" }}>
                                        {r.chaos ? "!" : ""}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Fake formula bar at bottom */}
                        <div
                            style={{
                                marginTop: "auto",
                                padding: "10px 14px",
                                borderTop: "1px solid #dadce0",
                                background: "#f8f9fa",
                                fontFamily: FONTS.mono,
                                fontSize: 12,
                                color: "#5f6368",
                                display: "flex",
                                gap: 12,
                            }}
                        >
                            <span style={{ color: "#c5221f", fontWeight: 700 }}>#REF!</span>
                            <span style={{ color: "#c5221f", fontWeight: 700 }}>#N/A</span>
                            <span style={{ color: "#c5221f", fontWeight: 700 }}>#VALUE!</span>
                        </div>
                    </div>

                    {/* RIGHT: WhatsApp chaos */}
                    <div
                        style={{
                            flex: 1,
                            opacity: waOpacity,
                            transform: `translate(${waX + shake * -0.8}px, 0) rotate(${waRot}deg)`,
                            background: C.waBg,
                            borderRadius: 22,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow:
                                "0 50px 120px -25px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                            minHeight: vert ? 0 : 520,
                        }}
                    >
                        {/* WA Header */}
                        <div
                            style={{
                                background: C.waPanel,
                                padding: "18px 22px",
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontWeight: 700,
                                    fontFamily: FONTS.sans,
                                    fontSize: 16,
                                }}
                            >
                                CH
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: C.waText,
                                    }}
                                >
                                    Chefe
                                </div>
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 13,
                                        color: C.waMute,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                    }}
                                >
                                    digitando
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            gap: 3,
                                        }}
                                    >
                                        {[0, 1, 2].map((d) => (
                                            <span
                                                key={d}
                                                style={{
                                                    width: 4,
                                                    height: 4,
                                                    borderRadius: "50%",
                                                    background: C.waMute,
                                                    opacity:
                                                        0.3 +
                                                        0.7 *
                                                            Math.max(
                                                                0,
                                                                Math.sin((frame - d * 4) / 5)
                                                            ),
                                                }}
                                            />
                                        ))}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Bubbles */}
                        <div
                            style={{
                                flex: 1,
                                padding: 22,
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                backgroundImage: `radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)`,
                                backgroundSize: "30px 30px",
                            }}
                        >
                            {messages.map((m, i) => {
                                const bubbleOpacity = interpolate(frame, [m.at, m.at + 10], [0, 1], {
                                    extrapolateRight: "clamp",
                                });
                                const bubbleY = interpolate(frame, [m.at, m.at + 14], [14, 0], {
                                    extrapolateRight: "clamp",
                                });
                                const bubbleScale = interpolate(frame, [m.at, m.at + 14], [0.94, 1], {
                                    extrapolateRight: "clamp",
                                });
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            alignSelf: "flex-start",
                                            opacity: bubbleOpacity,
                                            transform: `translateY(${bubbleY}px) scale(${bubbleScale})`,
                                            transformOrigin: "left center",
                                            background: C.waBubbleIn,
                                            color: C.waText,
                                            fontFamily: FONTS.sans,
                                            fontSize: 16,
                                            fontWeight: 500,
                                            padding: "11px 15px",
                                            borderRadius: "14px 14px 14px 2px",
                                            maxWidth: "88%",
                                            lineHeight: 1.35,
                                            boxShadow: "0 1px 1px rgba(0,0,0,0.3)",
                                        }}
                                    >
                                        {m.text}
                                    </div>
                                );
                            })}
                            {/* unread counter */}
                            <div
                                style={{
                                    alignSelf: "center",
                                    marginTop: 14,
                                    background: C.red,
                                    color: "#ffffff",
                                    fontFamily: FONTS.sans,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: "5px 12px",
                                    borderRadius: 999,
                                    opacity: interpolate(frame, [82, 98], [0, 1], { extrapolateRight: "clamp" }),
                                    transform: `scale(${interpolate(frame, [82, 98], [0.8, 1], {
                                        extrapolateRight: "clamp",
                                    })})`,
                                    letterSpacing: 0.5,
                                    textTransform: "uppercase",
                                    boxShadow: "0 8px 24px -6px rgba(239,68,68,0.6)",
                                }}
                            >
                                12 mensagens não lidas
                            </div>
                        </div>
                    </div>
                </div>

                {/* Headline */}
                <div
                    style={{
                        opacity: headOpacity,
                        transform: `translateY(${headY}px)`,
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: vert ? 54 : 56,
                            fontWeight: 800,
                            color: C.text,
                            letterSpacing: -1.8,
                            lineHeight: 1.1,
                        }}
                    >
                        {vert ? (
                            <>
                                Planilha não é CRM.
                                <br />
                                <span style={{ color: C.brand }}>Grupo não é pipeline.</span>
                            </>
                        ) : (
                            <>
                                Planilha não é CRM.{" "}
                                <span style={{ color: C.brand }}>Grupo não é pipeline.</span>
                            </>
                        )}
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
