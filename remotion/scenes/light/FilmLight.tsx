import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmGrade } from "./lib-light";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { HookCine } from "./HookCine";
import { AgitacaoLight } from "./AgitacaoLight";
import { OpeningLight } from "./OpeningLight";
import { EvaLightHero } from "./EvaLightHero";
import { AnalisarLight } from "./AnalisarLight";
import { EvaStudioLight } from "./EvaStudioLight";
import { AgenteCriacaoLight } from "./AgenteCriacaoLight";
import { PipelineLight } from "./PipelineLight";
import { CTALight } from "./CTALight";

// estrutura de história: cold open (dor) → agitação → virada (EVA) → herói → CTA(marca)
const D = { hook: 420, agita: 175, open: 142, eva: 205, analisar: 185, studio: 168, criaAg: 262, pipe: 218, cta: 185 };
const T = 18;
export const FILM_TOTAL = D.hook + D.agita + D.open + D.eva + D.analisar + D.studio + D.criaAg + D.pipe + D.cta - (7 * T + 24);

export const FilmLight: React.FC = () => {
    const { durationInFrames } = useVideoConfig();
    const f = useCurrentFrame();
    return (
        <AbsoluteFill style={{ background: "#faf9f5" }}>
            <TransitionSeries>
                {/* ATO 1 — dor (cold open, sem logo) */}
                <TransitionSeries.Sequence durationInFrames={D.hook}><HookCine /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.agita}><AgitacaoLight /></TransitionSeries.Sequence>
                {/* A VIRADA */}
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 24 })} />
                <TransitionSeries.Sequence durationInFrames={D.open}><OpeningLight /></TransitionSeries.Sequence>
                {/* ATO 2 — produto como herói */}
                <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.eva}><EvaLightHero /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.analisar}><AnalisarLight /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.studio}><EvaStudioLight /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.criaAg}><AgenteCriacaoLight /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: T })} />
                {/* ATO 3 — prova + CTA(marca) */}
                <TransitionSeries.Sequence durationInFrames={D.pipe}><PipelineLight /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.cta}><CTALight /></TransitionSeries.Sequence>
            </TransitionSeries>

            {/* film grade global — luz, vinheta e grão por cima de todas as cenas */}
            <FilmGrade frame={f} grain={0.1} vignette={1.2} />

            <Audio
                src={staticFile("audio/bed2.mp3")}
                loop
                volume={(f) => interpolate(f, [0, 28, durationInFrames - 50, durationInFrames - 6], [0, 0.15, 0.15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />

            {/* narração por cena (ElevenLabs · Bella) — frames absolutos no filme.
                O Hook traz a sua própria narração (L1-L4) dentro do HookCine. */}
            <Sequence from={432}><Audio src={staticFile("audio/vo/film/A1.mp3")} /></Sequence>
            <Sequence from={593}><Audio src={staticFile("audio/vo/film/A2.mp3")} /></Sequence>
            <Sequence from={717}><Audio src={staticFile("audio/vo/film/A3.mp3")} /></Sequence>
            <Sequence from={904}><Audio src={staticFile("audio/vo/film/A4.mp3")} /></Sequence>
            <Sequence from={1066}><Audio src={staticFile("audio/vo/film/A5.mp3")} /></Sequence>
            <Sequence from={1231}><Audio src={staticFile("audio/vo/film/A6.mp3")} /></Sequence>
            <Sequence from={1465}><Audio src={staticFile("audio/vo/film/A7.mp3")} /></Sequence>
            <Sequence from={1665}><Audio src={staticFile("audio/vo/film/A8.mp3")} /></Sequence>
        </AbsoluteFill>
    );
};
