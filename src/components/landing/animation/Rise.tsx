// LP.5 2026-06-12: Rise — reveal-on-scroll leve, sem framer-motion no caminho
// eager da landing (FAQ/lazy continuam com Reveal.tsx). IntersectionObserver +
// transição CSS transform-only (.lp-rise em index.css) — nunca opacity, pelo
// mesmo motivo do Reveal (IO que não dispara em WebView deixaria conteúdo
// invisível; ver memory feedback_whileinview_opacity). Com prefers-reduced-motion
// renderiza estático, sem transform inicial.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface RiseProps {
    children: ReactNode;
    /** Atraso adicional (segundos) antes da transição começar */
    delay?: number;
    className?: string;
    style?: CSSProperties;
}

export function Rise({ children, delay = 0, className = "", style }: RiseProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isStatic] = useState(prefersReducedMotion);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (isStatic || inView) return;
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setInView(true);
                    io.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [isStatic, inView]);

    if (isStatic) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className={`lp-rise${inView ? " lp-rise-in" : ""}${className ? ` ${className}` : ""}`}
            style={delay ? { ...style, transitionDelay: `${delay}s` } : style}
        >
            {children}
        </div>
    );
}
