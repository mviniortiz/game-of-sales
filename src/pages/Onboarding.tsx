import { useState, useEffect, useRef, useCallback, memo } from "react";
import { logger } from "@/utils/logger";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
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
    Phone,
    Briefcase,
    LayoutDashboard,
    MessageCircle,
    Package,
    BarChart3,
    X,
    Plus,
    ShoppingBag,
    Wrench,
    Palette,
    Image,
    CreditCard,
    Crown,
    Star,
    Shield,
    Lock,
    Calendar,
    type LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { Confetti } from "@/components/crm/Confetti";
import { PLANS, formatPrice, getAnnualMonthlyEquivalent, type BillingCycle } from "@/config/plans";
import { getAttribution } from "@/lib/attribution";
import { z } from "zod";

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
        description: "Funil clássico para vendas empresariais",
        icon: Briefcase,
        stages: [
            { id: "lead", title: "Lead", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Qualificação", iconId: "users", colorId: "blue" },
            { id: "proposal", title: "Proposta", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Negociação", iconId: "trending", colorId: "amber" },
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
            { id: "negotiation", title: "Recuperação", iconId: "trending", colorId: "amber" },
            { id: "closed_won", title: "Comprou", iconId: "check", colorId: "emerald" },
        ],
    },
    servicos: {
        label: "Serviços",
        description: "Para prestadores de serviços e consultorias",
        icon: Wrench,
        stages: [
            { id: "lead", title: "Contato Inicial", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Diagnóstico", iconId: "users", colorId: "blue" },
            { id: "proposal", title: "Orçamento", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Follow-up", iconId: "trending", colorId: "amber" },
            { id: "closed_won", title: "Fechado", iconId: "check", colorId: "emerald" },
        ],
    },
    custom: {
        label: "Personalizado",
        description: "Use o pipeline padrão e personalize depois",
        icon: Palette,
        stages: [
            { id: "lead", title: "Lead", iconId: "target", colorId: "gray" },
            { id: "qualification", title: "Qualificação", iconId: "users", colorId: "blue" },
            { id: "proposal", title: "Proposta", iconId: "dollar", colorId: "indigo" },
            { id: "negotiation", title: "Negociação", iconId: "trending", colorId: "amber" },
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

const PIPELINE_CONFIG_KEY_PREFIX = "vyzon_pipeline_config_v3_";

// Cores das colunas do mini-funil no preview ao vivo
const STAGE_DOT = ["#94A3B8", "#2563EB", "#7C3AED", "#F59E0B", "#16A34A"];

// Adapta o funil sugerido pelo segmento escolhido
const segmentToTemplate = (seg: string): string => {
    const s = (seg || "").toLowerCase();
    if (s.includes("infoproduto")) return "infoprodutos";
    if (s.includes("consultoria") || s.includes("marketing") || s.includes("agência") || s.includes("agencia") || s.includes("servi")) return "servicos";
    return "b2b";
};

const PLAN_ICONS: Record<string, LucideIcon> = {
    starter: Star,
    plus: Crown,
    pro: Rocket,
};

const registerSchema = z.object({
    nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    companyName: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
});

const TOTAL_STEPS = 7;

export default function Onboarding() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { user, refreshProfile, companyId: authCompanyId, profile } = useAuth();

    // If user is already logged in, skip registration step (step 1)
    const isLoggedIn = !!user;

    // Step tracking - respect ?step= param for upgrades, otherwise start at 2 if logged in
    const urlStep = Number(searchParams.get("step"));
    const resolvedInitialStep = isLoggedIn && urlStep >= 2 && urlStep <= TOTAL_STEPS
        ? urlStep
        : isLoggedIn ? 2 : 1;
    const [currentStep, setCurrentStep] = useState(resolvedInitialStep);
    const [direction, setDirection] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
    const [evaHappyPulse, setEvaHappyPulse] = useState(false);
    const [evaTyped, setEvaTyped] = useState("");
    const [evaTyping, setEvaTyping] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Step 1: Registration (only if not logged in)
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regCompanyName, setRegCompanyName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

    // Step 2: Company data
    const [companyName, setCompanyName] = useState("");
    const [segment, setSegment] = useState("");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 3: User profile
    const [userName, setUserName] = useState("");
    const [userPhone, setUserPhone] = useState("");
    const [userRole, setUserRole] = useState("");

    // Step 4: Pipeline template
    const [selectedTemplate, setSelectedTemplate] = useState("");

    // Step 5: Plan + Payment
    const [selectedPlan, setSelectedPlan] = useState(searchParams.get("plan") || "plus");
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Step 6: Invite team
    const [teamEmails, setTeamEmails] = useState<string[]>([""]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [invitedCount, setInvitedCount] = useState(0);

    // Track onboarding start once on mount
    useEffect(() => {
        trackEvent(FUNNEL_EVENTS.ONBOARDING_START, {
            step: isLoggedIn ? 2 : 1,
            plan: selectedPlan,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Inline validation for registration fields
    const validateField = useCallback((field: string, value: string) => {
        let error = "";
        switch (field) {
            case "regName":
                if (value.length > 0 && value.trim().length < 3) error = "Mínimo 3 caracteres";
                break;
            case "regEmail":
                if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Formato inválido (ex: nome@empresa.com)";
                break;
            case "regPassword":
                if (value.length > 0 && value.length < 8) error = `Faltam ${8 - value.length} caractere(s)`;
                break;
            case "regCompanyName":
                if (value.length > 0 && value.trim().length < 2) error = "Mínimo 2 caracteres";
                break;
        }
        setFieldErrors(prev => ({ ...prev, [field]: error }));
    }, []);

    const handleFieldBlur = useCallback((field: string, value: string) => {
        setFieldTouched(prev => ({ ...prev, [field]: true }));
        validateField(field, value);
    }, [validateField]);

    // Determine effective company ID
    // Use a ref to lock the company ID once set during registration (Step 1),
    // preventing the auth-state useEffect from overwriting it with a stale value.
    // Also persist to localStorage so it survives re-renders / auth state changes.
    const ONBOARDING_COMPANY_KEY = "onboarding_company_id";
    const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(
        () => localStorage.getItem(ONBOARDING_COMPANY_KEY)
    );
    const companyIdLockedRef = useRef(!!localStorage.getItem(ONBOARDING_COMPANY_KEY));

    const ONBOARDING_EMAIL_KEY = "onboarding_email";
    const lockAndSetCompanyId = useCallback((id: string) => {
        companyIdLockedRef.current = true;
        setEffectiveCompanyId(id);
        localStorage.setItem(ONBOARDING_COMPANY_KEY, id);
    }, []);

    // On mount, determine company context and pre-fill from existing profile
    useEffect(() => {
        // If company ID was already locked by Step 1 registration, don't overwrite
        if (companyIdLockedRef.current) return;

        const compId = authCompanyId || searchParams.get("company_id");
        setEffectiveCompanyId(compId);

        if (profile?.nome) {
            setUserName(profile.nome);
        }
    }, [authCompanyId, searchParams, profile, user]);

    // Pre-fill company name if company already exists
    useEffect(() => {
        if (!effectiveCompanyId) return;
        const loadCompany = async () => {
            const { data } = await supabase
                .from("companies")
                .select("name, plan")
                .eq("id", effectiveCompanyId)
                .single();
            if (data?.name) {
                setCompanyName(data.name);
            }
            if (data?.plan && !searchParams.get("plan")) {
                setSelectedPlan(data.plan);
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
            toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
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
            case 1: return regName.trim().length >= 3 && regEmail.includes("@") && regPassword.length >= 8 && regCompanyName.trim().length >= 2;
            case 2: return companyName.trim().length >= 2;
            case 3: return userName.trim().length >= 2;
            case 4: return true;
            case 5: return !!selectedPlan;
            case 6: return true;
            case 7: return true;
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
                logger.warn("Logo upload failed:", error);
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

    // Inicia o trial de 14 dias SEM cartão (step 5).
    // A contratação (com cartão via Mercado Pago) acontece in-app ao expirar o trial,
    // via UpgradeLock (AppLayout) -> /upgrade.
    const handleStartTrial = async () => {
        trackEvent(FUNNEL_EVENTS.PAYMENT_SUBMIT, { plan: selectedPlan, trial_no_card: true });

        const companyId = authCompanyId
            || effectiveCompanyId
            || localStorage.getItem(ONBOARDING_COMPANY_KEY);
        if (companyId && companyId !== effectiveCompanyId) {
            lockAndSetCompanyId(companyId);
        }
        if (!companyId) {
            toast({ title: "Erro", description: "Dados da empresa não encontrados. Recarregue a página.", variant: "destructive" });
            return;
        }

        setPaymentLoading(true);
        setPaymentError(null);
        try {
            const trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();
            const { error } = await supabase
                .from("companies")
                .update({
                    plan: selectedPlan,
                    subscription_status: "trialing",
                    trial_ends_at: trialEnds,
                } as any)
                .eq("id", companyId);
            if (error) throw error;

            try { await refreshProfile(); } catch { /* non-critical */ }

            trackEvent(FUNNEL_EVENTS.PAYMENT_SUCCESS, { plan: selectedPlan, trial_no_card: true });
            toast({ title: "Teste liberado!", description: "Você tem 14 dias grátis com acesso total." });
            advanceStep();
        } catch (error: any) {
            const msg = error?.message || "Não foi possível iniciar o teste. Tente novamente.";
            setPaymentError(msg);
            toast({ title: "Erro", description: msg, variant: "destructive" });
        } finally {
            setPaymentLoading(false);
        }
    };

    // Main save handler for step transitions
    const handleNext = async () => {
        if (!canProceed()) return;

        // Step 1: Create account (registration)
        if (currentStep === 1) {
            const validation = registerSchema.safeParse({
                nome: regName,
                email: regEmail,
                password: regPassword,
                companyName: regCompanyName,
            });
            if (!validation.success) {
                const errors = validation.error.errors.map(e => e.message).join(", ");
                toast({ title: "Dados inválidos", description: errors, variant: "destructive" });
                return;
            }



            setIsLoading(true);
            try {
                // Generate company ID client-side to avoid SELECT after INSERT (anon RLS issue)
                const newCompanyId = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
                    (+c ^ (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
                );

                // Create company with explicit ID (no .select() needed)
                const attribution = getAttribution() || {};
                const { error: companyError } = await supabase
                    .from("companies")
                    .insert({ id: newCompanyId, name: regCompanyName, plan: selectedPlan, ...attribution } as any);
                if (companyError) throw new Error(`Erro ao criar empresa: ${companyError.message}`);

                lockAndSetCompanyId(newCompanyId);
                localStorage.setItem(ONBOARDING_EMAIL_KEY, regEmail);
                setCompanyName(regCompanyName);
                setUserName(regName);

                // Create user with company association
                const { error: signUpError } = await supabase.auth.signUp({
                    email: regEmail,
                    password: regPassword,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`,
                        data: {
                            nome: regName,
                            company_id: newCompanyId,
                        },
                    },
                });

                if (signUpError) {
                    const msg = signUpError.message.toLowerCase();

                    // Rate limit on email sending — account may still be created, check before rollback
                    if (msg.includes("rate limit") || msg.includes("too many")) {
                        // Check if user was actually created despite rate limit on confirmation email
                        const { data: signInData } = await supabase.auth.signInWithPassword({
                            email: regEmail,
                            password: regPassword,
                        });
                        if (signInData?.user) {
                            // Account exists, just email confirmation was rate-limited. Continue.
                            toast({ title: "Conta criada!", description: "Vamos configurar sua empresa." });
                            advanceStep();
                            return;
                        }
                        // Rollback and show error
                        await supabase.from("companies").delete().eq("id", newCompanyId);
                        throw new Error("Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.");
                    }

                    if (msg.includes("already registered") || msg.includes("already been registered")) {
                        await supabase.from("companies").delete().eq("id", newCompanyId);
                        throw new Error("Este e-mail ja esta cadastrado. Tente fazer login.");
                    }

                    // Rollback company for other errors
                    await supabase.from("companies").delete().eq("id", newCompanyId);
                    throw new Error(`Erro ao criar conta: ${signUpError.message}`);
                }

                trackEvent(FUNNEL_EVENTS.REGISTER_COMPLETE, { plan: selectedPlan });
                toast({ title: "Conta criada!", description: "Vamos configurar sua empresa." });
                advanceStep();
            } catch (error: any) {
                toast({ title: "Erro ao criar conta", description: error.message || "Tente novamente", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Step 2: Save company data
        if (currentStep === 2) {
            setIsLoading(true);
            try {
                if (effectiveCompanyId) {
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
                    lockAndSetCompanyId(newId);

                    const logoUrl = await uploadLogo(newId);
                    if (logoUrl || segment) {
                        const updatePayload: Record<string, any> = {};
                        if (logoUrl) updatePayload.logo_url = logoUrl;
                        if (segment) updatePayload.segment = segment;
                        await supabase.from("companies").update(updatePayload).eq("id", newId);
                    }

                    if (user) {
                        // Use SECURITY DEFINER RPC to bypass RLS chicken-and-egg issue
                        const { error: rpcErr } = await supabase.rpc("onboarding_assign_company", {
                            target_company_id: newId,
                        });
                        if (rpcErr) {
                            console.error("[Onboarding] RPC assign company error:", rpcErr);
                            // Fallback to direct update
                            await supabase
                                .from("profiles")
                                .update({ company_id: newId, role: "admin" })
                                .eq("id", user.id);
                        }
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

        // Step 3: Save profile
        if (currentStep === 3) {
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

        // Step 4: Save pipeline config
        if (currentStep === 4) {
            if (effectiveCompanyId) {
                savePipelineConfig(effectiveCompanyId);
            }
            advanceStep();
            return;
        }

        // Step 5: tratado por handleStartTrial() (trial sem cartão)
        if (currentStep === 5) {
            return;
        }

        // Step 6: Invite team (or skip)
        if (currentStep === 6) {
            advanceStep();
            return;
        }

        // Step 7: Complete
        if (currentStep === 7) {
            handleComplete("dashboard");
            return;
        }
    };

    const advanceStep = () => {
        setDirection(1);
        const nextStep = Math.min(currentStep + 1, TOTAL_STEPS);
        trackEvent(FUNNEL_EVENTS.ONBOARDING_STEP, { step: nextStep, plan: selectedPlan });
        setCurrentStep(nextStep);
        // EVA reage com alegria a cada avanço (some sozinho)
        setEvaHappyPulse(true);
        setTimeout(() => setEvaHappyPulse(false), 1500);
    };

    const handleBack = () => {
        const minStep = isLoggedIn ? 2 : 1;
        if (currentStep > minStep) {
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
            trackEvent(FUNNEL_EVENTS.TEAM_INVITE_SENT, { count: successCount });
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
        localStorage.removeItem(ONBOARDING_COMPANY_KEY);
        localStorage.removeItem(ONBOARDING_EMAIL_KEY);
        try {
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
                title: "Bem-vindo ao Vyzon!",
                description: "Seu ambiente está pronto. Boas vendas!",
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
    const allStepMeta = [
        { icon: Mail, label: "Conta" },
        { icon: Building2, label: "Empresa" },
        { icon: User, label: "Perfil" },
        { icon: LayoutDashboard, label: "Pipeline" },
        { icon: CreditCard, label: "Plano" },
        { icon: Users, label: "Equipe" },
        { icon: Rocket, label: "Pronto!" },
    ];
    // Falas da EVA por etapa (1-indexed) — a copiloto "reage" ao progresso
    const evaSay: Record<number, string> = {
        1: "Oi! Sou a EVA. Vou montar seu Vyzon aqui do lado enquanto a gente conversa.",
        2: "Boa! Já coloquei o nome da sua empresa no painel.",
        3: "Você lidera por aqui, vai aparecer no ranking do time.",
        4: "Montei seu funil, olha ele tomando forma do lado.",
        5: "Pode testar à vontade: 14 dias com acesso total, sem cartão.",
        6: "Bora chamar o time? Os avatares já aparecem no painel.",
        7: "Pronto! Seu Vyzon já está montado. Bora vender.",
    };
    const evaThinking = isLoading || paymentLoading || inviteLoading;
    // Estado expressivo da EVA por contexto: pensando (loading) > comemora (fim)
    // > acena (boas-vindas) > feliz (acabou de avançar) > normal.
    const evaMood = evaThinking
        ? "thinking"
        : currentStep === 7
            ? "excited"
            : currentStep === 1
                ? "waving"
                : evaHappyPulse
                    ? "happy"
                    : "normal";

    // Adapta o funil sugerido pelo segmento (pré-seleciona pro step do pipeline)
    useEffect(() => {
        if (segment && !selectedTemplate) setSelectedTemplate(segmentToTemplate(segment));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segment]);

    // Funil efetivo mostrado no preview ao vivo (escolhido > por segmento > b2b)
    const previewTpl = selectedTemplate || segmentToTemplate(segment) || "b2b";
    const previewStages = PIPELINE_TEMPLATES[previewTpl].stages;
    const previewName = (userName || regName || "Você").trim().split(" ")[0] || "Você";
    // Dados de exemplo pra dar vida ao preview (rotulado como "prévia")
    const sampleCounts = [3, 2, 1, 1, 0];
    const sampleDeals = [
        { cliente: "Mariana Costa", valor: 3500 },
        { cliente: "Studio Alpha", valor: 8900 },
        { cliente: "João Pereira", valor: 12000 },
    ];

    // Fala "ao vivo" da EVA: pensa um instante → digita a frase letra a letra
    useEffect(() => {
        const full = evaSay[currentStep] || evaSay[1];
        setEvaTyped("");
        setEvaTyping(true);
        let i = 0;
        let iv: ReturnType<typeof setInterval> | undefined;
        const delay = setTimeout(() => {
            iv = setInterval(() => {
                i++;
                setEvaTyped(full.slice(0, i));
                if (i >= full.length) {
                    clearInterval(iv);
                    setEvaTyping(false);
                }
            }, 22);
        }, 380);
        return () => {
            clearTimeout(delay);
            if (iv) clearInterval(iv);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep]);

    // If logged in, skip step 1 visually
    const stepMeta = isLoggedIn ? allStepMeta.slice(1) : allStepMeta;
    const displayStep = isLoggedIn ? currentStep - 1 : currentStep;
    const displayTotalSteps = isLoggedIn ? TOTAL_STEPS - 1 : TOTAL_STEPS;

    // ── Stepper (compact) ──
    const Stepper = () => {
        const pct = ((displayStep - 1) / (displayTotalSteps - 1)) * 100;
        const currentLabel = stepMeta[displayStep - 1]?.label;
        return (
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                            style={{ background: "rgba(37,99,235,0.10)", color: "#2563EB" }}
                        >
                            {displayStep}/{displayTotalSteps}
                        </span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={currentLabel}
                                className="text-sm font-medium"
                                style={{ color: "#334155" }}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15 }}
                            >
                                {currentLabel}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                    <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                        {Math.round(pct)}%
                    </span>
                </div>
                {/* Single progress bar */}
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "#E6EDF5" }}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #2563EB, #4A8CE8)" }}
                        initial={false}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                </div>
            </div>
        );
    };

    const inputClasses =
        "bg-white border-[#E6EDF5] text-[#0B1220] placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[rgba(37,99,235,0.18)] focus-visible:border-[#2563EB] hover:border-[#D7DEE9] h-12 text-base rounded-xl transition-all duration-200";

    // MP Card field styles moved to top-level MpCardFields component

    // ── Step renderers ──
    const renderStep = () => {
        switch (currentStep) {
            // ────────────── Step 1: Create Account ──────────────
            case 1:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
                        >
                            <Rocket className="h-8 w-8 text-[#2563EB]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B1220] tracking-tight mb-2 text-center">
                            Crie sua conta
                        </h2>
                        <p className="text-[#64748B] mb-6 text-sm text-center">
                            Comece sua jornada de alta performance em vendas
                        </p>

                        {/* SSO Google — caminho rápido. User vai pro passo 2 após OAuth */}
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    trackEvent("onboarding_google_sso_click");
                                    const { error } = await supabase.auth.signInWithOAuth({
                                        provider: "google",
                                        options: {
                                            redirectTo: `${window.location.origin}/onboarding?step=2`,
                                            queryParams: {
                                                access_type: "offline",
                                                prompt: "consent",
                                            },
                                        },
                                    });
                                    if (error) {
                                        toast({
                                            title: "Não foi possível entrar com Google",
                                            description: error.message,
                                            variant: "destructive",
                                        });
                                    }
                                } catch (err: any) {
                                    toast({
                                        title: "Erro no login com Google",
                                        description: err?.message ?? String(err),
                                        variant: "destructive",
                                    });
                                }
                            }}
                            className="w-full h-12 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                            style={{
                                background: "#FFFFFF",
                                border: "1px solid #E6EDF5",
                                color: "#334155",
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continuar com Google
                        </button>

                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px" style={{ background: "#E6EDF5" }} />
                            <span className="text-[11px]" style={{ color: "#94A3B8" }}>ou com email</span>
                            <div className="flex-1 h-px" style={{ background: "#E6EDF5" }} />
                        </div>

                        <div className="space-y-4">
                            {/* Nome */}
                            <div className="space-y-1.5">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Seu nome completo <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                    <Input
                                        ref={inputRef}
                                        placeholder="Joao Silva"
                                        value={regName}
                                        onChange={(e) => { setRegName(e.target.value); validateField("regName", e.target.value); }}
                                        onBlur={() => handleFieldBlur("regName", regName)}
                                        className={`${inputClasses} pl-10 ${fieldTouched.regName && fieldErrors.regName ? "!border-rose-500/50 !ring-rose-500/20" : ""}`}
                                        autoFocus
                                    />
                                </div>
                                {fieldTouched.regName && fieldErrors.regName && (
                                    <p className="text-xs text-rose-400 pl-1">{fieldErrors.regName}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label className="text-[#334155] text-sm font-medium">
                                    E-mail <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                    <Input
                                        placeholder="voce@empresa.com"
                                        value={regEmail}
                                        onChange={(e) => { setRegEmail(e.target.value); if (fieldErrors.regEmail) setFieldErrors(prev => ({ ...prev, regEmail: "" })); }}
                                        onBlur={() => handleFieldBlur("regEmail", regEmail)}
                                        className={`${inputClasses} pl-10 ${fieldTouched.regEmail && fieldErrors.regEmail ? "!border-rose-500/50 !ring-rose-500/20" : ""}`}
                                        type="email"
                                        autoComplete="email"
                                    />
                                </div>
                                {fieldTouched.regEmail && fieldErrors.regEmail && (
                                    <p className="text-xs text-rose-400 pl-1">{fieldErrors.regEmail}</p>
                                )}
                            </div>

                            {/* Empresa */}
                            <div className="space-y-1.5">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Nome da empresa <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                    <Input
                                        placeholder="Sua Empresa Ltda"
                                        value={regCompanyName}
                                        onChange={(e) => { setRegCompanyName(e.target.value); validateField("regCompanyName", e.target.value); }}
                                        onBlur={() => handleFieldBlur("regCompanyName", regCompanyName)}
                                        className={`${inputClasses} pl-10 ${fieldTouched.regCompanyName && fieldErrors.regCompanyName ? "!border-rose-500/50 !ring-rose-500/20" : ""}`}
                                    />
                                </div>
                                {fieldTouched.regCompanyName && fieldErrors.regCompanyName && (
                                    <p className="text-xs text-rose-400 pl-1">{fieldErrors.regCompanyName}</p>
                                )}
                            </div>

                            {/* Senha */}
                            <div className="space-y-1.5">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Senha <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                    <Input
                                        placeholder="Mínimo 8 caracteres"
                                        value={regPassword}
                                        onChange={(e) => { setRegPassword(e.target.value); validateField("regPassword", e.target.value); }}
                                        onBlur={() => handleFieldBlur("regPassword", regPassword)}
                                        className={`${inputClasses} pl-10 pr-10 ${fieldTouched.regPassword && fieldErrors.regPassword ? "!border-rose-500/50 !ring-rose-500/20" : ""}`}
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                                    >
                                        {showPassword ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                    </button>
                                </div>
                                {fieldTouched.regPassword && fieldErrors.regPassword ? (
                                    <p className="text-xs text-rose-400 pl-1">{fieldErrors.regPassword}</p>
                                ) : regPassword.length > 0 && regPassword.length < 8 ? (
                                    <p className="text-xs text-[#64748B] pl-1">Minimo 8 caracteres ({regPassword.length}/8)</p>
                                ) : regPassword.length >= 8 ? (
                                    <p className="text-xs text-[#2563EB] pl-1 flex items-center gap-1"><Check className="h-3 w-3" /> Senha valida</p>
                                ) : null}
                            </div>
                        </div>

                        <p className="text-[11px] text-[#94A3B8] mt-5 text-center">
                            Ao criar sua conta, você concorda com nossos{" "}
                            <a
                                href="/termos-de-servico"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2563EB] hover:text-[#4A8CE8] underline underline-offset-2 transition-colors"
                            >
                                Termos de Uso
                            </a>.
                        </p>
                    </div>
                );

            // ────────────── Step 2: Company Data ──────────────
            case 2:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}
                        >
                            <Building2 className="h-8 w-8 text-[#2563EB]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B1220] tracking-tight mb-2 text-center">
                            Dados da Empresa
                        </h2>
                        <p className="text-[#64748B] mb-8 text-sm text-center">
                            Vamos configurar o ambiente da sua empresa
                        </p>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[#334155] text-sm font-medium">
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

                            <div className="space-y-2">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Segmento <span className="text-[#94A3B8] font-normal">(opcional)</span>
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {SEGMENT_OPTIONS.map((seg) => (
                                        <button
                                            key={seg}
                                            type="button"
                                            onClick={() => setSegment(segment === seg ? "" : seg)}
                                            className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                                                segment === seg
                                                    ? "bg-[rgba(37,99,235,0.08)] border-[rgba(37,99,235,0.45)] text-[#2563EB]"
                                                    : "bg-white border-[#E6EDF5] text-[#64748B] hover:bg-[#F1F5F9] hover:border-[#D7DEE9] hover:text-[#0B1220]"
                                            }`}
                                        >
                                            {seg}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Logo (opcional)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed border-[#E6EDF5] hover:border-[#D7DEE9] bg-white transition-colors overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="Logo preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Image className="w-6 h-6 text-[#94A3B8]" />
                                        )}
                                    </button>
                                    <div className="text-sm text-[#94A3B8]">
                                        {logoFile ? (
                                            <span className="text-[#2563EB]">{logoFile.name}</span>
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

            // ────────────── Step 3: User Profile ──────────────
            case 3:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}
                        >
                            <User className="h-8 w-8 text-[#2563EB]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B1220] tracking-tight mb-2 text-center">
                            Seu Perfil
                        </h2>
                        <p className="text-[#64748B] mb-8 text-sm text-center">
                            Conte-nos um pouco sobre voce
                        </p>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Seu nome <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
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

                            <div className="space-y-2">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Telefone / WhatsApp <span className="text-[#94A3B8] font-normal">(opcional)</span>
                                </Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                                    <Input
                                        placeholder="(11) 99999-9999"
                                        value={userPhone}
                                        onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                                        className={`${inputClasses} pl-10`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#334155] text-sm font-medium">
                                    Cargo <span className="text-[#94A3B8] font-normal">(opcional)</span>
                                </Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
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

            // ────────────── Step 4: Pipeline Template ──────────────
            case 4:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}
                        >
                            <LayoutDashboard className="h-8 w-8 text-[#2563EB]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B1220] tracking-tight mb-2 text-center">
                            Configure seu Pipeline
                        </h2>
                        <p className="text-[#64748B] mb-8 text-sm text-center">
                            Escolha um modelo de funil para começar. Você pode personalizar depois.
                        </p>

                        <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
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
                                                ? "bg-[rgba(37,99,235,0.08)] border-[rgba(37,99,235,0.45)] shadow-[0_0_20px_-5px_rgba(37,99,235,0.2)]"
                                                : "bg-white backdrop-blur-sm border-[#E6EDF5] hover:bg-[#F1F5F9] hover:border-[#D7DEE9] hover:shadow-lg"
                                        }`}
                                    >
                                        <div
                                            className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-[rgba(37,99,235,0.16)] text-[#2563EB]"
                                                    : "bg-[#F1F5F9] text-[#64748B] group-hover:text-[#2563EB] group-hover:bg-[rgba(37,99,235,0.08)]"
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`font-semibold text-sm ${
                                                    isSelected ? "text-[#2563EB]" : "text-[#0B1220]"
                                                }`}
                                            >
                                                {template.label}
                                            </p>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">
                                                {template.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {template.stages.map((s) => (
                                                    <span
                                                        key={s.id}
                                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                            isSelected
                                                                ? "border-[rgba(37,99,235,0.30)] text-[#4A8CE8] bg-[rgba(37,99,235,0.08)]"
                                                                : "border-[#E6EDF5] text-[#94A3B8] bg-[#F8FAFC]"
                                                        }`}
                                                    >
                                                        {s.title}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <motion.div layoutId="templateCheck" className="shrink-0 self-center">
                                                <div className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center shadow-[0_0_10px_rgba(37,99,235,0.5)]">
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

            // ────────────── Step 5: Plan + Payment ──────────────
            case 5: {
                const currentPlan = PLANS[selectedPlan];
                const chargeAmount = currentPlan && billingCycle === "annual"
                    ? getAnnualMonthlyEquivalent(currentPlan)
                    : currentPlan?.monthlyPrice ?? 0;
                const trialEndDate = new Date(Date.now() + 14 * 86400000)
                    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}
                        >
                            <CreditCard className="h-8 w-8 text-[#2563EB]" />
                        </motion.div>
                        <h2 className="font-heading text-2xl font-bold text-[#0B1220] tracking-tight mb-2 text-center">
                            Escolha seu Plano
                        </h2>
                        <p className="text-[#64748B] mb-6 text-sm text-center">
                            14 dias grátis para testar. Cancele quando quiser.
                        </p>

                        {/* Billing toggle */}
                        <div className="inline-flex items-center gap-1 p-1 rounded-xl mx-auto mb-6 w-full max-w-[260px]" style={{ background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                                    billingCycle === "monthly"
                                        ? "bg-white text-[#0B1220] shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
                                        : "text-[#64748B] hover:text-[#0B1220]"
                                }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setBillingCycle("annual")}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${
                                    billingCycle === "annual"
                                        ? "bg-[rgba(37,99,235,0.12)] text-[#2563EB] shadow-[0_0_0_1px_rgba(37,99,235,0.3)]"
                                        : "text-[#64748B] hover:text-[#0B1220]"
                                }`}
                            >
                                Anual
                                <span className="text-[10px] bg-[rgba(37,99,235,0.16)] text-[#2563EB] px-1.5 py-0.5 rounded font-bold">
                                    -10%
                                </span>
                            </button>
                        </div>

                        {/* Plan cards com hierarquia — popular destacado */}
                        <div className="grid gap-2.5 mb-6">
                            {["starter", "plus", "pro"].map((planId) => {
                                const plan = PLANS[planId];
                                const PlanIcon = PLAN_ICONS[planId];
                                const isSelected = selectedPlan === planId;
                                const isPopular = plan.highlight;
                                const monthlyDisplay = billingCycle === "annual"
                                    ? Math.round(getAnnualMonthlyEquivalent(plan))
                                    : plan.monthlyPrice;

                                return (
                                    <motion.button
                                        key={planId}
                                        type="button"
                                        onClick={() => setSelectedPlan(planId)}
                                        whileHover={{ y: -1 }}
                                        className={`relative flex items-center gap-4 px-4 rounded-2xl border text-left overflow-visible ${
                                            isPopular ? "py-4" : "py-3.5"
                                        } ${
                                            isSelected
                                                ? isPopular
                                                    ? "bg-gradient-to-br from-[rgba(37,99,235,0.12)] to-[rgba(37,99,235,0.04)] border-[rgba(37,99,235,0.55)] shadow-[0_0_24px_-4px_rgba(37,99,235,0.4)]"
                                                    : "bg-[rgba(37,99,235,0.08)] border-[rgba(37,99,235,0.45)] shadow-[0_0_15px_-5px_rgba(37,99,235,0.3)]"
                                                : isPopular
                                                    ? "bg-[rgba(37,99,235,0.04)] border-[rgba(37,99,235,0.2)] hover:border-[rgba(37,99,235,0.40)]"
                                                    : "bg-white border-[#E6EDF5] hover:border-[#D7DEE9]"
                                        }`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-[#2563EB] text-white text-[9px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                                                Popular
                                            </div>
                                        )}
                                        <div className={`p-2 rounded-lg shrink-0 ${
                                            isSelected
                                                ? "bg-[rgba(37,99,235,0.16)]"
                                                : isPopular
                                                    ? "bg-[rgba(37,99,235,0.08)]"
                                                    : "bg-[#F1F5F9]"
                                        }`}>
                                            <PlanIcon className={`h-4 w-4 ${
                                                isSelected
                                                    ? "text-[#2563EB]"
                                                    : isPopular
                                                        ? "text-[#4A8CE8]"
                                                        : "text-[#64748B]"
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm ${
                                                isSelected ? "text-[#2563EB]" : "text-[#0B1220]"
                                            }`}>
                                                {plan.name}
                                            </p>
                                            <p className="text-xs text-[#94A3B8] mt-0.5">
                                                {plan.description}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-bold ${isPopular ? "text-xl" : "text-lg"} ${
                                                isSelected ? "text-[#2563EB]" : "text-[#0B1220]"
                                            }`}>
                                                R$ {monthlyDisplay}
                                            </p>
                                            <p className="text-[10px] text-[#94A3B8]">/mês</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-opacity ${
                                            isSelected
                                                ? "bg-[#2563EB] opacity-100"
                                                : "bg-[#F1F5F9] opacity-60"
                                        }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Resumo + timeline trial */}
                        {currentPlan && (
                            <div
                                className="rounded-2xl p-4 mb-6"
                                style={{
                                    background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))",
                                    border: "1px solid rgba(37,99,235,0.2)",
                                }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="h-4 w-4 text-[#2563EB] shrink-0" />
                                    <p className="font-heading font-bold text-sm text-[#0B1220]">
                                        Como funciona
                                    </p>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-[rgba(37,99,235,0.16)] border border-[rgba(37,99,235,0.40)] flex items-center justify-center shrink-0">
                                                <Check className="h-3 w-3 text-[#2563EB]" strokeWidth={3} />
                                            </div>
                                            <span className="text-sm text-[#334155]">
                                                Hoje — acesso total liberado
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-[#2563EB] shrink-0">R$ 0</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-[#F1F5F9] border border-[#E6EDF5] flex items-center justify-center shrink-0">
                                                <Calendar className="h-3 w-3 text-[#64748B]" strokeWidth={2} />
                                            </div>
                                            <span className="text-sm text-[#334155] truncate">
                                                A partir de {trialEndDate}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-[#0B1220] shrink-0">
                                            {formatPrice(chargeAmount)}/mês
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#E6EDF5]">
                                    Cancele quando quiser pelo painel, sem multa.
                                </p>
                            </div>
                        )}

                        {/* Sem cartão — destaque */}
                        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-2" style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.18)" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.12)" }}>
                                <Shield className="h-4 w-4 text-[#2563EB]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0B1220]">Sem cartão para começar</p>
                                <p className="text-xs text-[#64748B] mt-0.5">
                                    Acesso total por 14 dias. Só pedimos pagamento se você decidir continuar, e dá pra contratar pela própria plataforma.
                                </p>
                            </div>
                        </div>

                        {/* Payment error */}
                        {paymentError && (
                            <div className="mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-xs text-rose-400">{paymentError}</p>
                            </div>
                        )}

                        {/* CTA — inicia trial sem cartão */}
                        <div className="mt-6 flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={paymentLoading}
                                className="h-12 w-12 shrink-0 p-0 border-[#E6EDF5] bg-[#F1F5F9] hover:bg-[#EEF2F7] text-[#64748B] hover:text-[#0B1220] rounded-xl transition-colors disabled:opacity-50"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                onClick={handleStartTrial}
                                disabled={paymentLoading || !selectedPlan}
                                className="relative flex-1 h-12 text-white font-bold text-base rounded-xl border-none transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 overflow-hidden"
                                style={{
                                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                                    boxShadow: "0 0 0 1px rgba(37,99,235,0.3), 0 4px 24px rgba(37,99,235,0.3)",
                                }}
                            >
                                {paymentLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Liberando acesso...
                                    </>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Começar teste grátis
                                        <ArrowRight className="h-5 w-5" />
                                    </span>
                                )}
                            </Button>
                        </div>

                        {/* Trust row */}
                        <div className="mt-5 pt-5 border-t border-[#E6EDF5] flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#94A3B8]">
                            <div className="flex items-center gap-1.5">
                                <CreditCard className="h-3 w-3" strokeWidth={2} />
                                <span>Sem cartão agora</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Lock className="h-3 w-3" strokeWidth={2} />
                                <span>Cancele quando quiser</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3" strokeWidth={2} />
                                <span>LGPD</span>
                            </div>
                        </div>
                    </div>
                );
            }

            // ────────────── Step 6: Invite Team ──────────────
            case 6:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}
                        >
                            <Users className="h-8 w-8 text-[#2563EB]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-[#0B1220] tracking-tight mb-2 text-center">
                            Convide sua Equipe
                        </h2>
                        <p className="text-[#64748B] mb-8 text-sm text-center">
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
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
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
                                            className="p-2 text-[#94A3B8] hover:text-rose-400 transition-colors"
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
                                    className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#2563EB] transition-colors py-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Adicionar mais um vendedor
                                </button>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            <Button
                                onClick={handleInviteTeam}
                                disabled={inviteLoading || teamEmails.every((e) => !e.trim())}
                                className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-lg shadow-[0_8px_24px_-8px_rgba(37,99,235,0.30)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
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

            // ────────────── Step 7: Success / Ready ──────────────
            case 7:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)" }}
                        >
                            <Trophy className="h-10 w-10 text-[#2563EB]" />
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-[#2563EB] font-bold text-xs uppercase tracking-widest mb-3"
                        >
                            Tudo pronto!
                        </motion.p>

                        <h2 className="text-2xl font-bold text-[#0B1220] tracking-tight mb-2">
                            Seu ambiente esta configurado!
                        </h2>
                        <p className="text-[#64748B] mb-10 text-sm max-w-sm mx-auto">
                            {companyName
                                ? `A empresa "${companyName}" esta pronta para usar o Vyzon.`
                                : "Seu Vyzon esta pronto para usar."}{" "}
                            {invitedCount > 0 &&
                                `${invitedCount} vendedor(es) ja receberam convite por e-mail.`}
                        </p>

                        <div className="grid gap-3">
                            {/* FIO 1 — conectar o WhatsApp é o que ativa a Inbox e a EVA.
                                Vira a ação destacada do fim do onboarding; abre o modal
                                de conexão direto via deep link `?connect=1`. */}
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                onClick={() => handleComplete("inbox?connect=1")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[rgba(37,99,235,0.30)] bg-[rgba(37,99,235,0.08)] hover:bg-[rgba(37,99,235,0.16)] transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-[rgba(37,99,235,0.16)]">
                                    <MessageCircle className="h-5 w-5 text-[#2563EB]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#2563EB]">
                                        Conectar o WhatsApp
                                    </p>
                                    <p className="text-xs text-[#94A3B8]">
                                        Traga suas conversas pra Inbox e deixe a EVA ajudar
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#2563EB] group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                onClick={() => handleComplete("crm")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[#E6EDF5] bg-white hover:bg-[#F1F5F9] hover:border-[#D7DEE9] transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-[#F1F5F9]">
                                    <LayoutDashboard className="h-5 w-5 text-[#2563EB]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#0B1220]">
                                        Ir ao Pipeline
                                    </p>
                                    <p className="text-xs text-[#94A3B8]">
                                        Comece a adicionar seus deals
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#94A3B8] group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                onClick={() => handleComplete("nova-venda")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[#E6EDF5] bg-white hover:bg-[#F1F5F9] hover:border-[#D7DEE9] transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-[#F1F5F9]">
                                    <Package className="h-5 w-5 text-[#2563EB]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#0B1220]">
                                        Registrar uma Venda
                                    </p>
                                    <p className="text-xs text-[#94A3B8]">
                                        Registre sua primeira venda agora
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#94A3B8] group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                onClick={() => handleComplete("dashboard")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[#E6EDF5] bg-white hover:bg-[#F1F5F9] hover:border-[#D7DEE9] transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-[#F1F5F9]">
                                    <BarChart3 className="h-5 w-5 text-[#2563EB]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#0B1220]">
                                        Ver Dashboard
                                    </p>
                                    <p className="text-xs text-[#94A3B8]">
                                        Veja metricas e acompanhe o time
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#94A3B8] group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex selection:bg-[rgba(37,99,235,0.18)]" style={{ background: "#F3F6FA" }}>
            <Confetti show={showConfetti} />

            {/* Left Panel - Dynamic per step (hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12" style={{ background: "#FFFFFF", borderRight: "1px solid #E6EDF5" }}>
                {/* Subtle top glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />
                {/* Subtle grid overlay */}
                <div className="absolute inset-0 opacity-[0.5] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(11,18,32,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(11,18,32,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

                {/* Top — Logo + Dynamic headline */}
                <div className="relative z-10">
                    <ThemeLogo className="h-12 mb-8" />

                    {/* EVA — copiloto que reage a cada etapa */}
                    <div className="flex items-start gap-3.5 mb-8">
                        <div className="relative shrink-0 mt-0.5" style={{ width: 80, height: 80 }}>
                            {/* aura reativa ao estado (mais intensa pensando, âmbar comemorando) */}
                            <motion.div
                                aria-hidden
                                className="absolute -inset-3 rounded-full pointer-events-none"
                                style={{ background: `radial-gradient(circle, ${evaMood === "excited" ? "rgba(245,158,11,0.22)" : "rgba(124,58,237,0.18)"} 0%, rgba(124,58,237,0) 70%)` }}
                                animate={{
                                    opacity: evaThinking ? [0.5, 0.95, 0.5] : [0.4, 0.8, 0.4],
                                    scale: evaThinking ? [0.96, 1.14, 0.96] : [0.95, 1.08, 0.95],
                                }}
                                transition={{ duration: evaThinking ? 2.2 : 4, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* cristais flutuando (assinatura da EVA) */}
                            <motion.span
                                aria-hidden
                                className="absolute -top-1 -right-1 h-2 w-2 rotate-45 rounded-[2px]"
                                style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}
                                animate={{ y: [0, -6, 0], opacity: [0.55, 1, 0.55] }}
                                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.span
                                aria-hidden
                                className="absolute bottom-0 -left-2 h-1.5 w-1.5 rounded-full"
                                style={{ background: "#22d3ee" }}
                                animate={{ y: [0, 5, 0], opacity: [0.4, 0.9, 0.4] }}
                                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                            />
                            {/* avatar: punch (muda expressão) > float idle > bob no ritmo da fala */}
                            <motion.div
                                key={evaMood}
                                initial={{ scale: 0.82 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 320, damping: 16 }}
                            >
                                <motion.div
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <motion.div
                                        animate={evaTyping ? { y: [0, -1.5, 0], scale: [1, 1.02, 1] } : { y: 0, scale: 1 }}
                                        transition={evaTyping ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                                    >
                                        <EvaPhotoAvatar size="lg" ring="glow" mood={evaMood} thinking={evaThinking} />
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-semibold text-[#0B1220]">EVA</span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}>
                                    sua copiloto
                                </span>
                            </div>
                            <div
                                className="relative inline-flex items-center rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-snug min-h-[42px]"
                                style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#334155", boxShadow: "0 4px 16px -8px rgba(11,18,32,0.12)" }}
                            >
                                {evaTyping && evaTyped === "" ? (
                                    <span className="inline-flex items-center gap-1 py-1" aria-label="EVA digitando">
                                        {[0, 1, 2].map((d) => (
                                            <motion.span
                                                key={d}
                                                className="h-1.5 w-1.5 rounded-full"
                                                style={{ background: "#7c3aed" }}
                                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                                                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: d * 0.15 }}
                                            />
                                        ))}
                                    </span>
                                ) : (
                                    <span>
                                        {evaTyped}
                                        {evaTyping && (
                                            <motion.span
                                                className="inline-block w-[2px] h-[1em] align-middle ml-0.5"
                                                style={{ background: "#7c3aed" }}
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 0.7, repeat: Infinity }}
                                            />
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`left-${currentStep}`}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.35 }}
                        >
                            {currentStep === 1 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Crie sua conta em{" "}
                                        <span className="text-[#2563EB]">30 segundos</span>.
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Preencha seus dados básicos e já tenha acesso à plataforma completa.
                                    </p>
                                </>
                            )}
                            {currentStep === 2 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Personalize para{" "}
                                        <span className="text-[#2563EB]">sua empresa</span>.
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Essas informações nos ajudam a configurar o ambiente ideal para o seu negócio.
                                    </p>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Quem vai{" "}
                                        <span className="text-[#2563EB]">liderar</span>?
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Seu perfil aparece no ranking e no dashboard do time.
                                    </p>
                                </>
                            )}
                            {currentStep === 4 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Monte seu{" "}
                                        <span className="text-[#2563EB]">funil de vendas</span>.
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Escolha um template pronto ou personalize depois. Você pode mudar a qualquer momento.
                                    </p>
                                </>
                            )}
                            {currentStep === 5 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Escolha o plano{" "}
                                        <span className="text-[#2563EB]">ideal</span>.
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Todos os planos incluem 14 dias grátis. Cancele quando quiser, sem burocracia.
                                    </p>
                                </>
                            )}
                            {currentStep === 6 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Traga seu{" "}
                                        <span className="text-[#2563EB]">time junto</span>.
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Convide vendedores por e-mail. Eles recebem acesso instantâneo ao pipeline e ranking.
                                    </p>
                                </>
                            )}
                            {currentStep === 7 && (
                                <>
                                    <h1 className="text-2xl xl:text-3xl font-bold leading-tight mb-2.5" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        Tudo pronto.{" "}
                                        <span className="text-[#2563EB]">Boas vendas!</span>
                                    </h1>
                                    <p className="text-sm max-w-md" style={{ color: "#64748B" }}>
                                        Seu ambiente está configurado. Hora de colocar o time para vender.
                                    </p>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom — Preview ao vivo: mini-mockup do Vyzon com dados de exemplo */}
                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="rounded-2xl p-5"
                        style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 12px 32px -16px rgba(11,18,32,0.14)" }}
                    >
                        {/* Empresa + tag prévia */}
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" style={{ border: "1px solid #E6EDF5" }} />
                                ) : (
                                    <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "linear-gradient(135deg,#2563EB,#4A8CE8)" }}>
                                        {(companyName || regCompanyName || "V").trim().charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: "#0B1220" }}>{companyName || regCompanyName || "Sua empresa"}</p>
                                    <p className="text-[10.5px] truncate" style={{ color: "#94A3B8" }}>{segment || "Central comercial"}</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: "#F1F5F9", color: "#94A3B8", letterSpacing: "0.06em" }}>prévia</span>
                        </div>

                        {/* Pipeline em destaque */}
                        <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>Pipeline</p>
                                <span className="text-[10.5px] font-semibold" style={{ color: "#16A34A" }}>▲ 12%</span>
                            </div>
                            <p className="text-[26px] font-bold tabular-nums leading-none mt-1" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>R$ 36.300</p>
                        </div>

                        {/* Funil (colunas com contagem) */}
                        <div className="grid grid-cols-5 gap-1 mb-3">
                            <AnimatePresence mode="popLayout">
                                {previewStages.map((s, i) => (
                                    <motion.div key={`${previewTpl}-${s.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }} className="rounded-md px-1 py-1.5 text-center" style={{ background: "#F8FAFC", border: "1px solid #EEF2F7" }}>
                                        <span className="block h-1 w-1 rounded-full mx-auto mb-0.5" style={{ background: STAGE_DOT[i % STAGE_DOT.length] }} />
                                        <p className="text-[7.5px] leading-tight truncate" style={{ color: "#94A3B8" }}>{s.title}</p>
                                        <p className="text-[12px] font-bold tabular-nums" style={{ color: "#475569" }}>{sampleCounts[i] ?? 0}</p>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Deals de exemplo */}
                        <div className="space-y-1.5 mb-3">
                            {sampleDeals.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: STAGE_DOT[(i + 1) % STAGE_DOT.length] }}>
                                        {d.cliente.charAt(0)}
                                    </span>
                                    <span className="text-[11.5px] flex-1 truncate" style={{ color: "#475569" }}>{d.cliente}</span>
                                    <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: "#0B1220" }}>R$ {d.valor.toLocaleString("pt-BR")}</span>
                                </div>
                            ))}
                        </div>

                        {/* Ranking (você + meta) */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] inline-flex items-center gap-1.5" style={{ color: "#475569" }}>
                                    <span className="text-[9px] font-bold px-1 rounded" style={{ background: "#FEF3C7", color: "#B45309" }}>1º</span>
                                    {previewName}
                                </span>
                                <span className="text-[11px] font-semibold" style={{ color: "#16A34A" }}>82% da meta</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E6EDF5" }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: "82%" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#2563EB,#4A8CE8)" }} />
                            </div>
                        </div>

                        {/* Plano + time */}
                        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #E6EDF5" }}>
                            <span className="text-[11px]" style={{ color: "#64748B" }}>
                                Plano <span className="font-semibold" style={{ color: "#0B1220" }}>{PLANS[selectedPlan]?.name || "Plus"}</span> · 14 dias grátis
                            </span>
                            <div className="flex -space-x-1.5">
                                {teamEmails.filter((e) => e.trim()).slice(0, 3).map((e, i) => (
                                    <span key={i} className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#7c3aed", border: "1.5px solid #FFFFFF" }}>
                                        {e.trim().charAt(0).toUpperCase()}
                                    </span>
                                ))}
                                <span className="h-5 w-5 rounded-full flex items-center justify-center text-[11px] leading-none" style={{ background: "#EFF4FF", border: "1.5px solid #FFFFFF", color: "#2563EB" }}>+</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Form Steps */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-10">
                        <ThemeLogo className="h-10 mx-auto" />
                    </div>

                    {/* Voltar — disponível em qualquer etapa acima da mínima */}
                    {currentStep > (isLoggedIn ? 2 : 1) && currentStep !== 7 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isLoading || paymentLoading || inviteLoading}
                            className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0B1220] mb-4 transition-colors disabled:opacity-40"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </button>
                    )}

                    {/* Stepper */}
                    <Stepper />

                    {/* Step Card */}
                    <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04), 0 12px 32px -12px rgba(11,18,32,0.10)" }}>
                        {/* Top border accent */}
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.3) 50%, transparent)" }} />

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

                        {/* Navigation buttons (hidden on steps with their own CTA) */}
                        {currentStep !== 5 && currentStep !== 6 && currentStep !== 7 && (
                            <div className="flex items-center gap-4 mt-10">
                                {currentStep > (isLoggedIn ? 2 : 1) && (
                                    <Button
                                        variant="outline"
                                        onClick={handleBack}
                                        disabled={isLoading}
                                        className="h-12 w-12 shrink-0 p-0 border-[#E6EDF5] bg-[#F1F5F9] hover:bg-[#EEF2F7] text-[#64748B] hover:text-[#0B1220] rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                )}

                                <Button
                                    onClick={handleNext}
                                    disabled={!canProceed() || isLoading}
                                    className="flex-1 h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base rounded-xl shadow-lg shadow-[0_8px_24px_-8px_rgba(37,99,235,0.30)] border-none transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 group"
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

                        {/* Skip option for step 4 (pipeline) */}
                        {currentStep === 4 && (
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors"
                                >
                                    Pular por agora
                                </button>
                            </div>
                        )}

                        {/* Step 6 has skip as separate button below its own CTA */}
                        {currentStep === 6 && (
                            <div className="mt-4 flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    disabled={inviteLoading}
                                    className="h-12 w-12 shrink-0 p-0 border-[#E6EDF5] bg-[#F1F5F9] hover:bg-[#EEF2F7] text-[#64748B] hover:text-[#0B1220] rounded-xl transition-colors disabled:opacity-50"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={inviteLoading}
                                    className="flex-1 text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors py-3"
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
