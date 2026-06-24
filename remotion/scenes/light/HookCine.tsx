import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, interpolateColors, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { HEAD, SERIF, MONO, useSentient, FilmGrade } from "./lib-light";
import { easeInOut, circOut, backOut } from "motion";

const CL = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ip = (f: number, a: number[], b: number[], ease?: (t: number) => number) =>
    interpolate(f, a, b, { ...CL, ...(ease ? { easing: ease } : {}) });
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ── motor do tempo: começa devagar e DISPARA (o lead sendo abandonado) ──
const ACCEL_START = 120;
const ACCEL_FRAMES = 200;
const TOTAL_MIN = 2880; // 2 dias (2 ciclos dia/noite visíveis)
const elapsedMin = (f: number) => Math.pow(clamp01((f - ACCEL_START) / ACCEL_FRAMES), 1.5) * TOTAL_MIN;
const pad = (n: number) => String(n).padStart(2, "0");

// estado do céu em função do frame (compartilhado por Sky + textos adaptativos)
const sky = (f: number) => {
    const total = 23 * 60 + 47 + elapsedMin(f);
    const hod = (total / 60) % 24; // hora do dia
    const elev = Math.sin(((hod - 6) / 12) * Math.PI); // -1 (meia-noite) .. 1 (meio-dia)
    const bright = clamp01((elev + 0.22) / 1.05); // 0 noite, 1 dia
    const days = Math.floor(elapsedMin(f) / 1440);
    return { total, hod, elev, bright, days };
};
// cor de texto que acompanha a luz do céu (clara à noite, escura de dia)
const inkA = (bright: number) => interpolateColors(bright, [0, 1], ["#eef3fa", "#0d1421"]);

const HOR = 1180; // linha do horizonte (px)
const PEAK = 560; // altura máx. do arco sol/lua

// ── Céu dinâmico: estrelas, lua, sol, gradiente noite→dia→noite ──
const STARS = Array.from({ length: 80 }).map((_, i) => ({
    x: (i * 97.3) % 100,
    y: (i * 61.7) % 64,
    r: 1.2 + ((i * 13) % 4) * 0.6,
    tw: (i * 0.7) % (Math.PI * 2),
}));

const Sky: React.FC<{ frame: number }> = ({ frame }) => {
    const { hod, elev, bright } = sky(frame);

    const top = interpolateColors(bright, [0, 0.5, 1], ["#070b18", "#3a4566", "#a7c8ee"]);
    const mid = interpolateColors(bright, [0, 0.5, 1], ["#0e1426", "#6b6f86", "#cfe0f3"]);
    const bot = interpolateColors(bright, [0, 0.5, 1], ["#161d33", "#b98a78", "#eef0ec"]);

    // calor de amanhecer/pôr (pico quando o sol cruza o horizonte)
    const twilight = Math.exp(-(elev * elev) / 0.012) * clamp01((bright - 0.02) * 6);

    // sol
    const sunProg = clamp01((hod - 5.5) / 13);
    const sunX = 12 + sunProg * 76;
    const sunY = HOR - Math.sin(clamp01(sunProg) * Math.PI) * PEAK;
    const sunOp = clamp01((elev + 0.04) / 0.18);

    // lua
    const mh = (hod + 6) % 24;
    const moonProg = mh / 12; // válido (0..1) durante a noite
    const moonX = 12 + clamp01(moonProg) * 76;
    const moonY = HOR - Math.sin(clamp01(moonProg) * Math.PI) * PEAK;
    const moonOp = moonProg <= 1.02 ? clamp01((-elev + 0.04) / 0.18) : 0;

    return (
        <AbsoluteFill style={{ overflow: "hidden" }}>
            <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 52%, ${bot} 100%)` }} />

            {/* estrelas (noite) */}
            <AbsoluteFill style={{ opacity: clamp01(1 - bright * 1.6) }}>
                {STARS.map((s, i) => {
                    const tw = 0.45 + 0.55 * Math.sin(frame / (7 + (i % 5)) + s.tw);
                    return (
                        <div key={i} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, borderRadius: "50%", background: "#eaf0ff", opacity: tw * 0.9, boxShadow: `0 0 ${s.r * 2}px rgba(220,232,255,0.6)` }} />
                    );
                })}
            </AbsoluteFill>

            {/* lua */}
            <div style={{ position: "absolute", left: `${moonX}%`, top: moonY, transform: "translate(-50%,-50%)", opacity: moonOp }}>
                <div style={{ position: "absolute", left: "50%", top: "50%", width: 360, height: 360, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(214,226,255,0.5), transparent 70%)", filter: "blur(8px)" }} />
                <div style={{ width: 132, height: 132, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%, #f4f7ff, #c4d0e8 70%, #aab8d6)", boxShadow: "inset -10px -8px 22px rgba(120,135,170,0.5)" }}>
                    <div style={{ position: "absolute", top: 38, left: 30, width: 22, height: 22, borderRadius: "50%", background: "rgba(150,165,200,0.35)" }} />
                    <div style={{ position: "absolute", top: 74, left: 72, width: 16, height: 16, borderRadius: "50%", background: "rgba(150,165,200,0.3)" }} />
                </div>
            </div>

            {/* sol */}
            <div style={{ position: "absolute", left: `${sunX}%`, top: sunY, transform: "translate(-50%,-50%)", opacity: sunOp }}>
                <div style={{ position: "absolute", left: "50%", top: "50%", width: 640, height: 640, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,214,0.55), transparent 66%)", filter: "blur(10px)" }} />
                <div style={{ width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle at 50% 45%, #fffdf6, #ffe9b8 60%, #ffd98a)", boxShadow: "0 0 60px 12px rgba(255,225,160,0.55)" }} />
            </div>

            {/* calor de twilight no horizonte (só no nascer/pôr) */}
            <AbsoluteFill style={{ background: `radial-gradient(120% 46% at 50% ${HOR / 19.2}%, rgba(255,150,90,${0.5 * twilight}), transparent 60%)`, mixBlendMode: "screen", pointerEvents: "none" }} />
            {/* névoa do horizonte — só de DIA (some à noite p/ não virar listra); feather nas 2 pontas */}
            <div style={{ position: "absolute", left: 0, right: 0, top: HOR - 240, height: 560, background: `linear-gradient(180deg, transparent, ${bot} 58%, transparent)`, opacity: 0.55 * bright, pointerEvents: "none" }} />
        </AbsoluteFill>
    );
};

// ── Relógio: timestamp grande com motion-blur proporcional à velocidade ──
const Clock: React.FC<{ frame: number }> = ({ frame }) => {
    const { hod, bright, days } = sky(frame);
    const HH = Math.floor((23 * 60 + 47 + elapsedMin(frame)) / 60) % 24;
    const MM = Math.floor(23 * 60 + 47 + elapsedMin(frame)) % 60;
    void hod;
    const speed = elapsedMin(frame) - elapsedMin(frame - 1);
    const mblur = Math.min(13, speed * 0.5);
    const dim = ip(speed, [0, 40], [1, 0.55]);
    const colonOn = Math.floor(frame / 14) % 2 === 0 || speed > 2;
    const appear = ip(frame, [8, 32], [0, 1], circOut);
    const appearY = ip(frame, [8, 34], [26, 0], backOut);
    const col = inkA(bright);

    return (
        <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", opacity: appear, transform: `translateY(${appearY}px)` }}>
            <Ruler frame={frame} bright={bright} />
            <div style={{ fontFamily: MONO, fontSize: 132, fontWeight: 700, letterSpacing: "-0.02em", color: col, lineHeight: 1, fontVariantNumeric: "tabular-nums", filter: mblur > 0.4 ? `blur(${mblur}px)` : "none", opacity: dim, textShadow: "0 2px 30px rgba(0,0,0,0.22)" }}>
                {pad(HH)}
                <span style={{ opacity: colonOn ? 1 : 0.12, margin: "0 2px" }}>:</span>
                {pad(MM)}
            </div>
            <div style={{ marginTop: 26, fontFamily: MONO, fontSize: 26, letterSpacing: "0.34em", textTransform: "uppercase", color: col, opacity: ip(frame, [70, 96], [0, 0.72]) }}>
                {days <= 0 ? "lida · sem resposta" : `há ${days} ${days === 1 ? "dia" : "dias"} · sem resposta`}
            </div>
        </div>
    );
};

const Ruler: React.FC<{ frame: number; bright: number }> = ({ frame, bright }) => {
    const shift = (elapsedMin(frame) / TOTAL_MIN) * 320;
    const op = ip(frame, [120, 160, 330, 360], [0, 0.5, 0.5, 0.2]);
    const tick = interpolateColors(bright, [0, 1], ["rgba(220,230,250,0.4)", "rgba(13,20,33,0.28)"]);
    return (
        <div style={{ position: "absolute", top: -54, left: 0, right: 0, height: 40, opacity: op, overflow: "hidden", pointerEvents: "none", maskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)" }}>
            <div style={{ position: "absolute", left: "50%", top: 0, transform: `translateX(calc(-50% - ${shift}px))`, display: "flex", gap: 34 }}>
                {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} style={{ width: 2, height: i % 5 === 0 ? 28 : 16, background: tick, flexShrink: 0 }} />
                ))}
            </div>
        </div>
    );
};

// ── geada que se forma no card (cristais + véu) conforme esfria ──
const Frost: React.FC<{ cool: number }> = ({ cool }) => (
    <div style={{ position: "absolute", inset: 0, borderRadius: 36, overflow: "hidden", pointerEvents: "none", opacity: cool }}>
        {/* véu frio das bordas pra dentro */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 50% 50%, transparent 40%, rgba(176,201,230,0.5) 100%)" }} />
        {/* brilhos de cristal nos cantos */}
        {[
            { t: 8, l: 8, r: -25 },
            { t: 10, r: 12, r2: 30 },
            { b: 12, l: 16, r: 18 },
            { b: 10, r: 18, r2: -20 },
        ].map((c, i) => (
            <div
                key={i}
                style={{
                    position: "absolute",
                    top: c.t,
                    bottom: c.b,
                    left: c.l,
                    right: c.r2 !== undefined ? c.r : undefined,
                    width: 120,
                    height: 3,
                    background: "linear-gradient(90deg, transparent, rgba(235,245,255,0.85), transparent)",
                    transform: `rotate(${c.r2 ?? c.r ?? 0}deg)`,
                    filter: "blur(0.4px)",
                }}
            />
        ))}
    </div>
);

// partículas frias subindo (respiro gélido)
const ColdMotes: React.FC<{ frame: number; cool: number }> = ({ frame, cool }) =>
    cool < 0.02 ? null : (
        <>
            {Array.from({ length: 10 }).map((_, i) => {
                const seed = i * 53.7;
                const x = (seed % 100);
                const rise = ((frame * (0.6 + (i % 3) * 0.2) + seed) % 180);
                const op = cool * clamp01(Math.sin((rise / 180) * Math.PI)) * 0.5;
                return <div key={i} style={{ position: "absolute", left: `${10 + (x % 80)}%`, top: 980 - rise * 2.2, width: 5, height: 5, borderRadius: "50%", background: "rgba(225,240,255,0.9)", opacity: op, filter: "blur(0.6px)", boxShadow: "0 0 8px rgba(200,225,255,0.8)" }} />;
            })}
        </>
    );

export const HookCine: React.FC = () => {
    useSentient();
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const { bright } = sky(f);

    const camScale = ip(f, [0, durationInFrames], [1.0, 1.07], easeInOut);
    const camY = ip(f, [0, durationInFrames], [18, -22], easeInOut);

    const cardIn = ip(f, [48, 92], [0, 1], circOut);
    const cardBlur = ip(f, [48, 90], [26, 0]);
    const cardY = ip(f, [48, 96], [120, 0], backOut);
    const floatY = Math.sin((f - 60) / 46) * 7;
    const tiltX = 7 - ip(f, [48, 116], [4, 0]);
    const tiltY = ip(f, [48, 116], [-5, -2.5]);
    const msgIn = ip(f, [96, 124], [0, 1], circOut);

    const cool = clamp01(elapsedMin(f) / TOTAL_MIN);
    const dotCol = interpolateColors(cool, [0, 1], ["#13b877", "#7d93ad"]);

    const h1 = ip(f, [325, 358], [0, 1], circOut);
    const h1y = ip(f, [325, 362], [42, 0], backOut);

    return (
        <AbsoluteFill style={{ fontFamily: HEAD, background: "#070b18" }}>
            <Sky frame={f} />

            <AbsoluteFill style={{ transform: `scale(${camScale}) translateY(${camY}px)`, transformOrigin: "50% 42%" }}>
                <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "50% 40%" }}>
                    <Clock frame={f} />

                    {/* card de vidro flutuante */}
                    <div
                        style={{
                            position: "absolute",
                            top: 720,
                            left: "50%",
                            width: 720,
                            transform: `translateX(-50%) translateY(${cardY + floatY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
                            transformStyle: "preserve-3d",
                            opacity: cardIn,
                            filter: `blur(${cardBlur}px)`,
                        }}
                    >
                        <div style={{ position: "absolute", left: "50%", bottom: -70, width: 560, height: 120, transform: "translateX(-50%) rotateX(62deg)", background: "radial-gradient(50% 50% at 50% 50%, rgba(5,10,22,0.4), transparent 72%)", filter: "blur(26px)" }} />
                        <div
                            style={{
                                position: "relative",
                                background: "linear-gradient(170deg, rgba(255,255,255,0.97), rgba(246,248,251,0.94))",
                                borderRadius: 36,
                                padding: "36px 38px",
                                border: "1px solid rgba(255,255,255,0.9)",
                                boxShadow: "0 1px 1px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9), 0 30px 60px -28px rgba(5,10,22,0.5), 0 70px 130px -50px rgba(5,10,22,0.6)",
                                overflow: "hidden",
                            }}
                        >
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.7) 0%, transparent 28%)", pointerEvents: "none" }} />

                            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22, position: "relative" }}>
                                <div style={{ width: 60, height: 60, borderRadius: 999, background: "linear-gradient(135deg,#1556c0,#2f6fd6)", color: "#fff", fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px -6px rgba(21,86,192,0.6)" }}>MC</div>
                                <div>
                                    <div style={{ fontSize: 27, fontWeight: 700, color: "#0d1421", letterSpacing: "-0.01em" }}>Marina · Clínica Belle</div>
                                    <div style={{ fontSize: 18, color: "rgba(13,20,33,0.4)" }}>WhatsApp</div>
                                </div>
                            </div>

                            <div style={{ background: "#f3f5f9", border: "1px solid rgba(13,20,33,0.14)", borderRadius: "22px 22px 22px 8px", padding: "20px 24px", fontSize: 27, color: "#0d1421", lineHeight: 1.42, opacity: msgIn, transform: `translateY(${(1 - msgIn) * 12}px)`, position: "relative" }}>
                                Vocês ainda fazem tráfego pago? Queria começar logo.
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 20, fontSize: 20, color: "rgba(13,20,33,0.45)", opacity: msgIn, position: "relative" }}>
                                <span style={{ width: 13, height: 13, borderRadius: 999, background: dotCol, boxShadow: `0 0 ${10 * (1 - cool)}px ${dotCol}` }} />
                                <span style={{ color: interpolateColors(cool, [0, 1], ["rgba(13,20,33,0.45)", "#7d93ad"]) }}>
                                    {cool < 0.35 ? "lida" : "ainda sem resposta"}
                                </span>
                            </div>

                            <Frost cool={cool} />
                        </div>
                        <ColdMotes frame={f} cool={cool} />
                    </div>

                    <div style={{ position: "absolute", top: 1320, left: 0, right: 0, textAlign: "center", padding: "0 110px", opacity: h1, transform: `translateY(${h1y}px)` }}>
                        <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-0.038em", color: inkA(bright), lineHeight: 1.03, textShadow: "0 2px 36px rgba(0,0,0,0.28)" }}>
                            Todo dia, um lead{" "}
                            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: "#9db6d4" }}>esfria</span>
                            <br />no WhatsApp.
                        </div>
                    </div>
                </AbsoluteFill>
            </AbsoluteFill>

            <FilmGrade frame={f} grain={0.11} vignette={1.3} />

            {/* som de esfriamento (início da aceleração + reforço) */}
            <Sequence from={126}><Audio src={staticFile("audio/freeze.wav")} volume={0.55} /></Sequence>
            <Sequence from={250}><Audio src={staticFile("audio/freeze.wav")} volume={0.4} /></Sequence>
            {/* narração por frase, sincronizada aos beats (ElevenLabs · Bella) */}
            <Sequence from={44}><Audio src={staticFile("audio/vo/cine/L1.mp3")} /></Sequence>
            <Sequence from={150}><Audio src={staticFile("audio/vo/cine/L2.mp3")} /></Sequence>
            <Sequence from={205}><Audio src={staticFile("audio/vo/cine/L3.mp3")} /></Sequence>
            <Sequence from={305}><Audio src={staticFile("audio/vo/cine/L4.mp3")} /></Sequence>
        </AbsoluteFill>
    );
};
