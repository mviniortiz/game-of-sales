import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
    Eye, CurrencyDollar, Fire, Target, ArrowRight, Clock, CalendarCheck,
    ChatCircleDots, ArrowsClockwise, FileText, Medal, Gift, HandWaving, Users, ClockCounterClockwise,
} from "@phosphor-icons/react";
import { AgentMind, AgentData } from "./AgentMind";
import { HookLight } from "./HookLight";
import { AgitacaoLight } from "./AgitacaoLight";
import { OpeningLight } from "./OpeningLight";
import { CTALight } from "./CTALight";

const AGENTS: { data: AgentData; dur: number }[] = [
    {
        dur: 215,
        data: {
            variant: "blue", deep: "#1E3A8A", name: "Qualificação", tagline: "Lê o lead|e diz quem está pronto",
            lines: [
                { Icon: Eye, label: "Lendo a conversa", value: "23 mensagens" },
                { Icon: CurrencyDollar, label: "Orçamento detectado", value: "R$ 3 mil/mês" },
                { Icon: Fire, label: "Urgência", value: "Alta — “pra ontem”" },
                { Icon: Target, label: "Fit com seu ICP", value: "92%" },
            ],
            Verdict: ArrowRight, verdict: "Lead quente. Avançar.",
        },
    },
    {
        dur: 200,
        data: {
            variant: "aqua", deep: "#0B5563", name: "Follow-up", tagline: "Retoma a conversa|na hora certa",
            lines: [
                { Icon: Clock, label: "Conversa parada", value: "há 2 dias" },
                { Icon: CalendarCheck, label: "Melhor horário", value: "amanhã, 9h" },
                { Icon: ChatCircleDots, label: "Tom sugerido", value: "leve, sem cobrança" },
            ],
            Verdict: ArrowsClockwise, verdict: "Reabrir com a Marina.",
        },
    },
    {
        dur: 200,
        data: {
            variant: "violet", deep: "#4C1D95", name: "Propostas", tagline: "Monta o rascunho|da proposta",
            lines: [
                { Icon: FileText, label: "Escopo", value: "Tráfego pago + landing" },
                { Icon: CurrencyDollar, label: "Ticket", value: "R$ 3 mil/mês" },
                { Icon: Medal, label: "Provas anexadas", value: "2 cases do segmento" },
            ],
            Verdict: ArrowRight, verdict: "Rascunho pronto pra revisar.",
        },
    },
    {
        dur: 200,
        data: {
            variant: "warm", deep: "#9A3412", name: "Reativação", tagline: "Resgata quem|esfriou",
            lines: [
                { Icon: ClockCounterClockwise, label: "Clientes parados", value: "12 contatos" },
                { Icon: Gift, label: "Oferta de retorno", value: "diagnóstico grátis" },
                { Icon: HandWaving, label: "Tom", value: "reaproximação" },
            ],
            Verdict: Users, verdict: "12 reaberturas sugeridas.",
        },
    },
];

const D = { hook: 130, agita: 150, open: 130, cta: 165 };
const T = 16, TURN = 24;
const agentsSum = AGENTS.reduce((a, x) => a + x.dur, 0);
// 7 transições: hook→agita(T), agita→open(TURN), open→ag1(T), ag1→2(T), 2→3(T), 3→4(T), ag4→cta(T)
export const AGENTES_TOTAL = D.hook + D.agita + D.open + agentsSum + D.cta - (6 * T + TURN);

export const AgentesFilm: React.FC = () => {
    const { durationInFrames } = useVideoConfig();
    return (
        <AbsoluteFill style={{ background: "#faf9f5" }}>
            <TransitionSeries>
                {/* DOR */}
                <TransitionSeries.Sequence durationInFrames={D.hook}><HookLight /></TransitionSeries.Sequence>
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.agita}><AgitacaoLight /></TransitionSeries.Sequence>
                {/* A VIRADA — EVA entra */}
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TURN })} />
                <TransitionSeries.Sequence durationInFrames={D.open}><OpeningLight /></TransitionSeries.Sequence>
                {/* CADA AGENTE ATUANDO */}
                {AGENTS.map((a, i) => (
                    <React.Fragment key={i}>
                        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
                        <TransitionSeries.Sequence durationInFrames={a.dur}><AgentMind agent={a.data} dur={a.dur} /></TransitionSeries.Sequence>
                    </React.Fragment>
                ))}
                {/* CTA */}
                <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
                <TransitionSeries.Sequence durationInFrames={D.cta}><CTALight /></TransitionSeries.Sequence>
            </TransitionSeries>

            <AbsoluteFill style={{ background: "radial-gradient(125% 85% at 50% 42%, transparent 60%, rgba(13,20,33,0.06))", pointerEvents: "none" }} />

            <Audio src={staticFile("audio/bed2.mp3")} loop volume={(f) => interpolate(f, [0, 28, durationInFrames - 50, durationInFrames - 6], [0, 0.38, 0.38, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        </AbsoluteFill>
    );
};
