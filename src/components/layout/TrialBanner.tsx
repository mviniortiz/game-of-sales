// Trial Banner — indicador discreto do período de teste (sem ícones chamativos)
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTrial } from '@/hooks/useTrial';

type Stage = 'comfortable' | 'warning' | 'critical';

const getStage = (days: number): Stage => {
    if (days <= 1) return 'critical';
    if (days <= 3) return 'warning';
    return 'comfortable';
};

const styles: Record<Stage, { bar: string; dot: string; text: string; link: string }> = {
    comfortable: {
        bar: 'bg-[#F8FAFC] border-b border-[#E6EDF5]',
        dot: '#2563EB',
        text: '#64748B',
        link: 'text-[#2563EB] hover:text-[#1D4ED8]',
    },
    warning: {
        bar: 'bg-[#FFFBEB] border-b border-[#FDE68A]',
        dot: '#D97706',
        text: '#92400E',
        link: 'text-[#B45309] hover:text-[#92400E]',
    },
    critical: {
        bar: 'bg-[#FEF2F2] border-b border-[#FECACA]',
        dot: '#DC2626',
        text: '#991B1B',
        link: 'text-[#DC2626] hover:text-[#991B1B]',
    },
};

export const TrialBanner = () => {
    const { isTrialActive, daysRemaining } = useTrial();
    const [dismissed, setDismissed] = useState(false);

    if (!isTrialActive || dismissed) return null;

    const stage = getStage(daysRemaining);
    const s = styles[stage];

    const message =
        stage === 'critical'
            ? daysRemaining <= 0
                ? 'Seu teste termina hoje'
                : 'Último dia de teste'
            : `Teste grátis · ${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`relative overflow-hidden ${s.bar}`}
            >
                <div className="px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
                        <p className="text-[12px] truncate" style={{ color: s.text }}>
                            {message}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Link
                            to="/upgrade"
                            className={`text-[12px] font-medium transition-colors ${s.link}`}
                        >
                            Ver planos
                        </Link>
                        {stage !== 'critical' && (
                            <button
                                onClick={() => setDismissed(true)}
                                className="p-0.5 rounded hover:bg-black/5 transition-colors"
                                aria-label="Fechar"
                            >
                                <X className="h-3.5 w-3.5" style={{ color: s.text }} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
