import React from "react";
import { Img, interpolate, staticFile, useVideoConfig } from "remotion";

// Aspect helper — detecta se a composition é vertical (Reels 9:16) ou horizontal
export const useIsVertical = () => {
    const { width, height } = useVideoConfig();
    return height > width;
};

// ============================================
// FONTS — Brand 2026 (Sora primary + Inter body)
// ============================================
export const fontStyles = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

export const FONTS = {
    heading: "'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
};

// ============================================
// BRAND PALETTE 2026 — FULL DARK
// Alinhada com landing vyzon.com.br (#06080a base)
// ============================================
export const C = {
    bg: "#06080a",
    bg2: "#0a0d12",
    bg3: "#0f1319",
    surface: "rgba(255,255,255,0.04)",
    surfaceHi: "rgba(255,255,255,0.06)",

    border: "rgba(255,255,255,0.08)",
    border2: "rgba(255,255,255,0.14)",

    text: "rgba(255,255,255,0.95)",
    text2: "rgba(255,255,255,0.70)",
    text3: "rgba(255,255,255,0.45)",
    text4: "rgba(255,255,255,0.28)",

    brand: "#00E37A",
    brandDim: "#00B266",
    brandDark: "#006A3D",
    brand2: "#1556C0",
    brand2Dim: "#0F3F8F",

    red: "#EF4444",
    redDim: "#B91C1C",
    gold: "#F5B84A",
    vio: "#8B5CF6",

    waBg: "#0b141a",
    waPanel: "#202c33",
    waBubbleIn: "#202c33",
    waBubbleOut: "#005c4b",
    waText: "#e9edef",
    waMute: "#8696a0",
};

// ============================================
// HELPERS
// ============================================
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const fadeInOut = (frame: number, duration: number, fadeIn = 15, fadeOut = 15) => {
    const a = interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" });
    const b = interpolate(frame, [duration - fadeOut, duration], [1, 0], { extrapolateLeft: "clamp" });
    return Math.min(a, b);
};

export const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const useCountUp = (frame: number, target: number, start = 0, end = 60) => {
    const t = clamp01((frame - start) / (end - start));
    return Math.round(target * easeOut(t));
};

// ============================================
// SCENE BACKGROUND — dark with brand tint
// ============================================
export const SceneBG: React.FC<{ frame: number; tint?: "brand" | "blue" | "red" | "neutral" | "mixed" }> = ({
    frame,
    tint = "brand",
}) => {
    const tints = {
        brand: { a: "rgba(0,227,122,0.10)", b: "rgba(21,86,192,0.07)" },
        blue: { a: "rgba(21,86,192,0.14)", b: "rgba(0,227,122,0.06)" },
        red: { a: "rgba(239,68,68,0.10)", b: "rgba(180,28,28,0.06)" },
        neutral: { a: "rgba(255,255,255,0.04)", b: "rgba(255,255,255,0.03)" },
        mixed: { a: "rgba(0,227,122,0.08)", b: "rgba(139,92,246,0.07)" },
    }[tint];

    return (
        <>
            <div style={{ position: "absolute", inset: 0, background: C.bg }} />
            <div
                style={{
                    position: "absolute",
                    top: "6%",
                    left: "4%",
                    width: 760,
                    height: 760,
                    background: `radial-gradient(circle, ${tints.a} 0%, transparent 60%)`,
                    borderRadius: "50%",
                    filter: "blur(50px)",
                    transform: `translate(${Math.sin(frame / 60) * 18}px, ${Math.cos(frame / 50) * 14}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "6%",
                    right: "4%",
                    width: 680,
                    height: 680,
                    background: `radial-gradient(circle, ${tints.b} 0%, transparent 60%)`,
                    borderRadius: "50%",
                    filter: "blur(50px)",
                    transform: `translate(${Math.cos(frame / 55) * 16}px, ${Math.sin(frame / 45) * 12}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
                    pointerEvents: "none",
                }}
            />
        </>
    );
};

// ============================================
// SECTION HEADER
// ============================================
export const SectionHeader: React.FC<{
    frame: number;
    eyebrow: string;
    title: string;
    accent?: string;
    align?: "left" | "center";
}> = ({ frame, eyebrow, title, accent = C.brand, align = "left" }) => {
    const eyeOpacity = interpolate(frame, [5, 22], [0, 1], { extrapolateRight: "clamp" });
    const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });
    const titleY = interpolate(frame, [12, 30], [22, 0], { extrapolateRight: "clamp" });

    return (
        <div style={{ textAlign: align as React.CSSProperties["textAlign"] }}>
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: accent,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                    fontFamily: FONTS.sans,
                    opacity: eyeOpacity,
                }}
            >
                <span
                    style={{
                        display: "inline-block",
                        width: 28,
                        height: 2,
                        background: accent,
                        borderRadius: 2,
                    }}
                />
                {eyebrow}
            </div>
            <div
                style={{
                    fontSize: 60,
                    fontWeight: 800,
                    fontFamily: FONTS.heading,
                    color: C.text,
                    lineHeight: 1.05,
                    letterSpacing: -2,
                    marginTop: 14,
                    opacity: titleOpacity,
                    transform: `translateY(${titleY}px)`,
                }}
            >
                {title}
            </div>
        </div>
    );
};

// ============================================
// GLASS CARD (dark)
// ============================================
export const Glass: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div
        style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: `1px solid ${C.border}`,
            backdropFilter: "blur(20px)",
            borderRadius: 18,
            boxShadow:
                "0 30px 80px -20px rgba(0,0,0,0.6), 0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
            ...style,
        }}
    >
        {children}
    </div>
);

// ============================================
// AVATAR
// ============================================
// ============================================
// VYZON LOGO MARK (símbolo 3D + wordmark Sora 700)
// Usa public/logo.png (mesmo arquivo do brand guide 2026)
// ============================================
export const LogoMark: React.FC<{
    size?: number;
    glow?: number;
    showWordmark?: boolean;
    wordmarkColor?: string;
}> = ({ size = 100, glow = 1, showWordmark = true, wordmarkColor = C.text }) => {
    const iconSrc = staticFile("logo.png");
    const wordmarkSize = size * 0.95;

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: size * 0.2,
                position: "relative",
            }}
        >
            {/* Glow ambient behind icon */}
            <div
                style={{
                    position: "absolute",
                    left: -size * 0.4,
                    top: -size * 0.4,
                    width: size * 1.8,
                    height: size * 1.8,
                    background: `radial-gradient(circle, ${C.brand}${Math.floor(glow * 40)
                        .toString(16)
                        .padStart(2, "0")} 0%, transparent 60%)`,
                    filter: "blur(30px)",
                    pointerEvents: "none",
                }}
            />
            <Img
                src={iconSrc}
                style={{
                    width: size,
                    height: size,
                    objectFit: "contain",
                    filter: `drop-shadow(0 0 ${16 * glow}px ${C.brand}55) drop-shadow(0 4px 12px rgba(0,0,0,0.4))`,
                    position: "relative",
                    zIndex: 1,
                }}
            />
            {showWordmark && (
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontWeight: 700,
                        fontSize: wordmarkSize,
                        color: wordmarkColor,
                        letterSpacing: "-0.035em",
                        lineHeight: 1,
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    Vyzon
                </div>
            )}
        </div>
    );
};

// ============================================
// EVA AVATAR — orb violeta + anéis orbitais
// Replica src/components/icons/EvaAvatar.tsx
// ============================================
export const EvaAvatar: React.FC<{ size?: number; frame?: number; thinking?: boolean }> = ({
    size = 44,
    frame = 0,
    thinking = true,
}) => {
    const id = `eva-${size}-${Math.floor(frame / 10)}`;
    const scale = size / 40;

    // Electron orbital positions (time-driven)
    const t1 = (frame % 54) / 54;
    const angle1 = t1 * Math.PI * 2;
    const e1x = Math.cos(angle1) * 16 * scale;
    const e1y = Math.sin(angle1) * 6 * scale;

    const t2 = (frame % 66) / 66;
    const angle2 = t2 * Math.PI * 2;
    // rotated ellipse (-30deg), rx=6, ry=16
    const rot = (-30 * Math.PI) / 180;
    const cx2 = Math.cos(angle2) * 6 * scale;
    const cy2 = Math.sin(angle2) * 16 * scale;
    const e2x = cx2 * Math.cos(rot) - cy2 * Math.sin(rot);
    const e2y = cx2 * Math.sin(rot) + cy2 * Math.cos(rot);

    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id={`${id}-orb`} x1="14" y1="10" x2="26" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {thinking && <circle cx="20" cy="20" r="19" fill={`url(#${id}-glow)`} />}

                {/* Orbital ring horizontal */}
                <ellipse
                    cx="20"
                    cy="20"
                    rx="16"
                    ry="6"
                    stroke="#8b5cf6"
                    strokeOpacity={thinking ? 0.5 : 0.25}
                    strokeWidth="1"
                    fill="none"
                />
                {/* Orbital ring diagonal */}
                <ellipse
                    cx="20"
                    cy="20"
                    rx="6"
                    ry="16"
                    stroke="#8b5cf6"
                    strokeOpacity={thinking ? 0.35 : 0.15}
                    strokeWidth="0.8"
                    fill="none"
                    transform="rotate(-30 20 20)"
                />

                {/* Central orb */}
                <circle cx="20" cy="20" r="5.5" fill={`url(#${id}-orb)`} />
                <circle cx="18" cy="18" r="2" fill="white" opacity="0.28" />
            </svg>

            {/* Animated electrons */}
            {thinking && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            width: 6 * scale,
                            height: 6 * scale,
                            top: "50%",
                            left: "50%",
                            transform: `translate(${e1x - 3 * scale}px, ${e1y - 3 * scale}px)`,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, #a78bfa 0%, #7c3aed 60%, transparent 100%)",
                            boxShadow: "0 0 8px 2px rgba(139, 92, 246, 0.5)",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            width: 4 * scale,
                            height: 4 * scale,
                            top: "50%",
                            left: "50%",
                            transform: `translate(${e2x - 2 * scale}px, ${e2y - 2 * scale}px)`,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, #c4b5fd 0%, #8b5cf6 60%, transparent 100%)",
                            boxShadow: "0 0 6px 1px rgba(139, 92, 246, 0.4)",
                        }}
                    />
                </>
            )}
        </div>
    );
};

// ============================================
// SUBTITLE OVERLAY — legendas queimadas
// ============================================
export const SubtitleTrack: React.FC<{
    frame: number;
    cues: Array<{ from: number; to: number; text: string }>;
}> = ({ frame, cues }) => {
    const active = cues.find((c) => frame >= c.from && frame <= c.to);
    if (!active) return null;

    const age = frame - active.from;
    const remaining = active.to - frame;
    const opacity = Math.min(
        interpolate(age, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
        interpolate(remaining, [0, 6], [0, 1], { extrapolateRight: "clamp" })
    );
    const y = interpolate(age, [0, 10], [8, 0], { extrapolateRight: "clamp" });

    return (
        <div
            style={{
                position: "absolute",
                bottom: "9%",
                left: "50%",
                transform: `translate(-50%, ${y}px)`,
                opacity,
                zIndex: 100,
                maxWidth: "86%",
                textAlign: "center",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    display: "inline-block",
                    fontFamily: FONTS.heading,
                    fontSize: 34,
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.25,
                    letterSpacing: -0.5,
                    padding: "14px 26px",
                    background: "rgba(6,8,10,0.82)",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 12px 40px -6px rgba(0,0,0,0.7)",
                    whiteSpace: "pre-line",
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                }}
            >
                {active.text}
            </div>
        </div>
    );
};

export const Avatar: React.FC<{ name: string; size?: number; gradient?: [string, string]; text?: string }> = ({
    name,
    size = 36,
    gradient = [C.brand, C.brandDim],
    text,
}) => {
    const initials =
        text ??
        name
            .split(" ")
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase();
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#06080a",
                fontWeight: 800,
                fontSize: size * 0.4,
                fontFamily: FONTS.sans,
                flexShrink: 0,
                boxShadow: `0 6px 16px -3px ${gradient[0]}66, 0 2px 4px rgba(0,0,0,0.3)`,
            }}
        >
            {initials}
        </div>
    );
};
