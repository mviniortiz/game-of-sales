// EVA.STUDIO.9 — primitivas de motion honestas e leves.
// Reveal por bloco (CSS) + checklist sequencial (timers curtos). O CSS cuida do
// prefers-reduced-motion; o hook do framer-motion (já instalado) evita anexar
// delays/animação quando o usuário pede menos movimento. Sem libs novas.
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { GREEN, PURPLE, INK, SUB } from "./tokens";

/** Reveal por bloco: fade + slide-up curto, com delay escalonado por índice.
 *  Em reduced-motion aparece imediatamente, sem classe nem delay. */
export function MotionSafeReveal({
    index = 0,
    step = 80,
    children,
    className = "",
}: { index?: number; step?: number; children: ReactNode; className?: string }) {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className}>{children}</div>;
    return (
        <div className={`eva-reveal ${className}`} style={{ animationDelay: `${index * step}ms` }}>
            {children}
        </div>
    );
}

/** Checklist sequencial: cada item ganha o check em cascata dentro de durationMs.
 *  Não simula processamento longo — é só a janela de reveal controlada.
 *  Em reduced-motion, mostra tudo concluído de imediato. */
export function ProgressChecklist({
    items,
    running,
    durationMs = 1000,
    title,
}: { items: string[]; running: boolean; durationMs?: number; title?: string }) {
    const reduce = useReducedMotion();
    const [done, setDone] = useState(reduce ? items.length : 0);

    useEffect(() => {
        if (reduce || !running) { setDone(items.length); return; }
        setDone(0);
        const per = Math.max(120, Math.floor(durationMs / (items.length + 1)));
        const timers = items.map((_, i) => window.setTimeout(() => setDone(i + 1), per * (i + 1)));
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [running, reduce, items, durationMs]);

    return (
        <div className="space-y-2.5">
            {title && <p className="text-[12px] font-semibold" style={{ color: INK }}>{title}</p>}
            {items.map((label, i) => {
                const isDone = i < done;
                const isActive = i === done && running && !reduce;
                return (
                    <div key={label} className="flex items-center gap-2.5 text-[12.5px]">
                        {isDone ? (
                            <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#ECFDF3" }}>
                                <Check className="w-2.5 h-2.5" style={{ color: GREEN }} />
                            </span>
                        ) : isActive ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: PURPLE }} />
                        ) : (
                            <span className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: "#E5E7EB" }} />
                        )}
                        <span style={{ color: isDone ? SUB : INK, fontWeight: isDone ? 400 : 500 }}>{label}</span>
                    </div>
                );
            })}
        </div>
    );
}
