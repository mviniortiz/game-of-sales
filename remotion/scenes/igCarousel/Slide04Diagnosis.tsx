import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow, GlassCard } from "./lib";

const Chip: React.FC<{ icon: string; label: string; sub: string }> = ({ icon, label, sub }) => (
    <GlassCard style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div
            style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                flexShrink: 0,
            }}
        >
            {icon}
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                {label}
            </div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 500, color: C.text3 }}>{sub}</div>
        </div>
    </GlassCard>
);

export const Slide04Diagnosis: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="mixed" />
            <SlideFrame index={3} total={8} accent={C.gold}>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    <Eyebrow accent={C.gold}>O diagnóstico</Eyebrow>

                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 62,
                            fontWeight: 800,
                            color: C.text,
                            lineHeight: 1.05,
                            letterSpacing: -2.6,
                        }}
                    >
                        Não é o vendedor.
                        <br />
                        É o <span style={{ color: C.gold }}>CRM imaginário</span>.
                    </div>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 20,
                            fontWeight: 500,
                            color: C.text2,
                            lineHeight: 1.4,
                            maxWidth: 760,
                        }}
                    >
                        Sua operação de vendas hoje é um Frankenstein de ferramentas que
                        não conversam:
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
                        <Chip
                            icon="📊"
                            label="Planilha do Excel que ninguém atualiza"
                            sub="Última edição: sexta-feira retrasada"
                        />
                        <Chip
                            icon="💬"
                            label="WhatsApp pessoal do vendedor"
                            sub="Conversa some quando ele pede demissão"
                        />
                        <Chip
                            icon="🪟"
                            label="Cinco abas abertas ao mesmo tempo"
                            sub="Calendly, Gmail, Sheets, Drive, chat interno…"
                        />
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
