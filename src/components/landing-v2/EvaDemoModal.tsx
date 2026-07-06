import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DemoIntakeStep } from "./DemoIntakeStep";
import { DemoPreparingStep } from "./DemoPreparingStep";
import { DemoSummaryStep } from "./DemoSummaryStep";
import { DemoLiveStage, type DemoSiteContext } from "./DemoLiveStage";
import { DemoBooking } from "./DemoBooking";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";

// LP.8 (v2) — modal da demo da EVA. Fluxo: intake (email + site) → preparando →
// TOUR AO VIVO (iframe do app real, /embed-demo, a EVA navega Central → Pipeline
// → Agente com cursor fantasma + Live) → resumo. Portal pra fora de ancestrais
// com transform; Esc fecha; mobile scrollável.
interface EvaDemoModalProps {
    open: boolean;
    onClose: () => void;
    onCTAClick: () => void;
}

type Step = "intake" | "preparing" | "tour" | "booking" | "summary";

export const EvaDemoModal = ({ open, onClose, onCTAClick }: EvaDemoModalProps) => {
    const [step, setStep] = useState<Step>("intake");
    const [email, setEmail] = useState("");
    const [site, setSite] = useState("");
    const [heardFrom, setHeardFrom] = useState("");
    const [closing, setClosing] = useState(false);
    const [intakeId, setIntakeId] = useState<string | null>(null);
    const [siteCtx, setSiteCtx] = useState<DemoSiteContext | null>(null);
    const ctxPromiseRef = useRef<Promise<unknown> | null>(null);

    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const requestClose = () => {
        if (closing) return;
        setClosing(true);
        closeTimer.current = setTimeout(() => onClose(), 180);
    };

    useEffect(() => {
        if (!open) return;
        setStep("intake");
        setEmail("");
        setSite("");
        setHeardFrom("");
        setClosing(false);
        setIntakeId(null);
        setSiteCtx(null);
        ctxPromiseRef.current = null;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
            if (closeTimer.current) clearTimeout(closeTimer.current);
            if (prepTimer.current) clearTimeout(prepTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // DEMO.A2 + DEMO.C — ao sair do intake: (1) persiste o lead PARCIAL na hora
    // (quem abandona o tour não se perde); (2) se informou site, dispara a
    // leitura do site em paralelo (personaliza a narração da EVA).
    const startDemo = () => {
        supabase
            .rpc("submit_demo_intake", {
                payload: { email, company: site, heard_from: heardFrom, ...(getAttribution() ?? {}) },
            })
            .then(({ data, error }) => {
                if (error) console.error("[EvaDemoModal] submit_demo_intake falhou:", error.message);
                else if (data) setIntakeId(data as string);
            });
        if (site.trim()) {
            ctxPromiseRef.current = supabase.functions
                .invoke("demo-site-context", { body: { site } })
                .then(({ data }) => {
                    const ctx = (data as { context?: DemoSiteContext | null })?.context;
                    if (ctx) setSiteCtx(ctx);
                })
                .catch(() => undefined);
        }
        setStep("preparing");
    };

    // preparando → tour: espera a leitura do site (teto 6.5s) e no mínimo 1.2s
    // de tela — o "preparando" agora é trabalho real, não só teatro.
    useEffect(() => {
        if (step !== "preparing") return;
        let cancelled = false;
        const minWait = new Promise((r) => { prepTimer.current = setTimeout(r, 1200); });
        const ctxWait = Promise.race([
            ctxPromiseRef.current ?? Promise.resolve(),
            new Promise((r) => setTimeout(r, 6500)),
        ]);
        Promise.all([minWait, ctxWait]).then(() => { if (!cancelled) setStep("tour"); });
        return () => { cancelled = true; if (prepTimer.current) clearTimeout(prepTimer.current); };
    }, [step]);

    if (!open) return null;

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
                        {step === "intake" && (
                            <DemoIntakeStep email={email} site={site} heardFrom={heardFrom} setEmail={setEmail} setSite={setSite} setHeardFrom={setHeardFrom} onStart={startDemo} />
                        )}
                        {step === "preparing" && <DemoPreparingStep site={site} />}
                        {step === "tour" && <DemoLiveStage onDone={() => setStep("summary")} onTourEnd={() => setStep("booking")} site={site} siteCtx={siteCtx} />}
                        {step === "booking" && (
                            <div className="relative flex-1">
                                <DemoBooking email={email} site={site} intakeId={intakeId} onDone={() => setStep("summary")} />
                            </div>
                        )}
                        {/* "Agendar demo" abre o BOOKING real (Google Calendar) — não o
                            teste grátis; o trial segue nos CTAs próprios da página. */}
                        {step === "summary" && <DemoSummaryStep onSchedule={() => setStep("booking")} onRestart={() => setStep("tour")} />}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};
