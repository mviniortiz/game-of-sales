import React, { useId } from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LC, HEAD, MONO, SERIF, fadeUp, backOut, circOut } from "./lib-light";
import { EvaOrb, OrbVariant, ORB_ACCENT, MESH } from "./EvaOrb";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

type IconC = React.ComponentType<{ size?: number; color?: string; weight?: any }>;
export type AgentLine = { Icon: IconC; label: string; value: string };
export type AgentData = {
    variant: OrbVariant;
    deep: string;
    name: string;
    tagline: string; // "linha 1|linha 2"
    lines: AgentLine[];
    Verdict: IconC;
    verdict: string;
};

export const AgentMind: React.FC<{ agent: AgentData; dur: number }> = ({ agent, dur }) => {
    const f = useCurrentFrame();
    const accent = ORB_ACCENT[agent.variant];
    const fid = "vzfm-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

    // fase 1 — orbe pequeno + nome
    const introScale = interpolate(f, [2, 30], [0.7, 1], { ...clamp, easing: backOut });
    const introOp = interpolate(f, [2, 18], [0, 1], clamp);
    const nameOp = interpolate(f, [12, 26, 40, 52], [0, 1, 1, 0], clamp);

    // fase 2 — REVEAL CIRCULAR (limpo, sem esticar): círculo cresce do centro
    const reveal = interpolate(f, [40, 74], [180, 2350], { ...clamp, easing: circOut });

    // mesh fullscreen (mesma turbulência do orbe, por frame)
    const t = f * 2;
    const bfx = (0.013 + Math.sin(t * 0.0065) * 0.005).toFixed(4);
    const bfy = (0.016 + Math.cos(t * 0.0052) * 0.005).toFixed(4);
    const sc = (18 + Math.sin(t * 0.009) * 9).toFixed(1);

    const headOp = fadeUp(f, 66, 22, 14);
    const outro = interpolate(f, [dur - 22, dur - 2], [1, 0], clamp);

    return (
        <AbsoluteFill style={{ background: LC.paper, fontFamily: HEAD }}>
            {/* orbe pequeno (fase 1) */}
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: introOp }}>
                <div style={{ transform: `scale(${introScale})` }}><EvaOrb size={360} variant={agent.variant} analyzing /></div>
            </AbsoluteFill>
            {/* nome (fase 1) */}
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: nameOp }}>
                <div style={{ marginTop: 380, textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: accent, marginBottom: 14 }}>Agente de</div>
                    <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: "-0.02em", color: LC.ink }}>{agent.name}</div>
                </div>
            </AbsoluteFill>

            {/* REVEAL: mesh fullscreen + tint, clipado por círculo crescente */}
            <AbsoluteFill style={{ clipPath: `circle(${reveal}px at 50% 50%)`, opacity: outro }}>
                <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
                    <defs>
                        <filter id={fid} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
                            <feTurbulence type="fractalNoise" baseFrequency={`${bfx} ${bfy}`} numOctaves={2} seed={7} result="n" />
                            <feDisplacementMap in="SourceGraphic" in2="n" scale={sc} xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>
                </svg>
                <Img src={staticFile(MESH[agent.variant])} style={{ position: "absolute", inset: 0, width: "112%", height: "112%", marginLeft: "-6%", marginTop: "-6%", objectFit: "cover", filter: `url(#${fid})` }} />
                <AbsoluteFill style={{ background: `linear-gradient(155deg, ${agent.deep}d9 0%, ${agent.deep}a6 42%, ${agent.deep}e6 100%)` }} />
            </AbsoluteFill>

            {/* raciocínio — texto branco grande */}
            <AbsoluteFill style={{ padding: "150px 86px", opacity: outro }}>
                <div style={{ ...headOp }}>
                    <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)", marginBottom: 16 }}>Agente · {agent.name}</div>
                    <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", lineHeight: 1.04 }}>{agent.tagline.split("|")[0]}<br /><span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: "rgba(255,255,255,0.94)" }}>{agent.tagline.split("|")[1]}</span></div>
                </div>

                <div style={{ marginTop: 76, display: "flex", flexDirection: "column", gap: 32 }}>
                    {agent.lines.map((l, i) => {
                        const a = fadeUp(f, 88 + i * 18, 26, 14);
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, ...a }}>
                                <div style={{ width: 92, height: 92, borderRadius: 24, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.24)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <l.Icon size={50} color="#ffffff" weight="bold" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 28, color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>{l.label}</div>
                                    <div style={{ fontSize: 48, color: "#fff", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{l.value}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 64, display: "inline-flex", alignItems: "center", gap: 18, alignSelf: "flex-start", background: "#fff", color: agent.deep, padding: "24px 36px", borderRadius: 20, boxShadow: "0 24px 60px -18px rgba(0,0,0,0.5)", ...fadeUp(f, 88 + agent.lines.length * 18 + 10, 26, 16) }}>
                    <agent.Verdict size={44} color={accent} weight="fill" />
                    <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.01em" }}>{agent.verdict}</span>
                </div>
            </AbsoluteFill>

            {/* sons */}
            <Sequence from={40} durationInFrames={20}><Audio src={staticFile("audio/whoosh.wav")} /></Sequence>
            {agent.lines.map((_, i) => (
                <Sequence key={i} from={90 + i * 18} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            ))}
            <Sequence from={88 + agent.lines.length * 18 + 12} durationInFrames={16}><Audio src={staticFile("audio/ding.wav")} /></Sequence>
        </AbsoluteFill>
    );
};
