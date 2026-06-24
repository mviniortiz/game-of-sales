import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate } from "remotion";
// Motion (motion.dev) — funções de easing JS puras (zero-DOM), usadas por frame no Remotion
import { backOut, anticipate, circOut, easeInOut } from "motion";
export { backOut, anticipate, circOut, easeInOut };

const CL = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// entrada com overshoot (Motion backOut): pop vivo (escala estoura e assenta)
export const popIn = (frame: number, start: number, dur = 18) => ({
    opacity: interpolate(frame, [start, start + Math.min(10, dur)], [0, 1], CL),
    scale: interpolate(frame, [start, start + dur], [0.8, 1], { ...CL, easing: backOut }),
});
// rise com overshoot
export const riseBack = (frame: number, start: number, dist = 26, dur = 22) => ({
    opacity: interpolate(frame, [start, start + Math.min(12, dur)], [0, 1], CL),
    transform: `translateY(${interpolate(frame, [start, start + dur], [dist, 0], { ...CL, easing: backOut })}px)`,
});

// ── Tokens OFICIAIS da marca (--lp-*) ──
export const LC = {
    paper: "#faf9f5",
    paper2: "#ffffff",
    conv: "#f3f5f9",
    white: "#ffffff",
    ink: "#0d1421",
    ink70: "rgba(13,20,33,0.60)",
    ink45: "rgba(13,20,33,0.40)",
    line: "rgba(13,20,33,0.08)",
    line2: "rgba(13,20,33,0.14)",
    blue: "#1556c0",
    blue2: "#2f6fd6",
    eva: "#6d28d9",
    evaSoft: "#f6f4fd",
    evaLine: "rgba(109,40,217,0.18)",
    green: "#008a52",
    amber: "#b45309",
    amberSoft: "rgba(245,158,11,0.13)",
    greenSoft: "rgba(0,138,82,0.12)",
};
export const HEAD = "'Sora', sans-serif";
export const SERIF = "'Sentient', Georgia, serif";
export const MONO = "'JetBrains Mono', monospace";

// Carrega Sentient garantindo load no render headless
export const useSentient = () => {
    const [handle] = useState(() => delayRender("sentient"));
    useEffect(() => {
        let done = false;
        const finish = () => { if (!done) { done = true; continueRender(handle); } };
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://api.fontshare.com/v2/css?f[]=sentient@500i&display=swap";
        link.onload = () => { (document.fonts?.load("italic 500 40px Sentient") || Promise.resolve()).then(finish).catch(finish); };
        link.onerror = finish;
        document.head.appendChild(link);
        const t = setTimeout(finish, 8000);
        return () => clearTimeout(t);
    }, [handle]);
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// movimento contínuo sutil (vida durante os holds)
export const floatY = (frame: number, amp = 6, period = 90, phase = 0) => amp * Math.sin((frame / period) * Math.PI * 2 + phase);

// shimmer multi-stop frame-driven (inspirado no gradient-shimmer; cores da marca, sutil)
export const Shimmer: React.FC<{ frame: number; children: React.ReactNode; base?: string; period?: number; angle?: number; style?: React.CSSProperties }> = ({ frame, children, base = LC.ink, period = 80, angle = 105, style }) => {
    const pos = ((frame % period) / period) * 300 - 100;
    const grad = `linear-gradient(${angle}deg, ${base} 0%, ${base} 38%, #1556c0 46%, #6d28d9 50%, #00b86a 54%, ${base} 62%, ${base} 100%)`;
    return (
        <span style={{ backgroundImage: grad, backgroundSize: "300% 100%", backgroundPosition: `${pos}% 0`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", display: "inline-block", ...style }}>{children}</span>
    );
};

// ── Word-swap dissolve: "A EVA [lê→analisa→sugere] pra você" ──
// a palavra do meio troca dissolvendo (blur + opacity + slide), texto fixo ao redor.
export const WordCycle: React.FC<{ frame: number; start: number; words: string[]; per: number; fade?: number; style?: React.CSSProperties }> = ({ frame, start, words, per, fade = 8, style }) => {
    const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
    const t = Math.max(0, frame - start);
    const idx = Math.min(words.length - 1, Math.floor(t / per));
    const local = t - idx * per;
    const fin = interpolate(local, [0, fade], [0, 1], cl);
    const fout = idx < words.length - 1 ? interpolate(local, [per - fade, per], [1, 0], cl) : 1;
    const op = fin * fout;
    const blur = (1 - op) * 9;
    const y = (1 - fin) * 16 - (1 - fout) * 16;
    return <span style={{ display: "inline-block", opacity: op, filter: `blur(${blur}px)`, transform: `translateY(${y}px)`, ...style }}>{words[idx]}</span>;
};

// entra com opacity + translateY
export const fadeUp = (frame: number, start: number, dist = 16, dur = 14) => {
    const t = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const e = easeOutCubic(t);
    return { opacity: e, transform: `translateY(${(1 - e) * dist}px)` };
};

// ── Device frame claro (com Ken Burns sutil opcional) ──
export const PhoneFrame: React.FC<{ children: React.ReactNode; frame?: number; top?: number; drift?: number }> = ({ children, frame = 0, top = 360, drift = 1 }) => {
    const float = Math.sin(frame / 42) * 5 * drift;
    return (
        <div style={{ position: "absolute", top, left: "50%", transform: `translateX(-50%) translateY(${float}px)`, transformOrigin: "top center" }}>
            <div style={{ width: 640, height: 1300, background: LC.white, borderRadius: 60, padding: 16, border: `1px solid ${LC.line}`, boxShadow: "0 2px 4px rgba(15,23,42,0.04), 0 40px 90px -34px rgba(15,23,42,0.30)" }}>
                <div style={{ width: 608, height: 1268, borderRadius: 46, overflow: "hidden", background: LC.conv, position: "relative", display: "flex", flexDirection: "column" }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export const PhoneHeader: React.FC = () => (
    <div style={{ background: LC.white, borderBottom: `1px solid ${LC.line2}`, padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff", fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>MC</div>
        <div>
            <div style={{ fontSize: 25, fontWeight: 700, color: LC.ink, letterSpacing: "-0.01em" }}>Marina Costa</div>
            <div style={{ fontSize: 17, color: LC.ink45, display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: LC.green, display: "inline-block" }} />Clínica Belle · WhatsApp
            </div>
        </div>
    </div>
);

// ── Cursor animado (motion) ──
export const Cursor: React.FC<{ x: number; y: number; down?: boolean }> = ({ x, y, down }) => (
    <div style={{ position: "absolute", left: x, top: y, width: 54, height: 54, zIndex: 50, transform: `scale(${down ? 0.86 : 1})`, transformOrigin: "6px 4px", filter: "drop-shadow(0 6px 10px rgba(15,23,42,0.28))" }}>
        <svg viewBox="0 0 28 28" width="54" height="54"><path d="M5 2 L5 22 L10 17 L13.5 25 L17 23.5 L13.5 15.5 L21 15.5 Z" fill="#fff" stroke={LC.ink} strokeWidth={1.5} strokeLinejoin="round" /></svg>
    </div>
);

// ripple no clique
export const Ripple: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
    const s = interpolate(t, [0, 1], [0.3, 5.5], { extrapolateRight: "clamp" });
    const o = interpolate(t, [0, 1], [0.5, 0], { extrapolateRight: "clamp" });
    return <div style={{ position: "absolute", left: x, top: y, width: 16, height: 16, borderRadius: 999, background: `rgba(21,86,192,${o})`, border: `3px solid rgba(21,86,192,${o})`, transform: `translate(-50%,-50%) scale(${s})`, zIndex: 49 }} />;
};

// ── Título editorial (eyebrow mono + headline) ──
export const SceneTitle: React.FC<{ frame: number; kicker: string; children: React.ReactNode; top?: number }> = ({ frame, kicker, children, top = 120 }) => {
    const a = fadeUp(frame, 6, 20);
    return (
        <div style={{ position: "absolute", top, left: 0, right: 0, textAlign: "center", ...a }}>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>{kicker}</div>
            <div style={{ fontFamily: HEAD, fontSize: 70, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.04 }}>{children}</div>
        </div>
    );
};

// ── Transição: in/out por cena (crossfade + slide/scale) ──
export type TKind = "fade" | "slideLeft" | "slideUp" | "scale";
export const transStyle = (local: number, total: number, inK: TKind = "fade", outK: TKind = "fade", d = 14): React.CSSProperties => {
    const tin = interpolate(local, [0, d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const tout = interpolate(local, [total - d, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ein = easeOutCubic(tin);
    const opacity = ein * tout;
    let tx = 0, ty = 0, sc = 1;
    if (inK === "slideLeft") tx += (1 - ein) * 80;
    if (inK === "slideUp") ty += (1 - ein) * 60;
    if (inK === "scale") sc *= 0.96 + 0.04 * ein;
    if (outK === "slideLeft") tx -= (1 - tout) * 80;
    if (outK === "slideUp") ty -= (1 - tout) * 60;
    if (outK === "scale") sc *= 1 - (1 - tout) * 0.03;
    return { opacity, transform: `translate(${tx}px,${ty}px) scale(${sc})` };
};

// ════════════════════════════════════════════════════════════
//  FILM GRADE — textura/profundidade que separa "slide" de "filme"
//  (mantém a paleta da marca; só adiciona luz, grão e vinheta)
// ════════════════════════════════════════════════════════════

// Grão de filme: tile de ruído SVG (fractalNoise dessaturado) repetido.
const GRAIN_URI =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="200" height="200" filter="url(#n)"/></svg>',
    );

// Cintila deslocando o tile por frame (grão real "respira", não fica congelado)
export const FilmGrain: React.FC<{ frame: number; opacity?: number }> = ({ frame, opacity = 0.06 }) => {
    const gx = (Math.floor(frame * 41) % 11) * 18 - 90;
    const gy = (Math.floor(frame * 67) % 11) * 18 - 90;
    return (
        <AbsoluteFill
            style={{
                backgroundImage: `url("${GRAIN_URI}")`,
                backgroundRepeat: "repeat",
                backgroundPosition: `${gx}px ${gy}px`,
                mixBlendMode: "soft-light",
                opacity,
                pointerEvents: "none",
            }}
        />
    );
};

// Vinheta: escurece as bordas, foca o olho no centro
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
    <AbsoluteFill
        style={{
            background: `radial-gradient(118% 76% at 50% 40%, transparent 50%, rgba(13,20,33,${0.05 * strength}) 84%, rgba(13,20,33,${0.13 * strength}) 100%)`,
            pointerEvents: "none",
        }}
    />
);

// Luz ambiente no topo (volume/profundidade sem tingir a paleta)
export const TopLight: React.FC = () => (
    <AbsoluteFill
        style={{
            background: "radial-gradient(76% 40% at 50% -4%, rgba(255,255,255,0.6), transparent 62%)",
            mixBlendMode: "soft-light",
            pointerEvents: "none",
        }}
    />
);

// Pacote completo de grade (uma linha no fim de cada filme)
export const FilmGrade: React.FC<{ frame: number; grain?: number; vignette?: number }> = ({ frame, grain = 0.06, vignette = 1 }) => (
    <>
        <TopLight />
        <Vignette strength={vignette} />
        <FilmGrain frame={frame} opacity={grain} />
    </>
);

// Sombra em camadas (ambient + contato + key) — cards "pousam" na cena
export const cardShadow = (tint = "15,23,42") =>
    `0 1px 1px rgba(${tint},0.04), 0 8px 16px -10px rgba(${tint},0.16), 0 40px 84px -38px rgba(${tint},0.34)`;

// Stage: centra opticamente um conteúdo posicionado em absoluto.
// Desloca TODOS os filhos juntos (cards, cursor, ripple) preservando o alinhamento.
export const Stage: React.FC<{ shift?: number; children: React.ReactNode }> = ({ shift = 0, children }) => (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${shift}px)` }}>{children}</div>
);

// ════════════════════════════════════════════════════════════
//  LINGUAGEM CINEMÁTICA — primitivas usadas por TODAS as cenas
//  (mesma língua: câmera, profundidade, vidro). Ref: HookCine.tsx
// ════════════════════════════════════════════════════════════

// Câmera: push-in lento e contínuo por toda a cena (o "ar" de filme).
// Envolve o conteúdo. `total` = durationInFrames da cena.
export const CineCamera: React.FC<{ frame: number; total: number; from?: number; to?: number; origin?: string; children: React.ReactNode }> = ({ frame, total, from = 1.0, to = 1.055, origin = "50% 44%", children }) => {
    const s = interpolate(frame, [0, total], [from, to], { ...CL, easing: easeInOut });
    const y = interpolate(frame, [0, total], [14, -16], { ...CL, easing: easeInOut });
    return <AbsoluteFill style={{ transform: `scale(${s}) translateY(${y}px)`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

// Partículas de profundidade (bokeh) — atmosfera 3D com parallax lento.
export const Bokeh: React.FC<{ frame: number; count?: number; dark?: boolean }> = ({ frame, count = 14, dark = false }) => {
    const motes = React.useMemo(
        () =>
            Array.from({ length: count }).map((_, i) => ({
                x: (i * 137.5) % 100,
                y: (i * 53.3) % 100,
                r: 6 + ((i * 17) % 26),
                depth: 0.3 + ((i * 7) % 10) / 14,
                phase: (i * 1.7) % (Math.PI * 2),
                hue: i % 3,
            })),
        [count],
    );
    return (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
            {motes.map((m, i) => {
                const drift = Math.sin(frame / (70 / m.depth) + m.phase) * 24 * m.depth;
                const driftX = Math.cos(frame / (95 / m.depth) + m.phase) * 16 * m.depth;
                const op = (0.045 + m.depth * 0.09) * interpolate(frame, [0, 30], [0, 1], CL);
                const col = dark ? (m.hue === 0 ? "230,238,255" : "150,180,210") : m.hue === 1 ? "120,165,235" : m.hue === 2 ? "150,180,210" : "255,255,255";
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${m.x}%`,
                            top: `${m.y}%`,
                            width: m.r * (1 + m.depth) * 2,
                            height: m.r * (1 + m.depth) * 2,
                            borderRadius: "50%",
                            background: `radial-gradient(circle at 38% 34%, rgba(${col},${op}) 0%, rgba(${col},0) 70%)`,
                            filter: `blur(${(1 - m.depth) * 7 + 2}px)`,
                            transform: `translate(${driftX}px, ${drift}px)`,
                        }}
                    />
                );
            })}
        </AbsoluteFill>
    );
};

// Fundo claro premium com profundidade + luz (substitui o paper chapado).
// tint: leve glow da cor da cena (azul=produto, eva=IA). Mantém a paleta.
export const SceneBGLight: React.FC<{ frame?: number; tint?: "neutral" | "blue" | "eva"; bokeh?: boolean }> = ({ frame = 0, tint = "neutral", bokeh = true }) => {
    const glow = tint === "blue" ? "rgba(21,86,192,0.07)" : tint === "eva" ? "rgba(109,40,217,0.07)" : "rgba(120,150,200,0.04)";
    return (
        <AbsoluteFill>
            <AbsoluteFill style={{ background: "radial-gradient(125% 96% at 50% 12%, #ffffff 0%, #f7f6f2 48%, #eceae4 100%)" }} />
            <AbsoluteFill style={{ background: `radial-gradient(58% 40% at 50% 24%, ${glow}, transparent 70%)` }} />
            <AbsoluteFill style={{ background: "radial-gradient(72% 38% at 50% -6%, rgba(255,255,255,0.6), transparent 60%)", mixBlendMode: "soft-light" }} />
            {bokeh && <Bokeh frame={frame} count={12} />}
        </AbsoluteFill>
    );
};

// Card de vidro premium: specular highlight + sombra em camadas + tilt 3D + float.
export const GlassCard: React.FC<{ children: React.ReactNode; frame?: number; width?: number; padding?: number | string; radius?: number; tilt?: number; float?: boolean; style?: React.CSSProperties }> = ({ children, frame = 0, width, padding = "34px 36px", radius = 32, tilt = 0, float = false, style }) => {
    const fl = float ? Math.sin(frame / 46) * 6 : 0;
    return (
        <div style={{ position: "relative", width, transform: `${tilt ? `perspective(1700px) rotateX(${tilt}deg) ` : ""}translateY(${fl}px)`, transformStyle: "preserve-3d", ...style }}>
            <div style={{ position: "relative", background: "linear-gradient(170deg, rgba(255,255,255,0.98), rgba(247,248,251,0.95))", borderRadius: radius, border: "1px solid rgba(255,255,255,0.9)", boxShadow: cardShadow(), overflow: "hidden", padding }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.6) 0%, transparent 26%)", pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>{children}</div>
            </div>
        </div>
    );
};
