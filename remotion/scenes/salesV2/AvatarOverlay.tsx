import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, FONTS, useIsVertical } from "./lib";
import type { VariantName } from "./variants";

// ============================================
// AVATAR OVERLAY — HeyGen talking head como Picture-in-Picture
// ============================================
// Cada cena com voiceover ganha seu próprio MP4 HeyGen.
// O MP4 já vem com áudio lip-synced, então substitui a voz ElevenLabs.
// Em 9:16 e 4:5 o avatar aparece como card; em 16:9 e 1:1 fica escondido
// (avatar ocupa demais na horizontal).

export interface AvatarCue {
    sceneId: number;     // 1, 3, 4, 5, 6, 7
    from: number;        // frame de início na composition principal
    duration: number;    // frames
}

// Mesmos offsets dos VOICEOVER_CUES — avatar fala junto
export const AVATAR_CUES: AvatarCue[] = [
    { sceneId: 1, from: 10, duration: 110 },   // Hook
    { sceneId: 3, from: 200, duration: 160 },  // Pulse
    { sceneId: 4, from: 380, duration: 190 },  // PipelineRanking
    { sceneId: 5, from: 590, duration: 160 },  // Eva
    { sceneId: 6, from: 770, duration: 220 },  // Dashboard
    { sceneId: 7, from: 1010, duration: 190 }, // CTA
];

// ============================================
// CARD — avatar render com borda brand + sombra + live indicator
// ============================================
const AvatarCard: React.FC<{
    src: string;
    width: number;
    height: number;
    duration: number;
}> = ({ src, width, height, duration }) => {
    // useCurrentFrame() aqui é LOCAL (0 = início da Sequence), não usar offset de composition
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        config: { damping: 120, stiffness: 120, mass: 1 },
    });
    const scale = interpolate(entrance, [0, 1], [0.85, 1]);
    const opacityIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const opacityOut = interpolate(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp" });
    const opacity = Math.min(opacityIn, opacityOut);

    // Breathing glow — pulse sutil
    const glow = 0.6 + 0.4 * Math.sin(frame / 18);

    return (
        <div
            style={{
                width,
                height,
                position: "relative",
                opacity,
                transform: `scale(${scale})`,
                transformOrigin: "bottom left",
            }}
        >
            {/* Glow aura brand */}
            <div
                style={{
                    position: "absolute",
                    inset: -12,
                    background: `radial-gradient(ellipse at center, ${C.brand}${Math.floor(glow * 40)
                        .toString(16)
                        .padStart(2, "0")} 0%, transparent 70%)`,
                    filter: "blur(20px)",
                    pointerEvents: "none",
                }}
            />

            {/* Card container */}
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    borderRadius: 22,
                    overflow: "hidden",
                    border: `2px solid ${C.brand}66`,
                    boxShadow: `
                        0 30px 80px -20px rgba(0,0,0,0.75),
                        0 0 0 1px rgba(255,255,255,0.06),
                        0 0 40px -8px ${C.brand}44,
                        inset 0 1px 0 rgba(255,255,255,0.08)
                    `,
                    background: C.bg,
                }}
            >
                <OffthreadVideo
                    src={src}
                    volume={2.4}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            </div>
        </div>
    );
};

// ============================================
// TRACK — renders todos os avatar cues nas Sequences corretas
// ============================================
export const AvatarOverlayTrack: React.FC<{ variant: VariantName }> = ({ variant }) => {
    const vert = useIsVertical();
    const { width } = useVideoConfig();

    // Tamanho responsivo: 9:16 grande (280×400), 4:5 médio (220×320).
    // Em 16:9/1:1 esconde (horizontal não cabe bem PiP grande sem poluir).
    if (!vert) return null;

    const cardW = Math.min(320, width * 0.3);
    const cardH = cardW * (16 / 9); // portrait ratio

    return (
        <AbsoluteFill>
            <div
                style={{
                    position: "absolute",
                    left: "5%",
                    bottom: "20%", // acima da legenda queimada (que fica 9% bottom)
                    width: cardW,
                    height: cardH,
                }}
            >
                {AVATAR_CUES.map((cue) => (
                    <Sequence key={cue.sceneId} from={cue.from} durationInFrames={cue.duration}>
                        <AvatarCard
                            src={staticFile(`avatar/${variant}/scene-${cue.sceneId}.mp4`)}
                            width={cardW}
                            height={cardH}
                            duration={cue.duration}
                        />
                    </Sequence>
                ))}
            </div>
        </AbsoluteFill>
    );
};
