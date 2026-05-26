import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// EvaPhotoAvatar (V1.1, 2026-05-22)
// Avatar fotográfico oficial da EVA. Usado em cards/headers premium.
// Não usar em micro-contextos como sidebar (24px) — pra esses, EvaIcon SVG.
//
// REGRA VISUAL (memory: feedback_eva_visual_rule):
// EVA é camada inteligente do Vyzon, NÃO marca separada. Roxo aparece só como
// accent sutil (ring/glow). Bg do componente é neutro (branco). Cards que usam
// esse avatar devem manter CTAs principais em AZUL Vyzon #2563EB.
//
// V1.1 — Estado `thinking`:
//   Quando true, faz crossfade pra arte "pensando" (eva-thinking-*.png) com
//   pose diferente (olhar pra cima + dedo no queixo + cristais flutuantes).
//   Em loop: breathing scale + Y-float defasado. Halo violeta atrás reforça
//   o mood. Respeita prefers-reduced-motion (crossfade simples, sem loop).
// ─────────────────────────────────────────────────────────────────────────────

export type EvaSize = "xs" | "sm" | "md" | "lg" | "xl";

interface SizeConfig {
    px: number;
    /** Asset de menor resolução pro 1x */
    src: string;
    /** srcSet com 1x e 2x quando faz sentido */
    srcSet?: string;
    /** Variante "pensando" */
    thinkingSrc: string;
    thinkingSrcSet?: string;
}

const SIZE_MAP: Record<EvaSize, SizeConfig> = {
    xs: {
        px: 24,
        src: "/eva/avatar-64.png",
        thinkingSrc: "/eva/eva-thinking-64.png",
    },
    sm: {
        px: 32,
        src: "/eva/avatar-64.png",
        srcSet: "/eva/avatar-64.png 1x, /eva/avatar-128.png 2x",
        thinkingSrc: "/eva/eva-thinking-64.png",
        thinkingSrcSet: "/eva/eva-thinking-64.png 1x, /eva/eva-thinking-128.png 2x",
    },
    md: {
        px: 48,
        src: "/eva/avatar-128.png",
        srcSet: "/eva/avatar-128.png 1x, /eva/avatar-256.png 2x",
        thinkingSrc: "/eva/eva-thinking-128.png",
        thinkingSrcSet: "/eva/eva-thinking-128.png 1x, /eva/eva-thinking-256.png 2x",
    },
    lg: {
        px: 80,
        src: "/eva/avatar-256.png",
        srcSet: "/eva/avatar-256.png 1x, /eva/avatar-512.png 2x",
        thinkingSrc: "/eva/eva-thinking-256.png",
        thinkingSrcSet: "/eva/eva-thinking-256.png 1x, /eva/eva-thinking-512.png 2x",
    },
    xl: {
        px: 160,
        src: "/eva/avatar-512.png",
        thinkingSrc: "/eva/eva-thinking-512.png",
    },
};

interface EvaPhotoAvatarProps {
    /** Tamanho semântico (xs 24px → xl 160px). Default md (48px). */
    size?: EvaSize;
    /**
     * Decoração lilás em volta do avatar.
     * - `none`: sem ring (uso em listas densas)
     * - `subtle`: ring 1.5px roxo muito suave (default — assinatura discreta)
     * - `glow`: ring + sombra roxa (estado de destaque, ex. página /eva)
     */
    ring?: "none" | "subtle" | "glow";
    /**
     * V1.1 — Quando true, troca pra arte de EVA pensando + ativa loop
     * (breathing/float/halo). Use enquanto a EVA está processando uma
     * request do usuário (Inbox sugestão, /eva streaming, etc).
     */
    thinking?: boolean;
    className?: string;
    /** Default: "EVA, IA comercial do Vyzon" (não muda em produção, é assinatura). */
    alt?: string;
}

export function EvaPhotoAvatar({
    size = "md",
    ring = "subtle",
    thinking = false,
    className = "",
    alt = "EVA, IA comercial do Vyzon",
}: EvaPhotoAvatarProps) {
    const { px, src, srcSet, thinkingSrc, thinkingSrcSet } = SIZE_MAP[size];
    const reducedMotion = useReducedMotion();

    const ringStyle = useMemo(() => {
        if (ring === "glow") {
            return "0 0 0 1.5px rgba(124,58,237,0.35), 0 0 20px rgba(124,58,237,0.22)";
        }
        if (ring === "subtle") {
            return "0 0 0 1.5px rgba(124,58,237,0.22)";
        }
        return "none";
    }, [ring]);

    // V1.1 — Tier visual: avatares xs/sm desativam halo+loop (custo visual
    // não compensa no tamanho). De md pra cima entra a animação completa.
    const allowLoop = !reducedMotion && (size === "md" || size === "lg" || size === "xl");
    const haloVisible = thinking && (size === "lg" || size === "xl") && !reducedMotion;

    return (
        <div
            className={cn("relative shrink-0", className)}
            style={{ width: px, height: px }}
        >
            {/* V1.1 — Halo violeta pulsando atrás (só em sizes maiores, só pensando) */}
            {haloVisible && (
                <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(124,58,237,0.30) 0%, rgba(124,58,237,0) 70%)",
                        filter: "blur(8px)",
                        zIndex: 0,
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: [0.45, 0.75, 0.45],
                        scale: [1.05, 1.15, 1.05],
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Avatar — crossfade entre normal e thinking */}
            <motion.div
                className="relative rounded-full overflow-hidden"
                style={{
                    width: px,
                    height: px,
                    background: "#FFFFFF",
                    boxShadow: ringStyle,
                    zIndex: 1,
                }}
                animate={
                    allowLoop && thinking
                        ? {
                              scale: [1, 1.015, 1],
                              y: [0, -2.5, 0],
                          }
                        : { scale: 1, y: 0 }
                }
                transition={
                    allowLoop && thinking
                        ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.2 }
                }
            >
                <AnimatePresence mode="sync" initial={false}>
                    {thinking ? (
                        <motion.img
                            key="thinking"
                            src={thinkingSrc}
                            srcSet={thinkingSrcSet}
                            alt={alt}
                            width={px}
                            height={px}
                            decoding="async"
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04, rotate: -2 }}
                            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, rotate: 1 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0.32, ease: [0.32, 0.72, 0.24, 1] }}
                        />
                    ) : (
                        <motion.img
                            key="normal"
                            src={src}
                            srcSet={srcSet}
                            alt={alt}
                            width={px}
                            height={px}
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
                            transition={{ duration: reducedMotion ? 0.15 : 0.24, ease: [0.32, 0.72, 0.24, 1] }}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
