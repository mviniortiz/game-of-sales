// UX.POLISH.1 — Motion system reutilizável. Entrada discreta (opacity + y
// pequeno), duração curta, easing de saída. Respeita prefers-reduced-motion
// via useReducedMotion do framer-motion (já instalado).
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

// Durações padrão (ms) — referência para uso em transitions.
export const MOTION_DURATION = { fast: 0.12, base: 0.18, slow: 0.26 } as const;

type MotionFadeProps = {
    children: ReactNode;
    className?: string;
    delay?: number;
    /** "base" (padrão), "fast" ou "slow". */
    speed?: keyof typeof MOTION_DURATION;
} & Omit<HTMLMotionProps<"div">, "children" | "className">;

/** Fade + slide-up sutil na entrada. Em reduced-motion, aparece sem animar. */
export const MotionFade = ({ children, className, delay = 0, speed = "base", ...props }: MotionFadeProps) => {
    const reduce = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : MOTION_DURATION[speed], ease: "easeOut", delay: reduce ? 0 : delay }}
            {...props}
        >
            {children}
        </motion.div>
    );
};

/** Troca suave de conteúdo (ex.: abas). Use key para remontar ao trocar. */
export const MotionSwap = ({ children, className }: { children: ReactNode; className?: string }) => {
    const reduce = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -2 }}
            transition={{ duration: reduce ? 0 : MOTION_DURATION.fast, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
};
