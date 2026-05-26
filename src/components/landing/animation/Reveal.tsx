// ─────────────────────────────────────────────────────────────────────────────
// F2.11 (2026-05-20) — Reveal + StaggerContainer
//
// Utilitários de scroll-in animation pra landing. Framer Motion (já instalado)
// + IntersectionObserver via `whileInView`. Respeita prefers-reduced-motion
// renderizando estático sem delays.
//
// Uso:
//   <Reveal>
//     <SectionHeader />
//   </Reveal>
//
//   <StaggerContainer>
//     <Card />  // 0ms
//     <Card />  // 90ms
//     <Card />  // 180ms
//   </StaggerContainer>
//
// Não usa scroll hijacking, não trava scroll, não loopa, não anima tudo
// ao mesmo tempo.
// ─────────────────────────────────────────────────────────────────────────────
import { Children, isValidElement, cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

const REVEAL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

interface RevealProps {
  children: ReactNode;
  /** Atraso adicional (segundos) antes da animação começar */
  delay?: number;
  /** Duração da animação em segundos. Default: 0.6 */
  duration?: number;
  /** Disparar quando X% do elemento está visível. Default 0.2 (20%) */
  amount?: number;
  /** Se true, anima toda vez que reentrar no viewport. Default false (uma vez) */
  repeat?: boolean;
  className?: string;
  as?: "div" | "section" | "li" | "ul" | "header";
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  amount = 0.2,
  repeat = false,
  className = "",
  as = "div",
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const Tag = as as "div";
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      variants={REVEAL_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // ease-out suave
      }}
    >
      {children}
    </MotionTag>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  /** Delay entre children. Default 0.09s (90ms) */
  stagger?: number;
  /** Atraso antes do primeiro child começar. Default 0 */
  delayStart?: number;
  /** Duração da animação de cada child. Default 0.5s */
  duration?: number;
  amount?: number;
  className?: string;
  as?: "div" | "ul" | "section";
  /**
   * `mode` = "wrap" (default): cada child vira motion.div internamente.
   * `mode` = "self": children já são motion components — só passa stagger via
   * parent (children precisam ter variants={REVEAL_VARIANTS}).
   */
  mode?: "wrap" | "self";
}

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export function StaggerContainer({
  children,
  stagger = 0.09,
  delayStart = 0,
  duration = 0.5,
  amount = 0.15,
  className = "",
  as = "div",
  mode = "wrap",
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const Tag = as as "div";
    return <Tag className={className}>{children}</Tag>;
  }

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delayStart,
        staggerChildren: stagger,
      },
    },
  };

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {mode === "self"
        ? children
        : Children.map(children, (child, i) => {
            if (!isValidElement(child)) return child;
            // Preserva key existente; envolve em motion.div com variants
            return (
              <motion.div
                key={(child as ReactElement).key ?? i}
                variants={ITEM_VARIANTS}
                transition={{
                  duration,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {cloneElement(child as ReactElement)}
              </motion.div>
            );
          })}
    </MotionTag>
  );
}

// Variants exportados pra quem quiser usar com mode="self"
export const revealItemVariants = ITEM_VARIANTS;
