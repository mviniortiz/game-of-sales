import type { CSSProperties } from "react";
import { ThinkingOrb } from "thinking-orbs";
import type { SpecialistKey } from "@/lib/eva/evaSpecialists";
import { getSpecialist } from "@/lib/eva/evaSpecialists";
import {
  mapEvaOrbUiState,
  type EvaOrbCycleState,
} from "@/hooks/useEvaOrbCycle";

// Chrome pequeno da EVA: ThinkingOrb (canvas 2D) + halo colorido por agente.
// O pacote é monocromático; a identidade do especialista fica no anel (accent).

const DEFAULT_ACCENT = "#1556C0";

export type EvaThinkingOrbProps = {
  /** Estado nativo do thinking-orbs, ou legado do EvaOrb (idle/analyzing…). */
  state?: EvaOrbCycleState | "idle" | "thinking" | "speaking" | "listening" | "analyzing";
  size?: 20 | 64;
  /** Tamanho visual CSS (o canvas interno usa o preset 20|64). */
  displaySize?: number;
  theme?: "light" | "dark" | "auto";
  paused?: boolean;
  agentKey?: SpecialistKey | string | null;
  /** Sobrescreve a cor do halo (senão usa accent do especialista / azul EVA). */
  accent?: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

function resolveAccent(agentKey?: string | null, accent?: string): string {
  if (accent) return accent;
  if (agentKey) return getSpecialist(agentKey).accent;
  return DEFAULT_ACCENT;
}

function resolveCycleState(
  state: EvaThinkingOrbProps["state"],
): EvaOrbCycleState {
  if (!state) return "listening";
  if (
    state === "idle" ||
    state === "thinking" ||
    state === "speaking" ||
    state === "listening" ||
    state === "analyzing"
  ) {
    // "listening" existe nos dois mundos; mapEva trata idle/thinking/etc.
    if (state === "listening") return "listening";
    return mapEvaOrbUiState(state);
  }
  return state;
}

export function EvaThinkingOrb({
  state = "listening",
  size = 20,
  displaySize,
  theme = "auto",
  paused = false,
  agentKey,
  accent,
  className = "",
  style,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: EvaThinkingOrbProps) {
  const cycle = resolveCycleState(state);
  const ring = resolveAccent(agentKey, accent);
  const box = displaySize ?? (size === 64 ? 36 : 20);
  // Halo fino: em orbs grandes o pad percentual estourava o anel.
  const haloPad = box >= 90
    ? Math.max(3, Math.round(box * 0.015))
    : Math.max(2, Math.round(box * 0.08));

  return (
    <span
      className={`eva-thinking-orb inline-flex shrink-0 items-center justify-center rounded-full ${className}`.trim()}
      style={{
        width: box + haloPad * 2,
        height: box + haloPad * 2,
        boxShadow: `0 0 0 1.5px ${ring}55, 0 0 0 ${haloPad}px ${ring}14`,
        ...style,
      }}
      aria-hidden={ariaHidden}
    >
      <ThinkingOrb
        state={cycle}
        size={size}
        theme={theme}
        paused={paused}
        className="shrink-0"
        style={{ width: box, height: box }}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden === true || ariaHidden === "true" ? true : undefined}
      />
    </span>
  );
}
