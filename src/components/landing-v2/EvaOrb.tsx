import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";
import type { SpecialistKey } from "@/lib/eva/evaSpecialists";

// Compat: antigos call sites do mesh agora usam ThinkingOrb + halo por agente.
// webgl/showVoice são no-ops (mantidos pra não quebrar imports).

export type EvaOrbState = "idle" | "thinking" | "speaking" | "listening" | "analyzing";
export type EvaOrbVariant = "blue" | "aqua" | "violet" | "warm";

const VARIANT_AGENT: Record<EvaOrbVariant, SpecialistKey> = {
    blue: "qualificacao",
    aqua: "followup",
    violet: "propostas",
    warm: "reativacao",
};

interface EvaOrbProps {
    state?: EvaOrbState;
    variant?: EvaOrbVariant;
    size?: number;
    showVoice?: boolean;
    className?: string;
    /** @deprecated Mesh/WebGL removido; ignorado. */
    webgl?: boolean;
    theme?: "light" | "dark" | "auto";
}

export const EvaOrb = ({
    state = "idle",
    variant,
    size = 200,
    className = "",
    theme = "light",
}: EvaOrbProps) => {
    const preset = size >= 48 ? 64 : 20;
    return (
        <EvaThinkingOrb
            state={state}
            size={preset}
            displaySize={size}
            theme={theme}
            agentKey={variant ? VARIANT_AGENT[variant] : undefined}
            className={className}
            aria-hidden
        />
    );
};
