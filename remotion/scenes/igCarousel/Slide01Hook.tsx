import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow } from "./lib";

export const Slide01Hook: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="red" />
            <SlideFrame index={0} total={8} accent={C.red}>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    <Eyebrow accent={C.red}>A verdade que ninguém conta</Eyebrow>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 86,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 1.02,
                            letterSpacing: -3.5,
                        }}
                    >
                        O maior ladrão de{" "}
                        <span
                            style={{
                                background: `linear-gradient(135deg, ${C.red} 0%, #F97066 100%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            comissão
                        </span>{" "}
                        do seu time
                    </div>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 30,
                            fontWeight: 500,
                            color: C.text2,
                            lineHeight: 1.35,
                            maxWidth: 780,
                        }}
                    >
                        não é a concorrência.
                    </div>

                    <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                            style={{
                                fontFamily: FONTS.sans,
                                fontSize: 17,
                                fontWeight: 600,
                                color: C.text3,
                                letterSpacing: 0.3,
                            }}
                        >
                            Arrasta →
                        </div>
                        <div
                            style={{
                                width: 60,
                                height: 1,
                                background: `linear-gradient(90deg, ${C.text3} 0%, transparent 100%)`,
                            }}
                        />
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
