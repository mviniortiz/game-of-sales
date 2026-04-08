import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { fontStyles } from "./sales/lib";
import { IntroScene } from "./sales/IntroScene";
import { DashboardScene } from "./sales/DashboardScene";
import { WhatsAppScene } from "./sales/WhatsAppScene";
import { EvaScene } from "./sales/EvaScene";
import { KanbanScene } from "./sales/KanbanScene";
import { RankingScene } from "./sales/RankingScene";
import { IntegrationsScene } from "./sales/IntegrationsScene";
import { OutroScene } from "./sales/OutroScene";

// Background music — royalty-free corporate track already in public/audio
const BG_MUSIC = staticFile("audio/corporate-music.mp3");

// ============================================
// SALES VIDEO COMPOSITION
// ============================================
// 45 seconds @ 30fps = 1350 frames
// Scene 1 — Intro             0  → 120  (4s)
// Scene 2 — Dashboard       120  → 300  (6s)
// Scene 3 — WhatsApp        300  → 510  (7s)
// Scene 4 — EVA AI          510  → 720  (7s)
// Scene 5 — Kanban          720  → 900  (6s)
// Scene 6 — Ranking         900  → 1080 (6s)
// Scene 7 — Integrations   1080  → 1230 (5s)
// Scene 8 — Outro          1230  → 1350 (4s)
// ============================================

// Audio with fade in (first 25 frames) and fade out (last 35 frames)
const BackgroundMusic: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [durationInFrames - 35, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
    const volume = Math.min(fadeIn, fadeOut) * 0.22;
    return <Audio src={BG_MUSIC} volume={volume} />;
};

export const SalesVideoComposition: React.FC = () => {
    return (
        <AbsoluteFill style={{ background: "#030712" }}>
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

            {/* Background music */}
            <BackgroundMusic />

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
        </AbsoluteFill>
    );
};
