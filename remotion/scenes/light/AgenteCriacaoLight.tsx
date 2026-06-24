import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, MONO, SERIF, Cursor, Ripple, fadeUp, easeOutCubic, Stage, SceneBGLight, GlassCard, CineCamera } from "./lib-light";
import { EvaOrb } from "./EvaOrb";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ACC = "#2563EB"; // Qualificação

const QA = [
    { q: "O que você vende?", a: "Tráfego pago pra clínicas" },
    { q: "Cliente ideal?", a: "Estética e odontologia" },
    { q: "Linha vermelha?", a: "Nunca dar desconto sem aprovação" },
];

export const AgenteCriacaoLight: React.FC = () => {
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const title = fadeUp(f, 6, 18);
    const cardOp = interpolate(f, [22, 40], [0, 1], clamp);
    const cardY = interpolate(f, [22, 40], [30, 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const cardBlur = interpolate(f, [22, 42], [16, 0], clamp);

    const done = f > 196;
    const doneOp = interpolate(f, [196, 212], [0, 1], clamp);
    const cy = interpolate(f, [150, 186], [1360, 852], { ...clamp, easing: easeOutCubic });

    return (
        <AbsoluteFill style={{ fontFamily: HEAD }}>
            <SceneBGLight frame={f} tint="eva" />
            <CineCamera frame={f} total={durationInFrames} origin="50% 50%">
            <Stage shift={335}>
            <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", ...title }}>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>Fácil de montar</div>
                <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.05 }}>3 perguntas e o agente <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.eva }}>nasce</span></div>
            </div>

            {/* card de criação (vidro premium) */}
            <div style={{ position: "absolute", top: 430, left: "50%", transform: `translateX(-50%) translateY(${cardY}px)`, opacity: cardOp, width: 820, filter: cardBlur > 0.4 ? `blur(${cardBlur}px)` : "none" }}>
            <GlassCard frame={f} radius={30} padding="34px 36px" style={{ width: "100%" }}>
                {/* cabeçalho: orbe do agente */}
                <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, borderBottom: `1px solid ${LC.line}` }}>
                    <EvaOrb size={92} variant="blue" analyzing={f < 196} />
                    <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: ACC, letterSpacing: "0.05em", textTransform: "uppercase" }}>Agente de</div>
                        <div style={{ fontSize: 40, fontWeight: 800, color: LC.ink, letterSpacing: "-0.02em" }}>Qualificação</div>
                    </div>
                </div>

                {/* perguntas respondidas */}
                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
                    {QA.map((it, i) => {
                        const start = 40 + i * 42;
                        const ans = fadeUp(f, start, 14, 12);
                        const check = interpolate(f, [start + 10, start + 20], [0, 1], clamp);
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 999, flexShrink: 0, background: check > 0.5 ? "rgba(0,138,82,0.12)" : LC.conv, color: LC.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, opacity: 0.4 + check * 0.6 }}>{check > 0.5 ? "✓" : i + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 19, color: LC.ink45, fontWeight: 600 }}>{it.q}</div>
                                    <div style={{ fontSize: 26, color: LC.ink, fontWeight: 600, ...ans }}>{it.a}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* botão criar */}
                <div style={{ marginTop: 28, height: 76, borderRadius: 18, background: `linear-gradient(135deg,${ACC},#4a8ce8)`, color: "#fff", fontSize: 26, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 14px 30px -12px ${ACC}88`, opacity: done ? 0 : 1 }}>Criar agente</div>

                {/* sucesso */}
                {done && (
                    <div style={{ marginTop: 28, height: 76, borderRadius: 18, background: "rgba(0,138,82,0.10)", border: "1px solid rgba(0,138,82,0.3)", color: LC.green, fontSize: 25, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: doneOp }}>✓ Agente pronto pra trabalhar</div>
                )}
            </GlassCard>
            </div>

            {f >= 150 && f < 206 && <Cursor x={540} y={cy} down={f >= 186 && f <= 196} />}
            {f >= 186 && f <= 206 && <Ripple x={540} y={852} t={(f - 186) / 18} />}
            </Stage>
            </CineCamera>

            <Sequence from={50} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            <Sequence from={92} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            <Sequence from={134} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            <Sequence from={187} durationInFrames={10}><Audio src={staticFile("audio/click.wav")} /></Sequence>
        </AbsoluteFill>
    );
};
