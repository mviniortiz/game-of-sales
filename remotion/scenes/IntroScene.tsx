import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from "remotion";

const LOGO = staticFile("logo.png");

export const IntroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Logo entrance animation
    const logoScale = spring({
        frame,
        fps,
        config: { damping: 80, stiffness: 150, mass: 0.8 },
    });

    const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

    // Text entrance (staggered)
    const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });
    const titleY = interpolate(frame, [20, 35], [30, 0], { extrapolateRight: "clamp" });

    const subtitleOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });
    const subtitleY = interpolate(frame, [35, 50], [20, 0], { extrapolateRight: "clamp" });

    // Particle effects
    const particles = Array.from({ length: 20 }).map((_, i) => ({
        x: Math.sin(i * 0.5) * 300 + Math.cos(frame / 20 + i) * 50,
        y: Math.cos(i * 0.3) * 200 + Math.sin(frame / 25 + i) * 30,
        size: 3 + Math.sin(i) * 2,
        opacity: 0.3 + Math.sin(frame / 30 + i) * 0.2,
    }));

    // Glow pulse
    const glowIntensity = 0.3 + Math.sin(frame / 15) * 0.1;

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #0f172a 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Particle effects */}
            {particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        left: `calc(50% + ${p.x}px)`,
                        top: `calc(50% + ${p.y}px)`,
                        width: p.size,
                        height: p.size,
                        borderRadius: "50%",
                        background: `rgba(129, 140, 248, ${p.opacity})`,
                        boxShadow: `0 0 ${p.size * 3}px rgba(129, 140, 248, ${p.opacity})`,
                    }}
                />
            ))}

            {/* Central glow */}
            <div
                style={{
                    position: "absolute",
                    width: 600,
                    height: 600,
                    background: `radial-gradient(circle, rgba(99, 102, 241, ${glowIntensity}) 0%, transparent 60%)`,
                    borderRadius: "50%",
                    filter: "blur(60px)",
                }}
            />

            {/* Logo */}
            <div
                style={{
                    transform: `scale(${logoScale})`,
                    opacity: logoOpacity,
                    marginBottom: 40,
                }}
            >
                <Img
                    src={LOGO}
                    style={{
                        width: 280,
                        height: "auto",
                        filter: "drop-shadow(0 20px 40px rgba(99, 102, 241, 0.5))",
                    }}
                />
            </div>

            {/* Title */}
            <div
                style={{
                    opacity: titleOpacity,
                    transform: `translateY(${titleY}px)`,
                    fontSize: 64,
                    fontWeight: 800,
                    color: "white",
                    textAlign: "center",
                    textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    letterSpacing: -1,
                }}
            >
                Transforme seu Time de Vendas
            </div>

            {/* Subtitle */}
            <div
                style={{
                    opacity: subtitleOpacity,
                    transform: `translateY(${subtitleY}px)`,
                    fontSize: 28,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                    marginTop: 20,
                    maxWidth: 700,
                    lineHeight: 1.5,
                }}
            >
                CRM gamificado que aumenta a performance do seu time com rankings, metas e competição saudável
            </div>

            {/* Badge */}
            <div
                style={{
                    opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" }),
                    transform: `translateY(${interpolate(frame, [50, 65], [20, 0], { extrapolateRight: "clamp" })}px)`,
                    marginTop: 40,
                    display: "flex",
                    gap: 20,
                }}
            >
                {["🏆 Gamificação", "📊 Analytics", "🔗 Integrações"].map((badge, i) => (
                    <div
                        key={i}
                        style={{
                            background: "rgba(99, 102, 241, 0.2)",
                            border: "1px solid rgba(99, 102, 241, 0.4)",
                            borderRadius: 30,
                            padding: "10px 24px",
                            color: "white",
                            fontSize: 16,
                            fontWeight: 500,
                            opacity: interpolate(frame - 50 - i * 5, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
                        }}
                    >
                        {badge}
                    </div>
                ))}
            </div>
        </AbsoluteFill>
    );
};
