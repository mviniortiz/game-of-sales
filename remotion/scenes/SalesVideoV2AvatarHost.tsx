import React from "react";
import {
    AbsoluteFill,
    Audio,
    OffthreadVideo,
    Sequence,
    staticFile,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
    spring,
} from "remotion";
import { C, FONTS, fontStyles, LogoMark, fadeInOut, formatBRL, useCountUp, EvaAvatar } from "./salesV2/lib";
import { SubtitleTrack } from "./salesV2/lib";
import { Icon } from "./salesV2/../sales/icons";

// ============================================
// AVATAR HOST COMPOSITION — 21s / 630 frames
// Abigail é protagonista contínua, produto aparece em chips ao redor
// ============================================
// Durações reais dos MP4s HeyGen (ffprobe confirmado):
//  scene-1: 3.12s (94 frames @ 30fps)
//  scene-3: 2.09s (63 frames)
//  scene-4: 4.61s (138 frames)
//  scene-5: 2.52s (76 frames)
//  scene-6: 2.36s (71 frames)
//  scene-7: 2.24s (67 frames)
// Total narração: 16.94s → 509 frames
// + intro 15f + outro 106f = 630f
// ============================================

const CUES = [
    { sceneId: 1, from: 15, duration: 94, topic: "caos" },
    { sceneId: 3, from: 109, duration: 63, topic: "pulse" },
    { sceneId: 4, from: 172, duration: 138, topic: "pipeline" },
    { sceneId: 5, from: 310, duration: 76, topic: "eva" },
    { sceneId: 6, from: 386, duration: 71, topic: "dashboard" },
    { sceneId: 7, from: 457, duration: 67, topic: "cta" },
];

const SUBTITLE_CUES = [
    { from: 20, to: 70, text: "Essa era minha segunda-feira." },
    { from: 72, to: 108, text: "Planilha. Grupo. Caos." },
    { from: 115, to: 170, text: "Juro que achava que\nplanilha dava conta." },
    { from: 178, to: 250, text: "Daí vi o pipeline\nse mexendo sozinho." },
    { from: 252, to: 308, text: "Meu time subiu\nno ranking. Literal." },
    { from: 316, to: 384, text: "A Eva lê meus dados.\nEu só pergunto." },
    { from: 392, to: 455, text: "Hoje bato meta\ne ainda sobra tempo." },
    { from: 462, to: 495, text: "Testa grátis." },
    { from: 497, to: 525, text: "Depois me agradece." },
    { from: 545, to: 625, text: "vyzon.com.br\n14 dias grátis" },
];

// ============================================
// Background — dark brand ambient
// ============================================
const Backdrop: React.FC = () => {
    const frame = useCurrentFrame();
    return (
        <>
            <div style={{ position: "absolute", inset: 0, background: C.bg }} />
            <div
                style={{
                    position: "absolute",
                    top: "-10%",
                    left: "-10%",
                    width: 900,
                    height: 900,
                    background: `radial-gradient(circle, ${C.brand}18 0%, transparent 60%)`,
                    filter: "blur(60px)",
                    transform: `translate(${Math.sin(frame / 80) * 30}px, ${Math.cos(frame / 70) * 22}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "-10%",
                    right: "-10%",
                    width: 900,
                    height: 900,
                    background: `radial-gradient(circle, ${C.brand2}15 0%, transparent 60%)`,
                    filter: "blur(60px)",
                    transform: `translate(${Math.cos(frame / 75) * 28}px, ${Math.sin(frame / 65) * 20}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 35%, transparent 85%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 85%)",
                }}
            />
        </>
    );
};

// ============================================
// Hero avatar (big, top-center)
// ============================================
const HeroAvatar: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({ frame, fps, config: { damping: 110, stiffness: 100, mass: 1 } });
    const scale = interpolate(entrance, [0, 1], [0.88, 1]);
    // Fade in (0-15) + fade out in outro (515-540)
    const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [515, 540], [1, 0], { extrapolateLeft: "clamp" });
    const opacity = Math.min(fadeIn, fadeOut);
    const glow = 0.55 + 0.45 * Math.sin(frame / 20);

    return (
        <div
            style={{
                position: "absolute",
                top: "6%",
                left: "50%",
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: "top center",
                opacity,
                width: "74%",
                aspectRatio: "9 / 14",
            }}
        >
            {/* Glow aura */}
            <div
                style={{
                    position: "absolute",
                    inset: -30,
                    background: `radial-gradient(ellipse at center, ${C.brand}${Math.floor(glow * 35)
                        .toString(16)
                        .padStart(2, "0")} 0%, transparent 70%)`,
                    filter: "blur(40px)",
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: 28,
                    overflow: "hidden",
                    border: `2px solid ${C.brand}55`,
                    boxShadow: `
                        0 40px 120px -20px rgba(0,0,0,0.8),
                        0 0 60px -10px ${C.brand}55,
                        inset 0 1px 0 rgba(255,255,255,0.08)
                    `,
                    background: C.bg,
                }}
            >
                {/* Avatar clips back-to-back */}
                {CUES.map((cue) => (
                    <Sequence key={cue.sceneId} from={cue.from} durationInFrames={cue.duration}>
                        <OffthreadVideo
                            src={staticFile(`avatar/matilda/scene-${cue.sceneId}.mp4`)}
                            volume={2.4}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                            }}
                        />
                    </Sequence>
                ))}
                {/* Vignette bottom */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 80,
                        background: "linear-gradient(180deg, transparent 0%, rgba(6,8,10,0.5) 100%)",
                        pointerEvents: "none",
                    }}
                />
            </div>
        </div>
    );
};

// ============================================
// Product B-roll chips — changes per Abigail segment
// ============================================
const ProductChip: React.FC<{ topic: string; progress: number }> = ({ topic, progress }) => {
    const inOp = interpolate(progress, [0, 0.15], [0, 1], { extrapolateRight: "clamp" });
    const outOp = interpolate(progress, [0.85, 1], [1, 0], { extrapolateLeft: "clamp" });
    const op = Math.min(inOp, outOp);
    const y = interpolate(progress, [0, 0.2], [16, 0], { extrapolateRight: "clamp" });

    const containerStyle: React.CSSProperties = {
        opacity: op,
        transform: `translateY(${y}px)`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "22px 26px",
        boxShadow: "0 30px 80px -15px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        gap: 18,
        width: "90%",
        maxWidth: 960,
    };

    if (topic === "caos") {
        return (
            <div style={containerStyle}>
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONTS.heading,
                        color: "white",
                        fontSize: 28,
                        fontWeight: 800,
                        flexShrink: 0,
                    }}
                >
                    !
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: C.red, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Planilha que não fecha
                    </div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4, letterSpacing: -0.5 }}>
                        3h/dia perdidas. #REF! #N/A
                    </div>
                </div>
            </div>
        );
    }

    if (topic === "pulse") {
        return (
            <div style={containerStyle}>
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: "linear-gradient(135deg, #25D366, #128C7E)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        flexShrink: 0,
                    }}
                >
                    <Icon.MessageCircle s={26} c="white" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: C.brand, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Pulse WhatsApp
                    </div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4, letterSpacing: -0.5 }}>
                        Conversa vira oportunidade
                    </div>
                </div>
            </div>
        );
    }

    if (topic === "pipeline") {
        const medalProgress = Math.min(progress * 1.3, 1);
        return (
            <div style={containerStyle}>
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${C.gold}, #D97706)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#06080a",
                        flexShrink: 0,
                    }}
                >
                    <Icon.Trophy s={26} c="#06080a" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Ranking ao vivo
                    </div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4, letterSpacing: -0.5 }}>
                        Meu time subiu {Math.round(3 * medalProgress)} posições
                    </div>
                </div>
            </div>
        );
    }

    if (topic === "eva") {
        return (
            <div style={containerStyle}>
                <EvaAvatar size={56} frame={progress * 80} thinking={true} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: "#a78bfa", letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Eva analisou pra você
                    </div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4, letterSpacing: -0.5 }}>
                        "Funil caiu 18% — ajusta follow-up"
                    </div>
                </div>
            </div>
        );
    }

    if (topic === "dashboard") {
        const pct = Math.round(27 * progress);
        return (
            <div style={containerStyle}>
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#06080a",
                        flexShrink: 0,
                    }}
                >
                    <Icon.TrendingUp s={26} c="#06080a" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: C.brand, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Meta do mês
                    </div>
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 30,
                            fontWeight: 800,
                            color: C.brand,
                            marginTop: 2,
                            letterSpacing: -1,
                        }}
                    >
                        +{pct}% acima
                    </div>
                </div>
            </div>
        );
    }

    if (topic === "cta") {
        return (
            <div
                style={{
                    ...containerStyle,
                    background: `linear-gradient(135deg, ${C.brand}22 0%, ${C.brand}08 100%)`,
                    border: `1.5px solid ${C.brand}66`,
                    boxShadow: `0 30px 80px -10px ${C.brand}55`,
                }}
            >
                <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 4 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: C.brand, letterSpacing: 1.5, textTransform: "uppercase" }}>
                        Testa sem risco
                    </div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -0.8 }}>
                        14 dias grátis, sem compromisso
                    </div>
                </div>
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#06080a",
                        background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                        padding: "10px 22px",
                        borderRadius: 12,
                        boxShadow: `0 10px 28px -6px ${C.brand}88`,
                    }}
                >
                    Começar
                </div>
            </div>
        );
    }

    return null;
};

const ProductChipTrack: React.FC = () => {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                position: "absolute",
                bottom: "18%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                display: "flex",
                justifyContent: "center",
            }}
        >
            {CUES.map((cue) => {
                const isActive = frame >= cue.from && frame <= cue.from + cue.duration;
                if (!isActive) return null;
                const progress = (frame - cue.from) / cue.duration;
                return <ProductChip key={cue.sceneId} topic={cue.topic} progress={progress} />;
            })}
        </div>
    );
};

// ============================================
// Outro — CTA logo + url
// ============================================
const Outro: React.FC = () => {
    const frame = useCurrentFrame();
    const startFrame = 520;
    const localFrame = frame - startFrame;
    if (localFrame < 0) return null;

    // Background cover slides in
    const bgOp = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    // Radial brand burst
    const burstScale = interpolate(localFrame, [5, 40], [0.6, 1.3], { extrapolateRight: "clamp" });
    const burstOp = interpolate(localFrame, [5, 30, 55], [0, 0.6, 0.25], { extrapolateRight: "clamp" });

    const logoOp = interpolate(localFrame, [10, 28], [0, 1], { extrapolateRight: "clamp" });
    const logoScale = interpolate(
        spring({ frame: localFrame - 10, fps: 30, config: { damping: 100, stiffness: 110 } }),
        [0, 1],
        [0.8, 1]
    );
    const glow = 0.6 + 0.4 * Math.sin(localFrame / 14);

    const pillOp = interpolate(localFrame, [28, 50], [0, 1], { extrapolateRight: "clamp" });
    const pillY = interpolate(localFrame, [28, 50], [18, 0], { extrapolateRight: "clamp" });
    const pillPulse = 0.85 + 0.15 * Math.sin(localFrame / 10);

    const urlOp = interpolate(localFrame, [48, 70], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill
            style={{
                opacity: bgOp,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 36,
                background: C.bg,
            }}
        >
            {/* Radial brand burst behind */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(circle at 50% 42%, ${C.brand}33 0%, transparent 55%)`,
                    opacity: burstOp,
                    transform: `scale(${burstScale})`,
                }}
            />
            {/* Dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                }}
            />

            <div style={{ opacity: logoOp, transform: `scale(${logoScale})` }}>
                <LogoMark size={180} glow={glow} showWordmark />
            </div>

            <div
                style={{
                    opacity: pillOp,
                    transform: `translateY(${pillY}px) scale(${pillPulse})`,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                }}
            >
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 44,
                        fontWeight: 800,
                        color: "#06080a",
                        background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                        padding: "20px 48px",
                        borderRadius: 18,
                        boxShadow: `0 0 80px ${C.brand}99, 0 20px 50px -10px rgba(0,0,0,0.6)`,
                        letterSpacing: -0.8,
                    }}
                >
                    14 dias grátis
                </div>
            </div>

            <div
                style={{
                    opacity: urlOp,
                    fontFamily: FONTS.mono,
                    fontSize: 28,
                    fontWeight: 600,
                    color: C.text,
                    letterSpacing: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                }}
            >
                <span style={{ color: C.brand }}>→</span>
                vyzon.com.br
            </div>
        </AbsoluteFill>
    );
};

// ============================================
// Subtitle band
// ============================================
const Subtitles: React.FC = () => {
    const frame = useCurrentFrame();
    return <SubtitleTrack frame={frame} cues={SUBTITLE_CUES} />;
};

// ============================================
// Background music
// ============================================
const BG_MUSIC = staticFile("audio/sales-video-v2-music.mp3");
const BackgroundMusic: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [durationInFrames - 35, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
    const volume = Math.min(fadeIn, fadeOut) * 0.11;
    return <Audio src={BG_MUSIC} volume={volume} />;
};

// ============================================
// Main composition
// ============================================
export const SalesVideoV2AvatarHostComposition: React.FC = () => {
    return (
        <AbsoluteFill style={{ background: C.bg }}>
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

            <BackgroundMusic />

            <Backdrop />
            <HeroAvatar />
            <ProductChipTrack />
            <Outro />
        </AbsoluteFill>
    );
};
