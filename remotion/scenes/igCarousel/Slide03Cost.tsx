import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONTS, CarouselBG, SlideFrame, Eyebrow, GlassCard } from "./lib";

const Row: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent = C.text }) => (
    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 0",
            borderBottom: `1px dashed ${C.border}`,
        }}
    >
        <span style={{ fontFamily: FONTS.sans, fontSize: 20, fontWeight: 500, color: C.text2 }}>{label}</span>
        <span
            style={{
                fontFamily: FONTS.mono,
                fontSize: 26,
                fontWeight: 600,
                color: accent,
                letterSpacing: -0.5,
            }}
        >
            {value}
        </span>
    </div>
);

export const Slide03Cost: React.FC = () => {
    return (
        <AbsoluteFill>
            <CarouselBG tint="red" />
            <SlideFrame index={2} total={8} accent={C.red}>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    <Eyebrow accent={C.red}>A conta que ninguém faz</Eyebrow>

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
                        Quanto vale um
                        <br />
                        lead esquecido?
                    </div>

                    <GlassCard style={{ padding: "8px 32px 8px", marginTop: 4 }}>
                        <Row label="Leads perdidos por dia" value="1" />
                        <Row label="Ticket médio" value="R$ 2.500" />
                        <Row label="Dias úteis no mês" value="× 30" />
                        <Row
                            label="Comissão afundada / mês"
                            value="R$ 75.000"
                            accent={C.red}
                        />
                    </GlassCard>

                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 20,
                            fontWeight: 500,
                            color: C.text3,
                            lineHeight: 1.4,
                            marginTop: 8,
                        }}
                    >
                        E ninguém na sua reunião de resultado sabe disso.
                    </div>
                </div>
            </SlideFrame>
        </AbsoluteFill>
    );
};
