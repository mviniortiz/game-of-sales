import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Building2,
    Users,
    Sparkles,
    Trophy,
    Rocket,
    Instagram,
    Youtube,
    Linkedin,
    Mail,
    UserPlus,
    Search,
    MessageCircle,
    Loader2,
    User,
    TrendingDown,
    Target,
    Zap,
    BarChart3,
    Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import gameSalesLogo from "@/assets/logo-full.png";
import { Confetti } from "@/components/crm/Confetti";
import { addDays } from "date-fns";

// Trial info - always PRO plan
const TRIAL_DAYS = 7;
const TRIAL_PLAN = {
    name: "Pro",
    color: "text-amber-400"
};

// How did you hear about us options
const referralSources = [
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "youtube", label: "YouTube", icon: Youtube },
    { id: "linkedin", label: "LinkedIn", icon: Linkedin },
    { id: "google", label: "Google", icon: Search },
    { id: "indicacao", label: "Indicação", icon: UserPlus },
    { id: "email", label: "E-mail", icon: Mail },
    { id: "outro", label: "Outro", icon: MessageCircle }
];

// Company size options
const companySizes = [
    { id: "1-5", label: "1-5 vendedores", description: "Time pequeno e ágil" },
    { id: "6-15", label: "6-15 vendedores", description: "Time em crescimento" },
    { id: "16-50", label: "16-50 vendedores", description: "Time consolidado" },
    { id: "51-100", label: "51-100 vendedores", description: "Time grande" },
    { id: "100+", label: "100+ vendedores", description: "Operação robusta" }
];

// Main challenges options
const mainChallenges = [
    { id: "baixa_conversao", label: "Baixa conversão de leads", icon: TrendingDown },
    { id: "falta_organizacao", label: "Falta de organização", icon: Settings2 },
    { id: "bater_metas", label: "Dificuldade em bater metas", icon: Target },
    { id: "motivacao", label: "Falta de motivação do time", icon: Zap },
    { id: "processos_manuais", label: "Processos manuais demais", icon: BarChart3 },
    { id: "outro", label: "Outro desafio", icon: MessageCircle }
];

const TOTAL_STEPS = 5;

export default function Onboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);

    // Trial is always PRO (7 days)

    // States
    const [currentStep, setCurrentStep] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false); // Only show on completion
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

    // Form data
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [referralSource, setReferralSource] = useState("");
    const [mainChallenge, setMainChallenge] = useState("");

    // Focus input when step changes
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [currentStep]);

    // Handle Enter key to go to next step
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && canProceed()) {
                e.preventDefault();
                handleNext();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentStep, userName, companyName, teamSize, referralSource, mainChallenge]);

    const canProceed = () => {
        switch (currentStep) {
            case 1: return userName.length >= 2 && userEmail.includes('@') && userPassword.length >= 6;
            case 2: return companyName.length >= 2;
            case 3: return teamSize !== "";
            case 4: return referralSource !== "";
            case 5: return mainChallenge !== "";
            default: return false;
        }
    };

    const handleNext = () => {
        if (!canProceed()) return;

        if (currentStep < TOTAL_STEPS) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!canProceed()) return;

        setIsLoading(true);

        try {
            let currentUser = user;

            // If not logged in, create account
            if (!currentUser) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: userEmail,
                    password: userPassword,
                    options: {
                        data: {
                            nome: userName
                        }
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error("Erro ao criar conta. Tente novamente.");

                currentUser = authData.user;
            }

            // Calculate trial end date (7 days from now)
            const trialEndsAt = addDays(new Date(), 7).toISOString();

            // Create company with trial status - always start on PRO trial
            const { data: companyData, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: companyName,
                    plan: 'pro', // Start on PRO for reverse trial
                    team_size: teamSize,
                    referral_source: referralSource,
                    main_challenge: mainChallenge,
                    trial_ends_at: trialEndsAt,
                    subscription_status: 'trialing'
                } as any) // Type assertion until migration is applied
                .select()
                .single();

            if (companyError) throw companyError;

            // Update user profile with company_id and name
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    company_id: companyData.id,
                    role: "admin",
                    nome: userName
                })
                .eq("id", currentUser.id);

            if (profileError) throw profileError;

            // Success!
            setIsComplete(true);
            setShowConfetti(true);

            // Redirect to dashboard after 2.5 seconds (skip checkout)
            setTimeout(() => {
                navigate("/admin/dashboard");
            }, 2500);

        } catch (error: any) {
            console.error("Onboarding error:", error);
            toast({
                title: "Erro no cadastro",
                description: error.message || "Tente novamente",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Animation variants - smoother spring animations
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.98
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -50 : 50,
            opacity: 0,
            scale: 0.98
        })
    };

    // Auto-advance when selection is made
    const handleSelectionWithAdvance = (setter: (val: string) => void, value: string) => {
        setter(value);
        // Small delay for visual feedback before advancing
        setTimeout(() => {
            setDirection(1);
            if (currentStep < TOTAL_STEPS) {
                setCurrentStep(prev => prev + 1);
            } else {
                handleSubmit();
            }
        }, 300);
    };

    // Progress bar component - Gold XP style
    const ProgressBar = () => (
        <div className="flex items-center gap-2 mb-6">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${index + 1 <= currentStep
                        ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                        : "bg-slate-800"
                        }`}
                />
            ))}
        </div>
    );

    // Step components
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-14 h-14 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <User className="h-7 w-7 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                            Crie sua conta grátis
                        </h2>
                        <p className="text-amber-400 font-medium mb-5 text-sm">
                            7 dias grátis do plano <span className="font-bold">PRO</span> 🚀
                        </p>
                        <div className="space-y-3">
                            <Input
                                ref={inputRef}
                                placeholder="Seu nome"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-indigo-600 h-12 text-base rounded-xl"
                                autoFocus
                            />
                            <Input
                                type="email"
                                placeholder="E-mail"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-indigo-600 h-12 text-base rounded-xl"
                            />
                            <Input
                                type="password"
                                placeholder="Senha (mín. 6 caracteres)"
                                value={userPassword}
                                onChange={(e) => setUserPassword(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-indigo-600 h-12 text-base rounded-xl"
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-14 h-14 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Building2 className="h-7 w-7 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                            Qual é o nome da sua empresa?
                        </h2>
                        <p className="text-slate-400 mb-5 text-sm">
                            Vamos configurar seu espaço de trabalho
                        </p>
                        <Input
                            ref={inputRef}
                            placeholder="Ex: Empresa XYZ"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-indigo-600 h-12 text-base text-center rounded-xl"
                            autoFocus
                        />
                    </div>
                );

            case 3:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-14 h-14 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Users className="h-7 w-7 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                            Quantos vendedores você tem?
                        </h2>
                        <p className="text-slate-400 mb-5 text-sm">
                            Isso nos ajuda a personalizar sua experiência
                        </p>
                        <div className="grid gap-2">
                            {companySizes.map((size, index) => (
                                <motion.button
                                    key={size.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05, duration: 0.2 }}
                                    onClick={() => handleSelectionWithAdvance(setTeamSize, size.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all duration-200 ${teamSize === size.id
                                        ? "bg-indigo-600/20 border-indigo-500/50 text-white ring-2 ring-indigo-500/30 scale-[1.02]"
                                        : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-700"
                                        }`}
                                >
                                    <span className="font-medium">{size.label}</span>
                                    <span className="text-sm text-slate-500">{size.description}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-14 h-14 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Sparkles className="h-7 w-7 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                            Por onde nos conheceu?
                        </h2>
                        <p className="text-slate-400 mb-5 text-sm">
                            Adoramos saber como você chegou até nós!
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {referralSources.map((source, index) => {
                                const Icon = source.icon;
                                const isSelected = referralSource === source.id;
                                return (
                                    <motion.button
                                        key={source.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.04, duration: 0.2 }}
                                        onClick={() => handleSelectionWithAdvance(setReferralSource, source.id)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`flex flex-col items-center gap-2 px-4 py-3.5 rounded-xl border transition-all duration-200 ${isSelected
                                            ? "bg-indigo-600/20 border-indigo-500/50 text-white ring-2 ring-indigo-500/30 scale-105"
                                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-700"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-xs font-medium">{source.label}</span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-14 h-14 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Target className="h-7 w-7 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                            Qual o maior desafio do seu time?
                        </h2>
                        <p className="text-slate-400 mb-5 text-sm">
                            Queremos ajudar você a superar esse obstáculo! 💪
                        </p>
                        <div className="grid gap-2">
                            {mainChallenges.map((challenge, index) => {
                                const Icon = challenge.icon;
                                const isSelected = mainChallenge === challenge.id;
                                return (
                                    <motion.button
                                        key={challenge.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.2 }}
                                        onClick={() => handleSelectionWithAdvance(setMainChallenge, challenge.id)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all duration-200 ${isSelected
                                            ? "bg-indigo-600/20 border-indigo-500/50 text-white ring-2 ring-indigo-500/30 scale-[1.02]"
                                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-700"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        <span className="font-medium text-left">{challenge.label}</span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Success screen
    if (isComplete) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500/30">
                <Confetti show={showConfetti} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
                    >
                        <Trophy className="h-10 w-10 text-white" />
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-amber-400 font-bold text-sm uppercase tracking-wider mb-2"
                    >
                        🏆 Level 1 Desbloqueado
                    </motion.p>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                        Bem-vindo, {userName}!
                    </h1>
                    <p className="text-slate-400 text-lg mb-8">
                        Sua jornada no Game Sales começa agora
                    </p>

                    <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <p className="text-slate-600 text-sm mt-4">
                        Entrando no dashboard...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500/30">
            {/* Confetti */}
            <Confetti show={showConfetti} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-xl"
            >
                {/* Logo */}
                <div className="text-center mb-6">
                    <img src={gameSalesLogo} alt="Game Sales" className="h-10 mx-auto mb-4" />
                    {currentStep === 1 && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-white/60 text-sm"
                        >
                            🎮 Trial de <span className="font-semibold text-amber-400">7 dias</span> do plano <span className="font-semibold text-amber-400">PRO</span>
                        </motion.p>
                    )}
                </div>

                {/* Progress bar */}
                <ProgressBar />

                {/* Card - The Console */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl shadow-black p-8">
                    {/* Step counter */}
                    <div className="text-center mb-6">
                        <span className="text-slate-500 text-sm">
                            Passo {currentStep} de {TOTAL_STEPS}
                        </span>
                    </div>

                    {/* Step content with animation */}
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                duration: 0.25
                            }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="flex items-center gap-3 mt-8">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                disabled={isLoading}
                                className="text-slate-500 hover:text-white transition-colors px-4 py-2 disabled:opacity-50"
                            >
                                <ArrowLeft className="inline mr-1 h-4 w-4" />
                                Voltar
                            </button>
                        )}

                        <Button
                            onClick={handleNext}
                            disabled={!canProceed() || isLoading}
                            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 border-none transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Configurando...
                                </>
                            ) : currentStep === TOTAL_STEPS ? (
                                <>
                                    <Rocket className="mr-2 h-5 w-5" />
                                    Começar a usar!
                                </>
                            ) : (
                                <>
                                    Continuar
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-center text-slate-600 text-xs mt-4">
                        Pressione <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Enter</kbd> para continuar
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
