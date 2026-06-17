import { useEffect, useRef, useState, type ReactNode } from "react";

// LP.6 (v2) — scroll reveal restrained (fade + 10px up, uma vez). CSS-only via
// classe .vz-reveal/.vz-reveal--in + IntersectionObserver. Respeita
// prefers-reduced-motion (aparece direto, sem animar). Sem dependências.
interface RevealProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export const Reveal = ({ children, delay = 0, className = "" }: RevealProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        if (
            typeof window === "undefined" ||
            typeof IntersectionObserver === "undefined" ||
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ) {
            setSeen(true);
            return;
        }
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setSeen(true);
                        io.disconnect();
                    }
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`vz-reveal ${seen ? "vz-reveal--in" : ""} ${className}`.trim()}
            style={delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    );
};
