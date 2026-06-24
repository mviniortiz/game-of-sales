import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, MONO, SERIF, fadeUp, riseBack, floatY, CineCamera, SceneBGLight, cardShadow, Stage } from "./lib-light";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const LEADS = [
    { nm: "Pedro · Imobiliária Sul", msg: "qual o valor do pacote?", h: "3h" },
    { nm: "Bia · Studio Bee", msg: "consigo começar essa semana?", h: "1 dia" },
    { nm: "Léo · Academia Forte", msg: "me manda a proposta?", h: "2 dias" },
];

export const AgitacaoLight: React.FC = () => {
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const title = fadeUp(f, 4, 18);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD, background: "#eceae4" }}>
            <SceneBGLight frame={f} tint="neutral" />

            <CineCamera frame={f} total={durationInFrames}>
                <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: "50% 38%" }}>
                    <Stage shift={200}>
                    <div style={{ position: "absolute", top: 130, left: 0, right: 0, textAlign: "center", ...title }}>
                        <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.amber, marginBottom: 16 }}>Não é só um lead</div>
                        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.04, textShadow: "0 2px 30px rgba(13,20,33,0.10)" }}>É <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.amber }}>todo dia</span>.</div>
                    </div>

                    {/* cards esfriando, escorregando, afundando na profundidade */}
                    <div style={{ position: "absolute", top: 480, left: "50%", transform: "translateX(-50%)", width: 700, transformStyle: "preserve-3d", display: "flex", flexDirection: "column", gap: 22 }}>
                        {LEADS.map((l, i) => {
                            const s = 24 + i * 16;
                            const intro = riseBack(f, s, 30);
                            const cool = interpolate(f, [s + 14, s + 64], [0, 1], clamp);
                            const dot = interpolateColors(cool, [0, 1], [LC.green, "#9aa6b6"]);
                            const slip = interpolate(f, [s + 30, s + 110], [0, 22 + i * 8], clamp);
                            const desat = 1 - cool * 0.55;
                            const drift = floatY(f, 4, 96, i * 1.3);
                            // frieza crescente: o card recua um pouco no eixo Z conforme esfria
                            const tilt = -2 - cool * 2.5;
                            const recede = cool * (i + 1) * 10;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        opacity: intro.opacity,
                                        transform: `${intro.transform} translateY(${slip + drift}px) translateZ(${-recede}px) rotateX(${tilt}deg)`,
                                        transformStyle: "preserve-3d",
                                        filter: `saturate(${desat})`,
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "relative",
                                            background: `linear-gradient(170deg, rgba(255,255,255,${0.98 - cool * 0.06}), rgba(${244 - cool * 14},${247 - cool * 14},${251}, ${0.95 - cool * 0.05}))`,
                                            borderRadius: 22,
                                            border: "1px solid rgba(255,255,255,0.9)",
                                            padding: "18px 22px",
                                            boxShadow: cardShadow(),
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.55) 0%, transparent 24%)", pointerEvents: "none" }} />
                                        {/* véu frio que entra pelas bordas conforme esfria */}
                                        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 130% at 50% 50%, transparent 46%, rgba(168,190,216,0.42) 100%)", opacity: cool, pointerEvents: "none" }} />
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
                                            <div style={{ width: 50, height: 50, borderRadius: 999, background: `linear-gradient(135deg,#94a3b8,#cbd5e1)`, color: "#fff", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px -5px rgba(15,23,42,0.4)" }}>{l.nm[0]}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: LC.ink }}>{l.nm}</div>
                                                <div style={{ fontSize: 19, color: LC.ink45 }}>{l.msg}</div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, color: "#8b97a8", fontWeight: 600 }}>
                                                <span style={{ width: 11, height: 11, borderRadius: 999, background: dot, boxShadow: `0 0 ${8 * (1 - cool)}px ${dot}` }} />sem resposta · {l.h}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ position: "absolute", top: 1040, left: 0, right: 0, textAlign: "center", padding: "0 90px", ...fadeUp(f, 96, 22, 16) }}>
                        <div style={{ fontSize: 44, fontWeight: 700, color: LC.ink, lineHeight: 1.2 }}>Follow-up esquecido. E o dinheiro vai <span style={{ color: LC.amber }}>embora</span> no scroll.</div>
                    </div>
                    </Stage>
                </AbsoluteFill>
            </CineCamera>
        </AbsoluteFill>
    );
};
