// Trial Banner — indicador do período de teste no topo do app. Light, cores da
// marca, 3 estágios de urgência (confortável → atenção → crítico), com barra de
// progresso do trial e CTA destacado. Sem ícones chamativos (Sparkles/Zap).
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Clock } from "lucide-react";
import { useTrial } from "@/hooks/useTrial";

type Stage = "comfortable" | "warning" | "critical";

const TRIAL_DAYS = 14;

const getStage = (days: number): Stage => {
    if (days <= 1) return "critical";
    if (days <= 3) return "warning";
    return "comfortable";
};

const styles: Record<Stage, { barBg: string; border: string; accent: string; text: string }> = {
    comfortable: { barBg: "#F8FAFC", border: "#E6EDF5", accent: "#2563EB", text: "#475569" },
    warning: { barBg: "#FFFBEB", border: "#FDE68A", accent: "#D97706", text: "#92400E" },
    critical: { barBg: "#FEF2F2", border: "#FECACA", accent: "#DC2626", text: "#991B1B" },
};

export const TrialBanner = () => {
    const { isTrialActive, daysRemaining } = useTrial();
    const [dismissed, setDismissed] = useState(false);

    if (!isTrialActive || dismissed) return null;

    const stage = getStage(daysRemaining);
    const s = styles[stage];
    const progress = Math.min(100, Math.max(6, ((TRIAL_DAYS - daysRemaining) / TRIAL_DAYS) * 100));

    const message =
        stage === "critical"
            ? daysRemaining <= 0
                ? "Seu teste termina hoje"
                : "Último dia de teste grátis"
            : `Teste grátis · ${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"}`;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative overflow-hidden"
                style={{ background: s.barBg, borderBottom: `1px solid ${s.border}` }}
            >
                <div className="px-4 sm:px-6 py-2 flex items-center gap-3">
                    <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${s.accent}1A` }}
                    >
                        <Clock className="h-3.5 w-3.5" style={{ color: s.accent }} />
                    </span>

                    <p className="text-[12.5px] font-semibold shrink-0" style={{ color: s.text }}>
                        {message}
                    </p>

                    {/* Barra de progresso do trial (esconde no mobile) */}
                    <div
                        className="hidden sm:block h-1.5 w-28 rounded-full overflow-hidden shrink-0"
                        style={{ background: "rgba(15,23,42,0.07)" }}
                        aria-hidden="true"
                    >
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: s.accent }}
                            initial={false}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        />
                    </div>

                    <div className="flex-1" />

                    <Link
                        to="/upgrade"
                        className="text-[12px] font-bold text-white px-3 py-1.5 rounded-full shrink-0 transition-transform hover:-translate-y-px"
                        style={{ background: s.accent, boxShadow: `0 2px 10px -3px ${s.accent}` }}
                    >
                        {stage === "comfortable" ? "Ver planos" : "Assinar agora"}
                    </Link>

                    {stage !== "critical" && (
                        <button
                            onClick={() => setDismissed(true)}
                            className="p-0.5 rounded hover:bg-black/5 transition-colors shrink-0"
                            aria-label="Fechar"
                        >
                            <X className="h-3.5 w-3.5" style={{ color: s.text }} />
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
