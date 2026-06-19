import { useEffect, useRef, useState, type ReactNode } from "react";

// LP.6 (v2) — scroll reveal BIDIRECIONAL (fade + deslize, reage descendo E
// subindo). CSS-only via .vz-reveal/.vz-reveal--in/.vz-reveal--from-top +
// IntersectionObserver mantido vivo (não dá disconnect): ao entrar revela, ao
// sair re-esconde no lado por onde saiu (segue o scroll). Respeita
// prefers-reduced-motion (aparece direto, sem animar). Sem dependências.
interface RevealProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export const Reveal = ({ children, delay = 0, className = "" }: RevealProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    const [fromTop, setFromTop] = useState(false); // escondido pra cima (saiu por cima)

    useEffect(() => {
        if (
            typeof window === "undefined" ||
            typeof IntersectionObserver === "undefined" ||
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ) {
            setInView(true);
            return;
        }
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setInView(true);
                    } else {
                        // saiu da viewport — esconde no lado por onde saiu pra
                        // reaparecer "vindo" da direção certa ao voltar.
                        const viewportBottom = e.rootBounds?.bottom ?? window.innerHeight;
                        const exitedUpward = e.boundingClientRect.bottom < viewportBottom / 2;
                        setFromTop(exitedUpward);
                        setInView(false);
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const cls = `vz-reveal ${inView ? "vz-reveal--in" : fromTop ? "vz-reveal--from-top" : ""} ${className}`.trim();

    return (
        <div ref={ref} className={cls} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
            {children}
        </div>
    );
};
