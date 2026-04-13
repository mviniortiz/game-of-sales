import { useState, useEffect, useRef, useCallback, memo } from "react";
import { logger } from "@/utils/logger";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackEvent, trackConversion, trackPurchaseConversion, FUNNEL_EVENTS } from "@/lib/analytics";
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
    Zap,
    Shield,
    type LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import vyzonLogo from "@/assets/logo-dark.png";
import { Confetti } from "@/components/crm/Confetti";
import { PLANS, formatPrice, getAnnualMonthlyEquivalent, getAnnualPrice, getBillingConfig, type BillingCycle } from "@/config/plans";
import { initMercadoPago } from "@mercadopago/sdk-react";
import coreCreateCardToken from "@mercadopago/sdk-react/esm/coreMethods/cardToken/create";
import { RATE_LIMITS, resetRateLimit } from "@/lib/rateLimiter";
import { z } from "zod";

// Initialize MercadoPago SDK
const mpPublicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
if (mpPublicKey) {
    initMercadoPago(mpPublicKey, { locale: "pt-BR" });
}

// MP error code to user-friendly message mapping
const MP_ERROR_MESSAGES: Record<string, string> = {
    "106": "Número do cartão inválido. Verifique e tente novamente.",
    "109": "Esse cartão não processa o número de parcelas selecionado.",
    "126": "Não foi possível processar o pagamento. Tente novamente.",
    "129": "Esse cartão não processa o valor selecionado.",
    "145": "Usuário não encontrado. Verifique seus dados.",
    "150": "Pagamento não disponível no momento. Tente novamente mais tarde.",
    "151": "Pagamento não disponível no momento. Tente outro cartão.",
    "160": "Não foi possível processar o pagamento. Tente outro cartão.",
    "204": "Bandeira do cartão não disponível no momento.",
    "205": "Número do cartão inválido. Verifique e tente novamente.",
    "208": "Mês de validade inválido.",
    "209": "Ano de validade inválido.",
    "212": "CPF inválido. Verifique e tente novamente.",
    "213": "CPF inválido. Verifique e tente novamente.",
    "214": "CPF inválido. Verifique e tente novamente.",
    "220": "Banco emissor não disponível. Tente outro cartão.",
    "221": "Titular do cartão inválido. Verifique o nome.",
    "224": "Código de segurança (CVV) inválido.",
    "E301": "Número do cartão inválido. Verifique e tente novamente.",
    "E302": "Código de segurança (CVV) inválido.",
    "316": "Titular do cartão inválido. Verifique o nome.",
    "322": "CPF inválido. Verifique e tente novamente.",
    "323": "CPF inválido. Verifique e tente novamente.",
    "324": "CPF inválido. Verifique e tente novamente.",
    "325": "Mês de validade inválido.",
    "326": "Ano de validade inválido.",
    "default": "Não foi possível processar o cartão. Verifique os dados e tente novamente.",
};

const getMpErrorMessage = (error: any): string => {
    const cause = error?.cause;
    if (Array.isArray(cause)) {
        for (const c of cause) {
            const code = c?.code || c?.message;
            if (code && MP_ERROR_MESSAGES[code]) return MP_ERROR_MESSAGES[code];
        }
    }
    const msg = String(error?.message || "").toLowerCase();
    if (msg.includes("whitespace") || msg.includes("public_key")) return "Erro de configuração do pagamento. Entre em contato com o suporte.";
    if (msg.includes("card number")) return "Número do cartão inválido.";
    if (msg.includes("security code") || msg.includes("cvv")) return "Código de segurança (CVV) inválido.";
    if (msg.includes("expiration")) return "Data de validade inválida.";
    if (msg.includes("cardholder")) return "Nome do titular inválido.";
    if (msg.includes("timeout") || msg.includes("tempo")) return "Tempo esgotado. Verifique sua conexão e tente novamente.";
    if (msg.includes("4000") || msg.includes("amount")) return "Valor acima do limite permitido. Entre em contato com o suporte.";
    if (msg.includes("validation") || msg.includes("failed")) return "Dados do cartão inválidos. Verifique e tente novamente.";
    return MP_ERROR_MESSAGES["default"];
};

// Card number formatting helpers
const formatCardNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatExpiration = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
};

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

const PLAN_ICONS: Record<string, LucideIcon> = {
    starter: Zap,
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

    // Step tracking - start at step 2 if already logged in
    const [currentStep, setCurrentStep] = useState(isLoggedIn ? 2 : 1);
    const [direction, setDirection] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
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
    const [cardToken, setCardToken] = useState<string | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiration, setCardExpiration] = useState("");
    const [cardCvv, setCardCvv] = useState("");

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

    // Handle payment submission for step 5
    const handlePayment = async () => {
        trackEvent(FUNNEL_EVENTS.PAYMENT_SUBMIT, { plan: selectedPlan });

        // Recover company ID — prefer authCompanyId (from profile, matches edge function check)
        // over localStorage which may be stale from a previous attempt
        let companyId = authCompanyId
            || effectiveCompanyId
            || localStorage.getItem(ONBOARDING_COMPANY_KEY);
        if (companyId && companyId !== effectiveCompanyId) {
            lockAndSetCompanyId(companyId);
        }

        // Recover user email — auth state may not have updated after signUp
        let email = user?.email || regEmail || localStorage.getItem(ONBOARDING_EMAIL_KEY) || "";
        if (!email) {
            try {
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                email = freshSession?.user?.email || "";
            } catch { /* ignore */ }
        }

        if (!companyId || !email) {
            console.error("[handlePayment] Missing data:", { companyId, email, user: !!user, regEmail, authCompanyId, effectiveCompanyId });
            toast({ title: "Erro", description: "Dados da empresa não encontrados. Tente recarregar a página.", variant: "destructive" });
            return;
        }

        const cardholderName = (document.getElementById("cardholder-name") as HTMLInputElement)?.value;
        const docNumber = (document.getElementById("doc-number") as HTMLInputElement)?.value;
        const rawCardNumber = cardNumber.replace(/\D/g, "");
        const expParts = cardExpiration.split("/");
        const expMonth = expParts[0] || "";
        const expYear = expParts[1] ? (expParts[1].length === 2 ? `20${expParts[1]}` : expParts[1]) : "";
        const rawCvv = cardCvv.replace(/\D/g, "");

        if (!cardholderName || !docNumber || !rawCardNumber || !expMonth || !expYear || !rawCvv) {
            toast({ title: "Campos obrigatórios", description: "Preencha todos os dados do cartão", variant: "destructive" });
            return;
        }

        if (rawCardNumber.length < 13 || rawCardNumber.length > 19) {
            toast({ title: "Cartão inválido", description: "O número do cartão deve ter entre 13 e 19 dígitos", variant: "destructive" });
            return;
        }

        if (rawCvv.length < 3 || rawCvv.length > 4) {
            toast({ title: "CVV inválido", description: "O código de segurança deve ter 3 ou 4 dígitos", variant: "destructive" });
            return;
        }

        if (docNumber.replace(/\D/g, "").length < 11) {
            toast({ title: "CPF inválido", description: "O CPF deve ter 11 dígitos", variant: "destructive" });
            return;
        }

        setPaymentLoading(true);
        setPaymentError(null);

        try {
            // Ensure user is authenticated before calling edge function
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession && regEmail && regPassword) {
                console.log("[handlePayment] No active session, attempting sign-in...");
                const { error: signInErr } = await supabase.auth.signInWithPassword({
                    email: regEmail,
                    password: regPassword,
                });
                if (signInErr) {
                    console.warn("[handlePayment] Auto sign-in failed:", signInErr.message);
                }
            }

            console.log("[handlePayment] Creating card token with core method...");

            const tokenPromise = coreCreateCardToken({
                cardNumber: rawCardNumber,
                cardholderName,
                cardExpirationMonth: expMonth,
                cardExpirationYear: expYear,
                securityCode: rawCvv,
                identificationType: "CPF",
                identificationNumber: docNumber.replace(/\D/g, ""),
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Tempo esgotado ao processar cartão. Tente novamente.")), 30000)
            );
            const tokenResponse = await Promise.race([tokenPromise, timeoutPromise]) as any;

            console.log("[handlePayment] Token response:", tokenResponse?.id ? "OK" : "FAILED");

            if (!tokenResponse?.id) {
                throw new Error("Não foi possível processar o cartão. Verifique os dados e tente novamente.");
            }

            // Get billing config
            const billing = getBillingConfig(selectedPlan, billingCycle);
            if (!billing) throw new Error("Plano inválido");

            // Call edge function to create subscription
            const response = await supabase.functions.invoke("mercadopago-create-subscription", {
                body: {
                    token: tokenResponse.id,
                    email,
                    companyId,
                    billingConfig: {
                        frequency: billing.frequency,
                        frequencyType: billing.frequencyType,
                        transactionAmount: billing.transactionAmount,
                    },
                },
            });

            if (response.error) {
                // Try to extract detailed error from edge function response
                let detail = response.error.message;
                try {
                    const ctx = (response.error as any).context;
                    if (ctx && typeof ctx.json === "function") {
                        const body = await ctx.json();
                        detail = body?.error || body?.message || detail;
                        console.error("[handlePayment] Edge function error:", body);
                    }
                } catch {
                    // fallback to generic message
                }
                throw new Error(detail || "Erro ao criar assinatura");
            }

            let result = response.data;
            console.log("[handlePayment] Edge function response:", result, typeof result);
            // Supabase sometimes returns stringified JSON
            if (typeof result === "string") {
                try { result = JSON.parse(result); } catch { /* keep as-is */ }
            }
            if (!result?.success) {
                throw new Error(result?.error || result?.message || "Erro ao processar pagamento");
            }

            // Update company plan locally (best effort — edge function already set trial)
            try {
                const { error: planErr } = await supabase
                    .from("companies")
                    .update({ plan: selectedPlan })
                    .eq("id", companyId);
                if (planErr) console.warn("[handlePayment] Plan update error (non-critical):", planErr);
            } catch (planErr) {
                console.warn("[handlePayment] Plan update exception (non-critical):", planErr);
            }

            console.log("[handlePayment] SUCCESS! Advancing to next step...");
            trackEvent(FUNNEL_EVENTS.PAYMENT_SUCCESS, { plan: selectedPlan });
            trackPurchaseConversion(Number(billingConfig?.amount) || 0, undefined, true);
            toast({ title: "Assinatura criada!", description: "Seu trial de 14 dias começou. Aproveite!" });
            advanceStep();
        } catch (error: any) {
            const msg = getMpErrorMessage(error);
            console.error("[handlePayment] Error:", error);
            trackEvent(FUNNEL_EVENTS.PAYMENT_ERROR, { plan: selectedPlan, error: msg });
            setPaymentError(msg);
            toast({ title: "Erro no pagamento", description: msg, variant: "destructive" });
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
                const { error: companyError } = await supabase
                    .from("companies")
                    .insert({ id: newCompanyId, name: regCompanyName, plan: selectedPlan } as any);
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
                trackPurchaseConversion(undefined, newCompanyId, true);
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

        // Step 5: Payment handled by handlePayment()
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
                            style={{ background: "rgba(16,185,129,0.1)", color: "#34d399" }}
                        >
                            {displayStep}/{displayTotalSteps}
                        </span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={currentLabel}
                                className="text-sm font-medium"
                                style={{ color: "rgba(255,255,255,0.7)" }}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15 }}
                            >
                                {currentLabel}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {Math.round(pct)}%
                    </span>
                </div>
                {/* Single progress bar */}
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #10b981, #34d399)" }}
                        initial={false}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                </div>
            </div>
        );
    };

    const inputClasses =
        "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.25)] focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/40 hover:border-[rgba(255,255,255,0.15)] h-12 text-base rounded-xl transition-all duration-200";

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
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            <Rocket className="h-8 w-8 text-emerald-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Crie sua conta
                        </h2>
                        <p className="text-[rgba(255,255,255,0.45)] mb-8 text-sm text-center">
                            Comece sua jornada de alta performance em vendas
                        </p>

                        <div className="space-y-4">
                            {/* Nome */}
                            <div className="space-y-1.5">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Seu nome completo <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    E-mail <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Nome da empresa <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Senha <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
                                    >
                                        {showPassword ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                    </button>
                                </div>
                                {fieldTouched.regPassword && fieldErrors.regPassword ? (
                                    <p className="text-xs text-rose-400 pl-1">{fieldErrors.regPassword}</p>
                                ) : regPassword.length > 0 && regPassword.length < 8 ? (
                                    <p className="text-xs text-amber-400/70 pl-1">Minimo 8 caracteres ({regPassword.length}/8)</p>
                                ) : regPassword.length >= 8 ? (
                                    <p className="text-xs text-emerald-400/70 pl-1 flex items-center gap-1"><Check className="h-3 w-3" /> Senha valida</p>
                                ) : null}
                            </div>
                        </div>

                        <p className="text-[11px] text-[rgba(255,255,255,0.3)] mt-5 text-center">
                            Ao criar sua conta, você concorda com nossos{" "}
                            <a
                                href="/termos-de-servico"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
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
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                        >
                            <Building2 className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Dados da Empresa
                        </h2>
                        <p className="text-[rgba(255,255,255,0.45)] mb-8 text-sm text-center">
                            Vamos configurar o ambiente da sua empresa
                        </p>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
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
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Segmento
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {SEGMENT_OPTIONS.map((seg) => (
                                        <button
                                            key={seg}
                                            type="button"
                                            onClick={() => setSegment(segment === seg ? "" : seg)}
                                            className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                                                segment === seg
                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                                    : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-white"
                                            }`}
                                        >
                                            {seg}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Logo (opcional)
                                </Label>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.03)] transition-colors overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="Logo preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Image className="w-6 h-6 text-[rgba(255,255,255,0.3)]" />
                                        )}
                                    </button>
                                    <div className="text-sm text-[rgba(255,255,255,0.3)]">
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

            // ────────────── Step 3: User Profile ──────────────
            case 3:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                        >
                            <User className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Seu Perfil
                        </h2>
                        <p className="text-[rgba(255,255,255,0.45)] mb-8 text-sm text-center">
                            Conte-nos um pouco sobre voce
                        </p>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Seu nome <span className="text-rose-400">*</span>
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Telefone / WhatsApp
                                </Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
                                    <Input
                                        placeholder="(11) 99999-9999"
                                        value={userPhone}
                                        onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                                        className={`${inputClasses} pl-10`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Cargo
                                </Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                        >
                            <LayoutDashboard className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Configure seu Pipeline
                        </h2>
                        <p className="text-[rgba(255,255,255,0.45)] mb-8 text-sm text-center">
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
                                                ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]"
                                                : "bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:shadow-lg"
                                        }`}
                                    >
                                        <div
                                            className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] group-hover:text-amber-500 group-hover:bg-amber-500/10"
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
                                            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-0.5">
                                                {template.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {template.stages.map((s) => (
                                                    <span
                                                        key={s.id}
                                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                            isSelected
                                                                ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                                                                : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)]"
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

            // ────────────── Step 5: Plan + Payment ──────────────
            case 5:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            <CreditCard className="h-8 w-8 text-emerald-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Escolha seu Plano
                        </h2>
                        <p className="text-[rgba(255,255,255,0.45)] mb-6 text-sm text-center">
                            14 dias grátis para testar. Cancele quando quiser.
                        </p>

                        {/* Billing toggle */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    billingCycle === "monthly"
                                        ? "bg-[rgba(255,255,255,0.08)] text-white"
                                        : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)]"
                                }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setBillingCycle("annual")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                    billingCycle === "annual"
                                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                                        : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)]"
                                }`}
                            >
                                Anual
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                    -10%
                                </span>
                            </button>
                        </div>

                        {/* Plan cards */}
                        <div className="grid gap-2.5 mb-6">
                            {["starter", "plus", "pro"].map((planId) => {
                                const plan = PLANS[planId];
                                const PlanIcon = PLAN_ICONS[planId];
                                const isSelected = selectedPlan === planId;
                                const monthlyDisplay = billingCycle === "annual"
                                    ? Math.round(getAnnualMonthlyEquivalent(plan))
                                    : plan.monthlyPrice;

                                return (
                                    <motion.button
                                        key={planId}
                                        type="button"
                                        onClick={() => setSelectedPlan(planId)}
                                        className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 text-left ${
                                            isSelected
                                                ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]"
                                                : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSelected ? "bg-emerald-500/20" : "bg-[rgba(255,255,255,0.06)]"}`}>
                                            <PlanIcon className={`h-4 w-4 ${isSelected ? "text-emerald-400" : "text-[rgba(255,255,255,0.45)]"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`font-bold text-sm ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                                    {plan.name}
                                                </p>
                                                {plan.highlight && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                                                        Popular
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-0.5">{plan.description}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`font-bold text-lg ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                                R$ {monthlyDisplay}
                                            </p>
                                            <p className="text-[10px] text-[rgba(255,255,255,0.3)]">/mes</p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Trial info */}
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                            <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                            <p className="text-xs text-amber-300">
                                <strong>14 dias grátis.</strong> Você só será cobrado após o período de teste. Cancele a qualquer momento.
                            </p>
                        </div>

                        {/* Card form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Número do cartão <span className="text-rose-400">*</span>
                                </Label>
                                <Input
                                    placeholder="0000 0000 0000 0000"
                                    className={inputClasses}
                                    maxLength={19}
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                    inputMode="numeric"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                        Validade <span className="text-rose-400">*</span>
                                    </Label>
                                    <Input
                                        placeholder="MM/AA"
                                        className={inputClasses}
                                        maxLength={5}
                                        value={cardExpiration}
                                        onChange={(e) => setCardExpiration(formatExpiration(e.target.value))}
                                        inputMode="numeric"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                        CVV <span className="text-rose-400">*</span>
                                    </Label>
                                    <Input
                                        placeholder="123"
                                        className={inputClasses}
                                        maxLength={4}
                                        value={cardCvv}
                                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        inputMode="numeric"
                                        type="password"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    Nome no cartão <span className="text-rose-400">*</span>
                                </Label>
                                <Input
                                    id="cardholder-name"
                                    placeholder="Nome como está no cartão"
                                    className={inputClasses}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[rgba(255,255,255,0.6)] text-sm font-medium">
                                    CPF do titular <span className="text-rose-400">*</span>
                                </Label>
                                <Input
                                    id="doc-number"
                                    placeholder="000.000.000-00"
                                    className={inputClasses}
                                    maxLength={14}
                                    inputMode="numeric"
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                                        let formatted = digits;
                                        if (digits.length > 9) formatted = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
                                        else if (digits.length > 6) formatted = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
                                        else if (digits.length > 3) formatted = `${digits.slice(0,3)}.${digits.slice(3)}`;
                                        e.target.value = formatted;
                                    }}
                                />
                            </div>
                        </div>

                        {/* Payment error */}
                        {paymentError && (
                            <div className="mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-xs text-rose-400">{paymentError}</p>
                            </div>
                        )}

                        {/* Payment CTA */}
                        <div className="mt-6 flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={paymentLoading}
                                className="h-12 w-12 shrink-0 p-0 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:text-white rounded-xl transition-colors disabled:opacity-50"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                onClick={handlePayment}
                                disabled={paymentLoading || !selectedPlan}
                                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-500/20 border-none transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                {paymentLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        Iniciar trial grátis
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                );

            // ────────────── Step 6: Invite Team ──────────────
            case 6:
                return (
                    <div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                        >
                            <Users className="h-8 w-8 text-amber-500" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
                            Convide sua Equipe
                        </h2>
                        <p className="text-[rgba(255,255,255,0.45)] mb-8 text-sm text-center">
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
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.3)]" />
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
                                            className="p-2 text-[rgba(255,255,255,0.3)] hover:text-rose-400 transition-colors"
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
                                    className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.45)] hover:text-emerald-400 transition-colors py-2"
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

            // ────────────── Step 7: Success / Ready ──────────────
            case 7:
                return (
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
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
                        <p className="text-[rgba(255,255,255,0.45)] mb-10 text-sm max-w-sm mx-auto">
                            {companyName
                                ? `A empresa "${companyName}" esta pronta para usar o Vyzon.`
                                : "Seu Vyzon esta pronto para usar."}{" "}
                            {invitedCount > 0 &&
                                `${invitedCount} vendedor(es) ja receberam convite por e-mail.`}
                        </p>

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
                                    <p className="text-xs text-[rgba(255,255,255,0.3)]">
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
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.06)]">
                                    <Package className="h-5 w-5 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                        Registrar uma Venda
                                    </p>
                                    <p className="text-xs text-[rgba(255,255,255,0.3)]">
                                        Registre sua primeira venda agora
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[rgba(255,255,255,0.3)] group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                onClick={() => handleComplete("dashboard")}
                                className="group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all text-left"
                            >
                                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.06)]">
                                    <BarChart3 className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                        Ver Dashboard
                                    </p>
                                    <p className="text-xs text-[rgba(255,255,255,0.3)]">
                                        Veja metricas e acompanhe o time
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[rgba(255,255,255,0.3)] group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex selection:bg-emerald-500/30" style={{ background: "#06080a" }}>
            <Confetti show={showConfetti} />

            {/* Left Panel - Dynamic per step (hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12" style={{ background: "#0a0d10", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Subtle grid overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

                {/* Top — Logo + Dynamic headline */}
                <div className="relative z-10">
                    <img src={vyzonLogo} alt="Vyzon" className="h-12 mb-10" />
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
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Crie sua conta em{" "}
                                        <span className="text-emerald-400">30 segundos</span>.
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Preencha seus dados básicos e já tenha acesso à plataforma completa.
                                    </p>
                                </>
                            )}
                            {currentStep === 2 && (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Personalize para{" "}
                                        <span className="text-emerald-400">sua empresa</span>.
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Essas informações nos ajudam a configurar o ambiente ideal para o seu negócio.
                                    </p>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Quem vai{" "}
                                        <span className="text-emerald-400">liderar</span>?
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Seu perfil aparece no ranking e no dashboard do time.
                                    </p>
                                </>
                            )}
                            {currentStep === 4 && (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Monte seu{" "}
                                        <span className="text-amber-400">funil de vendas</span>.
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Escolha um template pronto ou personalize depois. Você pode mudar a qualquer momento.
                                    </p>
                                </>
                            )}
                            {currentStep === 5 && (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Escolha o plano{" "}
                                        <span className="text-emerald-400">ideal</span>.
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Todos os planos incluem 14 dias grátis. Cancele quando quiser, sem burocracia.
                                    </p>
                                </>
                            )}
                            {currentStep === 6 && (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Traga seu{" "}
                                        <span className="text-blue-400">time junto</span>.
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Convide vendedores por e-mail. Eles recebem acesso instantâneo ao pipeline e ranking.
                                    </p>
                                </>
                            )}
                            {currentStep === 7 && (
                                <>
                                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5" style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em" }}>
                                        Tudo pronto.{" "}
                                        <span className="text-emerald-400">Boas vendas!</span>
                                    </h1>
                                    <p className="text-lg max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Seu ambiente está configurado. Hora de colocar o time para vender.
                                    </p>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom — Dynamic feature highlights per step */}
                <div className="relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`features-${currentStep}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="space-y-3"
                        >
                            {(currentStep <= 3 ? [
                                { icon: Zap, text: "Setup em menos de 5 minutos" },
                                { icon: Trophy, text: "Ranking gamificado ao vivo" },
                                { icon: LayoutDashboard, text: "Pipeline visual estilo Kanban" },
                            ] : currentStep === 4 ? [
                                { icon: Briefcase, text: "Templates prontos para B2B, infoprodutos e serviços" },
                                { icon: LayoutDashboard, text: "Personalize estágios, cores e ícones" },
                                { icon: ArrowRight, text: "Mude a qualquer momento nas configurações" },
                            ] : currentStep === 5 ? [
                                { icon: Shield, text: "Pagamento seguro via MercadoPago" },
                                { icon: CreditCard, text: "14 dias grátis — cobrança só depois" },
                                { icon: Zap, text: "Cancele quando quiser, sem multa" },
                            ] : currentStep === 6 ? [
                                { icon: Users, text: "Cada vendedor tem seu próprio login" },
                                { icon: Trophy, text: "Ranking atualiza automaticamente" },
                                { icon: Mail, text: "Convite chega direto no e-mail" },
                            ] : [
                                { icon: Rocket, text: "Pipeline, ranking e metas prontos" },
                                { icon: Users, text: "Time convidado e com acesso" },
                                { icon: Trophy, text: "Comece a bater metas hoje" },
                            ]).map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                                        >
                                            <Icon className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{item.text}</span>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
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
                        <img src={vyzonLogo} alt="Vyzon" className="h-10 mx-auto" />
                    </div>

                    {/* Stepper */}
                    <Stepper />

                    {/* Step Card */}
                    <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {/* Top border accent */}
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.3) 50%, transparent)" }} />

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
                                        className="h-12 w-12 shrink-0 p-0 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:text-white rounded-xl transition-colors disabled:opacity-50"
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

                        {/* Skip option for step 4 (pipeline) */}
                        {currentStep === 4 && (
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-sm text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
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
                                    className="h-12 w-12 shrink-0 p-0 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:text-white rounded-xl transition-colors disabled:opacity-50"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={inviteLoading}
                                    className="flex-1 text-sm text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] transition-colors py-3"
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
