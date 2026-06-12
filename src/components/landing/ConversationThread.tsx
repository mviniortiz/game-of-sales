// LP.5 2026-06-12: o Fio da Conversa vira elemento vivo — uma régua vertical
// fixa na borda esquerda (xl+) que se "desenha" conforme o scroll, com o nó
// azul (mesma linguagem do lp-station-node) viajando pela página. Scroll
// listener passivo + rAF, sem framer-motion e sem layout thrash (transform/top
// direto no ref). Decorativo: aria-hidden, pointer-events none, e some por
// completo com prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ConversationThread() {
    const lineRef = useRef<HTMLDivElement>(null);
    const dotRef = useRef<HTMLDivElement>(null);
    const [disabled] = useState(prefersReducedMotion);

    useEffect(() => {
        if (disabled) return;
        let raf = 0;

        const update = () => {
            raf = 0;
            const line = lineRef.current;
            const dot = dotRef.current;
            if (!line || !dot) return;
            const doc = document.documentElement;
            const max = doc.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
            line.style.transform = `scaleY(${p.toFixed(4)})`;
            dot.style.top = `${(p * 100).toFixed(3)}%`;
        };

        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        update();
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [disabled]);

    if (disabled) return null;

    return (
        <div
            aria-hidden="true"
            className="hidden xl:block fixed pointer-events-none"
            style={{ left: 26, top: 88, bottom: 28, width: 9, zIndex: 30 }}
        >
            {/* Trilho pontilhado (o fio ainda não percorrido) */}
            <div
                className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px"
                style={{
                    background:
                        "repeating-linear-gradient(180deg, var(--lp-line) 0 6px, transparent 6px 12px)",
                }}
            />
            {/* Fio percorrido — desenha com o scroll */}
            <div
                ref={lineRef}
                className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px"
                style={{
                    background: "var(--lp-blue)",
                    transform: "scaleY(0)",
                    transformOrigin: "top center",
                    willChange: "transform",
                }}
            />
            {/* Nó viajante — mesma linguagem do lp-station-node */}
            <div
                ref={dotRef}
                className="absolute left-1/2"
                style={{
                    top: 0,
                    width: 9,
                    height: 9,
                    marginLeft: -4.5,
                    marginTop: -4.5,
                    borderRadius: 999,
                    background: "var(--lp-blue)",
                    boxShadow: "0 0 0 4px rgba(21, 86, 192, 0.14)",
                    willChange: "top",
                }}
            />
        </div>
    );
}
