import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, SERIF, useSentient, fadeUp, WordCycle, popIn, floatY, CineCamera, SceneBGLight, GlassCard } from "./lib-light";
import { circOut } from "motion";
import { EvaOrb } from "./EvaOrb";

const CL = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const OpeningLight: React.FC = () => {
    useSentient();
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const orbP = popIn(f, 0, 30);
    const line = fadeUp(f, 26, 24, 18);

    // a luz da EVA cresce: glow que sobe atrás do orbe (a esperança chegando)
    const dawn = interpolate(f, [0, 60], [0, 1], { ...CL, easing: circOut });
    const orbFloat = floatY(f, 9, 70);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD, background: "#eceae4" }}>
            <SceneBGLight frame={f} tint="eva" />
            {/* aurora da EVA: luz roxa/azul subindo conforme ela entra */}
            <AbsoluteFill style={{ background: "radial-gradient(46% 34% at 50% 40%, rgba(109,40,217,0.16), rgba(21,86,192,0.07) 50%, transparent 74%)", opacity: dawn, mixBlendMode: "screen", pointerEvents: "none" }} />

            <CineCamera frame={f} total={durationInFrames} from={1.04} to={1.0} origin="50% 40%">
                <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
                    <div style={{ opacity: orbP.opacity, transform: `scale(${orbP.scale}) translateY(${-120 + orbFloat}px)`, filter: `drop-shadow(0 30px 70px rgba(109,40,217,${0.22 * dawn}))` }}>
                        <EvaOrb size={420} variant="eva" analyzing />
                    </div>

                    <div style={{ position: "absolute", bottom: 540, ...line }}>
                        <GlassCard frame={f} padding="34px 56px" radius={28} float style={{ width: 820 }}>
                            <div style={{ textAlign: "center", fontSize: 66, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.1 }}>
                                A EVA{" "}
                                <WordCycle frame={f} start={34} per={36} fade={12} words={["lê", "analisa", "sugere"]} style={{ color: LC.eva, fontFamily: SERIF, fontStyle: "italic", fontWeight: 500 }} />
                                {" "}pra você
                            </div>
                        </GlassCard>
                    </div>
                </AbsoluteFill>
            </CineCamera>
        </AbsoluteFill>
    );
};
