import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, LogoMark, fadeInOut, useIsVertical } from "./lib";

// ============================================
// CTA SCENE — 7s / 210 frames
// Logo + headline + URL + botão pulsante
// ============================================
export const CTAScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const vert = useIsVertical();
    const opacity = fadeInOut(frame, durationInFrames, 10, 18);

    // Logo entrance (scale up)
    const logoSpring = spring({ frame: frame - 8, fps, config: { damping: 95, stiffness: 110, mass: 1 } });
    const logoScale = interpolate(logoSpring, [0, 1], [0.8, 1]);
    const logoOpacity = interpolate(frame, [8, 30], [0, 1], { extrapolateRight: "clamp" });

    // Headline
    const h1Opacity = interpolate(frame, [30, 54], [0, 1], { extrapolateRight: "clamp" });
    const h1Y = interpolate(frame, [30, 54], [18, 0], { extrapolateRight: "clamp" });

    // Sub metrics
    const metrics = [
        { num: "5 min", label: "pra tá no ar", at: 54 },
        { num: "14 dias", label: "de trial", at: 66 },
        { num: "só depois", label: "cobra cartão", at: 78 },
    ];

    // CTA button pulse
    const btnOpacity = interpolate(frame, [94, 118], [0, 1], { extrapolateRight: "clamp" });
    const btnY = interpolate(frame, [94, 118], [16, 0], { extrapolateRight: "clamp" });
    const pulse = 0.7 + 0.3 * Math.sin((frame - 118) / 14);
    const btnGlow = frame > 118 ? pulse : 0.7;

    // URL
    const urlOpacity = interpolate(frame, [118, 140], [0, 1], { extrapolateRight: "clamp" });

    // Logo glow
    const logoGlow = 0.5 + 0.5 * Math.sin(frame / 20);

    return (
        <AbsoluteFill style={{ opacity, background: C.bg }}>
            {/* Ambient brand gradient */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 50% 40%, ${C.brand}1a 0%, transparent 55%), radial-gradient(ellipse at 50% 70%, ${C.brand2}14 0%, transparent 55%)`,
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

            {/* Vignette */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)",
                    pointerEvents: "none",
                }}
            />

            <AbsoluteFill
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 36,
                    padding: "80px",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        opacity: logoOpacity,
                        transform: `scale(${logoScale})`,
                    }}
                >
                    <LogoMark size={vert ? 100 : 130} glow={logoGlow} showWordmark={true} />
                </div>

                {/* Headline */}
                <div
                    style={{
                        opacity: h1Opacity,
                        transform: `translateY(${h1Y}px)`,
                        textAlign: "center",
                        maxWidth: 1100,
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: vert ? 52 : 64,
                            fontWeight: 800,
                            color: C.text,
                            letterSpacing: -2.4,
                            lineHeight: 1.1,
                        }}
                    >
                        {vert ? (
                            <>
                                O CRM que seu time
                                <br />
                                <span style={{ color: C.brand }}>abre todo dia</span>.
                            </>
                        ) : (
                            <>
                                O CRM que seu time <span style={{ color: C.brand }}>abre todo dia</span>.
                            </>
                        )}
                    </div>
                </div>

                {/* Metrics row */}
                <div style={{ display: "flex", gap: vert ? 24 : 48, alignItems: "center", flexWrap: vert ? "wrap" : "nowrap", justifyContent: "center" }}>
                    {metrics.map((m, i) => {
                        const mOpacity = interpolate(frame, [m.at, m.at + 18], [0, 1], { extrapolateRight: "clamp" });
                        const mY = interpolate(frame, [m.at, m.at + 18], [10, 0], { extrapolateRight: "clamp" });
                        return (
                            <React.Fragment key={i}>
                                <div
                                    style={{
                                        opacity: mOpacity,
                                        transform: `translateY(${mY}px)`,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 4,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: FONTS.heading,
                                            fontSize: 32,
                                            fontWeight: 800,
                                            color: C.brand,
                                            letterSpacing: -1,
                                        }}
                                    >
                                        {m.num}
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: FONTS.sans,
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: C.text3,
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {m.label}
                                    </div>
                                </div>
                                {i < metrics.length - 1 && (
                                    <div
                                        style={{
                                            width: 1,
                                            height: 40,
                                            background: C.border,
                                            opacity: interpolate(frame, [m.at + 10, m.at + 20], [0, 1], { extrapolateRight: "clamp" }),
                                        }}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* CTA button */}
                <div
                    style={{
                        opacity: btnOpacity,
                        transform: `translateY(${btnY}px)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 18,
                        marginTop: 8,
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 22,
                            fontWeight: 700,
                            color: C.bg,
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                            padding: "18px 48px",
                            borderRadius: 14,
                            boxShadow: `0 0 ${60 * btnGlow}px ${C.brand}88, 0 12px 32px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`,
                            letterSpacing: -0.3,
                            border: `1px solid ${C.brand}`,
                        }}
                    >
                        Começar agora
                    </div>

                    {/* URL */}
                    <div
                        style={{
                            opacity: urlOpacity,
                            fontFamily: FONTS.mono,
                            fontSize: 17,
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
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
