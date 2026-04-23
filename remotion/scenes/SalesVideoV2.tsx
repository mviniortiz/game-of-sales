import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { fontStyles, SubtitleTrack } from "./salesV2/lib";
import { HookScene } from "./salesV2/HookScene";
import { TransitionScene } from "./salesV2/TransitionScene";
import { PulseScene } from "./salesV2/PulseScene";
import { PipelineRankingScene } from "./salesV2/PipelineRankingScene";
import { EvaScene } from "./salesV2/EvaScene";
import { DashboardScene } from "./salesV2/DashboardScene";
import { CTAScene } from "./salesV2/CTAScene";
import { VARIANTS, type VariantName } from "./salesV2/variants";
import { VariantOverlayTrack } from "./salesV2/VariantOverlay";
import { AvatarOverlayTrack } from "./salesV2/AvatarOverlay";

// ============================================
// SALES VIDEO V2 — BRAND 2026 DARK
// 40s @ 30fps = 1200 frames
// ============================================

export type VoiceName = VariantName | "none";

export interface SalesVideoV2Props {
    voice: VoiceName;
    subtitles: boolean;
    overlays: boolean;
    avatar?: VariantName | "none";
}

const USE_NEW_MUSIC = true;
const BG_MUSIC = staticFile(
    USE_NEW_MUSIC ? "audio/sales-video-v2-music.mp3" : "audio/corporate-music.mp3"
);

const VOICEOVER_CUES = [
    { id: 1, from: 10 },
    { id: 3, from: 200 },
    { id: 4, from: 380 },
    { id: 5, from: 590 },
    { id: 6, from: 770 },
    { id: 7, from: 1010 },
];

const BackgroundMusic: React.FC<{ hasVoice: boolean }> = ({ hasVoice }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [durationInFrames - 35, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
    const peak = hasVoice ? 0.14 : 0.22;
    const volume = Math.min(fadeIn, fadeOut) * peak;
    return <Audio src={BG_MUSIC} volume={volume} />;
};

const SubtitlesOverlay: React.FC<{ cues: Array<{ from: number; to: number; text: string }> }> = ({ cues }) => {
    const frame = useCurrentFrame();
    return <SubtitleTrack frame={frame} cues={cues} />;
};

export const SalesVideoV2Composition: React.FC<SalesVideoV2Props> = ({
    voice = "brian",
    subtitles = true,
    overlays = true,
    avatar = "none",
}) => {
    const hasAvatar = avatar !== "none";
    // Se avatar ativo, desabilita ElevenLabs voice (avatar MP4 já traz áudio lip-synced)
    const hasVoice = !hasAvatar && voice !== "none";
    const variantKey: VariantName = voice !== "none" ? voice : "brian";
    const variant = VARIANTS[variantKey];

    return (
        <AbsoluteFill style={{ background: "#06080a" }}>
            <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

            <BackgroundMusic hasVoice={hasVoice} />

            {hasVoice &&
                VOICEOVER_CUES.map((cue) => (
                    <Sequence key={cue.id} from={cue.from}>
                        <Audio src={staticFile(`audio/vo/${voice}/scene-${cue.id}.mp3`)} volume={0.95} />
                    </Sequence>
                ))}

            <Sequence from={0} durationInFrames={120}>
                <HookScene />
            </Sequence>

            <Sequence from={120} durationInFrames={60}>
                <TransitionScene />
            </Sequence>

            <Sequence from={180} durationInFrames={180}>
                <PulseScene />
            </Sequence>

            <Sequence from={360} durationInFrames={210}>
                <PipelineRankingScene />
            </Sequence>

            <Sequence from={570} durationInFrames={180}>
                <EvaScene />
            </Sequence>

            <Sequence from={750} durationInFrames={240}>
                <DashboardScene />
            </Sequence>

            <Sequence from={990} durationInFrames={210}>
                <CTAScene />
            </Sequence>

            {overlays && variant.overlays.length > 0 && <VariantOverlayTrack cues={variant.overlays} />}

            {hasAvatar && <AvatarOverlayTrack variant={avatar as VariantName} />}

            {subtitles && <SubtitlesOverlay cues={variant.subtitles} />}
        </AbsoluteFill>
    );
};
