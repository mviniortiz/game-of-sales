import { useCallback, useEffect, useRef, useState } from "react";

/** Estados nativos do pacote thinking-orbs. */
export type EvaOrbCycleState =
  | "listening"
  | "working"
  | "searching"
  | "solving"
  | "composing"
  | "shaping";

/**
 * Ciclo de estados do ThinkingOrb pra chat da EVA:
 * open → shaping → listening;
 * ask → searching → working;
 * resposta → composing → listening.
 * lifePulse: shaping curto a cada ~18s quando idle (pill fechado).
 */
export function useEvaOrbCycle(opts?: {
  /** Pill/painel aberto: dispara shaping de abertura. */
  open?: boolean;
  /** Desliga life pulse (ex.: pill escondido ou reduced-motion). */
  lifePulse?: boolean;
  lifePulseMs?: number;
  openShapingMs?: number;
}) {
  const {
    open = false,
    lifePulse = false,
    lifePulseMs = 18000,
    openShapingMs = 1500,
  } = opts ?? {};

  const [state, setState] = useState<EvaOrbCycleState>("listening");
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const queue = useCallback(
    (next: EvaOrbCycleState, delayMs: number) => {
      timers.current.push(window.setTimeout(() => setState(next), delayMs));
    },
    [],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Abertura: morph shaping e assenta em listening.
  useEffect(() => {
    if (!open) return;
    clearTimers();
    setState("shaping");
    queue("listening", openShapingMs);
  }, [open, openShapingMs, clearTimers, queue]);

  // Sinal de vida no pill fechado.
  useEffect(() => {
    if (!lifePulse || open) return;
    const interval = window.setInterval(() => {
      setState("shaping");
      window.setTimeout(() => setState("listening"), 2200);
    }, lifePulseMs);
    return () => window.clearInterval(interval);
  }, [lifePulse, open, lifePulseMs]);

  const onAskStart = useCallback(() => {
    clearTimers();
    setState("searching");
    queue("working", 1600);
  }, [clearTimers, queue]);

  const onAnswerStart = useCallback(
    (answerLength: number) => {
      clearTimers();
      setState("composing");
      queue("listening", Math.min(answerLength * 10, 6000) + 400);
    },
    [clearTimers, queue],
  );

  const onIdle = useCallback(() => {
    clearTimers();
    setState("listening");
  }, [clearTimers]);

  return { state, setState, onAskStart, onAnswerStart, onIdle, clearTimers };
}

/** Mapeia estados legados do EvaOrb → ThinkingOrb. */
export function mapEvaOrbUiState(
  ui?: "idle" | "thinking" | "speaking" | "listening" | "analyzing" | null,
): EvaOrbCycleState {
  switch (ui) {
    case "analyzing":
    case "thinking":
      return "working";
    case "speaking":
      return "composing";
    case "listening":
      return "listening";
    case "idle":
    default:
      return "listening";
  }
}
