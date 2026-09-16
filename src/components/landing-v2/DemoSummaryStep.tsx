import { ButtonV2 } from "./ButtonV2";
import { EvaOrb } from "./EvaOrb";

// Fim do tour: a decisão. Trial é o caminho primário (sem cartão, 2 minutos);
// a conversa com o Markus fica como alternativa pra quem quer gente antes.
interface DemoSummaryStepProps {
    onTrial: () => void;
    onSchedule: () => void;
    onRestart: () => void;
}

export const DemoSummaryStep = ({ onTrial, onSchedule, onRestart }: DemoSummaryStepProps) => (
    <div className="vz-modal-step flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <EvaOrb state="idle" size={120} />
        <div>
            <h2 className="lp-display" style={{ fontSize: "clamp(1.8rem,3.4vw,2.4rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "var(--lp-ink)" }}>
                Agora com os seus leads.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px]" style={{ color: "rgba(5,5,5,0.64)", lineHeight: 1.6 }}>
                Você viu a EVA ler uma conversa, apontar quem está pronto e deixar a resposta pra aprovação.
                Na sua conta isso acontece com o seu WhatsApp, em 14 dias grátis, sem cartão.
            </p>
        </div>
        <div className="mt-1 flex flex-col items-center gap-3 sm:flex-row">
            <ButtonV2 onClick={onTrial} variant="primary" showArrow>Começar meus 14 dias grátis</ButtonV2>
            <ButtonV2 onClick={onSchedule} variant="secondary">Conversar 20 min com o Markus</ButtonV2>
        </div>
        <button type="button" onClick={onRestart} className="text-[13.5px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
            Rever o tour
        </button>
    </div>
);
