import { EvaOrb } from "./EvaOrb";
import { DemoProductCanvas } from "./DemoProductCanvas";
import type { DemoScene } from "./evaDemoData";

// LP.7 (v2) — passo 3: demo guiada. Canvas grande do produto + orb/narração +
// controles mínimos (anterior/próximo/reiniciar) e indicador de progresso.
interface DemoGuidedStepProps {
    scene: DemoScene;
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
    onRestart: () => void;
}

export const DemoGuidedStep = ({ scene, index, total, onPrev, onNext, onRestart }: DemoGuidedStepProps) => {
    return (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            {/* canvas do produto */}
            <div className="flex flex-1 items-center justify-center p-6 sm:p-10" style={{ background: "var(--lp-paper)" }}>
                <div key={scene.id} className="vz-modal-step flex w-full justify-center">
                    <DemoProductCanvas kind={scene.kind} />
                </div>
            </div>

            {/* narração + orb + controles */}
            <div className="flex shrink-0 flex-col justify-center gap-5 px-7 py-8 lg:w-[372px]" style={{ borderTop: "1px solid var(--lp-line)" }}>
                <div className="flex items-center gap-3">
                    <EvaOrb state="speaking" size={56} />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Cena {index + 1} de {total}</span>
                </div>

                <div key={scene.id} className="vz-modal-step">
                    <p className="lp-display" style={{ fontSize: "1.45rem", lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>{scene.title}</p>
                    <p className="mt-2.5 text-[14.5px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.55 }}>{scene.narration}</p>
                </div>

                {/* progresso */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: total }).map((_, i) => (
                        <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === index ? 18 : 6, background: i <= index ? "var(--lp-blue)" : "var(--lp-line)" }} />
                    ))}
                </div>

                {/* controles */}
                <div className="mt-1 flex items-center gap-4">
                    <button type="button" onClick={onPrev} disabled={index === 0} className="text-[13.5px] disabled:opacity-30" style={{ color: "var(--lp-ink-55)" }}>
                        Anterior
                    </button>
                    <button type="button" onClick={onNext} className="rounded-full px-5 py-2 text-[13.5px] text-white" style={{ background: "var(--lp-ink)", fontWeight: 600 }}>
                        {index === total - 1 ? "Concluir" : "Próximo"}
                    </button>
                    <button type="button" onClick={onRestart} className="ml-auto text-[13px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-40)" }}>
                        Reiniciar
                    </button>
                </div>
            </div>
        </div>
    );
};
