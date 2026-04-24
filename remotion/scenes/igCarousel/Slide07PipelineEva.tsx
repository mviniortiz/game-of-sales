import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow, GlassCard } from "./lib";
import { EvaAvatar } from "../salesV2/lib";

const PipeCard: React.FC<{ name: string; value: string; rank: number; color: string }> = ({
    name,
    value,
    rank,
    color,
}) => (
    <div
        style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border}`,
        }}
    >
        <div
            style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.04) 100%)`,
                border: `1px solid ${color}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.mono,
                fontSize: 15,
                fontWeight: 700,
                color: C.text,
                flexShrink: 0,
            }}
        >
            {rank}º
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 16, fontWeight: 700, color: C.text }}>{name}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: 500, color: C.text3 }}>{value}</div>
        </div>
    </div>
);

export const Slide07PipelineEva: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="mixed" />
            <SlideFrame index={6} total={8} accent={C.brand2}>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <Eyebrow accent={C.brand2}>Pilares 02 & 03</Eyebrow>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 52,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 1.05,
                            letterSpacing: -2.2,
                        }}
                    >
                        Pipeline que{" "}
                        <span
                            style={{
                                background: `linear-gradient(135deg, ${C.brand2} 0%, ${C.brand} 100%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            cobra sozinho
                        </span>
                        .
                    </div>

                    {/* Two cards side-by-side */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {/* Ranking ao vivo */}
                        <GlassCard style={{ padding: 20 }}>
                            <div
                                style={{
                                    fontFamily: FONTS.sans,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: C.brand2,
                                    textTransform: "uppercase",
                                    letterSpacing: 2,
                                    marginBottom: 14,
                                }}
                            >
                                Ranking ao vivo
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <PipeCard name="Ana Paula" value="R$ 142.800" rank={1} color={C.brand} />
                                <PipeCard name="Lucas T." value="R$ 98.400" rank={2} color={C.gold} />
                                <PipeCard name="Rafa C." value="R$ 71.200" rank={3} color={C.brand2} />
                            </div>
                        </GlassCard>

                        {/* Eva IA */}
                        <GlassCard style={{ padding: 20 }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 14,
                                }}
                            >
                                <EvaAvatar size={26} frame={20} thinking />
                                <div
                                    style={{
                                        fontFamily: FONTS.sans,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: C.vio,
                                        textTransform: "uppercase",
                                        letterSpacing: 2,
                                    }}
                                >
                                    Eva · IA
                                </div>
                            </div>

                            <div
                                style={{
                                    fontFamily: FONTS.sans,
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: C.text,
                                    lineHeight: 1.35,
                                    padding: "12px 14px",
                                    borderRadius: 12,
                                    background: "rgba(139,92,246,0.08)",
                                    border: `1px solid ${C.vio}33`,
                                    marginBottom: 12,
                                }}
                            >
                                "3 deals travados no mesmo estágio há 7+ dias. Quer que eu
                                redija o follow-up?"
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[
                                    "Analisa conversas do WhatsApp",
                                    "Escreve follow-up no seu tom",
                                    "Prevê risco de churn",
                                ].map((t) => (
                                    <div
                                        key={t}
                                        style={{
                                            fontFamily: FONTS.sans,
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: C.text2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 4,
                                                height: 4,
                                                borderRadius: "50%",
                                                background: C.vio,
                                                flexShrink: 0,
                                            }}
                                        />
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 18,
                            fontWeight: 500,
                            color: C.text3,
                            lineHeight: 1.4,
                            marginTop: 4,
                        }}
                    >
                        Gamificação que puxa o time + IA que cobra no tempo certo.
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
