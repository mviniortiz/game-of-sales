import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LC, HEAD, MONO, Shimmer, backOut } from "./lib-light";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const BrandIntroLight: React.FC = () => {
    const f = useCurrentFrame();
    const logoOp = interpolate(f, [4, 22], [0, 1], clamp);
    const logoScale = interpolate(f, [4, 32], [0.7, 1], { ...clamp, easing: backOut });
    const logoY = interpolate(f, [4, 30], [16, 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const wmOp = interpolate(f, [22, 38], [0, 1], clamp);
    const wmX = interpolate(f, [22, 40], [-22, 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
    const tagOp = interpolate(f, [38, 52], [0, 1], clamp);
    const ruleW = interpolate(f, [40, 60], [0, 320], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });

    return (
        <AbsoluteFill style={{ background: LC.paper, fontFamily: HEAD, alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -60 }}>
                <Img src={staticFile("logo-vyzon-new.png")} style={{ width: 184, height: 184, objectFit: "contain", opacity: logoOp, transform: `scale(${logoScale}) translateY(${logoY}px)`, filter: "drop-shadow(0 16px 34px rgba(0,160,90,0.28))" }} />
                <div style={{ fontWeight: 900, fontSize: 104, letterSpacing: "-0.02em", opacity: wmOp, transform: `translateX(${wmX}px)` }}><Shimmer frame={f} period={90}>Vyzon</Shimmer></div>
            </div>
            <div style={{ marginTop: 26, fontSize: 30, color: LC.ink70, opacity: tagOp }}>Central Comercial com EVA</div>
            <div style={{ marginTop: 18, height: 3, width: ruleW, borderRadius: 999, background: `linear-gradient(90deg, transparent, ${LC.blue}, ${LC.eva}, transparent)` }} />
            <div style={{ position: "absolute", bottom: 360, fontFamily: MONO, fontSize: 22, letterSpacing: "0.18em", color: LC.ink45, opacity: tagOp }}>vyzon.com.br</div>
        </AbsoluteFill>
    );
};
