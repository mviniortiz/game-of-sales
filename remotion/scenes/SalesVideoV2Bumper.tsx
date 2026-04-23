import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, fontStyles, LogoMark, fadeInOut } from "./salesV2/lib";

// ============================================
// BUMPER 6s — YouTube Bumper Ads (skippable pós 6s)
// 180 frames @ 30fps, 1920x1080
// ============================================
// 0-60  (2s) — Hook relâmpago: headline "CRM que seu time abre todo dia"
// 60-120 (2s) — Prova: dashboard meta batida +27%
// 120-180 (2s) — CTA: logo + "14 dias grátis"

const BG_MUSIC = staticFile("audio/sales-video-v2-music.mp3");
// Usa só o trecho mais energético da música (segundo refrão ~15s)
// Remotion recorta via startFrom/endAt

const BackgroundMusic: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
    const volume = Math.min(fadeIn, fadeOut) * 0.3;
    // startFrom em frames: pular ~15s do começo pra pegar o refrão
    return <Audio src={BG_MUSIC} volume={volume} startFrom={450} />;
};

// ================ SCENE A: HOOK ================
const HookFlash: React.FC = () => {
    const frame = useCurrentFrame();
    const opacity = fadeInOut(frame, 60, 4, 8);

    const eyebrowOp = interpolate(frame, [4, 18], [0, 1], { extrapolateRight: "clamp" });
    const h1Op = interpolate(frame, [10, 26], [0, 1], { extrapolateRight: "clamp" });
    const h1Y = interpolate(frame, [10, 26], [22, 0], { extrapolateRight: "clamp" });

    const underlineWidth = interpolate(frame, [26, 52], [0, 100], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity, background: C.bg }}>
            {/* Ambient radial */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 50% 40%, ${C.brand}22 0%, transparent 55%)`,
                }}
            />
            {/* Dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                }}
            />

            <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 80 }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        fontFamily: FONTS.sans,
                        fontSize: 16,
                        fontWeight: 700,
                        color: C.brand,
                        letterSpacing: 4,
                        textTransform: "uppercase",
                        opacity: eyebrowOp,
                    }}
                >
                    <span style={{ width: 28, height: 2, background: C.brand, borderRadius: 2 }} />
                    Vyzon
                </div>
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 96,
                        fontWeight: 800,
                        color: C.text,
                        letterSpacing: -3,
                        lineHeight: 1.05,
                        textAlign: "center",
                        maxWidth: 1400,
                        opacity: h1Op,
                        transform: `translateY(${h1Y}px)`,
                        position: "relative",
                    }}
                >
                    O CRM que seu time <span style={{ color: C.brand }}>abre todo dia</span>.
                    <div
                        style={{
                            position: "absolute",
                            bottom: -12,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: `${underlineWidth * 4}px`,
                            height: 3,
                            background: `linear-gradient(90deg, transparent, ${C.brand}, transparent)`,
                            maxWidth: 360,
                        }}
                    />
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ================ SCENE B: PROOF ================
const ProofFlash: React.FC = () => {
    const frame = useCurrentFrame();
    const opacity = fadeInOut(frame, 60, 6, 8);

    const badgeSpring = spring({ frame: frame - 4, fps: 30, config: { damping: 90, stiffness: 130 } });
    const badgeScale = interpolate(badgeSpring, [0, 1], [0.7, 1]);

    const count = Math.round(interpolate(frame, [6, 44], [0, 27], { extrapolateRight: "clamp" }));
    const lineY = interpolate(frame, [20, 44], [20, 0], { extrapolateRight: "clamp" });
    const lineOp = interpolate(frame, [20, 44], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity, background: C.bg }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 50% 50%, ${C.brand}1f 0%, transparent 60%)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                }}
            />

            <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: 80 }}>
                <div
                    style={{
                        transform: `scale(${badgeScale})`,
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        background: `linear-gradient(135deg, ${C.brand}22 0%, ${C.brand}08 100%)`,
                        border: `1.5px solid ${C.brand}66`,
                        borderRadius: 24,
                        padding: "32px 48px",
                        boxShadow: `0 24px 80px -16px ${C.brand}55, 0 0 0 1px rgba(255,255,255,0.05)`,
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 160,
                            fontWeight: 800,
                            color: C.brand,
                            letterSpacing: -6,
                            lineHeight: 1,
                        }}
                    >
                        +{count}%
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: C.text3, letterSpacing: 2, textTransform: "uppercase" }}>
                            Time bateu
                        </div>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 700, color: C.text, letterSpacing: -1 }}>
                            acima da meta
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        opacity: lineOp,
                        transform: `translateY(${lineY}px)`,
                        fontFamily: FONTS.sans,
                        fontSize: 22,
                        fontWeight: 500,
                        color: C.text3,
                        letterSpacing: 1,
                    }}
                >
                    Pipeline que se move. Ranking ao vivo. Dashboard em tempo real.
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ================ SCENE C: CTA ================
const CTAFlash: React.FC = () => {
    const frame = useCurrentFrame();
    const opacity = fadeInOut(frame, 60, 4, 10);

    const logoOp = interpolate(frame, [4, 24], [0, 1], { extrapolateRight: "clamp" });
    const logoScale = interpolate(spring({ frame: frame - 4, fps: 30, config: { damping: 90, stiffness: 110 } }), [0, 1], [0.85, 1]);
    const logoGlow = 0.5 + 0.5 * Math.sin(frame / 12);

    const pillOp = interpolate(frame, [18, 36], [0, 1], { extrapolateRight: "clamp" });
    const pillY = interpolate(frame, [18, 36], [14, 0], { extrapolateRight: "clamp" });

    const urlOp = interpolate(frame, [34, 50], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ opacity, background: C.bg }}>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 50% 40%, ${C.brand}28 0%, transparent 55%)`,
                }}
            />

            <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 32, padding: 80 }}>
                <div style={{ opacity: logoOp, transform: `scale(${logoScale})` }}>
                    <LogoMark size={130} glow={logoGlow} showWordmark={true} />
                </div>

                <div
                    style={{
                        opacity: pillOp,
                        transform: `translateY(${pillY}px)`,
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 30,
                            fontWeight: 700,
                            color: C.bg,
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                            padding: "16px 36px",
                            borderRadius: 14,
                            boxShadow: `0 0 50px ${C.brand}88, 0 12px 32px -6px rgba(0,0,0,0.5)`,
                        }}
                    >
                        14 dias grátis
                    </div>
                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 18,
                            fontWeight: 500,
                            color: C.text3,
                            letterSpacing: 1,
                        }}
                    >
                        em 5 minutos
                    </div>
                </div>

                <div
                    style={{
                        opacity: urlOp,
                        fontFamily: FONTS.mono,
                        fontSize: 20,
                        fontWeight: 600,
                        color: C.text2,
                        letterSpacing: 0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <span style={{ color: C.text4 }}>→</span>
                    vyzon.com.br
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================
// MAIN COMPOSITION — 6s / 180 frames
// ============================================
export const SalesVideoV2BumperComposition: React.FC = () => {
    return (
        <AbsoluteFill style={{ background: C.bg }}>
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

            <BackgroundMusic />

            <Sequence from={0} durationInFrames={60}>
                <HookFlash />
            </Sequence>

            <Sequence from={60} durationInFrames={60}>
                <ProofFlash />
            </Sequence>

            <Sequence from={120} durationInFrames={60}>
                <CTAFlash />
            </Sequence>
        </AbsoluteFill>
    );
};
