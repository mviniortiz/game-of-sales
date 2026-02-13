import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring, motion } from "framer-motion";

interface AnimatedCounterProps {
    target: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export const AnimatedCounter = ({
    target,
    duration = 1.5,
    prefix = "",
    suffix = "",
    className = "",
}: AnimatedCounterProps) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        duration: duration * 1000,
        bounce: 0,
    });

    useEffect(() => {
        if (isInView) {
            motionValue.set(target);
        }
    }, [isInView, motionValue, target]);

    useEffect(() => {
        const unsubscribe = springValue.on("change", (latest) => {
            if (ref.current) {
                const value = Math.round(latest);
                ref.current.textContent = `${prefix}${value.toLocaleString("pt-BR")}${suffix}`;
            }
        });
        return unsubscribe;
    }, [springValue, prefix, suffix]);

    return (
        <motion.span
            ref={ref}
            className={className}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
        >
            {prefix}0{suffix}
        </motion.span>
    );
};
