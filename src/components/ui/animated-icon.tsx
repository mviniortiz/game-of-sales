import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface AnimatedIconProps {
    icon: LucideIcon;
    isActive?: boolean;
    className?: string;
}

export const AnimatedIcon = ({ icon: Icon, isActive = false, className = "" }: AnimatedIconProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="relative flex items-center justify-center"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            animate={{
                scale: isHovered ? 1.15 : 1,
            }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 17,
            }}
        >
            {/* Glow effect background - works on both light and dark modes */}
            <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500 dark:bg-emerald-400 blur-md"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                    opacity: isHovered || isActive ? 0.4 : 0,
                    scale: isHovered || isActive ? 1.8 : 0.5,
                }}
                transition={{
                    duration: 0.3,
                    ease: "easeOut",
                }}
            />

            {/* Pulse ring on hover - visible on both modes */}
            {isHovered && (
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/60 dark:border-emerald-400/60"
                    initial={{ opacity: 0.8, scale: 1 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    transition={{
                        duration: 0.7,
                        ease: "easeOut",
                        repeat: Infinity,
                    }}
                />
            )}

            {/* The actual icon */}
            <motion.div
                animate={{
                    rotate: isHovered ? [0, -8, 8, -4, 4, 0] : 0,
                }}
                transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                }}
            >
                <Icon
                    className={`h-5 w-5 relative z-10 transition-colors duration-200 ${isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isHovered
                                ? 'text-emerald-500 dark:text-emerald-300'
                                : 'text-gray-600 dark:text-gray-400'
                        } ${className}`}
                />
            </motion.div>
        </motion.div>
    );
};
