import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow, GlassCard } from "./lib";

const Msg: React.FC<{ text: string; out?: boolean; time: string }> = ({ text, out = false, time }) => (
    <div style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
        <div
            style={{
                background: out ? C.waBubbleOut : C.waBubbleIn,
                borderRadius: out ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "10px 14px",
                maxWidth: 340,
                color: C.waText,
                fontFamily: FONTS.sans,
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.35,
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
        >
            {text}
            <div
                style={{
                    fontSize: 11,
                    color: C.waMute,
                    marginTop: 4,
                    textAlign: "right",
                }}
            >
                {time} {out && "✓✓"}
            </div>
        </div>
    </div>
);

export const Slide06Pulse: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="brand" />
            <SlideFrame index={5} total={8} accent={C.brand}>
                <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                    <Eyebrow accent={C.brand}>Pilar 01 · Pulse</Eyebrow>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 58,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 1.05,
                            letterSpacing: -2.4,
                        }}
                    >
                        WhatsApp oficial
                        <br />
                        dentro do <span style={{ color: C.brand }}>CRM</span>.
                    </div>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 19,
                            fontWeight: 500,
                            color: C.text2,
                            lineHeight: 1.4,
                            maxWidth: 780,
                        }}
                    >
                        Histórico unificado por contato. Se o vendedor sair, a conversa fica.
                        Se o cliente responder, o card move sozinho no pipeline.
                    </div>

                    {/* Mock WhatsApp thread */}
                    <GlassCard
                        style={{
                            padding: 20,
                            background: C.waBg,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                paddingBottom: 12,
                                borderBottom: `1px solid ${C.border}`,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${C.brand} 0%, ${C.brandDim} 100%)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#06080a",
                                    fontFamily: FONTS.sans,
                                    fontWeight: 800,
                                    fontSize: 15,
                                }}
                            >
                                MR
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: C.waText,
                                    }}
                                >
                                    Marina Ribeiro · Lead qualificado
                                </div>
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 12,
                                        color: C.waMute,
                                    }}
                                >
                                    online · respondendo…
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <Msg
                                out
                                time="09:42"
                                text="Oi Marina! Consegui liberar a proposta com desconto de 15%. Posso te mandar?"
                            />
                            <Msg time="09:43" text="Manda! Quero fechar ainda hoje 🙌" />
                            <Msg out time="09:43" text="Acabei de te enviar por email também. Qualquer coisa, me chama." />
                        </div>
                    </GlassCard>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
