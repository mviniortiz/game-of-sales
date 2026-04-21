import { forwardRef } from "react";
import { motion } from "framer-motion";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { cn } from "@/lib/utils";

interface EvaFloatingButtonProps {
  onClick: () => void;
  open: boolean;
  className?: string;
}

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.95 };

/**
 * Botão flutuante com o atom da Eva centralizado via flex.
 * Quando `open=false`, o atom é renderizado aqui (com layoutId compartilhado).
 * Quando `open=true`, o atom é montado no sidechat (mesmo layoutId) e framer-motion
 * faz a transição FLIP entre as duas posições automaticamente.
 */
export const EvaFloatingButton = forwardRef<HTMLButtonElement, EvaFloatingButtonProps>(
  ({ onClick, open, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={open ? "Fechar Eva" : "Abrir Eva"}
        aria-expanded={open}
        className={cn(
          "group fixed bottom-5 right-5 z-40 flex items-center justify-center rounded-full transition-[opacity,box-shadow]",
          "h-14 w-14 shadow-[0_8px_30px_rgba(139,92,246,0.20)] hover:shadow-[0_14px_40px_rgba(139,92,246,0.35)]",
          "dark:shadow-[0_8px_30px_rgba(139,92,246,0.35)] dark:hover:shadow-[0_14px_40px_rgba(139,92,246,0.55)]",
          "bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#f4f1fb_70%)]",
          "dark:bg-[radial-gradient(circle_at_30%_30%,#1a1030_0%,#0a0812_70%)]",
          "border border-violet-500/30 dark:border-violet-400/25",
          open && "opacity-0 pointer-events-none",
          className,
        )}
        style={{ transitionDuration: "220ms" }}
      >
        {!open && (
          <motion.div
            layoutId="eva-hero-atom"
            transition={SPRING}
            className="flex items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <EvaAvatar size={36} />
          </motion.div>
        )}

        {/* Tooltip */}
        <span
          className={cn(
            "absolute right-full mr-3 px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap font-medium",
            "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
            "bg-zinc-900/95 text-white/90 border border-white/10",
            "dark:bg-zinc-950/95 dark:text-white/85 dark:border-white/10",
          )}
        >
          Perguntar pra Eva
        </span>
      </button>
    );
  },
);

EvaFloatingButton.displayName = "EvaFloatingButton";
