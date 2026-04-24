import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow, GlassCard } from "./lib";

export const Slide08CTA: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="brand" />
            <SlideFrame index={7} total={8} accent={C.brand}>
                <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                    <Eyebrow accent={C.brand}>Chegou a hora</Eyebrow>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 72,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 1.02,
                            letterSpacing: -3,
                        }}
                    >
                        Para o seu CRM
                        <br />
                        de <span style={{ color: C.red }}>imaginar</span>.
                        <br />
                        <span style={{ color: C.brand }}>Comece a vender.</span>
                    </div>

                    {/* Oferta */}
                    <GlassCard style={{ padding: "24px 28px", marginTop: 8 }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 24,
                            }}
                        >
                            {[
                                { big: "14", small: "dias grátis" },
                                { big: "0", small: "cartão de crédito" },
                            ].map((it) => (
                                <div key={it.small}>
                                    <div
                                        style={{
                                            fontFamily: FONTS.heading,
                                            fontSize: 64,
                                            fontWeight: 800,
                                            color: C.brand,
                                            lineHeight: 1,
                                            letterSpacing: -3,
                                        }}
                                    >
                                        {it.big}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: FONTS.sans,
                                            fontSize: 16,
                                            fontWeight: 600,
                                            color: C.text2,
                                            marginTop: 6,
                                        }}
                                    >
                                        {it.small}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* CTA Button */}
                    <div
                        style={{
                            marginTop: 8,
                            padding: "22px 32px",
                            borderRadius: 16,
                            background: `linear-gradient(135deg, ${C.brand} 0%, ${C.brandDim} 100%)`,
                            boxShadow: `0 20px 60px -20px ${C.brand}99, 0 0 40px ${C.brand}44`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 24,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: FONTS.heading,
                                fontSize: 28,
                                fontWeight: 800,
                                color: "#06080a",
                                letterSpacing: -0.8,
                            }}
                        >
                            vyzon.com.br
                        </div>
                        <div
                            style={{
                                fontFamily: FONTS.sans,
                                fontSize: 18,
                                fontWeight: 700,
                                color: "#06080a",
                                opacity: 0.8,
                            }}
                        >
                            →
                        </div>
                    </div>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 17,
                            fontWeight: 500,
                            color: C.text3,
                            lineHeight: 1.45,
                            marginTop: 4,
                        }}
                    >
                        Seu time não precisa de mais disciplina.
                        <br />
                        Precisa de um CRM que cobra por eles.
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
