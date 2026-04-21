import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EvaAvatar } from "@/components/icons/EvaAvatar";

const SPRING = { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.95 };

function computeTarget(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const sheetWidth = vw >= 768 ? 480 : vw >= 640 ? 440 : vw;
  // Avatar real do ReportAgent: center em (sheet_left + 34, 58)
  // Atom 36x36 → top-left em (sheet_left + 16, 40)
  return { x: vw - sheetWidth + 16, y: 40 };
}

/**
 * Par de destino do shared layout (layoutId="eva-hero-atom").
 * Só é montado quando open=true. Framer-motion faz o FLIP a partir da
 * última posição do par origem (dentro do EvaFloatingButton) até aqui.
 */
export const EvaHeroAtom = ({ open }: { open: boolean }) => {
  const [target, setTarget] = useState<{ x: number; y: number }>(computeTarget);

  useEffect(() => {
    const onResize = () => setTarget(computeTarget());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed pointer-events-none"
      style={{ left: target.x, top: target.y, zIndex: 55 }}
    >
      <motion.div
        layoutId="eva-hero-atom"
        transition={SPRING}
        className="flex items-center justify-center"
        style={{ width: 36, height: 36 }}
      >
        <EvaAvatar size={36} thinking />
      </motion.div>
    </div>
  );
};
