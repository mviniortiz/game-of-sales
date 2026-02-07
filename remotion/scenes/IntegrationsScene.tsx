import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from "remotion";

const INTEGRATIONS_IMG = staticFile("screenshots/integrations.png");

export const IntegrationsScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideIn = spring({
        frame,
        fps,
        config: { damping: 100, stiffness: 200, mass: 0.5 },
    });

    const scale = interpolate(slideIn, [0, 1], [0.9, 1]);
    const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    const float = Math.sin(frame / 28) * 3;

    // Connection animation
    const connectionPulse = Math.sin(frame / 10) * 0.5 + 0.5;

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0f172a 0%, #3730a3 50%, #0f172a 100%)",
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
                    top: "40%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 600,
                    height: 600,
                    background: "radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(100px)",
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
                        color: "#f59e0b",
                        textTransform: "uppercase",
                        letterSpacing: 4,
                        marginBottom: 8,
                    }}
                >
                    Integrações
                </div>
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: "white",
                        textAlign: "center",
                    }}
                >
                    Conecte Suas Plataformas
                </div>
            </div>

            {/* Screenshot with effects */}
            <div
                style={{
                    marginTop: 100,
                    transform: `scale(${scale}) translateY(${float}px)`,
                    opacity,
                    boxShadow: "0 25px 100px -12px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                    borderRadius: 20,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                <Img
                    src={INTEGRATIONS_IMG}
                    style={{
                        width: 1100,
                        height: "auto",
                        display: "block",
                    }}
                />
            </div>

            {/* Integration icons floating */}
            <div
                style={{
                    position: "absolute",
                    bottom: 80,
                    display: "flex",
                    gap: 30,
                    opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
                }}
            >
                {[
                    { icon: "🔥", name: "Hotmart", status: "Ativo" },
                    { icon: "🥝", name: "Kiwify", status: "Conectar" },
                    { icon: "📅", name: "Google", status: "Conectar" },
                ].map((integration, i) => (
                    <div
                        key={i}
                        style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            border: `1px solid rgba(245, 158, 11, ${0.3 + connectionPulse * 0.3})`,
                            borderRadius: 16,
                            padding: "16px 28px",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            backdropFilter: "blur(10px)",
                            transform: `translateY(${interpolate(frame - 45 - i * 5, [0, 10], [20, 0], { extrapolateRight: "clamp" })}px)`,
                            opacity: interpolate(frame - 45 - i * 5, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
                        }}
                    >
                        <span style={{ fontSize: 28 }}>{integration.icon}</span>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>{integration.name}</div>
                            <div style={{ fontSize: 12, color: integration.status === "Ativo" ? "#10b981" : "#94a3b8" }}>
                                {integration.status}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </AbsoluteFill>
    );
};
