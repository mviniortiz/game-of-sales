import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONTS } from "./lib";
import type { OverlayCue, OverlayPosition, OverlayStyle } from "./variants";

// Acentos
const ACCENT: Record<NonNullable<OverlayCue["accent"]>, string> = {
    brand: C.brand,
    red: C.red,
    gold: C.gold,
    blue: C.brand2,
    violet: "#a78bfa",
};

// Position → CSS
const POSITION_STYLES: Record<OverlayPosition, React.CSSProperties> = {
    "top-left": { top: "4%", left: "4%", textAlign: "left" },
    "top-right": { top: "4%", right: "4%", textAlign: "right" },
    "top-center": { top: "4%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
    "bottom-center": { bottom: "18%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
};

// =====================================================
// Individual overlay (switches on style)
// =====================================================
const OverlayCard: React.FC<{ cue: OverlayCue; frame: number }> = ({ cue, frame }) => {
    const accent = ACCENT[cue.accent ?? "brand"];

    const age = frame - cue.from;
    const remaining = cue.to - frame;
    const opacity = Math.min(
        interpolate(age, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
        interpolate(remaining, [0, 8], [0, 1], { extrapolateRight: "clamp" })
    );
    const y = interpolate(age, [0, 12], [-6, 0], { extrapolateRight: "clamp" });

    const baseStyle: React.CSSProperties = {
        position: "absolute",
        opacity,
        zIndex: 80,
        pointerEvents: "none",
        fontFamily: FONTS.sans,
        ...POSITION_STYLES[cue.position],
    };

    if (cue.style === "metric") {
        return (
            <div style={{ ...baseStyle, transform: `${baseStyle.transform ?? ""} translateY(${y}px)`.trim() }}>
                <div
                    style={{
                        background: "rgba(6,8,10,0.82)",
                        border: `1px solid ${accent}44`,
                        borderRadius: 14,
                        padding: "12px 18px",
                        boxShadow: `0 20px 60px -10px rgba(0,0,0,0.55), 0 0 30px -8px ${accent}33`,
                        backdropFilter: "blur(10px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: cue.position.includes("right") ? "flex-end" : cue.position.includes("left") ? "flex-start" : "center",
                        gap: 2,
                        minWidth: 160,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.text3,
                            textTransform: "uppercase",
                            letterSpacing: 1.4,
                        }}
                    >
                        {cue.label}
                    </div>
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 28,
                            fontWeight: 800,
                            color: accent,
                            letterSpacing: -1,
                            lineHeight: 1,
                        }}
                    >
                        {cue.value}
                    </div>
                </div>
            </div>
        );
    }

    if (cue.style === "step") {
        return (
            <div style={{ ...baseStyle, transform: `${baseStyle.transform ?? ""} translateY(${y}px)`.trim() }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        background: "rgba(6,8,10,0.82)",
                        border: `1px solid ${accent}44`,
                        borderRadius: 999,
                        padding: "8px 18px 8px 8px",
                        backdropFilter: "blur(10px)",
                        boxShadow: `0 12px 40px -8px rgba(0,0,0,0.5)`,
                    }}
                >
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.bg,
                            fontFamily: FONTS.heading,
                            fontWeight: 800,
                            fontSize: 15,
                            letterSpacing: -0.5,
                        }}
                    >
                        {cue.label.replace(/\D+/g, "") || "✓"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: accent,
                                textTransform: "uppercase",
                                letterSpacing: 1.6,
                                lineHeight: 1,
                            }}
                        >
                            {cue.label}
                        </div>
                        {cue.value && (
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: C.text,
                                    letterSpacing: -0.3,
                                    lineHeight: 1.1,
                                }}
                            >
                                {cue.value}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (cue.style === "pov") {
        return (
            <div style={{ ...baseStyle, transform: `${baseStyle.transform ?? ""} translateY(${y}px)`.trim() }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        background: accent,
                        borderRadius: 8,
                        padding: "6px 14px",
                        boxShadow: `0 8px 24px -6px ${accent}88`,
                        textTransform: "lowercase",
                    }}
                >
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontWeight: 800,
                            fontSize: 22,
                            color: cue.accent === "red" ? "#ffffff" : C.bg,
                            letterSpacing: -0.5,
                            lineHeight: 1,
                        }}
                    >
                        {cue.label}
                    </div>
                </div>
            </div>
        );
    }

    // badge style
    return (
        <div style={{ ...baseStyle, transform: `${baseStyle.transform ?? ""} translateY(${y}px)`.trim() }}>
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    borderRadius: 999,
                    padding: "8px 18px",
                    boxShadow: `0 12px 32px -6px ${accent}66`,
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.bg,
                        textTransform: "uppercase",
                        letterSpacing: 1.4,
                    }}
                >
                    {cue.label}
                </div>
                {cue.value && (
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 15,
                            fontWeight: 800,
                            color: C.bg,
                            letterSpacing: -0.3,
                        }}
                    >
                        {cue.value}
                    </div>
                )}
            </div>
        </div>
    );
};

// =====================================================
// Track — renders all active overlays for the current frame
// =====================================================
export const VariantOverlayTrack: React.FC<{ cues: OverlayCue[] }> = ({ cues }) => {
    const frame = useCurrentFrame();
    const active = cues.filter((c) => frame >= c.from && frame <= c.to);
    return (
        <>
            {active.map((c, i) => (
                <OverlayCard key={`${c.label}-${c.from}-${i}`} cue={c} frame={frame} />
            ))}
        </>
    );
};
