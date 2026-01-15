import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    ArrowRight,
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
    Loader2
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
    { id: "1-5", label: "1-5" },
    { id: "6-15", label: "6-15" },
    { id: "16-50", label: "16-50" },
    { id: "51-100", label: "51-100" },
    { id: "100+", label: "100+" }
];

export default function Onboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();

    // Get plan from URL
    const planParam = searchParams.get("plan") || "starter";
    const plan = planDetails[planParam] || planDetails.starter;

    // States
    const [showConfetti, setShowConfetti] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Form data
    const [companyName, setCompanyName] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [referralSource, setReferralSource] = useState("");

    // Hide confetti after 4 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    const canSubmit = companyName.length >= 2 && companySize !== "" && referralSource !== "";

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setIsLoading(true);

        try {
            // Get current user
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            if (!currentUser) {
                throw new Error("Usuário não encontrado. Faça login novamente.");
            }

            // Create company with the correct plan
            const { data: companyData, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: companyName,
                    plan: planParam === "starter" ? "basic" : planParam // Map starter -> basic
                })
                .select()
                .single();

            if (companyError) throw companyError;

            // Update user profile with company_id
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    company_id: companyData.id,
                    role: "admin"
                })
                .eq("id", currentUser.id);

            if (profileError) throw profileError;

            // Success!
            setIsComplete(true);
            setShowConfetti(true);

            // Redirect after 2 seconds
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
                <div className="text-center mb-8">
                    <img src={gameSalesLogo} alt="Game Sales" className="h-12 mx-auto mb-6" />

                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-4">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Pagamento Confirmado
                    </Badge>

                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Bem-vindo ao Game Sales! 🎉
                    </h1>
                    <p className="text-white/60">
                        Plano <span className={`font-semibold ${plan.color}`}>{plan.name}</span> ativado.
                        Complete seu perfil para começar.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {!isComplete ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8"
                        >
                            {/* Company Name */}
                            <div className="mb-6">
                                <Label htmlFor="companyName" className="text-white/90 flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4" />
                                    Nome da sua empresa
                                </Label>
                                <Input
                                    id="companyName"
                                    placeholder="Ex: Empresa XYZ"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 h-12"
                                />
                            </div>

                            {/* Company Size */}
                            <div className="mb-6">
                                <Label className="text-white/90 flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4" />
                                    Quantos vendedores você tem?
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {companySizes.map((size) => (
                                        <button
                                            key={size.id}
                                            onClick={() => setCompanySize(size.id)}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${companySize === size.id
                                                ? "bg-white/20 border-white/40 text-white"
                                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                                                }`}
                                        >
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Referral Source */}
                            <div className="mb-8">
                                <Label className="text-white/90 flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4" />
                                    Como nos conheceu?
                                </Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {referralSources.map((source) => {
                                        const Icon = source.icon;
                                        const isSelected = referralSource === source.id;
                                        return (
                                            <button
                                                key={source.id}
                                                onClick={() => setReferralSource(source.id)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${isSelected
                                                    ? "bg-white/20 border-white/40 text-white"
                                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">{source.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                onClick={handleSubmit}
                                disabled={!canSubmit || isLoading}
                                className={`w-full h-12 bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white font-semibold text-base`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Configurando...
                                    </>
                                ) : (
                                    <>
                                        Entrar no Dashboard
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2 }}
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle2 className="h-10 w-10 text-white" />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-white mb-2">
                                Tudo pronto! 🚀
                            </h2>
                            <p className="text-white/60 mb-4">
                                Redirecionando para o dashboard...
                            </p>

                            <div className="flex items-center justify-center gap-1">
                                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
