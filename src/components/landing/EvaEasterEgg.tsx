// LP.5 2026-06-12: easter egg da EVA. Dois gatilhos escondidos:
//   1. digitar "eva" em qualquer lugar da página (fora de inputs);
//   2. 5 toques rápidos na telemetria "EVA · lendo a conversa" do hero
//      (mobile, via CustomEvent "vyzon:eva-egg").
// A EVA "acorda" num diálogo editorial (veil de tinta + cartão de papel com
// marcas de corte) e datilografa uma leitura da visita — a mesma mecânica de
// pills/stamp que ela usa com leads, aplicada ao próprio visitante. Há também
// uma dica no console (ver LandingPage). Acessível: role=dialog, foco no
// fechar, Esc/veil fecham, scroll lock; com prefers-reduced-motion o texto
// aparece inteiro, sem datilografia.
import { useCallback, useEffect, useRef, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { EvaNode } from "./EvaNode";
import { trackEvent } from "@/lib/analytics";
import { smoothScrollToId } from "@/hooks/useLandingAnchor";

const EGG_MESSAGE =
    "Você digitou meu nome — eu estava lendo esta página com você. " +
    "É assim que eu leio cada conversa da sua agência. Só que lá, eu aviso antes do lead esfriar.";

const EGG_PILLS = [
    { label: "curiosidade: alta", color: "#1556C0", bg: "rgba(21,86,192,0.08)", border: "rgba(21,86,192,0.3)" },
    { label: "atenção ao detalhe: rara", color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.35)" },
    { label: "fit: explorador", color: "#008A52", bg: "rgba(0,138,82,0.08)", border: "rgba(0,138,82,0.3)" },
] as const;

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isTypingTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

export function EvaEasterEgg() {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState("");
    const [done, setDone] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);

    const openEgg = useCallback((trigger: string) => {
        setOpen((already) => {
            if (already) return already;
            try {
                trackEvent("landing_easter_egg_found", { trigger });
            } catch {
                /* analytics never breaks UX */
            }
            return true;
        });
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setTyped("");
        setDone(false);
        previousFocus.current?.focus?.();
    }, []);

    // Gatilhos: sequência "eva" no teclado + CustomEvent do hero (mobile)
    useEffect(() => {
        let buffer = "";
        const onKey = (e: KeyboardEvent) => {
            if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
            if (isTypingTarget(e.target)) return;
            buffer = (buffer + e.key.toLowerCase()).slice(-3);
            if (buffer === "eva") {
                buffer = "";
                openEgg("typed");
            }
        };
        const onHeroTaps = () => openEgg("hero_taps");
        window.addEventListener("keydown", onKey);
        window.addEventListener("vyzon:eva-egg", onHeroTaps);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("vyzon:eva-egg", onHeroTaps);
        };
    }, [openEgg]);

    // Datilografia da mensagem + foco + Esc + scroll lock
    useEffect(() => {
        if (!open) return;

        previousFocus.current = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onEsc);

        let interval: ReturnType<typeof setInterval> | undefined;
        if (prefersReducedMotion()) {
            setTyped(EGG_MESSAGE);
            setDone(true);
        } else {
            let i = 0;
            interval = setInterval(() => {
                i += 1;
                setTyped(EGG_MESSAGE.slice(0, i));
                if (i >= EGG_MESSAGE.length) {
                    if (interval) clearInterval(interval);
                    setDone(true);
                }
            }, 16);
        }

        return () => {
            window.removeEventListener("keydown", onEsc);
            document.body.style.overflow = prevOverflow;
            if (interval) clearInterval(interval);
        };
    }, [open, close]);

    const goToEva = () => {
        close();
        window.dispatchEvent(new CustomEvent("vyzon:hydrate-all"));
        const start = Date.now();
        const wait = () => {
            if (smoothScrollToId("eva")) return;
            if (Date.now() - start < 2500) requestAnimationFrame(wait);
        };
        requestAnimationFrame(wait);
    };

    if (!open) return null;

    return (
        <div
            className="lp-egg-veil fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
            style={{ background: "rgba(13, 20, 33, 0.82)" }}
            onClick={close}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Você encontrou a EVA"
                className="lp-frame lp-egg-card relative w-full max-w-[520px]"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="relative px-6 py-7 sm:px-9 sm:py-9 max-h-[82vh] overflow-y-auto"
                    style={{
                        background: "var(--lp-paper)",
                        border: "1px solid var(--lp-line)",
                        borderRadius: "var(--lp-radius)",
                    }}
                >
                    {/* Telemetria do diálogo */}
                    <div
                        className="flex items-center gap-2.5 pb-4 border-b"
                        style={{ borderColor: "var(--lp-line-soft)" }}
                    >
                        <span className="lp-egg-node shrink-0 inline-flex" aria-hidden="true">
                            <EvaNode size={15} color="var(--lp-eva)" />
                        </span>
                        <span className="lp-mono" style={{ color: "var(--lp-eva)" }}>
                            EVA · presença detectada
                        </span>
                        <button
                            ref={closeRef}
                            onClick={close}
                            aria-label="Fechar"
                            className="ml-auto inline-flex items-center justify-center h-8 w-8 rounded-[8px]"
                            style={{ border: "1px solid var(--lp-line)", color: "var(--lp-ink-55)" }}
                        >
                            <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                    </div>

                    {/* Mensagem datilografada (voz humana = serif) */}
                    <p
                        className="lp-serif mt-6 min-h-[7.5em] sm:min-h-[6em]"
                        style={{
                            fontSize: "clamp(1.0625rem, 2.4vw, 1.25rem)",
                            lineHeight: 1.6,
                            color: "var(--lp-ink-90)",
                        }}
                        aria-live="polite"
                    >
                        {typed}
                        {!done && (
                            <span
                                className="lp-blink inline-block align-baseline ml-0.5"
                                style={{ width: 7, height: "0.9em", background: "var(--lp-eva)" }}
                                aria-hidden="true"
                            />
                        )}
                    </p>

                    {/* Leitura do visitante — só depois da datilografia */}
                    {done && (
                        <>
                            <div className="flex flex-wrap gap-2 mt-5">
                                {EGG_PILLS.map((p, i) => (
                                    <span
                                        key={p.label}
                                        className="lp-egg-pop lp-mono px-2.5 py-1.5"
                                        style={{
                                            animationDelay: `${i * 0.12}s`,
                                            color: p.color,
                                            background: p.bg,
                                            border: `1px solid ${p.border}`,
                                            borderRadius: 6,
                                            textTransform: "none",
                                            letterSpacing: "0.02em",
                                        }}
                                    >
                                        {p.label}
                                    </span>
                                ))}
                            </div>

                            <div className="flex justify-end mt-5">
                                <span
                                    className="lp-egg-pop lp-mono inline-flex items-center gap-2 px-3 py-2"
                                    style={{
                                        animationDelay: "0.4s",
                                        color: "var(--lp-eva)",
                                        border: "1.5px solid var(--lp-eva)",
                                        borderRadius: 4,
                                        background: "var(--lp-white)",
                                        transform: "rotate(-2deg)",
                                    }}
                                >
                                    → easter egg · encontrado
                                </span>
                            </div>

                            <div
                                className="lp-egg-pop flex flex-col sm:flex-row gap-3 mt-7 pt-6 border-t"
                                style={{ animationDelay: "0.55s", borderColor: "var(--lp-line)" }}
                            >
                                <button
                                    onClick={goToEva}
                                    className="lp-press lp-press--blue inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[10px] text-[14px] text-white"
                                    style={{
                                        background: "var(--lp-eva)",
                                        border: "1px solid #5b21b6",
                                        fontWeight: 600,
                                    }}
                                >
                                    Conhecer a EVA de verdade
                                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                                </button>
                                <button
                                    onClick={close}
                                    className="inline-flex items-center justify-center h-11 px-5 rounded-[10px] text-[14px]"
                                    style={{
                                        border: "1px solid var(--lp-line)",
                                        color: "var(--lp-ink-70)",
                                        background: "var(--lp-white)",
                                        fontWeight: 500,
                                    }}
                                >
                                    Voltar à página
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
