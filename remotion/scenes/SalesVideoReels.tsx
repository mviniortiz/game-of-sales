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

import { C, FONTS, fontStyles } from "./sales/lib";
import { IntroScene } from "./sales/IntroScene";
import { DashboardScene } from "./sales/DashboardScene";
import { WhatsAppScene } from "./sales/WhatsAppScene";
import { EvaScene } from "./sales/EvaScene";
import { KanbanScene } from "./sales/KanbanScene";
import { RankingScene } from "./sales/RankingScene";
import { IntegrationsScene } from "./sales/IntegrationsScene";
import { OutroScene } from "./sales/OutroScene";

// ============================================
// SALES VIDEO — INSTAGRAM REELS / STORIES
// ============================================
// 1080 x 1920 (9:16) · 45 seconds @ 30fps = 1350 frames
//
// Layout: the existing landscape scenes (1920x1080) are rendered at
// native resolution and transform-scaled to fit the 1080 width,
// centered vertically. The remaining space (top + bottom) hosts
// branded content: a persistent headline/logo on top and an
// animated CTA at the bottom.
// ============================================

const BG_MUSIC = staticFile("audio/corporate-music.mp3");
// Dark-background logo (white text variant). The file named
// "logo 1 - white.svg" is the *for-white-background* variant (dark text),
// so for the dark Reels header we use logo.png which has light text.
const LOGO = staticFile("logo.png");

// Target letterbox: scale 1920 → 1080 (factor 0.5625)
const SCENE_SCALE = 1080 / 1920; // 0.5625
const SCALED_W = 1080;
const SCALED_H = 1080 * SCENE_SCALE; // 607.5
const SCENE_OFFSET_Y = (1920 - SCALED_H) / 2; // 656.25

// Audio with fade in/out (matches landscape version)
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

// The actual scene strip, transform-scaled to 1080 wide and centered
const SceneStrip: React.FC = () => {
    return (
        <div
            style={{
                position: "absolute",
                left: 0,
                top: SCENE_OFFSET_Y,
                width: 1920,
                height: 1080,
                transform: `scale(${SCENE_SCALE})`,
                transformOrigin: "top left",
                overflow: "hidden",
                borderRadius: 0,
            }}
        >
            <Sequence from={0} durationInFrames={120}>
                <IntroScene />
            </Sequence>

            <Sequence from={120} durationInFrames={180}>
                <DashboardScene />
            </Sequence>

            <Sequence from={300} durationInFrames={210}>
                <WhatsAppScene />
            </Sequence>

            <Sequence from={510} durationInFrames={210}>
                <EvaScene />
            </Sequence>

            <Sequence from={720} durationInFrames={180}>
                <KanbanScene />
            </Sequence>

            <Sequence from={900} durationInFrames={180}>
                <RankingScene />
            </Sequence>

            <Sequence from={1080} durationInFrames={150}>
                <IntegrationsScene />
            </Sequence>

            <Sequence from={1230} durationInFrames={120}>
                <OutroScene />
            </Sequence>
        </div>
    );
};

// Top brand header — logo + tagline, persistent across the video
const TopHeader: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const enter = spring({
        frame,
        fps,
        config: { damping: 14, mass: 0.6 },
        durationInFrames: 24,
    });
    const translateY = interpolate(enter, [0, 1], [-40, 0]);

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 1080,
                height: SCENE_OFFSET_Y,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 60px 40px",
                opacity: enter,
                transform: `translateY(${translateY}px)`,
                background:
                    "linear-gradient(180deg, #030712 0%, #0b1220 55%, #030712 100%)",
            }}
        >
            {/* Ambient gold glow */}
            <div
                style={{
                    position: "absolute",
                    top: -120,
                    left: "50%",
                    width: 700,
                    height: 700,
                    transform: "translateX(-50%)",
                    background:
                        "radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(251,191,36,0.08) 35%, transparent 65%)",
                    filter: "blur(10px)",
                    pointerEvents: "none",
                }}
            />

            {/* Logo */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 40,
                    filter: "drop-shadow(0 12px 30px rgba(251,191,36,0.3))",
                    zIndex: 2,
                }}
            >
                <Img src={LOGO} style={{ width: 300, height: "auto", display: "block" }} />
            </div>

            {/* Tagline */}
            <div
                style={{
                    fontFamily: FONTS.heading,
                    fontSize: 58,
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: -1.6,
                    textAlign: "center",
                    background:
                        "linear-gradient(135deg, #ffffff 0%, #fde68a 55%, #fbbf24 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    zIndex: 2,
                }}
            >
                O CRM que vende
                <br />
                com você.
            </div>
        </div>
    );
};

// Bottom CTA — animated call-to-action
const BottomCTA: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    const enter = spring({
        frame,
        fps,
        config: { damping: 14, mass: 0.6 },
        durationInFrames: 24,
    });
    const translateY = interpolate(enter, [0, 1], [40, 0]);

    // Pulse the CTA pill subtly (2s cycle)
    const pulse = 1 + Math.sin((frame / fps) * Math.PI) * 0.015;

    // Fade out on the final frames
    const fadeOut = interpolate(
        frame,
        [durationInFrames - 30, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    return (
        <div
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 1080,
                height: SCENE_OFFSET_Y,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 60px 90px",
                opacity: enter * fadeOut,
                transform: `translateY(${translateY}px)`,
                background:
                    "linear-gradient(0deg, #030712 0%, #0b1220 55%, #030712 100%)",
            }}
        >
            {/* Ambient glow */}
            <div
                style={{
                    position: "absolute",
                    bottom: -140,
                    left: "50%",
                    width: 780,
                    height: 780,
                    transform: "translateX(-50%)",
                    background:
                        "radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(251,191,36,0.12) 40%, transparent 70%)",
                    filter: "blur(12px)",
                    pointerEvents: "none",
                }}
            />

            {/* Supporting line */}
            <div
                style={{
                    fontFamily: FONTS.sans,
                    fontSize: 34,
                    fontWeight: 500,
                    color: "rgba(226,232,240,0.82)",
                    textAlign: "center",
                    marginBottom: 32,
                    letterSpacing: -0.4,
                    zIndex: 2,
                }}
            >
                Dashboard, WhatsApp, IA e Kanban
                <br />
                em um só lugar.
            </div>

            {/* CTA pill */}
            <div
                style={{
                    transform: `scale(${pulse})`,
                    padding: "32px 64px",
                    borderRadius: 999,
                    background:
                        "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                    boxShadow:
                        "0 25px 60px -15px rgba(251,191,36,0.55), 0 0 80px -10px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
                    fontFamily: FONTS.heading,
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: -0.8,
                    zIndex: 2,
                }}
            >
                Experimente grátis
            </div>

            {/* Domain */}
            <div
                style={{
                    fontFamily: FONTS.mono,
                    fontSize: 30,
                    fontWeight: 500,
                    color: C.gold400,
                    marginTop: 28,
                    letterSpacing: 0.5,
                    zIndex: 2,
                }}
            >
                vyzon.com.br
            </div>
        </div>
    );
};

export const SalesVideoReelsComposition: React.FC = () => {
    return (
        <AbsoluteFill style={{ background: "#030712" }}>
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

            <BackgroundMusic />

            {/* Landscape scene strip, scaled to fit width and centered */}
            <SceneStrip />

            {/* Persistent brand header above the scene strip */}
            <TopHeader />

            {/* Persistent CTA below the scene strip */}
            <BottomCTA />
        </AbsoluteFill>
    );
};
