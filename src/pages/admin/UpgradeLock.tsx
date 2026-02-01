// Upgrade Lock Page - Full screen blocker when trial expires
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Lock, AlertTriangle, Check, Sparkles, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import gameSalesLogo from '@/assets/logo-full.png';

const plans = [
    {
        id: 'starter',
        name: 'Starter',
        price: 'R$ 147',
        period: '/mês',
        description: 'Para times iniciando',
        icon: Zap,
        color: 'from-blue-500 to-cyan-500',
        features: [
            'Até 2 vendedores',
            'Dashboard básico',
            'CRM simplificado',
            'Suporte por email'
        ],
        highlight: false
    },
    {
        id: 'plus',
        name: 'Plus',
        price: 'R$ 297',
        period: '/mês',
        description: 'Para times em crescimento',
        icon: Sparkles,
        color: 'from-indigo-500 to-purple-500',
        features: [
            'Até 10 vendedores',
            'Relatórios avançados',
            'Gamificação completa',
            'Integrações premium',
            'Suporte prioritário'
        ],
        highlight: true
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 'R$ 797',
        period: '/mês',
        description: 'Para operações robustas',
        icon: Crown,
        color: 'from-amber-500 to-orange-500',
        features: [
            'Vendedores ilimitados',
            'API de automação',
            'White-label disponível',
            'Onboarding dedicado',
            'SLA garantido',
            'Suporte 24/7'
        ],
        highlight: false
    }
];

export default function UpgradeLock() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
                {/* Logo */}
                <img src={gameSalesLogo} alt="Game Sales" className="h-10 mb-8" />

                {/* Lock Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-6 shadow-xl shadow-red-500/30"
                >
                    <Lock className="h-12 w-12 text-white" />
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-10"
                >
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                        Seu período de teste acabou
                    </h1>
                    <p className="text-white/60 text-lg max-w-md mx-auto">
                        Escolha um plano para continuar usando o Game Sales e potencializar suas vendas.
                    </p>
                </motion.div>

                {/* Pricing Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid md:grid-cols-3 gap-6 max-w-5xl w-full"
                >
                    {plans.map((plan, index) => {
                        const Icon = plan.icon;
                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                className={`relative rounded-2xl p-6 ${plan.highlight
                                        ? 'bg-white/15 border-2 border-indigo-400/50 shadow-xl shadow-indigo-500/20'
                                        : 'bg-white/5 border border-white/10'
                                    }`}
                            >
                                {plan.highlight && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            Mais Popular
                                        </span>
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div className="text-center mb-6">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                                        <Icon className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                    <p className="text-white/50 text-sm">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="text-center mb-6">
                                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                                    <span className="text-white/50">{plan.period}</span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-white/80 text-sm">
                                            <Check className={`h-4 w-4 flex-shrink-0 ${plan.highlight ? 'text-indigo-400' : 'text-green-400'}`} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Link to={`/checkout?plan=${plan.id}`} className="block">
                                    <Button
                                        className={`w-full h-12 font-semibold ${plan.highlight
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white'
                                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                            }`}
                                    >
                                        Assinar {plan.name}
                                    </Button>
                                </Link>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Help text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-white/40 text-sm mt-8 text-center"
                >
                    Dúvidas? Entre em contato com{' '}
                    <a href="mailto:suporte@gamesales.app" className="text-indigo-400 hover:underline">
                        suporte@gamesales.app
                    </a>
                </motion.p>
            </div>
        </div>
    );
}
