import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, MONO, SERIF, fadeUp, floatY, backOut, Stage, SceneBGLight, GlassCard, CineCamera } from "./lib-light";
import { EvaOrb, OrbVariant } from "./EvaOrb";

const AGENTS: { name: string; desc: string; variant: OrbVariant; accent: string }[] = [
    { name: "Qualificação", desc: "Lê cada lead e diz quem está pronto.", variant: "blue", accent: "#2563EB" },
    { name: "Follow-up", desc: "Retoma a conversa no timing certo.", variant: "aqua", accent: "#0E9DA8" },
    { name: "Propostas", desc: "Monta o rascunho da proposta.", variant: "violet", accent: "#7C3AED" },
    { name: "Reativação", desc: "Reaborda quem esfriou.", variant: "warm", accent: "#E0703A" },
];

// hex accent -> "r,g,b" pra alimentar cardShadow tingido na cor do agente
const rgb = (hex: string) => {
    const h = hex.replace("#", "");
    return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
};

export const EvaStudioLight: React.FC = () => {
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const title = fadeUp(f, 6, 18);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD }}>
            <SceneBGLight frame={f} tint="eva" />
            <CineCamera frame={f} total={durationInFrames} origin="50% 46%">
            <Stage shift={120}>
            <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", ...title }}>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>EVA Studio</div>
                <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.05 }}>Um <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.eva }}>especialista</span><br />pra cada etapa</div>
            </div>

            <div style={{ position: "absolute", top: 560, left: "50%", transform: "translateX(-50%)", width: 920, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, perspective: 1700 }}>
                {AGENTS.map((a, i) => {
                    const s = 26 + i * 12;
                    const op = interpolate(f, [s, s + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    const baseY = interpolate(f, [s, s + 22], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: backOut });
                    const blur = interpolate(f, [s, s + 18], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    const fl = floatY(f, 5, 130, i * 1.5);
                    const tilt = (i % 2 === 0 ? 1.4 : -1.4) * interpolate(f, [s, s + 30], [1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    return (
                        <div
                            key={i}
                            style={{
                                position: "relative",
                                opacity: op,
                                transform: `perspective(1700px) rotateY(${tilt}deg) translateY(${baseY + fl}px)`,
                                filter: blur > 0.4 ? `blur(${blur}px)` : "none",
                                borderRadius: 26,
                                // sombra em camadas tingida na cor do agente (card "pousa" na cena)
                                boxShadow: `0 1px 1px rgba(${rgb(a.accent)},0.05), 0 22px 50px -28px ${a.accent}66, 0 56px 104px -46px ${a.accent}40`,
                            }}
                        >
                            {/* anel na cor do agente, traçando a borda exata do card de vidro */}
                            <div style={{ position: "absolute", inset: 0, borderRadius: 26, border: `1px solid ${a.accent}55`, pointerEvents: "none", zIndex: 2 }} />
                            <GlassCard
                                frame={f}
                                radius={26}
                                padding="30px 30px 26px"
                                style={{ width: "100%" }}
                            >
                                <EvaOrb size={118} variant={a.variant} frameOffset={i * 20} />
                                <div style={{ fontSize: 34, fontWeight: 800, color: LC.ink, letterSpacing: "-0.02em", marginTop: 18 }}>{a.name}</div>
                                <div style={{ fontSize: 22, color: LC.ink70, lineHeight: 1.45, marginTop: 8 }}>{a.desc}</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: a.accent, marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>Criar agente →</div>
                            </GlassCard>
                        </div>
                    );
                })}
            </div>
            </Stage>

            <div style={{ position: "absolute", bottom: 180, left: 0, right: 0, textAlign: "center", fontSize: 24, color: LC.ink45, fontFamily: MONO, letterSpacing: "0.06em", ...fadeUp(f, 80, 16, 14) }}>
                a EVA sugere · você aprova
            </div>
            </CineCamera>
        </AbsoluteFill>
    );
};
