import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LC, HEAD, MONO, SERIF, Cursor, Ripple, fadeUp, backOut, CineCamera, SceneBGLight, GlassCard, Stage } from "./lib-light";
import { useCountUp } from "../salesV2/lib";
import { EvaOrb } from "./EvaOrb";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const AnalisarLight: React.FC = () => {
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const title = fadeUp(f, 6, 18);

    // micro-float que dá vida ao painel da conversa durante os holds
    const panelFloat = Math.sin(f / 50) * 5;

    // botão some no clique, orbe entra
    const clicked = f >= 36;
    const btnOp = interpolate(f, [36, 46], [1, 0], clamp);
    const orbOp = interpolate(f, [42, 58], [0, 1], clamp);
    const orbScale = interpolate(f, [42, 66], [0.6, 1], { ...clamp, easing: backOut });
    const analyzing = f < 100;

    // scan sweep sobre o painel
    const scanY = interpolate(f, [46, 96], [0, 360], clamp);
    const scanOp = interpolate(f, [46, 56, 90, 100], [0, 0.5, 0.5, 0], clamp);

    // resultado
    const score = useCountUp(f, 82, 100, 128);
    const res = fadeUp(f, 100, 18, 14);
    const badge = f < 100 ? { t: "Analisando", c: LC.eva, bg: "#f5f3ff" } : { t: "Pronto", c: LC.green, bg: "#ecfdf3" };

    // cursor
    const cx = interpolate(f, [6, 32], [740, 540], clamp);
    const cy = interpolate(f, [6, 32], [1820, 958], clamp);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD }}>
            <SceneBGLight frame={f} tint="blue" />
            <CineCamera frame={f} total={durationInFrames} origin="50% 48%">
            <Stage shift={150}>
            <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", ...title }}>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>Um clique</div>
                <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.04 }}>A EVA <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.eva }}>analisa</span> na hora</div>
            </div>

            {/* painel da conversa */}
            <div style={{ position: "absolute", top: 420, left: "50%", transform: `translateX(-50%) translateY(${panelFloat}px)` }}>
                <GlassCard frame={f} width={780} radius={28} padding="26px 28px" tilt={5}>
                <div style={{ fontSize: 18, fontWeight: 700, color: LC.ink45, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 16 }}>Conversa · Marina Costa</div>
                <div style={{ background: LC.conv, border: `1px solid ${LC.line2}`, borderRadius: "16px 16px 16px 6px", padding: "14px 18px", fontSize: 23, color: LC.ink, lineHeight: 1.4, marginBottom: 12 }}>Já invisto uns 3 mil/mês, mas vem pouco agendamento.</div>
                <div style={{ background: LC.conv, border: `1px solid ${LC.line2}`, borderRadius: "16px 16px 16px 6px", padding: "14px 18px", fontSize: 23, color: LC.ink, lineHeight: 1.4 }}>Preciso pra ontem, tô com a agenda parada.</div>

                {/* scan sweep */}
                <div style={{ position: "absolute", left: 0, right: 0, top: scanY, height: 80, background: `linear-gradient(180deg, transparent, ${LC.eva}22, transparent)`, opacity: scanOp, pointerEvents: "none" }} />

                {/* resultado */}
                <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${LC.line}`, paddingTop: 18, ...res }}>
                    <span style={{ fontSize: 21, fontWeight: 700, color: LC.amber, background: LC.amberSoft, padding: "8px 15px", borderRadius: 999 }}>🔥 Quente</span>
                    <span style={{ fontSize: 40, fontWeight: 800, color: LC.ink, letterSpacing: "-0.02em" }}>{score}<span style={{ fontSize: 19, color: LC.ink45, fontWeight: 600 }}>/100</span></span>
                    <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: LC.green, background: LC.greenSoft, padding: "8px 14px", borderRadius: 999 }}>Fit alto</span>
                </div>
                </GlassCard>
            </div>

            {/* botão / orbe */}
            {!clicked || btnOp > 0.02 ? (
                <div style={{ position: "absolute", top: 920, left: "50%", transform: "translateX(-50%)", opacity: btnOp }}>
                    <div style={{ height: 76, padding: "0 40px", borderRadius: 20, background: `linear-gradient(135deg,${LC.eva},#9333ea)`, color: "#fff", fontSize: 26, fontWeight: 600, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 14px 30px -12px rgba(109,40,217,0.55)" }}>
                        <span style={{ width: 14, height: 14, borderRadius: 5, background: "#fff", opacity: 0.9 }} />Analisar com a EVA
                    </div>
                </div>
            ) : null}

            {clicked && (
                <div style={{ position: "absolute", top: 962, left: "50%", transform: `translateX(-50%) scale(${orbScale})`, opacity: orbOp, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
                    <EvaOrb size={300} variant="eva" analyzing={analyzing} />
                    <div style={{ fontSize: 20, fontWeight: 800, color: badge.c, background: badge.bg, border: `1px solid ${badge.c}33`, padding: "8px 18px", borderRadius: 999, letterSpacing: "0.04em" }}>{badge.t}</div>
                </div>
            )}

            {f < 40 && <Cursor x={cx} y={cy} down={f >= 34 && f <= 42} />}
            {f >= 34 && f <= 52 && <Ripple x={540} y={958} t={(f - 34) / 18} />}
            </Stage>
            </CineCamera>

            {/* sons */}
            <Sequence from={35} durationInFrames={8}><Audio src={staticFile("audio/click.wav")} /></Sequence>
            <Sequence from={100} durationInFrames={10}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
        </AbsoluteFill>
    );
};
