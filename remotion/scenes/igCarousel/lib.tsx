import React from "react";
import { Img, staticFile } from "remotion";
import { C, FONTS } from "../salesV2/lib";

export { C, FONTS };

// ============================================
// CAROUSEL BG — dark brand, estático (sem animação, é PNG)
// Mesmo DNA do SceneBG do SalesV2 mas sem frame-driven transforms
// ============================================
export const CarouselBG: React.FC<{ tint?: "brand" | "blue" | "red" | "mixed" | "neutral" }> = ({ tint = "brand" }) => {
    const tints = {
        brand: { a: "rgba(0,227,122,0.14)", b: "rgba(21,86,192,0.09)" },
        blue: { a: "rgba(21,86,192,0.16)", b: "rgba(0,227,122,0.08)" },
        red: { a: "rgba(239,68,68,0.12)", b: "rgba(180,28,28,0.07)" },
        mixed: { a: "rgba(0,227,122,0.10)", b: "rgba(139,92,246,0.09)" },
        neutral: { a: "rgba(255,255,255,0.05)", b: "rgba(255,255,255,0.03)" },
    }[tint];

    return (
        <>
            <div style={{ position: "absolute", inset: 0, background: C.bg }} />
            <div
                style={{
                    position: "absolute",
                    top: "-8%",
                    left: "-10%",
                    width: 820,
                    height: 820,
                    background: `radial-gradient(circle, ${tints.a} 0%, transparent 62%)`,
                    borderRadius: "50%",
                    filter: "blur(60px)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "-10%",
                    right: "-8%",
                    width: 720,
                    height: 720,
                    background: `radial-gradient(circle, ${tints.b} 0%, transparent 62%)`,
                    borderRadius: "50%",
                    filter: "blur(60px)",
                }}
            />
            {/* dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "36px 36px",
                    maskImage: "radial-gradient(ellipse at center, black 35%, transparent 90%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 90%)",
                }}
            />
            {/* vignette */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
                    pointerEvents: "none",
                }}
            />
        </>
    );
};

// ============================================
// FRAME — margem interna + corner brackets + slide number
// Identidade visual que amarra os 8 slides
// ============================================
export const SlideFrame: React.FC<{
    children: React.ReactNode;
    index: number;
    total: number;
    accent?: string;
}> = ({ children, index, total, accent = C.brand }) => {
    const bracket = (pos: "tl" | "tr" | "bl" | "br") => {
        const isTop = pos[0] === "t";
        const isLeft = pos[1] === "l";
        return (
            <div
                style={{
                    position: "absolute",
                    top: isTop ? 56 : undefined,
                    bottom: !isTop ? 56 : undefined,
                    left: isLeft ? 56 : undefined,
                    right: !isLeft ? 56 : undefined,
                    width: 36,
                    height: 36,
                    borderTop: isTop ? `2px solid ${accent}` : "none",
                    borderBottom: !isTop ? `2px solid ${accent}` : "none",
                    borderLeft: isLeft ? `2px solid ${accent}` : "none",
                    borderRight: !isLeft ? `2px solid ${accent}` : "none",
                    opacity: 0.7,
                }}
            />
        );
    };

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {bracket("tl")}
            {bracket("tr")}
            {bracket("bl")}
            {bracket("br")}

            {/* Top-left: logo mark */}
            <div
                style={{
                    position: "absolute",
                    top: 72,
                    left: 76,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    zIndex: 10,
                }}
            >
                <Img
                    src={staticFile("logo.png")}
                    style={{
                        width: 32,
                        height: 32,
                        objectFit: "contain",
                        filter: `drop-shadow(0 0 10px ${C.brand}66)`,
                    }}
                />
                <span
                    style={{
                        fontFamily: FONTS.heading,
                        fontWeight: 700,
                        fontSize: 22,
                        color: C.text,
                        letterSpacing: "-0.03em",
                    }}
                >
                    Vyzon
                </span>
            </div>

            {/* Top-right: pagination */}
            <div
                style={{
                    position: "absolute",
                    top: 80,
                    right: 76,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    zIndex: 10,
                }}
            >
                {Array.from({ length: total }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: i === index ? 22 : 6,
                            height: 6,
                            borderRadius: 3,
                            background: i === index ? accent : "rgba(255,255,255,0.22)",
                            transition: "all 0.2s",
                        }}
                    />
                ))}
            </div>

            {/* Bottom-right: slide number */}
            <div
                style={{
                    position: "absolute",
                    bottom: 76,
                    right: 78,
                    fontFamily: FONTS.mono,
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.text3,
                    letterSpacing: 2,
                    zIndex: 10,
                }}
            >
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>

            {/* Bottom-left: handle */}
            <div
                style={{
                    position: "absolute",
                    bottom: 74,
                    left: 78,
                    fontFamily: FONTS.sans,
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.text3,
                    letterSpacing: 0.5,
                    zIndex: 10,
                }}
            >
                vyzon.com.br
            </div>

            {/* Content slot */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    padding: "160px 110px 150px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    zIndex: 5,
                }}
            >
                {children}
            </div>
        </div>
    );
};

// ============================================
// EYEBROW — label pequeno com pill + accent line
// ============================================
export const Eyebrow: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent = C.brand }) => (
    <div
        style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            fontFamily: FONTS.sans,
            fontSize: 13,
            fontWeight: 700,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: 3.5,
        }}
    >
        <span style={{ display: "inline-block", width: 28, height: 2, background: accent, borderRadius: 2 }} />
        {children}
    </div>
);

// ============================================
// GlassCard — reutilizável sem frame-driven stuff
// ============================================
export const GlassCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div
        style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            border: `1px solid ${C.border}`,
            backdropFilter: "blur(20px)",
            borderRadius: 22,
            boxShadow:
                "0 30px 80px -20px rgba(0,0,0,0.6), 0 2px 8px -2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
            ...style,
        }}
    >
        {children}
    </div>
);

// ============================================
// SlideContainer — um Composition = um slide, 1080x1350
// ============================================
export const IG_WIDTH = 1080;
export const IG_HEIGHT = 1350;
