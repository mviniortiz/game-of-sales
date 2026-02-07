import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig, Sequence, Audio } from "remotion";

// Premium Fonts - Source Serif 4 (Perplexity-style) + Inter
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700;8..60,800;8..60,900&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
`;

// Font family constants
const FONTS = {
    serif: "'Source Serif 4', Georgia, serif",
    sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

// Screenshot paths
const SCREENSHOTS = {
    dashboard: staticFile("screenshots/dashboard.png"),
    dashboard1: staticFile("screenshots/dashboard-1.png"),
    dashboard2: staticFile("screenshots/dashboard-2.png"),
    crm: staticFile("screenshots/crm.png"),
    calendar1: staticFile("screenshots/calendar-1.png"),
    calendar2: staticFile("screenshots/calendar-2.png"),
    integrations: staticFile("screenshots/integrations.png"),
    metas: staticFile("screenshots/metas.png"),
    ranking1: staticFile("screenshots/ranking-1.png"),
    ranking2: staticFile("screenshots/ranking-2.png"),
    newlead: staticFile("screenshots/newlead.png"),
};

const LOGO = staticFile("logo.png");
const BACKGROUND_MUSIC = staticFile("audio/corporate-music.mp3");

// ============================================
// PROFESSIONAL SVG ICONS (Lucide-style)
// ============================================
const Icons = {
    Trophy: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    ),
    BarChart: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" />
        </svg>
    ),
    TrendingUp: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
    ),
    Target: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
    ),
    Rocket: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
    ),
    Zap: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    Users: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Star: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    Flame: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    ),
    Kanban: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 5v11" /><path d="M12 5v6" /><path d="M18 5v14" />
        </svg>
    ),
    DollarSign: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    Link: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    ),
    Calendar: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    ),
    RefreshCw: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
        </svg>
    ),
    Smartphone: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
        </svg>
    ),
    CheckCircle: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    Lock: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    Play: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
    ),
    ArrowRight: ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    ),
};

// ============================================
// PROFESSIONAL SCREENSHOT SCENE - FULL SCREEN
// ============================================
interface FeatureItem {
    icon: React.ReactNode;
    text: string;
}

interface ProfessionalScreenshotSceneProps {
    screenshot: string;
    title: string;
    subtitle: string;
    features: FeatureItem[];
    layout?: "left" | "right" | "fullscreen";
}

const ProfessionalScreenshotScene: React.FC<ProfessionalScreenshotSceneProps> = ({
    screenshot,
    title,
    subtitle,
    features,
    layout = "left",
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Smooth entrance animations
    const slideProgress = spring({
        frame,
        fps,
        config: { damping: 100, stiffness: 120, mass: 1 },
    });

    const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
    const opacity = Math.min(fadeIn, fadeOut);

    // Screenshot gentle pan (very subtle)
    const panX = interpolate(frame, [0, durationInFrames], [0, -20], { extrapolateRight: "clamp" });

    // Content animations
    const textSlideX = interpolate(slideProgress, [0, 1], [layout === "left" ? -80 : 80, 0]);
    const screenshotSlideX = interpolate(slideProgress, [0, 1], [layout === "left" ? 100 : -100, 0]);

    // Feature stagger
    const getFeatureOpacity = (index: number) => {
        const delay = 30 + index * 12;
        return interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    };
    const getFeatureY = (index: number) => {
        const delay = 30 + index * 12;
        return interpolate(frame, [delay, delay + 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    };

    const isFullscreen = layout === "fullscreen";
    const isLeft = layout === "left";

    return (
        <AbsoluteFill
            style={{
                background: "linear-gradient(135deg, #0a0a1a 0%, #0f1629 30%, #1a1a3e 70%, #0f172a 100%)",
                opacity,
            }}
        >
            {/* Animated gradient orbs */}
            <div
                style={{
                    position: "absolute",
                    top: "10%",
                    left: isLeft ? "5%" : "60%",
                    width: 500,
                    height: 500,
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(60px)",
                    transform: `translate(${Math.sin(frame / 50) * 20}px, ${Math.cos(frame / 40) * 15}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "10%",
                    right: isLeft ? "10%" : "50%",
                    width: 400,
                    height: 400,
                    background: "radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(50px)",
                    transform: `translate(${Math.cos(frame / 45) * 15}px, ${Math.sin(frame / 35) * 20}px)`,
                }}
            />

            {/* Grid pattern overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                    opacity: 0.5,
                }}
            />

            {isFullscreen ? (
                // FULLSCREEN LAYOUT
                <AbsoluteFill style={{ padding: 60 }}>
                    {/* Top title bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 30,
                            opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
                            transform: `translateY(${interpolate(frame, [5, 25], [-20, 0], { extrapolateRight: "clamp" })}px)`,
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: "#fbbf24",
                                    textTransform: "uppercase",
                                    letterSpacing: 3,
                                    marginBottom: 4,
                                }}
                            >
                                {subtitle}
                            </div>
                            <div
                                style={{
                                    fontSize: 42,
                                    fontWeight: 700,
                                    fontFamily: FONTS.serif,
                                    color: "white",
                                    letterSpacing: -1,
                                }}
                            >
                                {title}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 16 }}>
                            {features.map((feature, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "12px 20px",
                                        background: "rgba(251, 191, 36, 0.12)",
                                        border: "1px solid rgba(251, 191, 36, 0.25)",
                                        borderRadius: 12,
                                        opacity: getFeatureOpacity(i),
                                        transform: `translateY(${getFeatureY(i)}px)`,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                            borderRadius: 8,
                                        }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <span style={{ color: "white", fontSize: 14, fontWeight: 500, fontFamily: FONTS.sans }}>
                                        {feature.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Full screenshot */}
                    <div
                        style={{
                            flex: 1,
                            borderRadius: 16,
                            overflow: "hidden",
                            boxShadow: "0 25px 80px -20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08)",
                            transform: `scale(${slideProgress})`,
                        }}
                    >
                        {/* Browser chrome */}
                        <div
                            style={{
                                height: 44,
                                background: "linear-gradient(180deg, #1e1e2e 0%, #181825 100%)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0 16px",
                                gap: 8,
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f38ba8" }} />
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f9e2af" }} />
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#a6e3a1" }} />
                            <div
                                style={{
                                    marginLeft: 16,
                                    flex: 1,
                                    maxWidth: 400,
                                    height: 28,
                                    background: "rgba(255,255,255,0.06)",
                                    borderRadius: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 12px",
                                    gap: 8,
                                }}
                            >
                                <Icons.Lock size={12} color="#a6e3a1" />
                                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>app.gameofsales.com.br</span>
                            </div>
                        </div>

                        {/* Screenshot */}
                        <div style={{ height: "calc(100% - 44px)", overflow: "hidden" }}>
                            <Img
                                src={screenshot}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    objectPosition: "top center",
                                    transform: `translateX(${panX}px)`,
                                }}
                            />
                        </div>
                    </div>
                </AbsoluteFill>
            ) : (
                // SPLIT LAYOUT (LEFT/RIGHT)
                <div
                    style={{
                        display: "flex",
                        flexDirection: isLeft ? "row" : "row-reverse",
                        height: "100%",
                        padding: 60,
                        gap: 60,
                    }}
                >
                    {/* Text content side */}
                    <div
                        style={{
                            flex: "0 0 400px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            transform: `translateX(${textSlideX}px)`,
                        }}
                    >
                        {/* Subtitle */}
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#fbbf24",
                                textTransform: "uppercase",
                                letterSpacing: 4,
                                marginBottom: 16,
                                opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
                            }}
                        >
                            {subtitle}
                        </div>

                        {/* Title */}
                        <div
                            style={{
                                fontSize: 48,
                                fontWeight: 700,
                                fontFamily: FONTS.serif,
                                color: "white",
                                lineHeight: 1.1,
                                marginBottom: 32,
                                letterSpacing: -1,
                                opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }),
                                transform: `translateY(${interpolate(frame, [15, 30], [30, 0], { extrapolateRight: "clamp" })}px)`,
                            }}
                        >
                            {title}
                        </div>

                        {/* Features list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {features.map((feature, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 16,
                                        padding: "16px 20px",
                                        background: "linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.06) 100%)",
                                        border: "1px solid rgba(251, 191, 36, 0.2)",
                                        borderRadius: 14,
                                        opacity: getFeatureOpacity(i),
                                        transform: `translateX(${interpolate(
                                            frame,
                                            [30 + i * 12, 50 + i * 12],
                                            [isLeft ? -30 : 30, 0],
                                            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                                        )}px)`,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                            borderRadius: 10,
                                            boxShadow: "0 4px 15px -3px rgba(245, 158, 11, 0.4)",
                                        }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <span style={{ color: "white", fontSize: 18, fontWeight: 500, fontFamily: FONTS.sans }}>
                                        {feature.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Screenshot side */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transform: `translateX(${screenshotSlideX}px)`,
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                height: "90%",
                                borderRadius: 20,
                                overflow: "hidden",
                                boxShadow: `
                                    0 50px 100px -30px rgba(0, 0, 0, 0.7),
                                    0 0 0 1px rgba(255,255,255,0.08),
                                    0 0 80px -20px rgba(251, 191, 36, 0.2)
                                `,
                                transform: `perspective(1000px) rotateY(${isLeft ? -3 : 3}deg) scale(${slideProgress})`,
                            }}
                        >
                            {/* Browser chrome */}
                            <div
                                style={{
                                    height: 40,
                                    background: "linear-gradient(180deg, #1e1e2e 0%, #181825 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 14px",
                                    gap: 8,
                                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                                }}
                            >
                                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#f38ba8" }} />
                                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#f9e2af" }} />
                                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#a6e3a1" }} />
                                <div
                                    style={{
                                        marginLeft: 12,
                                        flex: 1,
                                        maxWidth: 300,
                                        height: 24,
                                        background: "rgba(255,255,255,0.05)",
                                        borderRadius: 6,
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "0 10px",
                                        gap: 6,
                                    }}
                                >
                                    <Icons.Lock size={10} color="#a6e3a1" />
                                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>app.gameofsales.com.br</span>
                                </div>
                            </div>

                            {/* Screenshot - NO CROP */}
                            <div style={{ height: "calc(100% - 40px)", overflow: "hidden", background: "#0f172a" }}>
                                <Img
                                    src={screenshot}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                        objectPosition: "top center",
                                        transform: `translateX(${panX}px)`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AbsoluteFill>
    );
};

// ============================================
// PROFESSIONAL INTRO SCENE
// ============================================
const SalesIntro: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const logoScale = spring({
        frame: frame - 10,
        fps,
        config: { damping: 80, stiffness: 120, mass: 1 },
    });

    const logoOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
    const titleOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
    const titleY = interpolate(frame, [35, 55], [50, 0], { extrapolateRight: "clamp" });
    const subtitleOpacity = interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" });
    const badgeOpacity = interpolate(frame, [75, 95], [0, 1], { extrapolateRight: "clamp" });

    // Floating particles
    const particles = Array.from({ length: 50 }).map((_, i) => ({
        x: Math.sin(i * 0.4 + frame / 100) * 600 + Math.cos(frame / 60 + i * 0.7) * 100,
        y: Math.cos(i * 0.3 + frame / 80) * 400 + Math.sin(frame / 70 + i * 0.5) * 80,
        size: 2 + Math.sin(i * 1.3) * 1.5,
        opacity: 0.1 + Math.sin(frame / 50 + i) * 0.08,
    }));

    return (
        <AbsoluteFill
            style={{
                background: "radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f172a 50%, #030712 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Particles */}
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
                    }}
                />
            ))}

            {/* Central glowing orb */}
            <div
                style={{
                    position: "absolute",
                    width: 800,
                    height: 800,
                    background: `radial-gradient(circle, rgba(251, 191, 36, ${0.15 + Math.sin(frame / 30) * 0.03}) 0%, transparent 50%)`,
                    borderRadius: "50%",
                    filter: "blur(100px)",
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
                        filter: "drop-shadow(0 30px 60px rgba(251, 191, 36, 0.4))",
                    }}
                />
            </div>

            {/* Main title */}
            <div
                style={{
                    opacity: titleOpacity,
                    transform: `translateY(${titleY}px)`,
                    fontSize: 80,
                    fontWeight: 700,
                    fontFamily: FONTS.serif,
                    background: "linear-gradient(135deg, #ffffff 0%, #fde68a 50%, #fbbf24 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textAlign: "center",
                    letterSpacing: -2,
                }}
            >
                Revolucione suas Vendas
            </div>

            {/* Subtitle */}
            <div
                style={{
                    opacity: subtitleOpacity,
                    fontSize: 28,
                    fontWeight: 400,
                    fontFamily: FONTS.sans,
                    color: "rgba(255,255,255,0.7)",
                    textAlign: "center",
                    marginTop: 20,
                    maxWidth: 700,
                    lineHeight: 1.6,
                }}
            >
                O CRM gamificado que transforma seu time em uma{" "}
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>máquina de vendas</span>
            </div>

            {/* Animated badges */}
            <div
                style={{
                    marginTop: 50,
                    display: "flex",
                    gap: 20,
                    opacity: badgeOpacity,
                }}
            >
                {[
                    { icon: <Icons.Trophy size={20} color="white" />, text: "Gamificação", color: "#f59e0b" },
                    { icon: <Icons.BarChart size={20} color="white" />, text: "Tempo Real", color: "#3b82f6" },
                    { icon: <Icons.Rocket size={20} color="white" />, text: "Performance", color: "#8b5cf6" },
                ].map((badge, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "14px 28px",
                            background: `linear-gradient(135deg, ${badge.color}20 0%, ${badge.color}10 100%)`,
                            border: `1px solid ${badge.color}40`,
                            borderRadius: 50,
                            transform: `translateY(${interpolate(frame - 75 - i * 6, [0, 15], [30, 0], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                            })}px)`,
                            opacity: interpolate(frame - 75 - i * 6, [0, 15], [0, 1], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                            }),
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: `linear-gradient(135deg, ${badge.color} 0%, ${badge.color}cc 100%)`,
                                borderRadius: "50%",
                                boxShadow: `0 4px 20px -5px ${badge.color}`,
                            }}
                        >
                            {badge.icon}
                        </div>
                        <span style={{ color: "white", fontSize: 18, fontWeight: 600, fontFamily: FONTS.sans }}>{badge.text}</span>
                    </div>
                ))}
            </div>
        </AbsoluteFill>
    );
};

// ============================================
// PROFESSIONAL OUTRO / CTA SCENE
// ============================================
const SalesOutro: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const contentScale = spring({
        frame,
        fps,
        config: { damping: 100, stiffness: 100, mass: 1 },
    });

    const contentOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
    const buttonPulse = 1 + Math.sin(frame / 12) * 0.02;

    // Particles
    const particles = Array.from({ length: 60 }).map((_, i) => ({
        x: Math.sin(i * 0.35 + frame / 90) * 700 + Math.cos(frame / 50 + i) * 120,
        y: Math.cos(i * 0.25 + frame / 70) * 500 + Math.sin(frame / 60 + i) * 90,
        size: 2 + Math.sin(i) * 1.5,
        opacity: 0.08 + Math.sin(frame / 40 + i) * 0.05,
    }));

    return (
        <AbsoluteFill
            style={{
                background: "radial-gradient(ellipse at 50% 50%, #312e81 0%, #1e1b4b 40%, #0f172a 70%, #030712 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Particles */}
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
                        background: `rgba(251, 191, 36, ${p.opacity})`,
                    }}
                />
            ))}

            {/* Glowing orbs */}
            <div
                style={{
                    position: "absolute",
                    width: 1000,
                    height: 1000,
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 50%)",
                    borderRadius: "50%",
                    filter: "blur(120px)",
                }}
            />

            <div
                style={{
                    opacity: contentOpacity,
                    transform: `scale(${contentScale})`,
                    textAlign: "center",
                }}
            >
                {/* Logo */}
                <Img
                    src={LOGO}
                    style={{
                        width: 180,
                        height: "auto",
                        marginBottom: 40,
                        filter: "drop-shadow(0 25px 50px rgba(251, 191, 36, 0.4))",
                    }}
                />

                {/* Main CTA */}
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 700,
                        fontFamily: FONTS.serif,
                        background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: 20,
                        letterSpacing: -1,
                    }}
                >
                    Comece Agora!
                </div>

                <div
                    style={{
                        fontSize: 26,
                        fontFamily: FONTS.sans,
                        color: "rgba(255,255,255,0.7)",
                        marginBottom: 50,
                        maxWidth: 600,
                    }}
                >
                    Transforme seu time de vendas em{" "}
                    <span style={{ color: "#fbbf24", fontWeight: 600 }}>campeões</span>
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 16,
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        padding: "22px 60px",
                        borderRadius: 60,
                        fontSize: 26,
                        fontWeight: 700,
                        fontFamily: FONTS.sans,
                        color: "white",
                        transform: `scale(${buttonPulse})`,
                        boxShadow: "0 25px 80px -15px rgba(34, 197, 94, 0.6)",
                    }}
                >
                    <Icons.Rocket size={26} color="white" />
                    Teste Grátis por 7 Dias
                    <Icons.ArrowRight size={22} color="white" />
                </div>

                <div
                    style={{
                        marginTop: 40,
                        fontSize: 22,
                        fontFamily: FONTS.sans,
                        color: "rgba(255,255,255,0.5)",
                        letterSpacing: 1,
                    }}
                >
                    gameofsales.com.br
                </div>
            </div>
        </AbsoluteFill>
    );
};

// ============================================
// MAIN SALES VIDEO COMPOSITION
// ============================================
export const SalesVideoComposition: React.FC = () => {
    return (
        <AbsoluteFill>
            {/* Load Google Fonts */}
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

            {/* Background Music */}
            <Audio src={BACKGROUND_MUSIC} volume={0.25} />

            {/* Intro - 4 seconds */}
            <Sequence from={0} durationInFrames={120}>
                <SalesIntro />
            </Sequence>

            {/* Dashboard - 5 seconds (fullscreen) */}
            <Sequence from={120} durationInFrames={150}>
                <ProfessionalScreenshotScene
                    screenshot={SCREENSHOTS.dashboard1}
                    title="Visão 360° do Seu Negócio"
                    subtitle="Dashboard Inteligente"
                    features={[
                        { icon: <Icons.BarChart size={16} color="white" />, text: "Métricas em Tempo Real" },
                        { icon: <Icons.TrendingUp size={16} color="white" />, text: "Análise de Performance" },
                        { icon: <Icons.Target size={16} color="white" />, text: "Metas Visuais" },
                    ]}
                    layout="fullscreen"
                />
            </Sequence>

            {/* Ranking - 4.5 seconds (left layout) */}
            <Sequence from={270} durationInFrames={135}>
                <ProfessionalScreenshotScene
                    screenshot={SCREENSHOTS.ranking1}
                    title="Gamificação que Engaja"
                    subtitle="Competição Saudável"
                    features={[
                        { icon: <Icons.Trophy size={18} color="white" />, text: "Pódio dos Top Performers" },
                        { icon: <Icons.Flame size={18} color="white" />, text: "Competição em Tempo Real" },
                        { icon: <Icons.Star size={18} color="white" />, text: "Níveis e Conquistas" },
                    ]}
                    layout="left"
                />
            </Sequence>

            {/* CRM/Pipeline - 4.5 seconds (right layout) */}
            <Sequence from={405} durationInFrames={135}>
                <ProfessionalScreenshotScene
                    screenshot={SCREENSHOTS.crm}
                    title="Pipeline que Converte"
                    subtitle="CRM Visual & Intuitivo"
                    features={[
                        { icon: <Icons.Kanban size={18} color="white" />, text: "Kanban de Oportunidades" },
                        { icon: <Icons.Users size={18} color="white" />, text: "Gestão de Leads" },
                        { icon: <Icons.DollarSign size={18} color="white" />, text: "Funil de Receita" },
                    ]}
                    layout="right"
                />
            </Sequence>

            {/* Metas - 4 seconds (fullscreen) */}
            <Sequence from={540} durationInFrames={120}>
                <ProfessionalScreenshotScene
                    screenshot={SCREENSHOTS.metas}
                    title="Metas que Motivam"
                    subtitle="Acompanhamento de Performance"
                    features={[
                        { icon: <Icons.Target size={16} color="white" />, text: "Metas Individuais" },
                        { icon: <Icons.BarChart size={16} color="white" />, text: "Progresso Consolidado" },
                        { icon: <Icons.TrendingUp size={16} color="white" />, text: "Evolução em Tempo Real" },
                    ]}
                    layout="fullscreen"
                />
            </Sequence>

            {/* Integrations - 4 seconds (left layout) */}
            <Sequence from={660} durationInFrames={120}>
                <ProfessionalScreenshotScene
                    screenshot={SCREENSHOTS.integrations}
                    title="Conecte Suas Ferramentas"
                    subtitle="Integrações Poderosas"
                    features={[
                        { icon: <Icons.Link size={18} color="white" />, text: "Hotmart & Kiwify" },
                        { icon: <Icons.Calendar size={18} color="white" />, text: "Google Calendar" },
                        { icon: <Icons.Zap size={18} color="white" />, text: "Automações" },
                    ]}
                    layout="left"
                />
            </Sequence>

            {/* Calendar - 3.5 seconds (right layout) */}
            <Sequence from={780} durationInFrames={105}>
                <ProfessionalScreenshotScene
                    screenshot={SCREENSHOTS.calendar1}
                    title="Agenda Sincronizada"
                    subtitle="Organização Total"
                    features={[
                        { icon: <Icons.Calendar size={18} color="white" />, text: "Visualização Inteligente" },
                        { icon: <Icons.RefreshCw size={18} color="white" />, text: "Sincronização Automática" },
                        { icon: <Icons.Smartphone size={18} color="white" />, text: "Multi-dispositivo" },
                    ]}
                    layout="right"
                />
            </Sequence>

            {/* Outro/CTA - 4 seconds */}
            <Sequence from={885} durationInFrames={120}>
                <SalesOutro />
            </Sequence>
        </AbsoluteFill>
    );
};
