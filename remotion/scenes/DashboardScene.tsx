import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from "remotion";

// Screenshot paths - place your screenshots in public/screenshots/
const DASHBOARD_IMG = staticFile("screenshots/dashboard.png");

export const DashboardScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Smooth entrance animation
    const slideIn = spring({
        frame,
        fps,
        config: { damping: 100, stiffness: 200, mass: 0.5 },
    });

    const scale = interpolate(slideIn, [0, 1], [0.9, 1]);
    const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

    // Floating animation
    const float = Math.sin(frame / 30) * 5;

    // Feature highlight boxes animation
    const highlightOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
    const highlightScale = spring({
        frame: frame - 40,
        fps,
        config: { damping: 80, stiffness: 180, mass: 0.5 },
    });

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
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
                    top: "20%",
                    left: "30%",
                    width: 400,
                    height: 400,
                    background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(60px)",
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
                        color: "#818cf8",
                        textTransform: "uppercase",
                        letterSpacing: 4,
                        marginBottom: 8,
                    }}
                >
                    Visão Geral
                </div>
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: "white",
                        textAlign: "center",
                    }}
                >
                    Dashboard em Tempo Real
                </div>
            </div>

            {/* Screenshot with effects */}
            <div
                style={{
                    marginTop: 100,
                    transform: `scale(${scale}) translateY(${float}px)`,
                    opacity,
                    boxShadow: "0 25px 100px -12px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(255,255,255,0.1)",
                    borderRadius: 20,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                <Img
                    src={DASHBOARD_IMG}
                    style={{
                        width: 1100,
                        height: "auto",
                        display: "block",
                    }}
                />
            </div>

            {/* Feature callouts */}
            <div
                style={{
                    position: "absolute",
                    bottom: 80,
                    display: "flex",
                    gap: 30,
                    opacity: highlightOpacity,
                    transform: `scale(${Math.min(highlightScale, 1)})`,
                }}
            >
                {["📊 KPIs em tempo real", "📈 Evolução de vendas", "👥 Top vendedores"].map((feature, i) => (
                    <div
                        key={i}
                        style={{
                            background: "rgba(99, 102, 241, 0.2)",
                            border: "1px solid rgba(99, 102, 241, 0.4)",
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
