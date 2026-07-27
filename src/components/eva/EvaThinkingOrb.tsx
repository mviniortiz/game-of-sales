import { useEffect, useRef, type CSSProperties } from "react";
import { MODE_DRAWS, ThinkingOrb, resolvePreset, type OrbState } from "thinking-orbs";
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

// O ThinkingOrb do pacote só renderiza nos presets 20/64 CSS px; esticar o
// canvas via style (displaySize) upscala o bitmap e o orb grande sai borrado
// (bug visível no modal da demo, orb 168px). Este canvas redesenha o MESMO
// design (MODE_DRAWS + resolvePreset(64)) em resolução nativa: o contexto é
// escalado por (displaySize/64)×dpr e a geometria é vetorial, então fica
// nítido em qualquer tamanho. Loop espelha o do pacote (reduced-motion = 1
// frame, pausa fora da viewport e com aba oculta).
function BigThinkingOrbCanvas({
  state,
  displaySize,
  dark,
  paused,
}: {
  state: OrbState;
  displaySize: number;
  dark: boolean;
  paused: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(displaySize * dpr);
    canvas.height = Math.round(displaySize * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { mode, speed, opts } = resolvePreset(state, 64);
    const drawMode = MODE_DRAWS[mode];
    const k = (displaySize / 64) * dpr;
    const draw = (t: number) => {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, 64, 64);
      drawMode(ctx, 64, t, dark, opts);
    };

    const reduced =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || paused) {
      draw(0.6);
      return;
    }

    let raf = 0;
    let running = false;
    let visible = true;
    const loop = () => {
      draw((performance.now() / 1000) * speed);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    draw((performance.now() / 1000) * speed);

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            visible && document.visibilityState !== "hidden" ? start() : stop();
          })
        : null;
    io?.observe(canvas);
    const onVis = () => {
      document.visibilityState === "hidden" ? stop() : visible && start();
    };
    document.addEventListener("visibilitychange", onVis);
    io || start();
    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state, displaySize, dark, paused]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ width: displaySize, height: displaySize, display: "block" }}
    />
  );
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
  // Acima de 72px o upscale do preset 64 fica visivelmente borrado → canvas
  // próprio em resolução nativa. Abaixo disso o pacote resolve sozinho.
  const big = box > 72;
  const dark =
    theme === "dark" ||
    (theme === "auto" &&
      typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches)));
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
      {big ? (
        <BigThinkingOrbCanvas state={cycle} displaySize={box} dark={dark} paused={paused} />
      ) : (
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
      )}
    </span>
  );
}
