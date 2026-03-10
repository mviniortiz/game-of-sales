import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ArrowRight,
    ArrowLeft,
    Building2,
    Users,
    Trophy,
    Rocket,
    Mail,
    UserPlus,
    Loader2,
    User,
    Check,
    Star,
    Phone,
    Briefcase,
    LayoutDashboard,
    Package,
    BarChart3,
    X,
    Plus,
    ShoppingBag,
    Wrench,
    Palette,
    Image,
    type LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import gameSalesLogo from "@/assets/logo-full.png";
import { Confetti } from "@/components/crm/Confetti";

// ── Pipeline stage config type (matches CRM.tsx StageConfig) ──
interface StageConfig {
    id: string;
    title: string;
    iconId: string;
    colorId: string;
}

// Pipeline templates
const PIPELINE_TEMPLATES: Record<string, { label: string; description: string; icon: LucideIcon; stages: StageConfig[] }> = {
    b2b: {
        label: "Vendas B2B",
        description: "Funil classico para vendas empresariais",
        icon: Briefcase,
        stages: [
            { id: "lead", title: "Lead", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Qualificacao", iconId: "users", colorId: "blue" },
            { id: "proposal", title: "Proposta", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Negociacao", iconId: "trending", colorId: "amber" },
            { id: "closed_won", title: "Ganho", iconId: "check", colorId: "emerald" },
        ],
    },
    infoprodutos: {
        label: "Infoprodutos",
        description: "Para vendas de cursos, mentorias e produtos digitais",
        icon: ShoppingBag,
        stages: [
            { id: "lead", title: "Lead Captado", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Engajado", iconId: "zap", colorId: "blue" },
            { id: "proposal", title: "Checkout", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Recuperacao", iconId: "trending", colorId: "amber" },
            { id: "closed_won", title: "Comprou", iconId: "check", colorId: "emerald" },
        ],
    },
    servicos: {
        label: "Servicos",
        description: "Para prestadores de servicos e consultorias",
        icon: Wrench,
        stages: [
            { id: "lead", title: "Contato Inicial", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Diagnostico", iconId: "users", colorId: "blue" },
            { id: "proposal", title: "Orcamento", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Follow-up", iconId: "trending", colorId: "amber" },
            { id: "closed_won", title: "Fechado", iconId: "check", colorId: "emerald" },
        ],
    },
    custom: {
        label: "Personalizado",
        description: "Use o pipeline padrao e personalize depois",
        icon: Palette,
        stages: [
            { id: "lead", title: "Lead", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Qualificacao", iconId: "users", colorId: "blue" },
            { id: "proposal", title: "Proposta", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Negociacao", iconId: "trending", colorId: "amber" },
            { id: "closed_won", title: "Ganho", iconId: "check", colorId: "emerald" },
        ],
    },
};

// Segment options
const SEGMENT_OPTIONS = [
    "Tecnologia / SaaS",
    "Educacao / Infoprodutos",
    "Consultoria",
    "Varejo",
    "Imobiliario",
    "Saude",
    "Financeiro / Seguros",
    "Marketing / Agencia",
    "Industria",
    "Outro",
];

const PIPELINE_CONFIG_KEY_PREFIX = "gamesales_pipeline_config_v3_";

const TOTAL_STEPS = 5;

export default function Onboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user, refreshProfile, companyId: authCompanyId, profile } = useAuth();

    // Step tracking
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Step 1: Company data
    const [companyName, setCompanyName] = useState("");
    const [segment, setSegment] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 2: User profile
    const [userName, setUserName] = useState("");
    const [userPhone, setUserPhone] = useState("");
    const [userRole, setUserRole] = useState("");

    // Step 3: Pipeline template
    const [selectedTemplate, setSelectedTemplate] = useState("");

    // Step 4: Invite team
    const [teamEmails, setTeamEmails] = useState<string[]>([""]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [invitedCount, setInvitedCount] = useState(0);

    // Determine effective company ID
    const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(null);

    // On mount, determine company context and pre-fill from existing profile
    useEffect(() => {
        const compId = authCompanyId || searchParams.get("company_id");
        setEffectiveCompanyId(compId);

        // Pre-fill name from profile if available
        if (profile?.nome) {
            setUserName(profile.nome);
        }
        if (user?.email) {
            // We use email internally but don't show it as editable in onboarding
        }
    }, [authCompanyId, searchParams, profile, user]);

    // Pre-fill company name if company already exists
    useEffect(() => {
        if (!effectiveCompanyId) return;
        const loadCompany = async () => {
            const { data } = await supabase
                .from("companies")
                .select("name")
                .eq("id", effectiveCompanyId)
                .single();
            if (data?.name) {
                setCompanyName(data.name);
            }
        };
        loadCompany();
    }, [effectiveCompanyId]);

    // Focus input on step change
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [currentStep]);

    // Handle logo file selection
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "Arquivo muito grande", description: "Maximo 2MB", variant: "destructive" });
            return;
        }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    // Phone formatting
    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    // Validation per step
    const canProceed = () => {
        switch (currentStep) {
            case 1: return companyName.trim().length >= 2;
            case 2: return userName.trim().length >= 2;
            case 3: return true; // Pipeline has a default, skip is allowed
            case 4: return true; // Always can proceed (skip or invite)
            case 5: return true; // Final step
            default: return false;
        }
    };

    // Upload logo to supabase storage
    const uploadLogo = async (companyId: string): Promise<string | null> => {
        if (!logoFile) return null;
        try {
            const ext = logoFile.name.split(".").pop() || "png";
            const path = `logos/${companyId}.${ext}`;
            const { error } = await supabase.storage
                .from("company-assets")
                .upload(path, logoFile, { upsert: true });
            if (error) {
                console.warn("Logo upload failed:", error);
                return null;
            }
            const { data: urlData } = supabase.storage
                .from("company-assets")
                .getPublicUrl(path);
            return urlData?.publicUrl || null;
        } catch {
            return null;
        }
    };

    // Save pipeline template to localStorage
    const savePipelineConfig = (companyId: string) => {
        const templateKey = selectedTemplate || "b2b";
        const template = PIPELINE_TEMPLATES[templateKey];
        if (template && companyId) {
            const key = `${PIPELINE_CONFIG_KEY_PREFIX}${companyId}`;
            localStorage.setItem(key, JSON.stringify(template.stages));
        }
    };

    // Main save handler for step transitions
    const handleNext = async () => {
        if (!canProceed()) return;

        // Step 1 -> 2: Save company data
        if (currentStep === 1) {
            setIsLoading(true);
            try {
                if (effectiveCompanyId) {
                    // Update existing company
                    const logoUrl = await uploadLogo(effectiveCompanyId);
                    const updatePayload: Record<string, any> = { name: companyName };
                    if (segment) updatePayload.segment = segment;
                    if (logoUrl) updatePayload.logo_url = logoUrl;

                    const { error } = await supabase
                        .from("companies")
                        .update(updatePayload)
                        .eq("id", effectiveCompanyId);
                    if (error) throw error;
                } else {
                    // Create new company
                    const { data: newCompany, error: createError } = await supabase
                        .from("companies")
                        .insert({
                            name: companyName,
                            plan: "starter",
                        } as any)
                        .select("id")
                        .single();
                    if (createError) throw createError;

                    const newId = newCompany.id;
                    setEffectiveCompanyId(newId);

                    // Upload logo for new company
                    const logoUrl = await uploadLogo(newId);
                    if (logoUrl || segment) {
                        const updatePayload: Record<string, any> = {};
                        if (logoUrl) updatePayload.logo_url = logoUrl;
                        if (segment) updatePayload.segment = segment;
                        await supabase.from("companies").update(updatePayload).eq("id", newId);
                    }

                    // Link user to company
                    if (user) {
                        await supabase
                            .from("profiles")
                            .update({ company_id: newId, role: "admin" })
                            .eq("id", user.id);
                    }
                }
                advanceStep();
            } catch (error: any) {
                toast({
                    title: "Erro ao salvar empresa",
                    description: error.message || "Tente novamente",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Step 2 -> 3: Save profile
        if (currentStep === 2) {
            setIsLoading(true);
            try {
                if (user) {
                    const profileUpdate: Record<string, any> = { nome: userName };
                    if (userPhone) profileUpdate.phone = userPhone.replace(/\D/g, "");
                    if (userRole) profileUpdate.cargo = userRole;

                    const { error } = await supabase
                        .from("profiles")
                        .update(profileUpdate)
                        .eq("id", user.id);
                    if (error) throw error;
                }
                advanceStep();
            } catch (error: any) {
                toast({
                    title: "Erro ao salvar perfil",
                    description: error.message || "Tente novamente",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Step 3 -> 4: Save pipeline config
        if (currentStep === 3) {
            if (effectiveCompanyId) {
                savePipelineConfig(effectiveCompanyId);
            }
            advanceStep();
            return;
        }

        // Step 4 -> 5: Invite team (or skip)
        if (currentStep === 4) {
            advanceStep();
            return;
        }

        // Step 5: Complete
        if (currentStep === 5) {
            handleComplete("dashboard");
            return;
        }
    };

    const advanceStep = () => {
        setDirection(1);
        setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setDirection(-1);
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleSkip = () => {
        advanceStep();
    };

    // Invite sellers
    const handleInviteTeam = async () => {
        const validEmails = teamEmails
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e && e.includes("@"));

        if (validEmails.length === 0) {
            advanceStep();
            return;
        }

        setInviteLoading(true);
        let successCount = 0;

        for (const email of validEmails) {
            try {
                const { error } = await supabase.functions.invoke("admin-create-seller", {
                    body: {
                        nome: email.split("@")[0],
                        email,
                        sendPassword: true,
                        companyId: effectiveCompanyId,
                    },
                });
                if (!error) successCount++;
            } catch {
                // Continue with other invites
            }
        }

        setInvitedCount(successCount);
        if (successCount > 0) {
            toast({
                title: "Convites enviados!",
                description: `${successCount} vendedor(es) convidado(s) com sucesso.`,
            });
        }
        setInviteLoading(false);
        advanceStep();
    };

    // Add/remove email fields
    const addEmailField = () => {
        if (teamEmails.length < 10) {
            setTeamEmails([...teamEmails, ""]);
        }
    };

    const removeEmailField = (index: number) => {
        if (teamEmails.length > 1) {
            setTeamEmails(teamEmails.filter((_, i) => i !== index));
        }
    };

    const updateEmail = (index: number, value: string) => {
        const updated = [...teamEmails];
        updated[index] = value;
        setTeamEmails(updated);
    };

    // Complete onboarding
    const handleComplete = async (destination: string) => {
        setIsLoading(true);
        try {
            // Mark onboarding as complete on profile
            if (user) {
                await supabase
                    .from("profiles")
                    .update({ onboarding_completed: true } as any)
                    .eq("id", user.id);
            }
            await refreshProfile();
        } catch {
            // Non-critical, continue anyway
        }

        setShowConfetti(true);
        setTimeout(() => {
            navigate(`/${destination}`);
            toast({
                title: "Bem-vindo ao Game Sales!",
                description: "Seu ambiente esta pronto. Boas vendas!",
            });
        }, 1800);
    };

    // Animation variants
    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 50 : -50,
            opacity: 0,
            scale: 0.98,
        }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({
            x: dir > 0 ? -50 : 50,
            opacity: 0,
            scale: 0.98,
        }),
    };

    // ── Step indicator icons ──
    const stepMeta = [
        { icon: Building2, label: "Empresa" },
        { icon: User, label: "Perfil" },
        { icon: LayoutDashboard, label: "Pipeline" },
        { icon: Users, label: "Equipe" },
        { icon: Rocket, label: "Pronto!" },
    ];

    // ── Stepper ──
    const Stepper = () => (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm font-medium">
                    Passo {currentStep} de {TOTAL_STEPS}
                </span>
                <span className="text-slate-500 text-sm">{stepMeta[currentStep - 1]?.label}</span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-6">
                {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                    <div
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                            index + 1 < currentStep
                                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                                : index + 1 === currentStep
                                ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                : "bg-slate-800"
                        }`}
                    />
                ))}
            </div>

            {/* Step icons row */}
            <div className="flex items-center justify-between">
                {stepMeta.map((step, index) => {
                    const StepIcon = step.icon;
                    const isComplete = index + 1 < currentStep;
                    const isCurrent = index + 1 === currentStep;
                    return (
                        <div key={index} className="flex flex-col items-center gap-1.5">
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isComplete
                                        ? "bg-emerald-500/20 border border-emerald-500/50"
                                        : isCurrent
                                        ? "bg-amber-500/20 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                                        : "bg-slate-800/50 border border-slate-700/50"
                                }`}
                            >
                                {isComplete ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <StepIcon
                                        className={`w-4 h-4 ${
                                            isCurrent ? "text-amber-400" : "text-slate-500"
                                        }`}
                                    />
                                )}
                            </div>
                            <span
                                className={`text-[10px] font-medium hidden sm:block ${
                                    isComplete
                                        ? "text-emerald-400"
                                        : isCurrent
                                        ? "text-amber-400"
                                        : "text-slate-600"
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const inputClasses =
        "bg-slate-900/50 backdrop-blur-sm border-slate-800 text-white placeholder:text-slate-500 focus-visible:bg-slate-900 focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:border-slate-700 h-12 text-base rounded-xl transition-all duration-300";

    // ── Step renderers ──
    const renderStep = () => {
        switch (currentStep) {
            // ────────────── Step 1: Company Data ──────────────
            case 1:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Building2 className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Dados da Empresa
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm text-center">
                            Vamos configurar o ambiente da sua empresa
                        </p>

                        <div className="space-y-5">
                            {/* Company name */}
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm font-medium">
                                    Nome da empresa <span className="text-rose-400">*</span>
                                </Label>
                                <Input
                                    ref={inputRef}
                                    placeholder="Ex: Acme Ltda"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className={inputClasses}
                                    autoFocus
                                />
                            </div>

                            {/* Segment */}
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm font-medium">
                                    Segmento
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {SEGMENT_OPTIONS.map((seg) => (
                                        <button
                                            key={seg}
                                            type="button"
                                            onClick={() => setSegment(segment === seg ? "" : seg)}
                                            className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                                                segment === seg
                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:border-slate-700 hover:text-white"
                                            }`}
                                        >
                                            {seg}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Logo upload */}
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm font-medium">
                                    Logo (opcional)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/40 transition-colors overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="Logo preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Image className="w-6 h-6 text-slate-500" />
                                        )}
                                    </button>
                                    <div className="text-sm text-slate-500">
                                        {logoFile ? (
                                            <span className="text-emerald-400">{logoFile.name}</span>
                                        ) : (
                                            "Clique para enviar (max 2MB)"
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            // ────────────── Step 2: User Profile ──────────────
            case 2:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <User className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Seu Perfil
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm text-center">
                            Conte-nos um pouco sobre voce
                        </p>

                        <div className="space-y-5">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm font-medium">
                                    Seu nome <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        ref={inputRef}
                                        placeholder="Seu nome completo"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className={`${inputClasses} pl-10`}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm font-medium">
                                    Telefone / WhatsApp
                                </Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        placeholder="(11) 99999-9999"
                                        value={userPhone}
                                        onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                                        className={`${inputClasses} pl-10`}
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-sm font-medium">
                                    Cargo
                                </Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        placeholder="Ex: Gerente Comercial"
                                        value={userRole}
                                        onChange={(e) => setUserRole(e.target.value)}
                                        className={`${inputClasses} pl-10`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            // ────────────── Step 3: Pipeline Template ──────────────
            case 3:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <LayoutDashboard className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Configure seu Pipeline
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm text-center">
                            Escolha um modelo de funil para comecar. Voce pode personalizar depois.
                        </p>

                        <div className="grid gap-3">
                            {Object.entries(PIPELINE_TEMPLATES).map(([key, template], index) => {
                                const Icon = template.icon;
                                const isSelected = selectedTemplate === key;
                                return (
                                    <motion.button
                                        key={key}
                                        type="button"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.06, duration: 0.3 }}
                                        onClick={() => setSelectedTemplate(key)}
                                        className={`group relative flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden ${
                                            isSelected
                                                ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]"
                                                : "bg-slate-900/40 backdrop-blur-sm border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-lg"
                                        }`}
                                    >
                                        <div
                                            className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-slate-800 text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-500/10"
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`font-semibold text-sm ${
                                                    isSelected ? "text-emerald-400" : "text-white"
                                                }`}
                                            >
                                                {template.label}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {template.description}
                                            </p>
                                            {/* Stage preview */}
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {template.stages.map((s) => (
                                                    <span
                                                        key={s.id}
                                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                            isSelected
                                                                ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                                                                : "border-slate-700 text-slate-500 bg-slate-800/50"
                                                        }`}
                                                    >
                                                        {s.title}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <motion.div layoutId="templateCheck" className="shrink-0 self-center">
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

            // ────────────── Step 4: Invite Team ──────────────
            case 4:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]"
                        >
                            <Users className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Convide sua Equipe
                        </h2>
                        <p className="text-slate-400 mb-8 text-sm text-center">
                            Adicione os e-mails dos seus vendedores. Eles receberao um convite por e-mail.
                        </p>

                        <div className="space-y-3">
                            {teamEmails.map((email, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input
                                            placeholder="vendedor@empresa.com"
                                            value={email}
                                            onChange={(e) => updateEmail(index, e.target.value)}
                                            className={`${inputClasses} pl-10`}
                                            type="email"
                                        />
                                    </div>
                                    {teamEmails.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeEmailField(index)}
                                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </motion.div>
                            ))}

                            {teamEmails.length < 10 && (
                                <button
                                    type="button"
                                    onClick={addEmailField}
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors py-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Adicionar mais um vendedor
                                </button>
                            )}
                        </div>

                        {/* Invite action */}
                        <div className="mt-6 flex flex-col gap-3">
                            <Button
                                onClick={handleInviteTeam}
                                disabled={inviteLoading || teamEmails.every((e) => !e.trim())}
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                {inviteLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Enviando convites...
                                    </>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <UserPlus className="h-5 w-5" />
                                        Enviar Convites
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                );

            // ────────────── Step 5: Success / Ready ──────────────
            case 5:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_-3px_rgba(16,185,129,0.3)]"
                        >
                            <Trophy className="h-10 w-10 text-emerald-400" />
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-3"
                        >
                            Tudo pronto!
                        </motion.p>

                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                            Seu ambiente esta configurado!
                        </h2>
                        <p className="text-slate-400 mb-10 text-sm max-w-sm mx-auto">
                            {companyName
                                ? `A empresa "${companyName}" esta pronta para usar o Game Sales.`
                                : "Seu Game Sales esta pronto para usar."}{" "}
                            {invitedCount > 0 &&
                                `${invitedCount} vendedor(es) ja receberam convite por e-mail.`}
                        </p>

                        {/* Quick-start actions */}
                        <div className="grid gap-3">
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                onClick={() => handleComplete("crm")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-emerald-500/20">
                                    <LayoutDashboard className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-emerald-400">
                                        Ir ao Pipeline
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Comece a adicionar seus deals
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                onClick={() => handleComplete("nova-venda")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 hover:border-slate-700 transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-slate-800">
                                    <Package className="h-5 w-5 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                        Registrar uma Venda
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Registre sua primeira venda agora
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                onClick={() => handleComplete("dashboard")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 hover:border-slate-700 transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-slate-800">
                                    <BarChart3 className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                        Ver Dashboard
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Veja metricas e acompanhe o time
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex selection:bg-emerald-500/30">
            <Confetti show={showConfetti} />

            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 border-r border-slate-800 overflow-hidden flex-col justify-between p-12">
                {/* Background effects */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <img src={gameSalesLogo} alt="Game Sales" className="h-12 mb-8" />
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                            Transforme sua operacao comercial em uma{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                                maquina de vendas
                            </span>
                            .
                        </h1>
                        <p className="text-lg text-slate-400 max-w-md">
                            Configure sua empresa em poucos minutos e comece a vender mais hoje mesmo.
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
                            "Desde que implementamos o Game Sales, o engajamento do time explodiu. A
                            conversao de leads nunca esteve tao alta e finalmente temos visao clara das
                            metas."
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700">
                                <img
                                    src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Mariana Costa</h4>
                                <p className="text-slate-400 text-xs text-left">
                                    Diretora de Vendas - TechGrowth
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Form Steps */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
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

                    {/* Stepper */}
                    <Stepper />

                    {/* Step Card */}
                    <div className="bg-slate-900 border border-slate-800 shadow-2xl shadow-black/50 rounded-3xl p-8 relative overflow-hidden">
                        {/* Shimmer top border */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

                        {/* Step content */}
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
                                    duration: 0.3,
                                }}
                            >
                                {renderStep()}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation buttons (hidden on step 4 which has its own CTA, and step 5 which has quick-start) */}
                        {currentStep !== 4 && currentStep !== 5 && (
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
                                            Salvando...
                                        </>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Continuar
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </span>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Skip option for steps 3 and 4 */}
                        {(currentStep === 3) && (
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    Pular por agora
                                </button>
                            </div>
                        )}

                        {/* Step 4 has skip as separate button below its own CTA */}
                        {currentStep === 4 && (
                            <div className="mt-4 flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    disabled={inviteLoading}
                                    className="h-12 w-12 shrink-0 p-0 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors disabled:opacity-50"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={inviteLoading}
                                    className="flex-1 text-sm text-slate-500 hover:text-slate-300 transition-colors py-3"
                                >
                                    Pular por agora
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
