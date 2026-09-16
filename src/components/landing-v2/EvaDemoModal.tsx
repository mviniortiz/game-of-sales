import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DemoSummaryStep } from "./DemoSummaryStep";
import { DemoLiveStage } from "./DemoLiveStage";
import { DemoBooking } from "./DemoBooking";
import { trackBehavior, DEMO_EVENTS } from "@/lib/analytics";

// Modal da demo da EVA. Fluxo: TOUR AO VIVO direto (iframe do app real,
// /embed-demo, a EVA narra Central → Inbox → Análise → Pipeline) → decisão
// (trial ou conversa) → booking opcional. Sem formulário na porta: 68% de quem
// abria não começava (GA4, 28d até 2026-08-21). Portal pra fora de ancestrais
// com transform; Esc fecha; mobile scrollável.
interface EvaDemoModalProps {
    open: boolean;
    onClose: () => void;
    onCTAClick: () => void;
}

type Step = "tour" | "booking" | "summary";

export const EvaDemoModal = ({ open, onClose, onCTAClick }: EvaDemoModalProps) => {
    const [step, setStep] = useState<Step>("tour");
    const [closing, setClosing] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const requestClose = () => {
        if (closing) return;
        setClosing(true);
        closeTimer.current = setTimeout(() => onClose(), 180);
    };

    useEffect(() => {
        if (!open) return;
        setStep("tour");
        setClosing(false);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const startTrial = () => {
        trackBehavior(DEMO_EVENTS.DEMO_CTA, { cta: "trial" });
        onCTAClick();
    };
    const openBooking = () => {
        trackBehavior(DEMO_EVENTS.DEMO_CTA, { cta: "booking_open" });
        setStep("booking");
    };

    const isTour = step === "tour" || step === "booking";

    return createPortal(
        <div className="lp-v2">
            <div
                className={`vz-modal-overlay fixed inset-0 z-[100] flex items-center justify-center ${isTour ? "p-0 sm:p-3" : "p-2 sm:p-4"}`}
                data-closing={closing}
                style={{ background: "rgba(8,8,10,0.62)", backdropFilter: "blur(8px)" }}
                onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
                role="dialog"
                aria-modal="true"
                aria-label="Demonstração da EVA"
            >
                <div
                    className={`vz-modal-panel relative flex w-full flex-col overflow-hidden bg-white shadow-2xl ${isTour ? "rounded-none sm:rounded-[18px]" : "rounded-[22px]"}`}
                    data-closing={closing}
                    style={{ height: isTour ? "min(98vh, 1300px)" : "min(90vh, 760px)", maxWidth: isTour ? 1840 : 1152 }}
                >
                    <div className="flex items-center justify-between px-6 py-3.5" style={{ borderBottom: "1px solid var(--lp-line)" }}>
                        <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>EVA · Vyzon</span>
                        <button type="button" onClick={requestClose} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] leading-none" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)" }}>×</button>
                    </div>

                    <div className={`flex flex-1 flex-col ${isTour ? "overflow-hidden" : "overflow-y-auto"}`}>
                        {step === "tour" && <DemoLiveStage onDone={() => setStep("summary")} onTourEnd={() => setStep("summary")} site="" />}
                        {step === "booking" && (
                            <div className="relative flex-1">
                                <DemoBooking email="" site="" intakeId={null} onDone={() => setStep("summary")} />
                            </div>
                        )}
                        {step === "summary" && <DemoSummaryStep onTrial={startTrial} onSchedule={openBooking} onRestart={() => setStep("tour")} />}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};
