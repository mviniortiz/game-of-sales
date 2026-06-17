import { ButtonV2 } from "./ButtonV2";
import { EvaOrb } from "./EvaOrb";
import { DEMO_SUMMARY } from "./evaDemoData";

// LP.7 (v2) — passo 4: resumo. Fecha a história e leva pra ação (agendar) ou
// reiniciar a experiência.
interface DemoSummaryStepProps {
    onSchedule: () => void;
    onRestart: () => void;
}

export const DemoSummaryStep = ({ onSchedule, onRestart }: DemoSummaryStepProps) => (
    <div className="vz-modal-step flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <EvaOrb state="idle" size={120} />
        <div>
            <h2 className="lp-display" style={{ fontSize: "clamp(1.8rem,3.4vw,2.4rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "var(--lp-ink)" }}>
                {DEMO_SUMMARY.title}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px]" style={{ color: "rgba(5,5,5,0.64)", lineHeight: 1.6 }}>
                {DEMO_SUMMARY.text}
            </p>
        </div>
        <div className="mt-1 flex flex-col items-center gap-3 sm:flex-row">
            <ButtonV2 onClick={onSchedule} variant="primary" showArrow>Agendar demo</ButtonV2>
            <button type="button" onClick={onRestart} className="text-[13.5px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                Reiniciar experiência
            </button>
        </div>
    </div>
);
