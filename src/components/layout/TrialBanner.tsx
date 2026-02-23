// Trial Banner Component - Progressive Urgency Based on Days Remaining
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, AlertTriangle, Timer, X, Zap, Trophy } from 'lucide-react';
import { useTrial } from '@/hooks/useTrial';
import { Button } from '@/components/ui/button';

type UrgencyStage = 'comfortable' | 'warning' | 'critical';

interface UrgencyConfig {
    bgClass: string;
    borderClass: string;
    icon: typeof Rocket;
    iconClass: string;
    textClass: string;
    getMessage: (days: number) => React.ReactNode;
    buttonText: string;
    buttonClass: string;
    chipLabel?: string;
    chipClass?: string;
}

const getUrgencyStage = (daysRemaining: number): UrgencyStage => {
    if (daysRemaining <= 1) return 'critical';
    if (daysRemaining <= 3) return 'warning';
    return 'comfortable';
};

const urgencyConfigs: Record<UrgencyStage, UrgencyConfig> = {
    comfortable: {
        bgClass: 'bg-[#0a0f1a]',
        borderClass: 'border-b border-emerald-500/20',
        icon: Trophy,
        iconClass: 'text-emerald-400',
        textClass: 'text-slate-200',
        getMessage: (days) => (
            <>
                Você está no{' '}
                <span className="font-bold text-emerald-400">Game Sales PRO Trial</span>
                <span className="hidden sm:inline text-slate-400">
                    {' '}— Acesso completo por{' '}
                    <span className="font-bold text-white">{days} dias</span>
                </span>
            </>
        ),
        buttonText: 'Ver Planos',
        buttonClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        chipLabel: 'TRIAL ATIVO',
        chipClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    warning: {
        bgClass: 'bg-[#0a0f1a]',
        borderClass: 'border-b border-amber-500/30',
        icon: AlertTriangle,
        iconClass: 'text-amber-400',
        textClass: 'text-slate-200',
        getMessage: (days) => (
            <>
                <span className="hidden sm:inline text-slate-400">⚡ Atenção: </span>
                Seu trial expira em{' '}
                <span className="font-bold text-amber-400">{days} {days === 1 ? 'dia' : 'dias'}</span>
                <span className="hidden sm:inline text-slate-400"> — não perca seus dados!</span>
            </>
        ),
        buttonText: 'Garantir Acesso',
        buttonClass: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold',
        chipLabel: `${0} DIAS`,
        chipClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    },
    critical: {
        bgClass: 'bg-[#0a0f1a]',
        borderClass: 'border-b border-rose-500/40',
        icon: Timer,
        iconClass: 'text-rose-400 animate-pulse',
        textClass: 'text-slate-200',
        getMessage: (days) => (
            <span>
                ⚠️{' '}
                <span className="text-rose-400 font-bold">
                    {days === 0 ? 'SEU ACESSO EXPIRA HOJE' : 'ÚLTIMO DIA DE TRIAL'}
                </span>
                {' '}— Assine agora para não perder seus dados.
            </span>
        ),
        buttonText: 'ASSINAR AGORA',
        buttonClass: 'bg-rose-500 hover:bg-rose-400 text-white font-bold shadow-lg shadow-rose-500/25 uppercase tracking-wide',
        chipLabel: 'EXPIRA HOJE',
        chipClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse',
    },
};

// Mini countdown block
const DayBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg px-2.5 py-1 min-w-[2.5rem] border border-white/10">
        <span className="text-sm font-bold tabular-nums text-white leading-none">{String(value).padStart(2, '0')}</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-wide leading-none mt-0.5">{label}</span>
    </div>
);

export const TrialBanner = () => {
    const { isTrialActive, daysRemaining, trialEndsAt } = useTrial();
    const [isDismissed, setIsDismissed] = useState(false);

    if (!isTrialActive || isDismissed) {
        return null;
    }

    const stage = getUrgencyStage(daysRemaining);
    const config = urgencyConfigs[stage];
    const Icon = config.icon;

    // Build chip label with dynamic days
    const chipLabel = stage === 'comfortable'
        ? 'TRIAL ATIVO'
        : stage === 'warning'
            ? `${daysRemaining} DIAS`
            : 'EXPIRA HOJE';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`relative overflow-hidden ${config.bgClass} ${config.borderClass}`}
            >
                <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
                    {/* Left: Status chip + Icon + Message */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Status chip */}
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest flex-shrink-0 ${config.chipClass || 'bg-white/10 text-white'}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 inline-block" />
                            {chipLabel}
                        </span>

                        {/* Icon */}
                        <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconClass}`} />

                        {/* Message */}
                        <p className={`text-sm font-medium truncate ${config.textClass}`}>
                            {config.getMessage(daysRemaining)}
                        </p>

                        {/* Day countdown blocks — only comfortable stage, desktop */}
                        {stage === 'comfortable' && (
                            <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0 ml-2">
                                <DayBlock value={daysRemaining} label="dias" />
                            </div>
                        )}
                    </div>

                    {/* Right: CTA + Progress bar + Close */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Trial progress mini-bar — comfortable only */}
                        {stage === 'comfortable' && (
                            <div className="hidden md:flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${Math.round(((7 - daysRemaining) / 7) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                    {daysRemaining}d restantes
                                </span>
                            </div>
                        )}

                        <Link to="/admin/upgrade">
                            <Button
                                size="sm"
                                className={`h-7 px-3.5 text-xs border-0 rounded-lg ${config.buttonClass}`}
                            >
                                <Zap className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                {config.buttonText}
                            </Button>
                        </Link>

                        {/* Close only in non-critical stages */}
                        {stage !== 'critical' && (
                            <button
                                onClick={() => setIsDismissed(true)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                                aria-label="Fechar banner"
                            >
                                <X className="h-3.5 w-3.5 text-slate-500" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
