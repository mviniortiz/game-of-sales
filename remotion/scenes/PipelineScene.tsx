import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from "remotion";

const PIPELINE_IMG = staticFile("screenshots/crm.png");

export const PipelineScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideIn = spring({
        frame,
        fps,
        config: { damping: 100, stiffness: 200, mass: 0.5 },
    });

    const scale = interpolate(slideIn, [0, 1], [0.9, 1]);
    const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    const float = Math.sin(frame / 25) * 4;

    // Simulate drag animation
    const dragX = interpolate(frame, [50, 80], [0, 150], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
    });
    const dragOpacity = interpolate(frame, [50, 55, 75, 80], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
    });

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
            }}
        >
            {/* Glow effects */}
            <div
                style={{
                    position: "absolute",
                    top: "30%",
                    right: "20%",
                    width: 500,
                    height: 500,
                    background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(80px)",
                }}
            />

            {/* Title */}
            <div
                style={{
                    position: "absolute",
                    top: 60,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
                    transform: `translateY(${interpolate(frame, [0, 15], [-20, 0], { extrapolateRight: "clamp" })}px)`,
                }}
            >
                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: "#10b981",
                        textTransform: "uppercase",
                        letterSpacing: 4,
                        marginBottom: 8,
                    }}
                >
                    CRM Pipeline
                </div>
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: "white",
                        textAlign: "center",
                    }}
                >
                    Arraste e Gerencie Negociações
                </div>
            </div>

            {/* Screenshot with effects */}
            <div
                style={{
                    marginTop: 100,
                    position: "relative",
                    transform: `scale(${scale}) translateY(${float}px)`,
                    opacity,
                    boxShadow: "0 25px 100px -12px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                    borderRadius: 20,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                <Img
                    src={PIPELINE_IMG}
                    style={{
                        width: 1100,
                        height: "auto",
                        display: "block",
                    }}
                />

                {/* Animated drag indicator */}
                <div
                    style={{
                        position: "absolute",
                        top: "35%",
                        left: `${20 + dragX * 0.15}%`,
                        width: 150,
                        height: 80,
                        background: "rgba(16, 185, 129, 0.3)",
                        border: "2px dashed #10b981",
                        borderRadius: 12,
                        opacity: dragOpacity,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 14,
                        fontWeight: 600,
                    }}
                >
                    🖱️ Arrastando...
                </div>
            </div>

            {/* Feature callouts */}
            <div
                style={{
                    position: "absolute",
                    bottom: 80,
                    display: "flex",
                    gap: 30,
                    opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
                }}
            >
                {["🎯 5 etapas do funil", "💰 Valor por coluna", "⚡ Drag & Drop"].map((feature, i) => (
                    <div
                        key={i}
                        style={{
                            background: "rgba(16, 185, 129, 0.2)",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                            borderRadius: 12,
                            padding: "12px 24px",
                            color: "white",
                            fontSize: 18,
                            fontWeight: 500,
                            backdropFilter: "blur(10px)",
                            transform: `translateY(${interpolate(frame - 45 - i * 5, [0, 10], [20, 0], { extrapolateRight: "clamp" })}px)`,
                            opacity: interpolate(frame - 45 - i * 5, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
                        }}
                    >
                        {feature}
                    </div>
                ))}
            </div>
        </AbsoluteFill>
    );
};
