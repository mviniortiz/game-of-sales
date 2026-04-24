import { Composition } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { PipelineScene } from "./scenes/PipelineScene";
import { IntegrationsScene } from "./scenes/IntegrationsScene";
import { CalendarScene } from "./scenes/CalendarScene";
import { OutroScene } from "./scenes/OutroScene";
import { SalesVideoComposition } from "./scenes/SalesVideoScene";
import { SalesVideoReelsComposition } from "./scenes/SalesVideoReels";
import { SalesVideoSquareComposition } from "./scenes/SalesVideoSquare";
import { SalesVideoVertical45Composition } from "./scenes/SalesVideoVertical45";
import { HookScene as V2HookScene } from "./scenes/salesV2/HookScene";
import { TransitionScene as V2TransitionScene } from "./scenes/salesV2/TransitionScene";
import { PulseScene as V2PulseScene } from "./scenes/salesV2/PulseScene";
import { PipelineRankingScene as V2PipelineRankingScene } from "./scenes/salesV2/PipelineRankingScene";
import { EvaScene as V2EvaScene } from "./scenes/salesV2/EvaScene";
import { DashboardScene as V2DashboardScene } from "./scenes/salesV2/DashboardScene";
import { CTAScene as V2CTAScene } from "./scenes/salesV2/CTAScene";
import { SalesVideoV2Composition } from "./scenes/SalesVideoV2";
import { SalesVideoV2BumperComposition } from "./scenes/SalesVideoV2Bumper";
import { SalesVideoV2AvatarHostComposition } from "./scenes/SalesVideoV2AvatarHost";
import { fontStyles as v2FontStyles } from "./scenes/salesV2/lib";
import { Slide01Hook } from "./scenes/igCarousel/Slide01Hook";
import { Slide02Reveal } from "./scenes/igCarousel/Slide02Reveal";
import { Slide03Cost } from "./scenes/igCarousel/Slide03Cost";
import { Slide04Diagnosis } from "./scenes/igCarousel/Slide04Diagnosis";
import { Slide05Reveal } from "./scenes/igCarousel/Slide05Reveal";
import { Slide06Pulse } from "./scenes/igCarousel/Slide06Pulse";
import { Slide07PipelineEva } from "./scenes/igCarousel/Slide07PipelineEva";
import { Slide08CTA } from "./scenes/igCarousel/Slide08CTA";
import { SlideFounderHero } from "./scenes/igCarousel/SlideFounderHero";
import {
    FounderHeroGreen,
    FounderHeroBlue,
    FounderHeroDuotone,
    FounderHeroBlock,
    FounderHeroViolet,
} from "./scenes/igCarousel/FounderHeroVariants";

const ASPECTS = [
    { key: "4x5", label: "4x5", w: 1080, h: 1350 },
    { key: "1x1", label: "1x1", w: 1200, h: 1200 },
    { key: "1_91x1", label: "191x1", w: 1200, h: 628 },
] as const;

const HERO_VARIANTS = [
    { key: "Green", C: FounderHeroGreen },
    { key: "Blue", C: FounderHeroBlue },
    { key: "Block", C: FounderHeroBlock },
    { key: "Violet", C: FounderHeroViolet },
    { key: "Duotone", C: FounderHeroDuotone },
] as const;

const withV2Fonts = (Component: React.FC) => () =>
    (
        <>
            <style dangerouslySetInnerHTML={{ __html: v2FontStyles }} />
            <Component />
        </>
    );

// Full video composition
import { AbsoluteFill, Series } from "remotion";

const VyzonDemo = () => {
    return (
        <AbsoluteFill>
            <Series>
                <Series.Sequence durationInFrames={120}>
                    <IntroScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={100}>
                    <DashboardScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={100}>
                    <PipelineScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={90}>
                    <IntegrationsScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={90}>
                    <CalendarScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={120}>
                    <OutroScene />
                </Series.Sequence>
            </Series>
        </AbsoluteFill>
    );
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* Full Demo Video - ~20 seconds */}
            <Composition
                id="VyzonDemo"
                component={VyzonDemo}
                durationInFrames={620}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* Individual Scenes for preview/testing */}
            <Composition
                id="Intro"
                component={IntroScene}
                durationInFrames={120}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Dashboard"
                component={DashboardScene}
                durationInFrames={100}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Pipeline"
                component={PipelineScene}
                durationInFrames={100}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Integrations"
                component={IntegrationsScene}
                durationInFrames={90}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Calendar"
                component={CalendarScene}
                durationInFrames={90}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Outro"
                component={OutroScene}
                durationInFrames={120}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* Sales Video - Cinematic marketing video, 45 seconds */}
            <Composition
                id="SalesVideo"
                component={SalesVideoComposition}
                durationInFrames={1350}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* Sales Video - Instagram Reels / Stories (9:16), 45 seconds */}
            <Composition
                id="SalesVideoReels"
                component={SalesVideoReelsComposition}
                durationInFrames={1350}
                fps={30}
                width={1080}
                height={1920}
            />

            {/* Sales Video - Google Ads Square (1:1), 25 seconds */}
            <Composition
                id="SalesVideoSquare"
                component={SalesVideoSquareComposition}
                durationInFrames={750}
                fps={30}
                width={1080}
                height={1080}
            />

            {/* Sales Video - Google Ads Vertical (4:5), 25 seconds */}
            <Composition
                id="SalesVideoVertical45"
                component={SalesVideoVertical45Composition}
                durationInFrames={750}
                fps={30}
                width={1080}
                height={1350}
            />

            {/* === SALES VIDEO V2 — DARK / BRAND 2026 === */}
            {/*
              Props defaults: voice='brian', subtitles=true
              Override via CLI: --props='{"voice":"rachel"}' ou '{"subtitles":false}'
            */}

            {/* 16:9 landscape — landing + YouTube */}
            <Composition
                id="SalesVideoV2"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{ voice: "brian" as const, subtitles: true }}
            />

            {/* 9:16 — Instagram Reels / Stories / TikTok / YouTube Shorts */}
            <Composition
                id="SalesVideoV2Reels"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ voice: "brian" as const, subtitles: true }}
            />

            {/* 1:1 — Facebook / Instagram feed */}
            <Composition
                id="SalesVideoV2Square"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={{ voice: "brian" as const, subtitles: true }}
            />

            {/* 4:5 — Meta mobile-first / Google Ads discovery */}
            <Composition
                id="SalesVideoV2Vertical45"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1350}
                defaultProps={{ voice: "brian" as const, subtitles: true }}
            />

            {/* Variantes de voz para A/B em Reels (9:16) */}
            <Composition
                id="SalesVideoV2Reels-Adam"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ voice: "adam" as const, subtitles: true }}
            />
            <Composition
                id="SalesVideoV2Reels-Bella"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ voice: "bella" as const, subtitles: true }}
            />
            <Composition
                id="SalesVideoV2Reels-Matilda"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ voice: "matilda" as const, subtitles: true }}
            />

            {/* Variantes em Square (FB/IG feed) */}
            <Composition
                id="SalesVideoV2Square-Adam"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={{ voice: "adam" as const, subtitles: true }}
            />
            <Composition
                id="SalesVideoV2Square-Bella"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={{ voice: "bella" as const, subtitles: true }}
            />
            <Composition
                id="SalesVideoV2Square-Matilda"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={{ voice: "matilda" as const, subtitles: true }}
            />

            {/* Variantes em Vertical 4:5 (Meta mobile) */}
            <Composition
                id="SalesVideoV2Vertical45-Adam"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1350}
                defaultProps={{ voice: "adam" as const, subtitles: true }}
            />
            <Composition
                id="SalesVideoV2Vertical45-Bella"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1350}
                defaultProps={{ voice: "bella" as const, subtitles: true }}
            />
            <Composition
                id="SalesVideoV2Vertical45-Matilda"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1350}
                defaultProps={{ voice: "matilda" as const, subtitles: true }}
            />

            {/* === YouTube Bumper 6s (16:9 + 9:16 + 1:1) === */}
            <Composition
                id="SalesVideoV2Bumper"
                component={SalesVideoV2BumperComposition}
                durationInFrames={180}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="SalesVideoV2Bumper-Reels"
                component={SalesVideoV2BumperComposition}
                durationInFrames={180}
                fps={30}
                width={1080}
                height={1920}
            />
            <Composition
                id="SalesVideoV2Bumper-Square"
                component={SalesVideoV2BumperComposition}
                durationInFrames={180}
                fps={30}
                width={1080}
                height={1080}
            />

            {/* === AVATAR VARIANT (HeyGen Abigail) — PiP no canto === */}
            <Composition
                id="SalesVideoV2Reels-Matilda-Avatar"
                component={SalesVideoV2Composition}
                durationInFrames={1200}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    voice: "matilda" as const,
                    subtitles: true,
                    avatar: "matilda" as const,
                }}
            />

            {/* === AVATAR HOST — Abigail protagonista (21s / 9:16) === */}
            <Composition
                id="SalesVideoV2-AvatarHost"
                component={SalesVideoV2AvatarHostComposition}
                durationInFrames={630}
                fps={30}
                width={1080}
                height={1920}
            />

            {/* Individual scenes for preview */}
            <Composition
                id="V2-Hook"
                component={withV2Fonts(V2HookScene)}
                durationInFrames={120}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="V2-Transition"
                component={withV2Fonts(V2TransitionScene)}
                durationInFrames={60}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="V2-Pulse"
                component={withV2Fonts(V2PulseScene)}
                durationInFrames={180}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="V2-PipelineRanking"
                component={withV2Fonts(V2PipelineRankingScene)}
                durationInFrames={210}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="V2-Eva"
                component={withV2Fonts(V2EvaScene)}
                durationInFrames={180}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="V2-Dashboard"
                component={withV2Fonts(V2DashboardScene)}
                durationInFrames={240}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="V2-CTA"
                component={withV2Fonts(V2CTAScene)}
                durationInFrames={210}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* =====================================================
                INSTAGRAM CAROUSEL — 8 slides 1080×1350 (still PNG)
                Render: npx remotion still IG-Slide-01 out/ig/01.png
                ===================================================== */}
            <Composition
                id="IG-Slide-01-Hook"
                component={withV2Fonts(Slide01Hook)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-02-Reveal"
                component={withV2Fonts(Slide02Reveal)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-03-Cost"
                component={withV2Fonts(Slide03Cost)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-04-Diagnosis"
                component={withV2Fonts(Slide04Diagnosis)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-05-Reveal"
                component={withV2Fonts(Slide05Reveal)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-06-Pulse"
                component={withV2Fonts(Slide06Pulse)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-07-PipelineEva"
                component={withV2Fonts(Slide07PipelineEva)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-Slide-08-CTA"
                component={withV2Fonts(Slide08CTA)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            <Composition
                id="IG-FounderHero"
                component={withV2Fonts(SlideFounderHero)}
                durationInFrames={1}
                fps={30}
                width={1080}
                height={1350}
            />
            {HERO_VARIANTS.flatMap((variant) =>
                ASPECTS.map((a) => (
                    <Composition
                        key={`${variant.key}-${a.key}`}
                        id={`IG-FounderHero-${variant.key}-${a.label}`}
                        component={withV2Fonts(() => <variant.C aspect={a.key} />)}
                        durationInFrames={1}
                        fps={30}
                        width={a.w}
                        height={a.h}
                    />
                )),
            )}
        </>
    );
};
