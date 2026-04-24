import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONTS } from "./lib";

export const SlideFounderHero: React.FC = () => {
    return (
        <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
            {/* Founder photo — ocupa direita, full bleed */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "72%",
                    zIndex: 1,
                }}
            >
                <Img
                    src={staticFile("avatar/founder/founder-04.png")}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 25%",
                    }}
                />
                {/* Fade pra esquerda — funde a foto com o bg */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(90deg, ${C.bg} 0%, rgba(6,8,10,0.6) 20%, transparent 55%)`,
                    }}
                />
                {/* Fade inferior pra CTA não competir */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(180deg, transparent 55%, rgba(6,8,10,0.85) 100%)`,
                    }}
                />
            </div>

            {/* Glow verde atrás da foto */}
            <div
                style={{
                    position: "absolute",
                    top: "20%",
                    right: "-15%",
                    width: 700,
                    height: 700,
                    background: `radial-gradient(circle, rgba(0,227,122,0.22) 0%, transparent 60%)`,
                    borderRadius: "50%",
                    filter: "blur(80px)",
                    zIndex: 0,
                }}
            />

            {/* Dot grid sutil atrás de tudo */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "36px 36px",
                    maskImage: "radial-gradient(ellipse at 30% 50%, black 30%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at 30% 50%, black 30%, transparent 80%)",
                    zIndex: 0,
                }}
            />

            {/* Logo topo esquerdo */}
            <div
                style={{
                    position: "absolute",
                    top: 72,
                    left: 76,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    zIndex: 10,
                }}
            >
                <Img
                    src={staticFile("logo.png")}
                    style={{
                        width: 38,
                        height: 38,
                        objectFit: "contain",
                        filter: `drop-shadow(0 0 12px ${C.brand}88)`,
                    }}
                />
                <span
                    style={{
                        fontFamily: FONTS.heading,
                        fontWeight: 800,
                        fontSize: 26,
                        color: C.text,
                        letterSpacing: "-0.03em",
                    }}
                >
                    Vyzon
                </span>
            </div>

            {/* Bloco de conteúdo — lado esquerdo, empilhado do topo */}
            <div
                style={{
                    position: "absolute",
                    left: 76,
                    right: 76,
                    top: 170,
                    bottom: 76,
                    display: "flex",
                    flexDirection: "column",
                    gap: 32,
                    zIndex: 10,
                }}
            >
                {/* TOP — pill + headline */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
                    {/* Pill */}
                    <div
                        style={{
                            display: "inline-flex",
                            alignSelf: "flex-start",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 18px",
                            borderRadius: 999,
                            background: "rgba(0,227,122,0.12)",
                            border: `1px solid ${C.brand}55`,
                            fontFamily: FONTS.sans,
                            fontSize: 14,
                            fontWeight: 700,
                            color: C.brand,
                            letterSpacing: 2,
                            textTransform: "uppercase",
                        }}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: C.brand,
                                boxShadow: `0 0 12px ${C.brand}`,
                            }}
                        />
                        Pra quem vende
                    </div>

                    {/* Headline */}
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 78,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 0.98,
                            letterSpacing: -3.5,
                        }}
                    >
                        Parei de
                        <br />
                        perder <span style={{ color: C.brand }}>venda</span>
                        <br />
                        no esquecimento.
                    </div>

                    {/* Subheadline */}
                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 22,
                            fontWeight: 500,
                            color: C.text2,
                            lineHeight: 1.4,
                            maxWidth: 520,
                        }}
                    >
                        Pipeline, WhatsApp e IA no mesmo lugar.
                        <br />
                        O <span style={{ color: C.text, fontWeight: 700 }}>Vyzon</span> cobra o lead por mim.
                    </div>
                </div>

                {/* CTA logo após a copy — posição alta, zona segura do feed */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {/* Chips oferta */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {["14 dias grátis", "Sem cartão", "Pipeline + WhatsApp + IA"].map((t) => (
                            <div
                                key={t}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: 999,
                                    background: "rgba(255,255,255,0.05)",
                                    border: `1px solid ${C.border}`,
                                    fontFamily: FONTS.sans,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: C.text2,
                                }}
                            >
                                {t}
                            </div>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div
                        style={{
                            alignSelf: "flex-start",
                            padding: "20px 32px",
                            borderRadius: 18,
                            background: `linear-gradient(135deg, ${C.brand} 0%, ${C.brandDim} 100%)`,
                            boxShadow: `0 24px 60px -16px ${C.brand}aa, 0 0 50px ${C.brand}44`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 18,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: FONTS.heading,
                                fontSize: 30,
                                fontWeight: 800,
                                color: "#06080a",
                                letterSpacing: -1,
                            }}
                        >
                            Testar agora
                        </div>
                        <div
                            style={{
                                fontFamily: FONTS.sans,
                                fontSize: 22,
                                fontWeight: 800,
                                color: "#06080a",
                            }}
                        >
                            →
                        </div>
                    </div>

                </div>
            </div>

            {/* vyzon.com.br no topo-direito (zona segura) */}
            <div
                style={{
                    position: "absolute",
                    top: 84,
                    right: 76,
                    fontFamily: FONTS.sans,
                    fontSize: 16,
                    fontWeight: 600,
                    color: C.text2,
                    letterSpacing: 0.5,
                    zIndex: 10,
                }}
            >
                vyzon.com.br
            </div>
        </AbsoluteFill>
    );
};
