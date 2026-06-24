import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, SERIF, MONO, useSentient, fadeUp, Stage, cardShadow } from "./lib-light";

export const HookLight: React.FC = () => {
    useSentient();
    const f = useCurrentFrame();
    const { fps } = useVideoConfig();

    const kicker = fadeUp(f, 4, 16, 12);
    const cs = spring({ frame: f - 20, fps, config: { damping: 200, stiffness: 120 } });
    const cardOp = interpolate(f, [20, 38], [0, 1], { extrapolateRight: "clamp" });
    const cardY = interpolate(cs, [0, 1], [54, 0]);
    const cool = interpolate(f, [44, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const dot = interpolateColors(cool, [0, 1], [LC.green, "#9aa6b6"]);
    const headline = fadeUp(f, 46, 26, 18);

    return (
        <AbsoluteFill style={{ background: LC.paper, fontFamily: HEAD }}>
            <Stage shift={230}>
            <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, ...kicker }}>
                Toda agência conhece a dor
            </div>

            {/* card WhatsApp esfriando */}
            <div style={{ position: "absolute", top: 470, left: "50%", transform: `translateX(-50%) translateY(${cardY}px)`, opacity: cardOp, width: 660, background: LC.white, border: `1px solid ${LC.line2}`, borderRadius: 30, padding: "28px 30px", boxShadow: cardShadow() }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 999, background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff", fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>MC</div>
                    <div><div style={{ fontSize: 25, fontWeight: 700, color: LC.ink }}>Marina · Clínica Belle</div><div style={{ fontSize: 17, color: LC.ink45 }}>WhatsApp</div></div>
                    <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 20, color: LC.ink45 }}>23:47</div>
                </div>
                <div style={{ background: LC.conv, border: `1px solid ${LC.line2}`, borderRadius: "20px 20px 20px 6px", padding: "17px 20px", fontSize: 25, color: LC.ink, lineHeight: 1.42 }}>
                    Vocês ainda fazem tráfego pago? Queria começar logo.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, fontSize: 19, color: LC.ink45 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 999, background: dot }} />lida · há 2 dias, sem resposta
                </div>
            </div>

            {/* headline */}
            <div style={{ position: "absolute", top: 830, left: 0, right: 0, textAlign: "center", padding: "0 96px", ...headline }}>
                <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-0.035em", color: LC.ink, lineHeight: 1.04 }}>
                    Todo dia, um lead <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.blue }}>esfria</span> no WhatsApp.
                </div>
            </div>
            </Stage>
        </AbsoluteFill>
    );
};
