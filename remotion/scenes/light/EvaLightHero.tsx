import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useCountUp } from "../salesV2/lib";
import { CineCamera, SceneBGLight } from "./lib-light";

// Carrega Sentient (voz humana da marca) garantindo o load antes do render headless
const useSentient = () => {
    const [handle] = useState(() => delayRender("sentient"));
    useEffect(() => {
        let done = false;
        const finish = () => { if (!done) { done = true; continueRender(handle); } };
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://api.fontshare.com/v2/css?f[]=sentient@500i&display=swap";
        link.onload = () => {
            (document.fonts?.load("italic 500 40px Sentient") || Promise.resolve()).then(finish).catch(finish);
        };
        link.onerror = finish;
        document.head.appendChild(link);
        const t = setTimeout(finish, 8000);
        return () => clearTimeout(t);
    }, [handle]);
};

// ── Tokens OFICIAIS da marca (--lp-*): papel/tinta, azul ação, roxo só accent EVA ──
const C = {
    paper: "#faf9f5",   // --lp-paper
    paper2: "#ffffff",  // --lp-white
    conv: "#f3f5f9",
    white: "#ffffff",
    ink: "#0d1421",     // --lp-ink
    ink70: "rgba(13,20,33,0.60)",
    ink45: "rgba(13,20,33,0.40)",
    line: "rgba(13,20,33,0.08)",
    line2: "rgba(13,20,33,0.14)", // --lp-line
    blue: "#1556c0",    // --lp-blue
    blue2: "#2f6fd6",
    eva: "#6d28d9",     // --lp-eva
    evaSoft: "#f6f4fd",
    evaLine: "rgba(109,40,217,0.18)",
    green: "#008a52",   // --lp-live
    amber: "#b45309",
    amberSoft: "rgba(245,158,11,0.13)",
    greenSoft: "rgba(0,138,82,0.12)",
};
const HEAD = "'Sora', sans-serif";

const MSGS = [
    { who: "lead", t: "Oi! Queria entender como funciona o tráfego pago pra agendar mais avaliações." },
    { who: "me", t: "Oi Marina! Hoje vocês já investem em anúncio?" },
    { who: "lead", t: "Já invisto uns 3 mil/mês, mas vem pouco agendamento qualificado." },
    { who: "lead", t: "Preciso pra ontem, tô com a agenda parada." },
];

const easeOutY = (frame: number, start: number, dist = 16) => {
    const t = interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const e = 1 - Math.pow(1 - t, 3);
    return { opacity: e, y: (1 - e) * dist };
};

export const EvaLightHero: React.FC = () => {
    useSentient();
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // micro-float que dá vida ao device (herói) durante os holds
    const heroFloat = Math.sin(frame / 52) * 6;

    // device entra
    const devSpring = spring({ frame, fps, config: { damping: 200, stiffness: 90, mass: 1 } });
    const devScale = interpolate(devSpring, [0, 1], [0.965, 1]);
    const devOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

    // título
    const title = easeOutY(frame, 6, 20);

    // mensagens escalonadas
    const msgStart = 30;
    const msgStep = 15;
    const typingFrame = msgStart + MSGS.length * msgStep; // ~90
    const typingIn = interpolate(frame, [typingFrame, typingFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const typingOut = interpolate(frame, [typingFrame + 34, typingFrame + 44], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const typingOp = typingIn * typingOut;

    // sheet sobe
    const sheetStart = typingFrame + 30; // ~120
    const sheetSpring = spring({ frame: frame - sheetStart, fps, config: { damping: 200, stiffness: 110, mass: 0.9 } });
    const sheetY = interpolate(sheetSpring, [0, 1], [420, 0]);
    const sheetOp = interpolate(frame, [sheetStart, sheetStart + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // score + barra
    const scoreStart = sheetStart + 14;
    const score = useCountUp(frame, 82, scoreStart, scoreStart + 34);
    const barW = interpolate(frame, [scoreStart, scoreStart + 40], [0, 82], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // resposta sugerida
    const replyStart = scoreStart + 30;
    const reply = easeOutY(frame, replyStart, 16);
    const btnPulse = 1 + 0.03 * Math.sin((frame - replyStart) / 5);

    const Bubble = (i: number) => {
        const m = MSGS[i];
        const { opacity, y } = easeOutY(frame, msgStart + i * msgStep, 14);
        const me = m.who === "me";
        return (
            <div key={i} style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", opacity, transform: `translateY(${y}px)` }}>
                <div style={{
                    maxWidth: "78%", padding: "13px 17px", fontSize: 25, lineHeight: 1.42, borderRadius: 22,
                    fontFamily: HEAD, fontWeight: 500,
                    ...(me
                        ? { background: `linear-gradient(135deg,${C.blue},${C.blue2})`, color: "#fff", borderBottomRightRadius: 7, boxShadow: "0 6px 18px -10px rgba(37,99,235,0.5)" }
                        : { background: C.white, color: C.ink, border: `1px solid ${C.line2}`, borderBottomLeftRadius: 7, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }),
                }}>{m.t}</div>
            </div>
        );
    };

    return (
        <AbsoluteFill style={{ fontFamily: HEAD }}>
            <SceneBGLight frame={frame} tint="eva" />
            <CineCamera frame={frame} total={durationInFrames} origin="50% 46%">
            {/* título */}
            <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: title.opacity, transform: `translateY(${title.y}px)` }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: C.eva, marginBottom: 16 }}>No WhatsApp</div>
                <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: "-0.03em", color: C.ink, lineHeight: 1.04 }}>
                    A EVA <span style={{ fontFamily: "'Sentient', Georgia, serif", fontStyle: "italic", fontWeight: 500, color: C.eva }}>lê</span> a conversa
                </div>
            </div>

            {/* device */}
            <div style={{ position: "absolute", top: 360, left: "50%", transform: `translateX(-50%) translateY(${heroFloat}px) scale(${devScale})`, opacity: devOp, transformOrigin: "top center" }}>
                {/* sombra de contato — o device "pousa" na cena */}
                <div style={{ position: "absolute", left: "50%", bottom: -54, width: 540, height: 110, transform: "translateX(-50%)", background: "radial-gradient(50% 50% at 50% 50%, rgba(15,23,42,0.26), transparent 72%)", filter: "blur(30px)", pointerEvents: "none" }} />
                <div style={{
                    width: 640, height: 1300, background: C.white, borderRadius: 60, padding: 16,
                    border: `1px solid ${C.line}`,
                    boxShadow: "0 1px 1px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9), 0 40px 80px -34px rgba(15,23,42,0.34), 0 90px 150px -56px rgba(15,23,42,0.4)",
                }}>
                    <div style={{ width: 608, height: 1268, borderRadius: 46, overflow: "hidden", background: C.conv, position: "relative", display: "flex", flexDirection: "column" }}>
                        {/* header */}
                        <div style={{ background: C.white, borderBottom: `1px solid ${C.line2}`, padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 999, background: `linear-gradient(135deg,${C.blue},${C.blue2})`, color: "#fff", fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>MC</div>
                            <div>
                                <div style={{ fontSize: 25, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>Marina Costa</div>
                                <div style={{ fontSize: 17, color: C.ink45, display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                                    <span style={{ width: 9, height: 9, borderRadius: 999, background: C.green, display: "inline-block" }} />Clínica Belle · WhatsApp
                                </div>
                            </div>
                        </div>
                        {/* stream */}
                        <div style={{ flex: 1, padding: "26px 24px", display: "flex", flexDirection: "column", gap: 13 }}>
                            {MSGS.map((_, i) => Bubble(i))}
                            {/* typing */}
                            <div style={{ alignSelf: "flex-start", opacity: typingOp, display: "flex", alignItems: "center", gap: 11, background: "#f3eefe", border: `1px solid ${C.evaLine}`, padding: "12px 18px", borderRadius: 18 }}>
                                <span style={{ fontSize: 20, fontWeight: 700, color: C.eva }}>EVA está lendo</span>
                                {[0, 1, 2].map((d) => {
                                    const o = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((frame - typingFrame) / 3 - d * 0.7));
                                    return <span key={d} style={{ width: 10, height: 10, borderRadius: 999, background: C.eva, opacity: o, display: "inline-block" }} />;
                                })}
                            </div>
                        </div>
                        {/* EVA sheet */}
                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: `translateY(${sheetY}px)`, opacity: sheetOp, background: C.white, borderTop: `1px solid ${C.evaLine}`, borderRadius: "30px 30px 0 0", boxShadow: "0 -24px 60px -24px rgba(109,40,217,0.30)", padding: "20px 24px 30px" }}>
                            <div style={{ width: 54, height: 6, borderRadius: 999, background: C.line2, margin: "0 auto 18px" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 999, background: "radial-gradient(circle at 35% 30%, #a78bfa, #6d28d9 60%, #4c1d95)", boxShadow: "0 8px 20px -8px rgba(109,40,217,0.5)" }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>EVA leu esta conversa</div>
                                    <div style={{ fontSize: 18, color: C.ink70 }}>e sugere o próximo passo</div>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: C.eva, background: "rgba(109,40,217,0.10)", padding: "6px 13px", borderRadius: 999, letterSpacing: "0.05em" }}>ASSISTIDA</div>
                            </div>
                            {/* diagnóstico */}
                            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14, border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px" }}>
                                <span style={{ fontSize: 21, fontWeight: 700, color: C.amber, background: C.amberSoft, padding: "8px 15px", borderRadius: 999 }}>🔥 Quente</span>
                                <span style={{ fontSize: 42, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{score}<span style={{ fontSize: 20, color: C.ink45, fontWeight: 600 }}>/100</span></span>
                                <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: C.green, background: C.greenSoft, padding: "8px 14px", borderRadius: 999 }}>Fit alto</span>
                            </div>
                            <div style={{ marginTop: 12, height: 10, borderRadius: 999, background: "#eef2f7", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${barW}%`, borderRadius: 999, background: "linear-gradient(90deg,#f59e0b,#ef4444)" }} />
                            </div>
                            {/* resposta */}
                            <div style={{ marginTop: 16, opacity: reply.opacity, transform: `translateY(${reply.y}px)` }}>
                                <div style={{ background: C.evaSoft, border: `1px solid ${C.evaLine}`, borderRadius: "18px 18px 18px 6px", padding: "16px 18px", fontSize: 22, color: "#1e1b2e", lineHeight: 1.5 }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.eva, marginBottom: 8 }}>Resposta sugerida</div>
                                    Marina, com R$ 3 mil/mês dá pra estruturar campanhas bem mais qualificadas. Posso te mostrar 2 horários ainda essa semana?
                                </div>
                                <div style={{ marginTop: 14, display: "flex", gap: 12 }}>
                                    <div style={{ flex: 1, height: 60, borderRadius: 18, background: `linear-gradient(135deg,${C.blue},${C.blue2})`, color: "#fff", fontSize: 23, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transform: `scale(${btnPulse})`, boxShadow: "0 12px 26px -10px rgba(37,99,235,0.55)" }}>→ Usar resposta</div>
                                    <div style={{ width: 130, height: 60, borderRadius: 18, border: `1px solid ${C.evaLine}`, color: C.eva, fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>Editar</div>
                                </div>
                                <div style={{ marginTop: 12, textAlign: "center", fontSize: 17, color: C.ink45 }}>você revisa antes de enviar</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </CineCamera>
        </AbsoluteFill>
    );
};
