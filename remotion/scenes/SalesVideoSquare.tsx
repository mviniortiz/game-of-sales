import React from "react";
import {
    AbsoluteFill,
    Audio,
    Img,
    Sequence,
    interpolate,
    spring,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
} from "remotion";
import { FONTS, fontStyles, clamp01 } from "./sales/lib";

// ============================================
// SALES VIDEO — GOOGLE ADS SQUARE
// 1080 x 1080 (1:1) · 25s @ 30fps = 750 frames
// ============================================

const BG_MUSIC = staticFile("audio/corporate-music.mp3");
const LOGO = staticFile("logo.png");

// Vyzon brand palette (matches landing redesign)
const DARK = "#06080a";
const CARD = "#11152A";
const LINE = "rgba(139,156,180,0.16)";
const EMERALD = "#10B77F";
const EMERALD_DEEP = "#059669";
const EMERALD_SOFT = "rgba(16,183,127,0.22)";
const VIOLET = "#8B5CF6";
const VIOLET_SOFT = "rgba(139,92,246,0.20)";
const TEXT = "#CCFFFF";
const MUTED = "#8B9CB4";
const INK_ON_EMERALD = "#041411";

// ============================================
// AUDIO
// ============================================
const BackgroundMusic: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(
        frame,
        [durationInFrames - 35, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp" },
    );
    const volume = Math.min(fadeIn, fadeOut) * 0.22;
    return <Audio src={BG_MUSIC} volume={volume} />;
};

// ============================================
// AMBIENT BG — always emerald/violet, never gold
// ============================================
const AmbientBG: React.FC<{ tint?: "emerald" | "violet" | "mixed" }> = ({ tint = "emerald" }) => {
    const frame = useCurrentFrame();
    const palettes = {
        emerald: ["rgba(16,183,127,0.25)", "rgba(16,183,127,0.14)"],
        violet: ["rgba(139,92,246,0.22)", "rgba(16,183,127,0.14)"],
        mixed: ["rgba(139,92,246,0.22)", "rgba(16,183,127,0.22)"],
    }[tint];
    return (
        <>
            <div style={{ position: "absolute", inset: 0, background: DARK }} />
            <div
                style={{
                    position: "absolute",
                    top: "15%",
                    left: "10%",
                    width: 700,
                    height: 700,
                    background: `radial-gradient(circle, ${palettes[0]} 0%, transparent 65%)`,
                    borderRadius: "50%",
                    filter: "blur(80px)",
                    transform: `translate(${Math.sin(frame / 50) * 30}px, ${Math.cos(frame / 40) * 20}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "10%",
                    right: "8%",
                    width: 600,
                    height: 600,
                    background: `radial-gradient(circle, ${palettes[1]} 0%, transparent 65%)`,
                    borderRadius: "50%",
                    filter: "blur(90px)",
                    opacity: 0.7,
                    transform: `translate(${Math.cos(frame / 45) * 25}px, ${Math.sin(frame / 35) * 20}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                        "radial-gradient(rgba(204,255,255,0.05) 1.2px, transparent 1.2px)",
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                }}
            />
        </>
    );
};

// ============================================
// SCENE 1 — HOOK (0–90 / 3s)
// ============================================
const HookScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enter = spring({ frame, fps, config: { damping: 14, mass: 0.6 }, durationInFrames: 20 });
    const translateY = interpolate(enter, [0, 1], [30, 0]);
    const exit = interpolate(frame, [75, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const pulse = 1 + Math.sin((frame / fps) * Math.PI * 1.6) * 0.02;

    return (
        <AbsoluteFill>
            <AmbientBG tint="mixed" />
            <AbsoluteFill
                style={{
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: enter * exit,
                    transform: `translateY(${translateY}px)`,
                    padding: 80,
                }}
            >
                <div
                    style={{
                        fontFamily: FONTS.sans,
                        fontSize: 24,
                        fontWeight: 700,
                        color: EMERALD,
                        textTransform: "uppercase",
                        letterSpacing: 6,
                        marginBottom: 36,
                    }}
                >
                    <span style={{ display: "inline-block", width: 40, height: 2, background: EMERALD, verticalAlign: "middle", marginRight: 14 }} />
                    vendedor, atenção
                </div>
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 110,
                        fontWeight: 900,
                        lineHeight: 1,
                        letterSpacing: -3,
                        textAlign: "center",
                        background: `linear-gradient(135deg, #ffffff 0%, ${TEXT} 40%, ${EMERALD} 100%)`,
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        transform: `scale(${pulse})`,
                    }}
                >
                    Seus leads
                    <br />
                    estão esfriando
                    <br />
                    no WhatsApp.
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================
// SCENE 2 — LOGO REVEAL (90–180 / 3s)
// ============================================
const LogoScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enter = spring({ frame, fps, config: { damping: 12, mass: 0.7 }, durationInFrames: 28 });
    const scale = interpolate(enter, [0, 1], [0.7, 1]);
    const exit = interpolate(frame, [75, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    const taglineIn = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
    const taglineY = interpolate(taglineIn, [0, 1], [20, 0]);

    return (
        <AbsoluteFill>
            <AmbientBG tint="emerald" />
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
                <div
                    style={{
                        transform: `scale(${scale})`,
                        opacity: enter,
                        filter: `drop-shadow(0 20px 50px ${EMERALD_SOFT})`,
                    }}
                >
                    <Img src={LOGO} style={{ width: 520, height: "auto", display: "block" }} />
                </div>
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 54,
                        fontWeight: 800,
                        color: TEXT,
                        letterSpacing: -1.2,
                        marginTop: 48,
                        opacity: taglineIn,
                        transform: `translateY(${taglineY}px)`,
                        textAlign: "center",
                    }}
                >
                    O CRM que <span style={{ color: EMERALD }}>vende com você.</span>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================
// SCENE 3 — WHATSAPP + EVA (180–360 / 6s)
// ============================================
const FeatureChatScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const headerIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    const headerY = interpolate(headerIn, [0, 1], [-20, 0]);
    const cardIn = spring({ frame: frame - 10, fps, config: { damping: 14 }, durationInFrames: 24 });
    const cardY = interpolate(cardIn, [0, 1], [40, 0]);
    const exit = interpolate(frame, [165, 180], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    const msg1 = clamp01((frame - 30) / 12);
    const evaBadge = clamp01((frame - 70) / 15);
    const msg2 = clamp01((frame - 115) / 12);

    return (
        <AbsoluteFill>
            <AmbientBG tint="emerald" />
            <AbsoluteFill style={{ padding: 80, opacity: exit }}>
                <div style={{ opacity: headerIn, transform: `translateY(${headerY}px)` }}>
                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 22,
                            fontWeight: 700,
                            color: EMERALD,
                            textTransform: "uppercase",
                            letterSpacing: 5,
                        }}
                    >
                        WhatsApp + IA
                    </div>
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 72,
                            fontWeight: 900,
                            color: TEXT,
                            lineHeight: 1.05,
                            letterSpacing: -2,
                            marginTop: 18,
                        }}
                    >
                        A Eva te diz
                        <br />
                        o que responder.
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 50,
                        background: CARD,
                        border: `1px solid ${LINE}`,
                        borderRadius: 24,
                        padding: 28,
                        opacity: cardIn,
                        transform: `translateY(${cardY}px)`,
                        boxShadow: `0 30px 80px -30px ${EMERALD_SOFT}`,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 999,
                                background: `linear-gradient(135deg, ${EMERALD}, ${EMERALD_DEEP})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 800,
                                fontFamily: FONTS.sans,
                            }}
                        >
                            JP
                        </div>
                        <div>
                            <div style={{ color: TEXT, fontFamily: FONTS.sans, fontSize: 22, fontWeight: 700 }}>
                                João Pedro
                            </div>
                            <div style={{ color: MUTED, fontSize: 16, fontFamily: FONTS.sans }}>agora</div>
                        </div>
                    </div>

                    <div
                        style={{
                            opacity: msg1,
                            transform: `translateY(${interpolate(msg1, [0, 1], [10, 0])}px)`,
                            background: "#1a2033",
                            color: TEXT,
                            padding: "16px 22px",
                            borderRadius: "20px 20px 20px 4px",
                            fontFamily: FONTS.sans,
                            fontSize: 24,
                            maxWidth: "82%",
                            marginBottom: 14,
                        }}
                    >
                        Tá caro... preciso pensar melhor.
                    </div>

                    <div
                        style={{
                            opacity: evaBadge,
                            transform: `translateY(${interpolate(evaBadge, [0, 1], [10, 0])}px)`,
                            background: `linear-gradient(135deg, ${VIOLET_SOFT}, ${EMERALD_SOFT})`,
                            border: `1px solid ${VIOLET}`,
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 14,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                color: VIOLET,
                                fontFamily: FONTS.sans,
                                fontSize: 16,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: 2,
                                marginBottom: 10,
                            }}
                        >
                            <div style={{ width: 22, height: 22, borderRadius: 999, background: VIOLET }} />
                            EVA SUGERE
                        </div>
                        <div style={{ color: TEXT, fontFamily: FONTS.sans, fontSize: 22, lineHeight: 1.35 }}>
                            Pergunta o orçamento dele e ofereça
                            o plano Essencial — 40% mais barato.
                        </div>
                    </div>

                    <div
                        style={{
                            opacity: msg2,
                            transform: `translateY(${interpolate(msg2, [0, 1], [10, 0])}px)`,
                            background: `linear-gradient(135deg, ${EMERALD}, ${EMERALD_DEEP})`,
                            color: INK_ON_EMERALD,
                            padding: "16px 22px",
                            borderRadius: "20px 20px 4px 20px",
                            fontFamily: FONTS.sans,
                            fontSize: 24,
                            fontWeight: 600,
                            maxWidth: "82%",
                            marginLeft: "auto",
                        }}
                    >
                        Entendo! Qual orçamento faz sentido
                        pra você hoje?
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================
// SCENE 4 — KANBAN DRAG (360–510 / 5s)
// Smooth drag: Ana rendered once with absolute X interpolation
// ============================================
const KanbanMiniScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const headerIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    const exit = interpolate(frame, [135, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // Container dims (match padding+grid spacing)
    const containerWidth = 920;
    const gap = 18;
    const colWidth = (containerWidth - gap * 2) / 3;
    const col1X = colWidth + gap; // center anchor of col2 (Qualificando)
    const col2X = (colWidth + gap) * 2; // center anchor of col3 (Fechando)

    const pickupStart = 40;
    const pickupEnd = 55;
    const dropStart = 85;
    const dropEnd = 100;

    const dragProgress = interpolate(frame, [pickupEnd, dropStart], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const anaX = interpolate(dragProgress, [0, 1], [col1X, col2X]);

    // Pickup lift (scale up + shadow) between pickupStart and pickupEnd
    const lift = interpolate(frame, [pickupStart, pickupEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    // Drop settle
    const drop = interpolate(frame, [dropStart, dropEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const elevation = Math.max(lift, drop);
    const anaScale = interpolate(elevation, [0, 1], [1, 1.06]);
    const anaLiftY = interpolate(elevation, [0, 1], [0, -6]);

    const cols = ["Novos", "Qualificando", "Fechando"];
    // Ghost placeholder height inside source/target col while Ana is in transit
    const isDragging = frame >= pickupStart && frame < dropEnd;

    return (
        <AbsoluteFill>
            <AmbientBG tint="violet" />
            <AbsoluteFill style={{ padding: 80, opacity: exit }}>
                <div style={{ opacity: headerIn }}>
                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: 22,
                            fontWeight: 700,
                            color: VIOLET,
                            textTransform: "uppercase",
                            letterSpacing: 5,
                        }}
                    >
                        Pipeline visual
                    </div>
                    <div
                        style={{
                            fontFamily: FONTS.heading,
                            fontSize: 72,
                            fontWeight: 900,
                            color: TEXT,
                            lineHeight: 1.05,
                            letterSpacing: -2,
                            marginTop: 18,
                        }}
                    >
                        Arraste. Feche.
                        <br />
                        Comemore.
                    </div>
                </div>

                {/* Board wrapper with relative positioning */}
                <div style={{ marginTop: 60, position: "relative", width: containerWidth }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: gap }}>
                        {cols.map((name, ci) => (
                            <div
                                key={name}
                                style={{
                                    background: CARD,
                                    border: `1px solid ${LINE}`,
                                    borderRadius: 20,
                                    padding: 18,
                                    minHeight: 480,
                                }}
                            >
                                <div
                                    style={{
                                        color: MUTED,
                                        fontFamily: FONTS.sans,
                                        fontSize: 16,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: 2,
                                        marginBottom: 16,
                                        textAlign: "center",
                                    }}
                                >
                                    {name}
                                </div>

                                {/* Static cards (Ana rendered separately for smooth drag) */}
                                {ci === 0 && (
                                    <PipelineCard
                                        name="Construtora Vega"
                                        value="R$ 12k"
                                        gradient={[EMERALD, EMERALD_DEEP]}
                                    />
                                )}
                                {ci === 2 && (
                                    <PipelineCard
                                        name="TechSul"
                                        value="R$ 54k"
                                        gradient={["#fbbf24", "#f59e0b"]}
                                    />
                                )}

                                {/* Ghost placeholder slot showing drop target */}
                                {ci === 2 && isDragging && (
                                    <div
                                        style={{
                                            border: `2px dashed ${VIOLET}`,
                                            borderRadius: 14,
                                            height: 82,
                                            background: VIOLET_SOFT,
                                            opacity: interpolate(dragProgress, [0, 1], [0.3, 0.9]),
                                            marginTop: ci === 2 ? 12 : 0,
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Ana's card — absolute, interpolates across columns */}
                    <div
                        style={{
                            position: "absolute",
                            top: 72, // below column header
                            left: 18, // column inner padding
                            width: colWidth - 36, // minus padding
                            transform: `translateX(${anaX}px) translateY(${anaLiftY}px) scale(${anaScale})`,
                            zIndex: 10,
                        }}
                    >
                        <PipelineCard
                            name="Ana Martins"
                            value="R$ 28k"
                            gradient={[VIOLET, "#7c3aed"]}
                            extraShadow={elevation}
                        />
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

const PipelineCard: React.FC<{
    name: string;
    value: string;
    gradient: [string, string];
    extraShadow?: number;
}> = ({ name, value, gradient, extraShadow = 0 }) => (
    <div
        style={{
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            color: INK_ON_EMERALD,
            boxShadow: `0 ${12 + extraShadow * 18}px ${30 + extraShadow * 40}px -10px ${gradient[0]}${Math.round(
                (0.4 + extraShadow * 0.4) * 255,
            )
                .toString(16)
                .padStart(2, "0")}`,
        }}
    >
        <div style={{ fontFamily: FONTS.sans, fontSize: 18, fontWeight: 800 }}>{name}</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {value}
        </div>
    </div>
);

// ============================================
// SCENE 5 — METRIC REVEAL (510–630 / 4s)
// ============================================
const MetricScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enter = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 26 });
    const exit = interpolate(frame, [105, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const countUp = Math.round(clamp01((frame - 8) / 50) ** 0.9 * 40);

    return (
        <AbsoluteFill>
            <AmbientBG tint="emerald" />
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: enter * exit, padding: 80 }}>
                <div
                    style={{
                        fontFamily: FONTS.sans,
                        fontSize: 24,
                        fontWeight: 700,
                        color: EMERALD,
                        textTransform: "uppercase",
                        letterSpacing: 6,
                        marginBottom: 40,
                    }}
                >
                    times Vyzon em média
                </div>
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 320,
                        fontWeight: 900,
                        lineHeight: 0.95,
                        letterSpacing: -8,
                        background: `linear-gradient(135deg, #ffffff 0%, ${TEXT} 50%, ${EMERALD} 100%)`,
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    +{countUp}%
                </div>
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 52,
                        fontWeight: 800,
                        color: TEXT,
                        letterSpacing: -1.2,
                        marginTop: 20,
                        textAlign: "center",
                    }}
                >
                    em conversão de leads.
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================
// SCENE 6 — CTA (630–750 / 4s)
// ============================================
const CTAScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enter = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 26 });
    const pulse = 1 + Math.sin((frame / fps) * Math.PI * 1.4) * 0.02;
    // Tagline enters after logo settles
    const taglineIn = interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" });
    const taglineY = interpolate(taglineIn, [0, 1], [18, 0]);
    const buttonIn = interpolate(frame, [32, 52], [0, 1], { extrapolateRight: "clamp" });
    const buttonY = interpolate(buttonIn, [0, 1], [22, 0]);
    const domainIn = interpolate(frame, [44, 62], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill>
            <AmbientBG tint="mixed" />
            <AbsoluteFill
                style={{
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 80,
                    opacity: enter,
                }}
            >
                <Img
                    src={LOGO}
                    style={{
                        width: 300,
                        height: "auto",
                        marginBottom: 36,
                        filter: `drop-shadow(0 10px 30px ${EMERALD_SOFT})`,
                    }}
                />
                <div
                    style={{
                        fontFamily: FONTS.heading,
                        fontSize: 64,
                        fontWeight: 900,
                        letterSpacing: -1.5,
                        textAlign: "center",
                        marginBottom: 36,
                        lineHeight: 1.03,
                        opacity: taglineIn,
                        transform: `translateY(${taglineY}px)`,
                        background: `linear-gradient(135deg, #ffffff 0%, ${TEXT} 50%, ${EMERALD} 100%)`,
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    Teste grátis
                    <br />
                    por 14 dias.
                </div>
                <div
                    style={{
                        opacity: buttonIn,
                        transform: `translateY(${buttonY}px) scale(${pulse})`,
                        padding: "26px 60px",
                        borderRadius: 999,
                        background: `linear-gradient(135deg, ${EMERALD} 0%, ${EMERALD_DEEP} 100%)`,
                        boxShadow: `0 25px 60px -15px ${EMERALD_SOFT}, 0 0 80px -10px ${EMERALD_SOFT}`,
                        fontFamily: FONTS.heading,
                        fontSize: 40,
                        fontWeight: 900,
                        color: INK_ON_EMERALD,
                        letterSpacing: -0.6,
                    }}
                >
                    Começar agora
                </div>
                <div
                    style={{
                        fontFamily: FONTS.mono,
                        fontSize: 28,
                        fontWeight: 500,
                        color: EMERALD,
                        marginTop: 28,
                        letterSpacing: 0.5,
                        opacity: domainIn,
                    }}
                >
                    vyzon.com.br
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================
// COMPOSITION — 750 frames / 25s
// ============================================
export const SalesVideoSquareComposition: React.FC = () => {
    return (
        <AbsoluteFill style={{ background: DARK }}>
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
            <BackgroundMusic />

            <Sequence from={0} durationInFrames={90}>
                <HookScene />
            </Sequence>
            <Sequence from={90} durationInFrames={90}>
                <LogoScene />
            </Sequence>
            <Sequence from={180} durationInFrames={180}>
                <FeatureChatScene />
            </Sequence>
            <Sequence from={360} durationInFrames={150}>
                <KanbanMiniScene />
            </Sequence>
            <Sequence from={510} durationInFrames={120}>
                <MetricScene />
            </Sequence>
            <Sequence from={630} durationInFrames={120}>
                <CTAScene />
            </Sequence>
        </AbsoluteFill>
    );
};
