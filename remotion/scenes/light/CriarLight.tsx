import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LC, HEAD, MONO, SERIF, PhoneFrame, PhoneHeader, Cursor, Ripple, fadeUp } from "./lib-light";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const Bubble: React.FC<{ frame: number; start: number; me?: boolean; children: React.ReactNode }> = ({ frame, start, me, children }) => {
    const a = fadeUp(frame, start, 14, 12);
    return (
        <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", ...a }}>
            <div style={{ maxWidth: "80%", padding: "13px 17px", fontSize: 24, lineHeight: 1.42, borderRadius: 22, fontFamily: HEAD, fontWeight: 500, ...(me ? { background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff", borderBottomRightRadius: 7 } : { background: LC.white, color: LC.ink, border: `1px solid ${LC.line2}`, borderBottomLeftRadius: 7 }) }}>{children}</div>
        </div>
    );
};

const Field: React.FC<{ frame: number; start: number; label: string; value: string }> = ({ frame, start, label, value }) => {
    const fill = interpolate(frame, [start, start + 10], [0, 1], clamp);
    return (
        <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: LC.ink45 }}>{label}</div>
            <div style={{ marginTop: 7, height: 64, borderRadius: 16, display: "flex", alignItems: "center", padding: "0 18px", fontSize: 24, fontWeight: 500, color: LC.ink, position: "relative", border: `1px solid ${fill > 0.5 ? "rgba(21,86,192,0.4)" : LC.line2}`, background: fill > 0.5 ? "#f6faff" : LC.white }}>
                <span style={{ opacity: fill }}>{value}</span>
                <span style={{ position: "absolute", right: 16, opacity: fill, fontSize: 14, fontWeight: 800, color: LC.eva, background: "rgba(109,40,217,0.10)", padding: "5px 10px", borderRadius: 8 }}>EVA</span>
            </div>
        </div>
    );
};

export const CriarLight: React.FC = () => {
    const f = useCurrentFrame();

    // modal sobe
    const modalUp = interpolate(f, [86, 104], [620, 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const modalOp = interpolate(f, [86, 100], [0, 1], clamp);
    const tempSel = f > 168;
    const done = f > 200;
    const doneOp = interpolate(f, [200, 214], [0, 1], clamp);

    // cursor + cliques
    const cx = interpolate(f, [38, 70, 84, 172, 190], [760, 540, 540, 540, 540], clamp);
    const cy = interpolate(f, [38, 70, 84, 172, 190], [1880, 1560, 1560, 1560, 1548], clamp);
    const down = (f >= 82 && f <= 92) || (f >= 196 && f <= 206);
    const r1 = (f - 82) / 18, r2 = (f - 196) / 18;

    const title = fadeUp(f, 6, 18);

    return (
        <AbsoluteFill style={{ background: LC.paper, fontFamily: HEAD }}>
            <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", ...title }}>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>Sem digitar nada</div>
                <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.04 }}>A conversa <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.blue }}>vira</span> oportunidade</div>
            </div>

            <PhoneFrame frame={f}>
                <PhoneHeader />
                <div style={{ flex: 1, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <Bubble frame={f} start={24}>Já invisto uns 3 mil/mês, mas vem pouco agendamento.</Bubble>
                    <Bubble frame={f} start={40} me>Entendi! Sua meta é volume de agendamento, certo?</Bubble>
                    <Bubble frame={f} start={56}>Isso. Preciso pra ontem, tô com a agenda parada.</Bubble>
                </div>

                {/* actionbar */}
                <div style={{ background: LC.white, borderTop: `1px solid ${LC.line2}`, padding: "16px 20px", opacity: interpolate(f, [86, 96], [1, 0], clamp) }}>
                    <div style={{ height: 64, borderRadius: 18, background: LC.evaSoft, border: `1px solid ${LC.evaLine}`, color: LC.eva, fontSize: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 4, background: `linear-gradient(135deg,${LC.eva},#9333ea)` }} />Criar oportunidade
                    </div>
                </div>

                {/* modal */}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: `translateY(${modalUp}px)`, opacity: modalOp, background: LC.white, borderTop: `1px solid ${LC.evaLine}`, borderRadius: "30px 30px 0 0", boxShadow: "0 -24px 60px -24px rgba(11,18,32,0.30)", padding: "22px 26px 30px" }}>
                    <div style={{ width: 54, height: 6, borderRadius: 999, background: LC.line2, margin: "0 auto 18px" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 999, background: "radial-gradient(circle at 35% 30%, #a78bfa, #6d28d9 60%, #4c1d95)" }} />
                        <div><div style={{ fontSize: 25, fontWeight: 800, color: LC.ink }}>Nova oportunidade</div><div style={{ fontSize: 17, color: LC.eva, fontWeight: 600 }}>a EVA já preencheu pra você</div></div>
                    </div>
                    <Field frame={f} start={112} label="Contato" value="Marina Costa" />
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}><Field frame={f} start={126} label="Empresa" value="Clínica Belle" /></div>
                        <div style={{ flex: 1 }}><Field frame={f} start={140} label="Valor" value="R$ 3.000/mês" /></div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: LC.ink45 }}>Temperatura</div>
                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            {["Frio", "Morno", "🔥 Quente"].map((t, i) => (
                                <div key={i} style={{ fontSize: 22, fontWeight: 700, padding: "10px 16px", borderRadius: 12, border: `1px solid ${i === 2 && tempSel ? "rgba(245,158,11,0.5)" : LC.line2}`, background: i === 2 && tempSel ? "rgba(245,158,11,0.12)" : LC.white, color: i === 2 && tempSel ? LC.amber : LC.ink45 }}>{t}</div>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginTop: 22, height: 70, borderRadius: 18, background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff", fontSize: 25, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 30px -12px rgba(21,86,192,0.55)" }}>Criar oportunidade</div>

                    {/* sucesso */}
                    <div style={{ position: "absolute", inset: 0, background: LC.white, borderRadius: "30px 30px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: doneOp, pointerEvents: "none" }}>
                        <div style={{ width: 96, height: 96, borderRadius: 999, background: LC.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, color: LC.green, transform: `scale(${interpolate(f, [200, 216], [0.6, 1], clamp)})` }}>✓</div>
                        <div style={{ fontSize: 30, fontWeight: 800, color: LC.ink }}>Oportunidade criada</div>
                        <div style={{ fontSize: 21, color: LC.ink70, textAlign: "center", padding: "0 50px", lineHeight: 1.5 }}>Marina Costa entrou no pipeline, na etapa Qualificando.</div>
                    </div>
                </div>
            </PhoneFrame>

            {!done && <Cursor x={cx} y={cy} down={down} />}
            {f >= 82 && f <= 100 && <Ripple x={540} y={1560} t={r1} />}
            {f >= 196 && f <= 214 && <Ripple x={540} y={1548} t={r2} />}

            {/* sons */}
            <Sequence from={82} durationInFrames={8}><Audio src={staticFile("audio/click.wav")} /></Sequence>
            <Sequence from={196} durationInFrames={8}><Audio src={staticFile("audio/click.wav")} /></Sequence>
            <Sequence from={112} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            <Sequence from={126} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            <Sequence from={140} durationInFrames={8}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
            <Sequence from={200} durationInFrames={10}><Audio src={staticFile("audio/pop.wav")} /></Sequence>
        </AbsoluteFill>
    );
};
