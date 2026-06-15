// Upgrade Lock — tela cheia quando o trial expira.
// Light-first, azul da marca, planos do config central (sem preço/feature
// hardcoded), sem blur blobs nem ícones Sparkles/Zap.
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Check, Star, Crown, Rocket, ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { PLANS, formatPrice } from "@/config/plans";

const PLAN_ICONS: Record<string, LucideIcon> = {
    starter: Star,
    plus: Crown,
    pro: Rocket,
};

const PLAN_ORDER = ["starter", "plus", "pro"] as const;

export default function UpgradeLock() {
    useEffect(() => {
        trackEvent(FUNNEL_EVENTS.TRIAL_EXPIRED);
    }, []);

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFC" }}>
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16">
                <ThemeLogo className="h-9 mb-8" />

                {/* Selo de bloqueio — sóbrio, convite a continuar (azul, não alarme) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
                >
                    <Lock className="h-7 w-7" style={{ color: "#2563EB" }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-10 max-w-lg"
                >
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2.5" style={{ color: "#0B1220" }}>
                        Seu período de teste acabou
                    </h1>
                    <p className="text-[15px] leading-relaxed" style={{ color: "#64748B" }}>
                        Escolha um plano pra continuar com o Vyzon. Seus dados, pipeline e
                        conversas continuam salvos, é só reativar.
                    </p>
                </motion.div>

                {/* Planos — do config central, Plus em destaque */}
                <div className="grid md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl w-full">
                    {PLAN_ORDER.map((id, index) => {
                        const plan = PLANS[id];
                        const Icon = PLAN_ICONS[id];
                        const popular = !!plan.highlight;
                        const sellers =
                            plan.limits.sellers === 1
                                ? "1 vendedor"
                                : `Até ${plan.limits.sellers} vendedores`;

                        return (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.08 }}
                                className="relative rounded-2xl p-6 bg-white flex flex-col"
                                style={{
                                    boxShadow: popular
                                        ? "0 0 0 2px #2563EB, 0 18px 40px -20px rgba(37,99,235,0.45)"
                                        : "0 0 0 1px #E6EDF5, 0 10px 30px -22px rgba(15,23,42,0.25)",
                                }}
                            >
                                {popular && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                        <span
                                            className="text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full"
                                            style={{ background: "#2563EB", letterSpacing: "0.08em" }}
                                        >
                                            Mais popular
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{
                                            background: popular ? "rgba(37,99,235,0.1)" : "#F1F5F9",
                                        }}
                                    >
                                        <Icon className="h-5 w-5" style={{ color: popular ? "#2563EB" : "#64748B" }} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold" style={{ color: "#0B1220" }}>
                                            {plan.name}
                                        </h3>
                                        <p className="text-xs" style={{ color: "#94A3B8" }}>
                                            {plan.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-3xl font-bold tracking-tight" style={{ color: "#0B1220" }}>
                                        {formatPrice(plan.monthlyPrice)}
                                    </span>
                                    <span className="text-sm" style={{ color: "#94A3B8" }}>
                                        /mês
                                    </span>
                                </div>
                                <p className="text-xs font-semibold mb-5" style={{ color: "#2563EB" }}>
                                    {sellers}
                                </p>

                                <ul className="space-y-2.5 mb-6 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-[13px]" style={{ color: "#334155" }}>
                                            <span
                                                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                                style={{ background: "rgba(37,99,235,0.1)" }}
                                            >
                                                <Check className="h-2.5 w-2.5" style={{ color: "#2563EB" }} strokeWidth={3} />
                                            </span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={`/upgrade?plan=${id}`}
                                    className="block mt-auto"
                                    onClick={() => trackEvent(FUNNEL_EVENTS.UPGRADE_CLICK, { plan: id })}
                                >
                                    <Button
                                        className="w-full h-11 font-semibold text-[14px] rounded-xl border-none text-white"
                                        style={
                                            popular
                                                ? { background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }
                                                : { background: "#0B1220" }
                                        }
                                    >
                                        Assinar {plan.name}
                                        <ArrowRight className="ml-1.5 h-4 w-4" />
                                    </Button>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-[13px] mt-9 text-center"
                    style={{ color: "#94A3B8" }}
                >
                    Dúvidas?{" "}
                    <a href="mailto:suporte@vyzon.com.br" className="font-semibold hover:underline" style={{ color: "#2563EB" }}>
                        suporte@vyzon.com.br
                    </a>
                </motion.p>
            </div>
        </div>
    );
}
