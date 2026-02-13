// Trial Banner Component - Progressive Urgency Based on Days Remaining
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, AlertTriangle, Timer, X } from 'lucide-react';
import { useTrial } from '@/hooks/useTrial';
import { Button } from '@/components/ui/button';

type UrgencyStage = 'comfortable' | 'warning' | 'critical';

interface UrgencyConfig {
    bgClass: string;
    icon: typeof Rocket;
    iconClass: string;
    textClass: string;
    getMessage: (days: number) => React.ReactNode;
    buttonText: string;
    buttonClass: string;
}

const getUrgencyStage = (daysRemaining: number): UrgencyStage => {
    if (daysRemaining <= 1) return 'critical';
    if (daysRemaining <= 3) return 'warning';
    return 'comfortable';
};

const urgencyConfigs: Record<UrgencyStage, UrgencyConfig> = {
    comfortable: {
        bgClass: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
        icon: Rocket,
        iconClass: 'text-white',
        textClass: 'text-white',
        getMessage: (days) => (
            <>
                Você está testando o <span className="font-bold">Game Sales PRO</span>.
                <span className="hidden sm:inline"> Restam <span className="font-bold">{days} dias</span>.</span>
            </>
        ),
        buttonText: 'Ver Planos',
        buttonClass: 'bg-white/20 hover:bg-white/30 text-white border-white/30',
    },
    warning: {
        bgClass: 'bg-gradient-to-r from-amber-500 to-amber-600',
        icon: AlertTriangle,
        iconClass: 'text-white',
        textClass: 'text-white',
        getMessage: (days) => (
            <>
                <span className="hidden sm:inline">⚡ Atenção: </span>
                Seu período de teste acaba em <span className="font-bold">{days} {days === 1 ? 'dia' : 'dias'}</span>!
            </>
        ),
        buttonText: 'Garantir Acesso',
        buttonClass: 'bg-white text-amber-700 hover:bg-white/90 font-bold shadow-lg',
    },
    critical: {
        bgClass: 'bg-gradient-to-r from-rose-600 to-rose-700',
        icon: Timer,
        iconClass: 'text-white animate-pulse',
        textClass: 'text-white',
        getMessage: (days) => (
            <span className="animate-pulse">
                ⚠️ {days === 0 ? 'SEU ACESSO EXPIRA HOJE' : 'ÚLTIMO DIA DE TESTE'}! Assine para não perder seus dados.
            </span>
        ),
        buttonText: 'ASSINAR AGORA',
        buttonClass: 'bg-white text-rose-700 hover:bg-white/90 font-bold shadow-lg uppercase tracking-wide',
    },
};

export const TrialBanner = () => {
    const { isTrialActive, daysRemaining } = useTrial();
    const [isDismissed, setIsDismissed] = useState(false);

    // Don't render if trial is not active or if dismissed
    if (!isTrialActive || isDismissed) {
        return null;
    }

    const stage = getUrgencyStage(daysRemaining);
    const config = urgencyConfigs[stage];
    const Icon = config.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative overflow-hidden"
            >
                <div className={`${config.bgClass} text-white`}>
                    <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
                        {/* Left: Message */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconClass}`} />
                            <p className={`text-sm font-medium truncate ${config.textClass}`}>
                                {config.getMessage(daysRemaining)}
                            </p>

                            {/* Countdown Badge - Only show in comfortable stage */}
                            {stage === 'comfortable' && (
                                <div className="hidden sm:flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5 flex-shrink-0">
                                    <Timer className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold">{daysRemaining} dias</span>
                                </div>
                            )}
                        </div>

                        {/* Right: CTA + Close */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Link to="/admin/upgrade">
                                <Button
                                    size="sm"
                                    className={`h-8 px-4 text-xs border-0 ${config.buttonClass}`}
                                >
                                    {config.buttonText}
                                </Button>
                            </Link>

                            {/* Only show close button in comfortable/warning stages */}
                            {stage !== 'critical' && (
                                <button
                                    onClick={() => setIsDismissed(true)}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    aria-label="Fechar banner"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
