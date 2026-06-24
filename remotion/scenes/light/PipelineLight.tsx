import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, MONO, SERIF, fadeUp, riseBack, CineCamera, SceneBGLight, GlassCard, Stage } from "./lib-light";
import { EvaOrb, OrbVariant } from "./EvaOrb";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const COLS = [
    { name: "Novo lead", dot: "#94a3b8", x: 60 },
    { name: "Qualificando", dot: LC.blue, x: 390 },
    { name: "Proposta", dot: "#f59e0b", x: 720 },
];

const Card: React.FC<{ nm: string; co: string; val: string; orb?: OrbVariant; orbIn?: number; frame: number; w?: number; tilt?: number; float?: boolean }> = ({ nm, co, val, orb, orbIn = 0, frame, w = 300, tilt = 0, float = false }) => {
    const orbOp = orb ? interpolate(frame, [orbIn, orbIn + 14], [0, 1], clamp) : 0;
    return (
        <GlassCard frame={frame} width={w} padding="16px 18px" radius={18} tilt={tilt} float={float} style={{ overflow: "visible" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 44, height: 44, borderRadius: 999, background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px -8px rgba(21,86,192,0.6)" }}>{nm.split(" ").map((p) => p[0]).join("").slice(0, 2)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 21, fontWeight: 700, color: LC.ink }}>{nm}</div><div style={{ fontSize: 15, color: LC.ink45 }}>{co}</div></div>
            </div>
            <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, color: LC.ink }}>{val}<span style={{ fontSize: 14, color: LC.ink45, fontWeight: 600 }}> /mês</span></div>
            {orb && (
                <div style={{ position: "absolute", top: -16, right: -10, opacity: orbOp, transform: `scale(${0.7 + orbOp * 0.3})`, zIndex: 6 }}>
                    <EvaOrb size={56} variant={orb} analyzing showVoice />
                </div>
            )}
        </GlassCard>
    );
};

export const PipelineLight: React.FC = () => {
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const title = fadeUp(f, 6, 18);

    // card que viaja de Novo → Qualificando (agente qualificou)
    const moveX = interpolate(f, [80, 112], [60, 390], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const lift = interpolate(f, [80, 96, 112], [0, -34, 0], clamp);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD }}>
            <SceneBGLight frame={f} tint="blue" />

            <CineCamera frame={f} total={durationInFrames}>
                <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: "50% 42%" }}>
                    <Stage shift={20}>
                        <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", ...title }}>
                            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>Pipeline</div>
                            <div style={{ fontSize: 62, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.06, textShadow: "0 2px 30px rgba(13,20,33,0.08)" }}>Seu time, <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.eva }}>potencializado</span><br />por IA</div>
                        </div>

                        {/* board */}
                        <div style={{ position: "absolute", top: 760, left: 0, right: 0, height: 480 }}>
                            {COLS.map((c, ci) => (
                                <div key={ci} style={{ position: "absolute", left: c.x, top: 0, width: 300, ...fadeUp(f, 20 + ci * 8, 18, 14) }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, paddingLeft: 4 }}>
                                        <span style={{ width: 9, height: 9, borderRadius: 999, background: c.dot, boxShadow: `0 0 10px ${c.dot}` }} />
                                        <span style={{ fontSize: 19, fontWeight: 700, color: LC.ink }}>{c.name}</span>
                                    </div>
                                    {/* trilho da coluna (profundidade) */}
                                    <div style={{ position: "absolute", top: 44, left: 0, width: 300, height: 360, borderRadius: 22, background: "rgba(255,255,255,0.28)", border: "1px solid rgba(13,20,33,0.05)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }} />
                                </div>
                            ))}

                            {/* col Novo */}
                            <div style={{ position: "absolute", left: 60, top: 64, ...riseBack(f, 30, 26) }}>
                                <Card nm="Carla Figueiredo" co="Loja Aurora" val="R$ 2.200" frame={f} float />
                            </div>
                            {/* col Qualificando estática */}
                            <div style={{ position: "absolute", left: 390, top: 64, ...riseBack(f, 40, 26) }}>
                                <Card nm="Rafael Andrade" co="RA Performance" val="R$ 5.500" orb="blue" orbIn={120} frame={f} float />
                            </div>
                            {/* col Proposta — agente Propostas */}
                            <div style={{ position: "absolute", left: 720, top: 64, ...riseBack(f, 50, 26) }}>
                                <Card nm="Bruna Lima" co="Studio Bloom" val="R$ 6.000" orb="violet" orbIn={60} frame={f} float />
                            </div>

                            {/* card que viaja (Marina, qualificada pelo agente azul) */}
                            <div style={{ position: "absolute", left: moveX, top: 234, transform: `translateY(${lift}px)`, zIndex: 5, filter: "drop-shadow(0 22px 36px rgba(21,86,192,0.30))" }}>
                                <Card nm="Marina Costa" co="Clínica Belle" val="R$ 3.000" orb="blue" orbIn={40} frame={f} />
                            </div>
                        </div>

                        <div style={{ position: "absolute", top: 1330, left: 0, right: 0, textAlign: "center", fontSize: 26, color: LC.ink70, fontWeight: 500, ...fadeUp(f, 118, 16, 14) }}>
                            A EVA move o que está pronto. <span style={{ color: LC.ink, fontWeight: 700 }}>Seu time fecha.</span>
                        </div>
                    </Stage>
                </AbsoluteFill>
            </CineCamera>
        </AbsoluteFill>
    );
};
