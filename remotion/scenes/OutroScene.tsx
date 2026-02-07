import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from "remotion";

const LOGO = staticFile("logo.png");

export const OutroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Animations
    const logoScale = spring({
        frame,
        fps,
        config: { damping: 100, stiffness: 200, mass: 0.5 },
    });

    const contentOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

    const ctaScale = spring({
        frame: frame - 30,
        fps,
        config: { damping: 80, stiffness: 180, mass: 0.6 },
    });

    const ctaGlow = 0.5 + Math.sin(frame / 10) * 0.3;

    // Confetti particles
    const confetti = Array.from({ length: 30 }).map((_, i) => ({
        x: (i * 73) % 1920 - 960,
        y: interpolate(frame, [0, 120], [-200, 800 + (i % 5) * 100], { extrapolateRight: "clamp" }),
        rotation: frame * (2 + i % 3),
        color: ["#818cf8", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"][i % 5],
        size: 8 + (i % 4) * 3,
    }));

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Confetti */}
            {confetti.map((c, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        left: `calc(50% + ${c.x}px)`,
                        top: c.y,
                        width: c.size,
                        height: c.size * 0.6,
                        background: c.color,
                        borderRadius: 2,
                        transform: `rotate(${c.rotation}deg)`,
                        opacity: 0.8,
                    }}
                />
            ))}

            {/* Central glow */}
            <div
                style={{
                    position: "absolute",
                    width: 800,
                    height: 800,
                    background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 60%)",
                    borderRadius: "50%",
                    filter: "blur(80px)",
                }}
            />

            {/* Logo */}
            <div
                style={{
                    transform: `scale(${logoScale})`,
                    opacity: contentOpacity,
                    marginBottom: 30,
                }}
            >
                <Img
                    src={LOGO}
                    style={{
                        width: 220,
                        height: "auto",
                        filter: "drop-shadow(0 20px 40px rgba(99, 102, 241, 0.5))",
                    }}
                />
            </div>

            {/* Main text */}
            <div
                style={{
                    opacity: contentOpacity,
                    fontSize: 56,
                    fontWeight: 800,
                    color: "white",
                    textAlign: "center",
                    marginBottom: 20,
                }}
            >
                Pronto para Vender Mais?
            </div>

            {/* Subtitle */}
            <div
                style={{
                    opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }),
                    fontSize: 24,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                    marginBottom: 50,
                }}
            >
                Junte-se a centenas de times de vendas que já aumentaram sua performance
            </div>

            {/* CTA Button */}
            <div
                style={{
                    transform: `scale(${Math.max(0, ctaScale)})`,
                    opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" }),
                }}
            >
                <div
                    style={{
                        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        borderRadius: 16,
                        padding: "20px 60px",
                        fontSize: 24,
                        fontWeight: 700,
                        color: "white",
                        boxShadow: `0 0 60px rgba(99, 102, 241, ${ctaGlow})`,
                        border: "2px solid rgba(255,255,255,0.2)",
                        cursor: "pointer",
                    }}
                >
                    🚀 Comece Grátis Agora
                </div>
            </div>

            {/* Features row */}
            <div
                style={{
                    position: "absolute",
                    bottom: 80,
                    display: "flex",
                    gap: 40,
                    opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }),
                }}
            >
                {["✓ Teste de 7 dias grátis", "✓ Sem cartão de crédito", "✓ Suporte em português"].map(
                    (feature, i) => (
                        <div
                            key={i}
                            style={{
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 16,
                                fontWeight: 500,
                                opacity: interpolate(frame - 55 - i * 5, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
                            }}
                        >
                            {feature}
                        </div>
                    )
                )}
            </div>

            {/* Website */}
            <div
                style={{
                    position: "absolute",
                    bottom: 30,
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 18,
                    fontWeight: 500,
                    opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateRight: "clamp" }),
                }}
            >
                gamesales.com.br
            </div>
        </AbsoluteFill>
    );
};
