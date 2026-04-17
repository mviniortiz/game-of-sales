import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
    target: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

// CSS/IntersectionObserver-based counter — sem framer-motion.
// Anima de 0 até target com easeOutCubic quando entra no viewport.
export const AnimatedCounter = ({
    target,
    duration = 1.5,
    prefix = "",
    suffix = "",
    className = "",
}: AnimatedCounterProps) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [value, setValue] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let rafId = 0;
        let started = false;

        const animate = (t0: number) => {
            const step = (now: number) => {
                const elapsed = now - t0;
                const progress = Math.min(elapsed / (duration * 1000), 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setValue(Math.round(target * eased));
                if (progress < 1) rafId = requestAnimationFrame(step);
            };
            rafId = requestAnimationFrame(step);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !started) {
                        started = true;
                        animate(performance.now());
                        observer.disconnect();
                    }
                });
            },
            { rootMargin: "-50px" }
        );

        observer.observe(el);
        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [target, duration]);

    return (
        <span ref={ref} className={className}>
            {prefix}
            {value.toLocaleString("pt-BR")}
            {suffix}
        </span>
    );
};
