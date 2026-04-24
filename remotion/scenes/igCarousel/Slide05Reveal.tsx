import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow } from "./lib";

export const Slide05Reveal: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="brand" />
            <SlideFrame index={4} total={8} accent={C.brand}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 36,
                        alignItems: "flex-start",
                    }}
                >
                    <Eyebrow accent={C.brand}>A virada</Eyebrow>

                    {/* Logo grande + wordmark */}
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 28,
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                left: -80,
                                top: -80,
                                width: 280,
                                height: 280,
                                background: `radial-gradient(circle, ${C.brand}55 0%, transparent 60%)`,
                                filter: "blur(48px)",
                                pointerEvents: "none",
                            }}
                        />
                        <Img
                            src={staticFile("logo.png")}
                            style={{
                                width: 128,
                                height: 128,
                                objectFit: "contain",
                                filter: `drop-shadow(0 0 30px ${C.brand}aa)`,
                                position: "relative",
                                zIndex: 1,
                            }}
                        />
                        <div
                            style={{
                                fontFamily: FONTS.heading,
                                fontWeight: 700,
                                fontSize: 128,
                                color: C.text,
                                letterSpacing: "-0.045em",
                                lineHeight: 1,
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            Vyzon
                        </div>
                    </div>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 56,
                            fontWeight: 700,
                            color: C.text,
                            lineHeight: 1.08,
                            letterSpacing: -2.2,
                            maxWidth: 820,
                        }}
                    >
                        Pipeline, WhatsApp e IA
                        <br />
                        no <span style={{ color: C.brand }}>mesmo lugar</span>.
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 14,
                            flexWrap: "wrap",
                        }}
                    >
                        {["Feito no Brasil 🇧🇷", "LGPD nativo", "14 dias grátis"].map((t) => (
                            <div
                                key={t}
                                style={{
                                    padding: "10px 18px",
                                    borderRadius: 999,
                                    background: "rgba(0,227,122,0.08)",
                                    border: `1px solid ${C.brand}44`,
                                    fontFamily: FONTS.sans,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: C.brand,
                                }}
                            >
                                {t}
                            </div>
                        ))}
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
