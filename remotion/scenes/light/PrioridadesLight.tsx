import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { LC, HEAD, MONO, SERIF, PhoneFrame, Cursor, fadeUp } from "./lib-light";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const items = [
    { rk: "1", in: "MC", nm: "Marina Costa", co: "Clínica Belle", chip: "QUENTE · 82", hot: true, reason: <>Tem verba (<b>R$ 3 mil/mês</b>) e urgência. Falta oferecer 2 horários.</>, cta: "Responder", ghost: false },
    { rk: "2", in: "RA", nm: "Rafael Andrade", co: "RA Performance", chip: "QUENTE · 78", hot: true, reason: <>Decisor confirmado e meta clara. <b>Pronto pra proposta.</b></>, cta: "Montar proposta", ghost: false },
    { rk: "3", in: "TM", nm: "Thiago Mendes", co: "Mendes Adv.", chip: "ESFRIANDO", hot: false, reason: <>Sumiu <b>há 2 dias</b>. Vale um follow-up leve.</>, cta: "Follow-up", ghost: true },
];

export const PrioridadesLight: React.FC = () => {
    const f = useCurrentFrame();
    const title = fadeUp(f, 6, 18);
    const cx = interpolate(f, [70, 96], [760, 470], clamp);
    const cy = interpolate(f, [70, 96], [1820, 720], clamp);
    const hl = interpolate(f, [96, 110], [0, 1], clamp); // highlight item 1

    return (
        <AbsoluteFill style={{ background: LC.paper, fontFamily: HEAD }}>
            <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", ...title }}>
                <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.22em", textTransform: "uppercase", color: LC.eva, marginBottom: 16 }}>Nunca mais esqueça um lead</div>
                <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: "-0.03em", color: LC.ink, lineHeight: 1.04 }}>O que <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, color: LC.blue }}>responder</span> agora</div>
            </div>

            <PhoneFrame frame={f} drift={0.6}>
                {/* header */}
                <div style={{ background: LC.white, borderBottom: `1px solid ${LC.line2}`, padding: "22px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 999, background: "radial-gradient(circle at 35% 30%, #a78bfa, #6d28d9 60%, #4c1d95)" }} />
                        <div style={{ fontSize: 27, fontWeight: 800, color: LC.ink, letterSpacing: "-0.02em" }}>Precisa de você agora</div>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, color: LC.green, background: LC.greenSoft, padding: "5px 11px", borderRadius: 999 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: LC.green }} />LIVE</div>
                    </div>
                    <div style={{ marginTop: 9, fontSize: 17, color: LC.ink70, lineHeight: 1.45 }}>A EVA ordenou por quem está mais perto de avançar.</div>
                </div>
                {/* lista */}
                <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
                    {items.map((it, i) => {
                        const a = fadeUp(f, 24 + i * 14, 18, 12);
                        const ring = i === 0 ? `0 0 0 ${3 * hl}px rgba(21,86,192,0.18)` : "none";
                        return (
                            <div key={i} style={{ background: LC.white, border: `1px solid ${it.hot ? "rgba(239,68,68,0.22)" : LC.line2}`, borderRadius: 20, padding: 16, boxShadow: `0 1px 2px rgba(15,23,42,0.04)${i === 0 ? "," + ring : ""}`, ...a }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ width: 20, textAlign: "center", fontSize: 18, fontWeight: 800, color: LC.ink45 }}>{it.rk}</span>
                                    <div style={{ width: 50, height: 50, borderRadius: 999, background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.in}</div>
                                    <div><div style={{ fontSize: 22, fontWeight: 700, color: LC.ink }}>{it.nm}</div><div style={{ fontSize: 15, color: LC.ink45 }}>{it.co}</div></div>
                                    <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, color: it.hot ? "#b91c1c" : LC.amber, background: it.hot ? "rgba(239,68,68,0.10)" : LC.amberSoft }}>{it.chip}</span>
                                </div>
                                <div style={{ marginTop: 11, fontSize: 19, color: "#334155", lineHeight: 1.45, display: "flex", gap: 8 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: `linear-gradient(135deg,${LC.eva},#9333ea)`, flexShrink: 0, marginTop: 4 }} /><span>{it.reason}</span></div>
                                <div style={{ marginTop: 13, display: "flex", justifyContent: "flex-end" }}>
                                    <span style={{ height: 50, padding: "0 22px", borderRadius: 14, display: "flex", alignItems: "center", gap: 7, fontSize: 19, fontWeight: 600, ...(it.ghost ? { background: LC.white, border: `1px solid ${LC.line2}`, color: "#334155" } : { background: `linear-gradient(135deg,${LC.blue},${LC.blue2})`, color: "#fff" }) }}>→ {it.cta}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PhoneFrame>

            <Cursor x={cx} y={cy} />
        </AbsoluteFill>
    );
};
