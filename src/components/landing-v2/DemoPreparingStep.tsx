import { EvaOrb } from "./EvaOrb";

// LP.7 (v2) — passo 2: estado curto de preparação (1-2s). Orb pulsando, sem
// spinner pesado de SaaS.
export const DemoPreparingStep = () => (
    <div className="vz-modal-step flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <EvaOrb state="thinking" size={150} />
        <div>
            <h2 className="lp-display" style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)", lineHeight: 1.1, letterSpacing: "-0.025em", color: "var(--lp-ink)" }}>
                Preparando sua demo com a EVA…
            </h2>
            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(5,5,5,0.62)" }}>
                Carregando conversa, playbook e próximos passos.
            </p>
        </div>
    </div>
);
