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
    Settings2,
    CreditCard,
    Check,
    Star,
    Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import gameSalesLogo from "@/assets/logo-full.png";
import { Confetti } from "@/components/crm/Confetti";
import { addDays } from "date-fns";
import { CardPayment } from "@mercadopago/sdk-react";
import { initializeMercadoPago } from "@/lib/mercadopago";

// Trial info
const TRIAL_DAYS = 7;

// Subscription plans with real MP plan IDs
const subscriptionPlans = [
    {
        id: "starter",
        mpPlanId: "dd862f815f6b4d6285b2b8119710553b",
        name: "Starter",
        price: 147,
        color: "from-slate-500 to-slate-600",
        borderColor: "border-slate-500/30",
        features: ["Até 10 vendedores", "Ranking básico", "Metas simples"]
    },
    {
        id: "plus",
        mpPlanId: "7c2c9ac396684c229987a7501cf4f88c",
        name: "Plus",
        price: 397,
        color: "from-emerald-500 to-emerald-600",
        borderColor: "border-emerald-500/30",
        popular: true,
        features: ["Até 30 vendedores", "Ranking + Gamificação", "CRM completo", "Relatórios avançados"]
    },
    {
        id: "pro",
        mpPlanId: "7f7561d2b1174aacb31ab92dce72ded4",
        name: "Pro",
        price: 797,
        color: "from-amber-500 to-amber-600",
        borderColor: "border-amber-500/30",
        features: ["Vendedores ilimitados", "Tudo do Plus", "API + Integrações", "Suporte prioritário"]
    }
];

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

const TOTAL_STEPS = 6; // Now includes checkout step

export default function Onboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user, refreshProfile } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);

    // States
    const [currentStep, setCurrentStep] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [direction, setDirection] = useState(1);
    const [mpInitialized, setMpInitialized] = useState(false);

    // Form data
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userPassword, setUserPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [referralSource, setReferralSource] = useState("");
    const [mainChallenge, setMainChallenge] = useState("");
    const [selectedPlan, setSelectedPlan] = useState("pro"); // Default to Pro
    const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
    const [createdUserId, setCreatedUserId] = useState<string | null>(null);

    // Initialize MP SDK when reaching step 6
    useEffect(() => {
        if (currentStep === 6 && !mpInitialized) {
            initializeMercadoPago();
            setMpInitialized(true);
        }
    }, [currentStep, mpInitialized]);

    // Focus input when step changes
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [currentStep]);

    // Handle Enter key to go to next step
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && canProceed() && currentStep < 6) {
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
            case 6: return selectedPlan !== "";
            default: return false;
        }
    };

    const handleNext = async () => {
        if (!canProceed()) return;

        // Step 5 → 6: Create account and company first
        if (currentStep === 5) {
            setIsLoading(true);
            try {
                // Always sign out first to ensure clean session for new user
                if (user) {
                    await supabase.auth.signOut();
                }

                // Create new account
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: userEmail,
                    password: userPassword,
                    options: {
                        data: { nome: userName }
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error("Erro ao criar conta.");

                const currentUser = authData.user;

                setCreatedUserId(currentUser.id);

                // Calculate trial end date
                const trialEndsAt = addDays(new Date(), TRIAL_DAYS).toISOString();

                // Create company with trialing status
                const { data: companyData, error: companyError } = await supabase
                    .from("companies")
                    .insert({
                        name: companyName,
                        plan: selectedPlan,
                        team_size: teamSize,
                        referral_source: referralSource,
                        main_challenge: mainChallenge,
                        trial_ends_at: trialEndsAt,
                        subscription_status: 'trialing'
                    } as any)
                    .select()
                    .single();

                if (companyError) throw companyError;

                setCreatedCompanyId(companyData.id);

                // Update user profile
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        company_id: companyData.id,
                        role: "admin",
                        nome: userName
                    })
                    .eq("id", currentUser.id);

                if (profileError) throw profileError;

                // Force AuthContext to reload the NEW user's profile.
                // Without this, the sidebar/header may still show the
                // previous logged-in user's avatar (race condition between
                // onAuthStateChange and the profile update above).
                await refreshProfile();

                // Proceed to step 6 (payment)
                setDirection(1);
                setCurrentStep(6);
            } catch (error: any) {
                console.error("Account creation error:", error);
                toast({
                    title: "Erro no cadastro",
                    description: error.message || "Tente novamente",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        if (currentStep < TOTAL_STEPS) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1 && currentStep !== 6) {
            // Don't allow going back from payment step (account already created)
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    };

    // Handle card payment submission
    const handleCardPayment = async (formData: any) => {
        setIsLoading(true);

        try {
            // Call Edge Function to create subscription
            const { data, error } = await supabase.functions.invoke('mercadopago-create-subscription', {
                body: {
                    token: formData.token,
                    email: userEmail,
                    planId: subscriptionPlans.find(p => p.id === selectedPlan)?.mpPlanId,
                    companyId: createdCompanyId,
                    payerInfo: {
                        email: userEmail,
                        identification: formData.payer?.identification
                    }
                }
            });

            if (error) throw error;

            // Success! Reload profile before navigating so the sidebar
            // shows the correct avatar/name for the newly created account.
            await refreshProfile();

            setIsComplete(true);
            setShowConfetti(true);

            setTimeout(() => {
                navigate("/dashboard");
            }, 2500);

        } catch (error: any) {
            console.error("Payment error:", error);
            toast({
                title: "Erro no pagamento",
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
        setTimeout(() => {
            setDirection(1);
            if (currentStep < 5) {
                setCurrentStep(prev => prev + 1);
            } else if (currentStep === 5) {
                handleNext();
            }
        }, 300);
    };

    // Progress bar
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
                    <div className="text-center group">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <User className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Crie sua conta grátis
                        </h2>
                        <p className="text-amber-400 font-medium mb-8 text-sm bg-amber-500/10 inline-block px-4 py-1.5 rounded-full border border-amber-500/20">
                            7 dias grátis em qualquer plano 🚀
                        </p>
                        <div className="space-y-4">
                            <Input
                                ref={inputRef}
                                placeholder="Seu nome completo"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="bg-slate-900/50 backdrop-blur-sm border-slate-800 text-white placeholder:text-slate-500 focus-visible:bg-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:border-slate-700 h-14 text-base rounded-2xl transition-all duration-300"
                                autoFocus
                            />
                            <Input
                                type="email"
                                placeholder="Seu melhor e-mail corporativo"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                className="bg-slate-900/50 backdrop-blur-sm border-slate-800 text-white placeholder:text-slate-500 focus-visible:bg-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:border-slate-700 h-14 text-base rounded-2xl transition-all duration-300"
                            />
                            <Input
                                type="password"
                                placeholder="Crie uma senha forte (mínimo 6 caracteres)"
                                value={userPassword}
                                onChange={(e) => setUserPassword(e.target.value)}
                                className="bg-slate-900/50 backdrop-blur-sm border-slate-800 text-white placeholder:text-slate-500 focus-visible:bg-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:border-slate-700 h-14 text-base rounded-2xl transition-all duration-300"
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
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Building2 className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Qual é o nome da sua empresa?
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm">
                            Vamos configurar seu espaço de trabalho personalizado
                        </p>
                        <Input
                            ref={inputRef}
                            placeholder="Ex: Acme Inc."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="bg-slate-900/50 backdrop-blur-sm border-slate-800 text-white placeholder:text-slate-500 focus-visible:bg-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:border-slate-700 h-14 text-base text-center rounded-2xl transition-all duration-300"
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
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Users className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Quantos vendedores você tem?
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm">
                            Isso nos ajuda a personalizar sua experiência e dimensionar o ambiente
                        </p>
                        <div className="grid gap-3">
                            {companySizes.map((size, index) => {
                                const isSelected = teamSize === size.id;
                                return (
                                    <motion.button
                                        key={size.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                        onClick={() => handleSelectionWithAdvance(setTeamSize, size.id)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`group relative flex items-center justify-between px-6 py-5 rounded-2xl border transition-all duration-300 overflow-hidden ${isSelected
                                            ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)] text-white"
                                            : "bg-slate-900/40 backdrop-blur-sm border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white hover:border-slate-700 hover:shadow-lg"
                                            }`}
                                    >
                                        {/* Hover glare effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

                                        <span className={`font-semibold text-lg transition-colors ${isSelected ? "text-emerald-400" : ""}`}>{size.label}</span>
                                        <span className={`text-sm transition-colors ${isSelected ? "text-emerald-200" : "text-slate-500"}`}>{size.description}</span>

                                        {isSelected && (
                                            <motion.div layoutId="teamSizeCheck" className="absolute right-6">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
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
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Sparkles className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Por onde nos conheceu?
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm">
                            Adoramos saber como as empresas de sucesso chegam até nós!
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {referralSources.map((source, index) => {
                                const Icon = source.icon;
                                const isSelected = referralSource === source.id;
                                return (
                                    <motion.button
                                        key={source.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                        onClick={() => handleSelectionWithAdvance(setReferralSource, source.id)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`group relative flex flex-col items-center justify-center gap-3 px-4 py-6 rounded-2xl border transition-all duration-300 overflow-hidden ${isSelected
                                            ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]"
                                            : "bg-slate-900/40 backdrop-blur-sm border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-lg hover:text-white"
                                            }`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className={`p-3 rounded-xl transition-colors ${isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500 group-hover:text-amber-500 group-hover:bg-amber-500/10"}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-semibold">{source.label}</span>
                                        {isSelected && (
                                            <motion.div layoutId="referralCheck" className="absolute top-2 right-2">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            </motion.div>
                                        )}
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
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Target className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Qual o maior desafio do seu time?
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm">
                            Queremos configurar a plataforma para atacar o seu gargalo primeiro 💪
                        </p>
                        <div className="grid gap-3">
                            {mainChallenges.map((challenge, index) => {
                                const Icon = challenge.icon;
                                const isSelected = mainChallenge === challenge.id;
                                return (
                                    <motion.button
                                        key={challenge.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                        onClick={() => handleSelectionWithAdvance(setMainChallenge, challenge.id)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`group relative flex items-center gap-4 px-6 py-5 rounded-2xl border transition-all duration-300 overflow-hidden ${isSelected
                                            ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]"
                                            : "bg-slate-900/40 backdrop-blur-sm border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white hover:border-slate-700 hover:shadow-lg"
                                            }`}
                                    >
                                        {/* Hover glare effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

                                        <div className={`p-2.5 rounded-lg transition-colors ${isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-500/10"}`}>
                                            <Icon className="h-5 w-5 flex-shrink-0" />
                                        </div>
                                        <span className={`font-semibold text-left transition-colors ${isSelected ? "text-emerald-400" : ""}`}>{challenge.label}</span>

                                        {isSelected && (
                                            <motion.div layoutId="challengeCheck" className="absolute right-6 ml-auto">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                );

            // Note: The payment wrapper (step 6) is in another chunk to avoid making this chunk too large.
            case 6: {
                const currentPlan = subscriptionPlans.find(p => p.id === selectedPlan)!;
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <CreditCard className="h-8 w-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Escolha seu plano
                        </h2>
                        <p className="inline-block text-amber-400 font-medium mb-8 text-sm bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                            🎁 7 dias grátis, cancele quando quiser
                        </p>

                        {/* Plan selection */}
                        <div className="grid gap-4 mb-8">
                            {subscriptionPlans.map((plan) => (
                                <motion.button
                                    key={plan.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`relative flex items-center justify-between px-6 py-6 rounded-2xl border transition-all duration-300 overflow-hidden group ${selectedPlan === plan.id
                                        ? `bg-gradient-to-r ${plan.color} border-transparent text-white shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]`
                                        : "bg-slate-900/40 backdrop-blur-sm border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-lg"
                                        }`}
                                >
                                    {selectedPlan !== plan.id && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                    )}

                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 overflow-hidden w-24 h-24">
                                            <div className="absolute -top-6 -right-6 w-32 bg-amber-500 text-black text-[10px] font-bold py-1 px-8 rotate-45 text-center shadow-lg">
                                                POPULAR
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selectedPlan === plan.id ? "border-white bg-white shadow-[0_0_10px_white]" : "border-slate-600 group-hover:border-slate-400"
                                            }`}>
                                            {selectedPlan === plan.id && (
                                                <Check className="h-4 w-4 text-emerald-600" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-bold text-lg ${selectedPlan === plan.id ? "text-white" : "text-emerald-400"}`}>{plan.name}</p>
                                            <p className="text-sm opacity-90 mt-0.5 max-w-[180px] leading-tight flex items-center gap-1">
                                                <Check className="w-3 h-3 opacity-70" /> {plan.features[0]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10 mr-4">
                                        <p className="text-2xl font-black tabular-nums tracking-tight">
                                            R${plan.price}
                                        </p>
                                        <p className="text-xs uppercase tracking-wider font-semibold opacity-80">/mês</p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Card Payment Brick */}
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                            <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm">
                                <Shield className="h-4 w-4" />
                                <span>Pagamento seguro via Mercado Pago</span>
                            </div>

                            {mpInitialized ? (
                                <CardPayment
                                    initialization={{
                                        amount: currentPlan.price
                                    }}
                                    customization={{
                                        paymentMethods: {
                                            maxInstallments: 1
                                        },
                                        visual: {
                                            style: {
                                                theme: 'dark'
                                            }
                                        }
                                    }}
                                    onSubmit={handleCardPayment}
                                    onError={(error) => {
                                        console.error("Card error:", error);
                                        toast({
                                            title: "Erro no cartão",
                                            description: "Verifique os dados e tente novamente",
                                            variant: "destructive"
                                        });
                                    }}
                                />
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    // Success screen
    if (isComplete) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-emerald-500/30">
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
                        className="w-24 h-24 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]"
                    >
                        <Trophy className="h-12 w-12 text-emerald-500" />
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
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <p className="text-slate-500 text-sm mt-6 font-medium">
                        Preparando seu dashboard...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex selection:bg-emerald-500/30">
            <Confetti show={showConfetti} />

            {/* Left Panel - Branding & Social Proof (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 border-r border-slate-800 overflow-hidden flex-col justify-between p-12">
                {/* Background effects */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Abstract grid pattern */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <img src={gameSalesLogo} alt="Game Sales" className="h-12 mb-8" />
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                            Transforme sua operação comercial em uma <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">máquina de vendas</span>.
                        </h1>
                        <p className="text-lg text-slate-400 max-w-md">
                            Milhares de empresas já estão batendo suas metas através de nossa plataforma gameficada de CRM.
                        </p>
                    </motion.div>
                </div>

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl"
                    >
                        <div className="flex items-center gap-1 mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="w-5 h-5 fill-amber-500 text-amber-500" />
                            ))}
                        </div>
                        <p className="text-slate-300 font-medium italic mb-4 text-base">
                            "Desde que implementamos o Game of Sales, o engajamento do time explodiu. A conversão de leads nunca esteve tão alta e finalmente temos visão clara das metas."
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700">
                                <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Mariana Costa</h4>
                                <p className="text-slate-400 text-xs text-left">Diretora de Vendas • TechGrowth</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Form Steps */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-10">
                        <img src={gameSalesLogo} alt="Game Sales" className="h-10 mx-auto" />
                    </div>

                    {/* Progress Indicator */}
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-400 text-sm font-medium">Passo {currentStep} de {TOTAL_STEPS}</span>
                            {currentStep === 1 && (
                                <span className="text-amber-400 text-sm font-bold bg-amber-500/10 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-500/20">
                                    <Sparkles className="w-4 h-4" /> 7 dias grátis
                                </span>
                            )}
                        </div>
                        <ProgressBar />
                    </div>

                    {/* Step Card */}
                    <div className="bg-slate-900 border border-slate-800 shadow-2xl shadow-black/50 rounded-3xl p-8 relative overflow-hidden">
                        {/* Shimmer effect top border */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

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
                                    stiffness: 400,
                                    damping: 35,
                                    duration: 0.3
                                }}
                            >
                                {renderStep()}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation buttons */}
                        {currentStep < 6 && (
                            <div className="flex items-center gap-4 mt-10">
                                {currentStep > 1 && (
                                    <Button
                                        variant="outline"
                                        onClick={handleBack}
                                        disabled={isLoading}
                                        className="h-12 w-12 shrink-0 p-0 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                )}

                                <Button
                                    onClick={handleNext}
                                    disabled={!canProceed() || isLoading}
                                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-500/20 border-none transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 group"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            {currentStep === 5 ? "Configurando conta..." : "Processando..."}
                                        </>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {currentStep === 5 ? "Começar Trial Agora" : "Continuar"}
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </span>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
{/* End of Onboarding */ }
