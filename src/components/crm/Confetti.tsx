import { motion, AnimatePresence } from "framer-motion";
import { memo, useEffect, useState } from "react";

interface ConfettiProps {
    show: boolean;
    onComplete?: () => void;
}

// Generate random confetti pieces
const generateConfetti = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: [
            "#10B981", // Emerald
            "#10b981", // Indigo
            "#F59E0B", // Amber
            "#EC4899", // Pink
            "#3B82F6", // Blue
            "#10b981", // Violet
        ][Math.floor(Math.random() * 6)],
    }));
};

export const Confetti = memo(({ show, onComplete }: ConfettiProps) => {
    const [particles, setParticles] = useState<ReturnType<typeof generateConfetti>>([]);

    useEffect(() => {
        if (show) {
            setParticles(generateConfetti(50));

            // Clean up after animation
            const timer = setTimeout(() => {
                setParticles([]);
                onComplete?.();
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && particles.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
                    {particles.map((particle) => (
                        <motion.div
                            key={particle.id}
                            initial={{
                                opacity: 1,
                                x: `${particle.x}vw`,
                                y: "-20px",
                                rotate: 0,
                                scale: particle.scale,
                            }}
                            animate={{
                                opacity: [1, 1, 0],
                                y: "110vh",
                                rotate: particle.rotation + 720,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 2 + Math.random(),
                                delay: particle.delay,
                                ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            className="absolute w-3 h-3"
                            style={{
                                backgroundColor: particle.color,
                                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                            }}
                        />
                    ))}

                    {/* Center burst effect */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0.8 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-radial from-emerald-400/30 to-transparent"
                    />
                </div>
            )}
        </AnimatePresence>
    );
});

Confetti.displayName = "Confetti";

// Celebration text overlay
interface CelebrationOverlayProps {
    show: boolean;
    message?: string;
}

export const CelebrationOverlay = memo(({ show, message = "🎉 Deal Ganho!" }: CelebrationOverlayProps) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] pointer-events-none"
                >
                    <div className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-2xl shadow-emerald-500/40">
                        <span className="text-2xl font-bold text-white drop-shadow-lg">
                            {message}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

CelebrationOverlay.displayName = "CelebrationOverlay";
