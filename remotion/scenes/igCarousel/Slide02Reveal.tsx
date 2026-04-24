import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow, GlassCard } from "./lib";

export const Slide02Reveal: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="red" />
            <SlideFrame index={1} total={8} accent={C.red}>
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    <Eyebrow accent={C.red}>é o lead que</Eyebrow>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 78,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 1.04,
                            letterSpacing: -3,
                        }}
                    >
                        ficou{" "}
                        <span style={{ color: C.red }}>4 dias</span> sem
                        <br />
                        resposta no WhatsApp
                        <br />
                        do vendedor.
                    </div>

                    {/* Mock WhatsApp card mostrando "Visto há 4 dias" */}
                    <GlassCard
                        style={{
                            marginTop: 20,
                            padding: "22px 26px",
                            display: "flex",
                            alignItems: "center",
                            gap: 18,
                            maxWidth: 680,
                        }}
                    >
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #6B7280 0%, #374151 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: C.text,
                                fontFamily: FONTS.sans,
                                fontWeight: 700,
                                fontSize: 20,
                                flexShrink: 0,
                            }}
                        >
                            JM
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                    marginBottom: 4,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color: C.text,
                                    }}
                                >
                                    João Mendes
                                </div>
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 13,
                                        color: C.text3,
                                    }}
                                >
                                    há 4 dias
                                </div>
                            </div>
                            <div
                                style={{
                                    fontFamily: FONTS.sans,
                                    fontSize: 15,
                                    color: C.text2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                "Oi, ainda tá valendo aquela proposta?"
                            </div>
                        </div>
                        <div
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: C.red,
                                boxShadow: `0 0 12px ${C.red}`,
                                flexShrink: 0,
                            }}
                        />
                    </GlassCard>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 22,
                            fontWeight: 500,
                            color: C.text3,
                            lineHeight: 1.4,
                            maxWidth: 680,
                            fontStyle: "italic",
                        }}
                    >
                        "Ele não quis mais."
                        <br />
                        Na verdade, ele só foi mais rápido noutro lugar.
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
