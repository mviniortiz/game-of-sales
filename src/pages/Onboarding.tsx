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

// Plan details
const planDetails: Record<string, { name: string; price: string; color: string; gradient: string }> = {
    starter: {
        name: "Starter",
        price: "R$ 147/mês",
        color: "text-blue-400",
        gradient: "from-blue-500 to-cyan-500"
    },
    plus: {
        name: "Plus",
        price: "R$ 297/mês",
        color: "text-indigo-400",
        gradient: "from-indigo-500 to-purple-500"
    },
    pro: {
        name: "Pro",
        price: "R$ 797/mês",
        color: "text-amber-400",
        gradient: "from-amber-500 to-orange-500"
    }
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

    // Get plan from URL
    const planParam = searchParams.get("plan") || "starter";
    const plan = planDetails[planParam] || planDetails.starter;

    // States
    const [currentStep, setCurrentStep] = useState(1);
    const [showConfetti, setShowConfetti] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

    // Form data
    const [userName, setUserName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [referralSource, setReferralSource] = useState("");
    const [mainChallenge, setMainChallenge] = useState("");

    // Hide initial confetti after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
    }, []);

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
            case 1: return userName.length >= 2;
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
            // Get current user
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            if (!currentUser) {
                throw new Error("Usuário não encontrado. Faça login novamente.");
            }

            // Create company with all collected data
            const { data: companyData, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: companyName,
                    plan: planParam === "starter" ? "basic" : planParam,
                    team_size: teamSize,
                    referral_source: referralSource,
                    main_challenge: mainChallenge
                })
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

            // Redirect after 2.5 seconds
            setTimeout(() => {
                navigate("/dashboard");
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

    // Animation variants
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -100 : 100,
            opacity: 0
        })
    };

    // Progress bar component
    const ProgressBar = () => (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${index + 1 <= currentStep
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                            : "bg-white/10"
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
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                            <User className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Qual é o seu nome?
                        </h2>
                        <p className="text-white/60 mb-8">
                            Queremos te conhecer melhor! 👋
                        </p>
                        <Input
                            ref={inputRef}
                            placeholder="Digite seu nome"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-400 h-14 text-lg text-center"
                            autoFocus
                        />
                    </div>
                );

            case 2:
                return (
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                            <Building2 className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Qual é o nome da sua empresa?
                        </h2>
                        <p className="text-white/60 mb-8">
                            Vamos configurar seu espaço de trabalho
                        </p>
                        <Input
                            ref={inputRef}
                            placeholder="Ex: Empresa XYZ"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 h-14 text-lg text-center"
                            autoFocus
                        />
                    </div>
                );

            case 3:
                return (
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
                            <Users className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Quantos vendedores você tem?
                        </h2>
                        <p className="text-white/60 mb-8">
                            Isso nos ajuda a personalizar sua experiência
                        </p>
                        <div className="grid gap-3">
                            {companySizes.map((size) => (
                                <button
                                    key={size.id}
                                    onClick={() => setTeamSize(size.id)}
                                    className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${teamSize === size.id
                                            ? "bg-emerald-500/20 border-emerald-400/50 text-white"
                                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <span className="font-medium">{size.label}</span>
                                    <span className="text-sm text-white/50">{size.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Por onde nos conheceu?
                        </h2>
                        <p className="text-white/60 mb-8">
                            Adoramos saber como você chegou até nós!
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {referralSources.map((source) => {
                                const Icon = source.icon;
                                const isSelected = referralSource === source.id;
                                return (
                                    <button
                                        key={source.id}
                                        onClick={() => setReferralSource(source.id)}
                                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all ${isSelected
                                                ? "bg-pink-500/20 border-pink-400/50 text-white"
                                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-6 w-6" />
                                        <span className="text-sm font-medium">{source.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
                            <Target className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            Qual o maior desafio do seu time?
                        </h2>
                        <p className="text-white/60 mb-8">
                            Queremos ajudar você a superar esse obstáculo! 💪
                        </p>
                        <div className="grid gap-3">
                            {mainChallenges.map((challenge) => {
                                const Icon = challenge.icon;
                                const isSelected = mainChallenge === challenge.id;
                                return (
                                    <button
                                        key={challenge.id}
                                        onClick={() => setMainChallenge(challenge.id)}
                                        className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${isSelected
                                                ? "bg-amber-500/20 border-amber-400/50 text-white"
                                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        <span className="font-medium text-left">{challenge.label}</span>
                                    </button>
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
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
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-8"
                    >
                        <CheckCircle2 className="h-12 w-12 text-white" />
                    </motion.div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                        Tudo pronto, {userName}! 🚀
                    </h1>
                    <p className="text-white/60 text-lg mb-6">
                        Sua conta foi configurada com sucesso
                    </p>

                    <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <p className="text-white/40 text-sm mt-4">
                        Redirecionando para o dashboard...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            {/* Confetti */}
            <Confetti show={showConfetti} />

            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-lg"
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
                            Plano <span className={`font-semibold ${plan.color}`}>{plan.name}</span> ativado ✓
                        </motion.p>
                    )}
                </div>

                {/* Progress bar */}
                <ProgressBar />

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
                    {/* Step counter */}
                    <div className="text-center mb-6">
                        <span className="text-white/40 text-sm">
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
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation buttons */}
                    <div className="flex items-center gap-3 mt-8">
                        {currentStep > 1 && (
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={isLoading}
                                className="flex-1 h-12 bg-white/5 border-white/20 text-white hover:bg-white/10"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Button>
                        )}

                        <Button
                            onClick={handleNext}
                            disabled={!canProceed() || isLoading}
                            className={`flex-1 h-12 bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white font-semibold`}
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
                    <p className="text-center text-white/30 text-xs mt-4">
                        Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> para continuar
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
