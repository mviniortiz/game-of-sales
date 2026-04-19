import { useEffect, useState } from "react";
import {
    Calendar,
    ArrowRight,
    ArrowLeft,
    Check,
    User,
    Mail,
    Building2,
    Phone,
    Loader2,
    Users,
    Table2,
    Target,
    TrendingUp,
    Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import NativeScheduler from "./NativeScheduler";

interface DemoScheduleSectionProps {
    /** @deprecated mantido por compat com usos antigos — scheduler agora é nativo */
    calendlyUrl?: string;
}

type Step = "contact" | "qualify" | "schedule" | "done";

interface FormState {
    name: string;
    email: string;
    company: string;
    phone: string;
    team_size: "" | "1-3" | "4-10" | "11-30" | "30+";
    uses_spreadsheets: "" | "yes" | "no";
    biggest_pain: string;
    improvement_goal: string;
}

const PAIN_OPTIONS = [
    { id: "visibility", label: "Falta de visibilidade do pipeline", icon: TrendingUp },
    { id: "quotas", label: "Equipe não bate metas", icon: Target },
    { id: "followup", label: "Follow-ups caem no esquecimento", icon: Phone },
    { id: "reporting", label: "Relatórios demoram e não confiamos nos dados", icon: Table2 },
    { id: "ramp", label: "Onboarding de vendedor lento", icon: Users },
    { id: "outro", label: "Outro", icon: Sparkles },
] as const;

const TEAM_SIZES = [
    { id: "1-3", label: "1–3", hint: "Começando" },
    { id: "4-10", label: "4–10", hint: "Em crescimento" },
    { id: "11-30", label: "11–30", hint: "Escalando" },
    { id: "30+", label: "30+", hint: "Alto volume" },
] as const;

// Máscara BR: (11) 99999-9999 · aceita 10 ou 11 dígitos
function formatBRPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

const logStep = (step: string, data?: Record<string, string | number | boolean>) => {
    try {
        // eslint-disable-next-line no-console
        console.log(`[demo-form] ${step}`, data || {});
        trackEvent(`demo_form_${step}`, data);
    } catch {
        /* analytics never breaks UX */
    }
};

export const DemoScheduleSection = ({
    calendlyUrl: _calendlyUrl,
}: DemoScheduleSectionProps = {}) => {
    void _calendlyUrl;
    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        company: "",
        phone: "",
        team_size: "",
        uses_spreadsheets: "",
        biggest_pain: "",
        improvement_goal: "",
    });
    const [step, setStep] = useState<Step>("contact");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<"email" | "phone" | "name" | "company", string>>>({});
    const [leadId, setLeadId] = useState<string | null>(null);

    useEffect(() => {
        logStep("rendered", { path: window.location.pathname });
    }, []);

    const phoneDigits = form.phone.replace(/\D/g, "");
    const isPhoneValid = phoneDigits.length === 10 || phoneDigits.length === 11;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const isNameValid = form.name.trim().length >= 2;
    const isCompanyValid = form.company.trim().length >= 2;
    const canProceedContact = isEmailValid && isPhoneValid && isNameValid && isCompanyValid;
    const canSubmitQualify = form.team_size !== "" && form.uses_spreadsheets !== "";

    const validateContact = () => {
        const next: typeof errors = {};
        if (!isEmailValid) next.email = "Informe um e-mail válido";
        if (!isPhoneValid) next.phone = "Informe seu WhatsApp com DDD (10 ou 11 dígitos)";
        if (!isNameValid) next.name = "Informe seu nome";
        if (!isCompanyValid) next.company = "Informe o nome da empresa";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        logStep("contact_submit", {
            has_email: !!form.email,
            has_phone: !!form.phone,
            has_name: !!form.name,
            has_company: !!form.company,
        });
        if (!validateContact()) {
            logStep("contact_blocked_validation");
            return;
        }
        setStep("qualify");
    };

    const handleQualifySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmitQualify) return;

        logStep("qualify_submit", {
            team_size: form.team_size,
            uses_spreadsheets: form.uses_spreadsheets,
            has_pain: !!form.biggest_pain,
            has_goal: !!form.improvement_goal,
        });

        setIsSubmitting(true);

        try {
            trackEvent("demo_request_submit", {
                source: "landing",
                has_company: !!form.company,
                team_size: form.team_size,
                uses_spreadsheets: form.uses_spreadsheets === "yes",
            });
            void trackDemoConversion({ email: form.email, phone: form.phone });
            (window as any).fbq?.("track", "Lead", {
                content_name: "demo_request",
                content_category: "landing",
            });
            logStep("tracking_fired");
        } catch (err) {
            logStep("tracking_failed", { err: String(err).slice(0, 120) });
        }

        void saveLead().finally(() => {
            setStep("schedule");
            setIsSubmitting(false);
        });
    };

    const handleEventScheduled = () => {
        logStep("demo_scheduled");
        try {
            trackEvent("demo_scheduled", { source: "landing_native" });
        } catch {
            /* analytics never breaks UX */
        }
        setStep("done");
    };

    const saveLead = async (): Promise<string | null> => {
        try {
            const attribution = getAttribution() || {};
            const phoneE164 = phoneDigits ? `+55${phoneDigits}` : form.phone;
            const { data, error } = await supabase
                .from("demo_requests")
                .insert({
                    name: form.name.trim() || "Lead",
                    email: form.email.trim().toLowerCase(),
                    company: form.company.trim() || null,
                    phone: phoneE164,
                    source: "landing_page",
                    status: "pending",
                    team_size: form.team_size || null,
                    uses_spreadsheets: form.uses_spreadsheets === "yes" ? true : form.uses_spreadsheets === "no" ? false : null,
                    biggest_pain: form.biggest_pain || null,
                    improvement_goal: form.improvement_goal.trim() || null,
                    ...attribution,
                } as any)
                .select("id")
                .single();

            if (error) {
                logStep("insert_failed", {
                    code: String(error.code || ""),
                    message: String(error.message || "").slice(0, 120),
                });
                return null;
            }

            const id = (data as { id: string } | null)?.id || null;
            if (id) setLeadId(id);
            logStep("insert_success", { id: id ? "ok" : "null" });
            return id;
        } catch (err) {
            logStep("insert_threw", { err: String(err).slice(0, 120) });
            return null;
        }
    };

    return (
        <section
            className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#06080a" }}
        >
            <div
                className="absolute top-[-15%] left-[10%] w-[60%] h-[80%] rounded-full pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 55%)",
                }}
            />
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="relative max-w-5xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-12 landing-fade-in-up">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span
                            className="text-xs text-emerald-400"
                            style={{ fontWeight: 600, letterSpacing: "0.12em" }}
                        >
                            DEMONSTRAÇÃO PERSONALIZADA
                        </span>
                    </div>

                    <h2
                        className="font-heading mb-5 max-w-3xl mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.6rem, 5vw, 3rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Vamos montar uma demo{" "}
                        <span
                            style={{
                                background: "linear-gradient(135deg, #10b981, #34d399)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            sob medida
                        </span>{" "}
                        pro seu comercial
                    </h2>

                    <p
                        className="max-w-xl mx-auto"
                        style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", lineHeight: 1.7 }}
                    >
                        Responde 2 passos em menos de 1 minuto. A gente prepara a sessão focada nas suas dores reais —
                        sem pitch genérico.
                    </p>
                </div>

                {/* ── Progress indicator ───────────────────── */}
                {step !== "done" && (
                    <div className="flex items-center justify-center gap-2 mb-6 landing-fade-in">
                        <StepDot
                            active={step === "contact"}
                            done={step === "qualify" || step === "schedule"}
                            label="Contato"
                            n={1}
                        />
                        <div
                            className="w-10 sm:w-12 h-px"
                            style={{
                                background:
                                    step === "qualify" || step === "schedule"
                                        ? "linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.3))"
                                        : "rgba(255,255,255,0.08)",
                            }}
                        />
                        <StepDot
                            active={step === "qualify"}
                            done={step === "schedule"}
                            label="Qualificação"
                            n={2}
                        />
                        <div
                            className="w-10 sm:w-12 h-px"
                            style={{
                                background:
                                    step === "schedule"
                                        ? "linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.3))"
                                        : "rgba(255,255,255,0.08)",
                            }}
                        />
                        <StepDot active={step === "schedule"} done={false} label="Horário" n={3} />
                    </div>
                )}

                {/* Card container */}
                <div
                    className="relative rounded-2xl overflow-hidden landing-fade-in-up landing-delay-100"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        boxShadow:
                            "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.3), 0 40px 80px -16px rgba(0,0,0,0.4)",
                    }}
                >
                    <div
                        className="absolute top-0 inset-x-0 h-px"
                        style={{
                            background:
                                "linear-gradient(90deg, transparent, rgba(16,185,129,0.5) 30%, rgba(20,184,166,0.4) 70%, transparent)",
                        }}
                    />

                    {/* ── STEP 1: CONTACT ─────────────────────── */}
                    {step === "contact" && (
                        <div className="p-6 sm:p-10 md:p-12 landing-fade-in">
                            <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start">
                                {/* Left — value props */}
                                <div>
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                                        style={{
                                            background: "rgba(16,185,129,0.08)",
                                            border: "1px solid rgba(16,185,129,0.15)",
                                        }}
                                    >
                                        <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-xs text-emerald-400" style={{ fontWeight: 600 }}>
                                            30 min · 100% gratuito
                                        </span>
                                    </div>

                                    <h3
                                        className="font-heading mb-4"
                                        style={{
                                            fontWeight: 700,
                                            fontSize: "1.35rem",
                                            lineHeight: 1.2,
                                            letterSpacing: "-0.03em",
                                            color: "rgba(255,255,255,0.9)",
                                        }}
                                    >
                                        O que você vai levar
                                    </h3>

                                    <div className="flex flex-col gap-3">
                                        {[
                                            "Pipeline e painel montados com seus dados",
                                            "Ranking gamificado rodando ao vivo",
                                            "Eva analisando o seu funil na hora",
                                            "Integrações com o que você já usa",
                                            "Plano ideal pro tamanho do seu time",
                                        ].map((item) => (
                                            <div key={item} className="flex items-start gap-2.5">
                                                <div
                                                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                                                    style={{ background: "rgba(16,185,129,0.12)" }}
                                                >
                                                    <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
                                                </div>
                                                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right — contact form */}
                                <form onSubmit={handleContactSubmit} className="flex flex-col gap-3.5" noValidate>
                                    <FormField icon={Mail} error={errors.email}>
                                        <input
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            required
                                            placeholder="Seu e-mail *"
                                            value={form.email}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, email: e.target.value }));
                                                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                                            }}
                                            className={`demo-input ${errors.email ? "demo-input-error" : ""}`}
                                        />
                                    </FormField>

                                    <FormField icon={Phone} error={errors.phone} hint="+55 (DDD) 9XXXX-XXXX">
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            required
                                            placeholder="WhatsApp · (11) 99999-9999 *"
                                            value={form.phone}
                                            onChange={(e) => {
                                                const masked = formatBRPhone(e.target.value);
                                                setForm((p) => ({ ...p, phone: masked }));
                                                if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                                            }}
                                            maxLength={16}
                                            className={`demo-input ${errors.phone ? "demo-input-error" : ""}`}
                                        />
                                    </FormField>

                                    <FormField icon={User} error={errors.name}>
                                        <input
                                            type="text"
                                            autoComplete="name"
                                            required
                                            placeholder="Seu nome *"
                                            value={form.name}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, name: e.target.value }));
                                                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                                            }}
                                            className={`demo-input ${errors.name ? "demo-input-error" : ""}`}
                                        />
                                    </FormField>

                                    <FormField icon={Building2} error={errors.company}>
                                        <input
                                            type="text"
                                            autoComplete="organization"
                                            required
                                            placeholder="Nome da empresa *"
                                            value={form.company}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, company: e.target.value }));
                                                if (errors.company) setErrors((p) => ({ ...p, company: undefined }));
                                            }}
                                            className={`demo-input ${errors.company ? "demo-input-error" : ""}`}
                                        />
                                    </FormField>

                                    <button
                                        type="submit"
                                        disabled={!canProceedContact}
                                        className="demo-submit-btn relative overflow-hidden flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl text-white group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                            boxShadow:
                                                "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                                            fontWeight: 700,
                                            fontSize: "0.95rem",
                                        }}
                                    >
                                        <span
                                            className="absolute inset-0 rounded-xl landing-shine"
                                            style={{
                                                background:
                                                    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)",
                                            }}
                                        />
                                        <span className="relative">Continuar</span>
                                        <ArrowRight className="relative h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                    </button>

                                    <p className="text-center text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                                        Sem compromisso · Cancela ou remarca quando quiser
                                    </p>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: QUALIFY ─────────────────────── */}
                    {step === "qualify" && (
                        <div className="p-6 sm:p-10 md:p-12 landing-fade-in">
                            <form onSubmit={handleQualifySubmit} className="space-y-7 max-w-2xl mx-auto">
                                <div className="text-center mb-2">
                                    <h3
                                        className="font-heading mb-2"
                                        style={{
                                            fontWeight: 700,
                                            fontSize: "1.4rem",
                                            lineHeight: 1.2,
                                            letterSpacing: "-0.03em",
                                            color: "rgba(255,255,255,0.9)",
                                        }}
                                    >
                                        Só mais alguns detalhes
                                    </h3>
                                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Isso ajuda a gente a preparar a sessão pro seu contexto real
                                    </p>
                                </div>

                                {/* ── Team size ─────────────────────── */}
                                <QuestionBlock
                                    icon={Users}
                                    label="Quantos vendedores têm no seu time hoje?"
                                    required
                                >
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {TEAM_SIZES.map((size) => {
                                            const selected = form.team_size === size.id;
                                            return (
                                                <button
                                                    key={size.id}
                                                    type="button"
                                                    onClick={() => setForm((p) => ({ ...p, team_size: size.id }))}
                                                    className="relative flex flex-col items-center gap-1 px-3 py-3.5 rounded-xl transition-all duration-150"
                                                    style={{
                                                        background: selected
                                                            ? "rgba(16,185,129,0.1)"
                                                            : "rgba(255,255,255,0.03)",
                                                        boxShadow: selected
                                                            ? "0 0 0 1.5px rgba(16,185,129,0.45), 0 4px 16px rgba(16,185,129,0.15)"
                                                            : "0 0 0 1px rgba(255,255,255,0.08)",
                                                    }}
                                                >
                                                    <span
                                                        className="text-base tabular-nums"
                                                        style={{
                                                            fontWeight: 700,
                                                            color: selected ? "#34d399" : "rgba(255,255,255,0.9)",
                                                        }}
                                                    >
                                                        {size.label}
                                                    </span>
                                                    <span
                                                        className="text-[10px]"
                                                        style={{
                                                            color: selected ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.35)",
                                                        }}
                                                    >
                                                        {size.hint}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </QuestionBlock>

                                {/* ── Spreadsheets ─────────────────────── */}
                                <QuestionBlock
                                    icon={Table2}
                                    label="Usa planilhas hoje pra controlar o time comercial?"
                                    required
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: "yes" as const, label: "Sim, ainda usamos" },
                                            { id: "no" as const, label: "Não, já usamos CRM" },
                                        ].map((opt) => {
                                            const selected = form.uses_spreadsheets === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setForm((p) => ({ ...p, uses_spreadsheets: opt.id }))}
                                                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm transition-all duration-150"
                                                    style={{
                                                        background: selected
                                                            ? "rgba(16,185,129,0.1)"
                                                            : "rgba(255,255,255,0.03)",
                                                        boxShadow: selected
                                                            ? "0 0 0 1.5px rgba(16,185,129,0.45), 0 4px 16px rgba(16,185,129,0.15)"
                                                            : "0 0 0 1px rgba(255,255,255,0.08)",
                                                        color: selected ? "#34d399" : "rgba(255,255,255,0.75)",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </QuestionBlock>

                                {/* ── Biggest pain ─────────────────────── */}
                                <QuestionBlock icon={Target} label="Qual a maior dor da gestão comercial hoje?">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {PAIN_OPTIONS.map((opt) => {
                                            const selected = form.biggest_pain === opt.label;
                                            const Icon = opt.icon;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setForm((p) => ({ ...p, biggest_pain: opt.label }))}
                                                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-sm transition-all duration-150"
                                                    style={{
                                                        background: selected
                                                            ? "rgba(16,185,129,0.1)"
                                                            : "rgba(255,255,255,0.03)",
                                                        boxShadow: selected
                                                            ? "0 0 0 1.5px rgba(16,185,129,0.45)"
                                                            : "0 0 0 1px rgba(255,255,255,0.08)",
                                                        color: selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
                                                    }}
                                                >
                                                    <Icon
                                                        className="h-3.5 w-3.5 flex-shrink-0"
                                                        style={{ color: selected ? "#34d399" : "rgba(255,255,255,0.3)" }}
                                                    />
                                                    <span style={{ fontWeight: 500 }}>{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </QuestionBlock>

                                {/* ── Improvement goal ─────────────────── */}
                                <QuestionBlock
                                    icon={Sparkles}
                                    label="O que você mais quer melhorar na operação?"
                                    hint="Opcional — quanto mais específico, melhor a demo"
                                >
                                    <textarea
                                        placeholder="Ex: reduzir ciclo de venda, aumentar taxa de conversão, ter previsibilidade..."
                                        value={form.improvement_goal}
                                        onChange={(e) => setForm((p) => ({ ...p, improvement_goal: e.target.value }))}
                                        rows={3}
                                        className="demo-input resize-none"
                                        style={{ padding: "12px 14px" }}
                                    />
                                </QuestionBlock>

                                {/* ── Actions ─────────────────────── */}
                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep("contact")}
                                        className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm transition-all duration-150"
                                        style={{
                                            background: "rgba(255,255,255,0.04)",
                                            boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                                            color: "rgba(255,255,255,0.6)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!canSubmitQualify || isSubmitting}
                                        className="demo-submit-btn relative overflow-hidden flex items-center justify-center gap-2.5 flex-1 px-6 py-3.5 rounded-xl text-white group disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                            boxShadow:
                                                "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                                            fontWeight: 700,
                                            fontSize: "0.95rem",
                                        }}
                                    >
                                        <span
                                            className="absolute inset-0 rounded-xl landing-shine"
                                            style={{
                                                background:
                                                    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)",
                                            }}
                                        />
                                        {isSubmitting ? (
                                            <Loader2 className="relative h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Calendar className="relative h-4 w-4" />
                                                <span className="relative">Escolher horário</span>
                                                <ArrowRight className="relative h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── STEP 3: SCHEDULE ─────── */}
                    {step === "schedule" && (
                        <div className="p-3 sm:p-6 md:p-8 landing-fade-in">
                            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                        <span
                                            className="text-[10px] sm:text-xs uppercase tracking-wider text-emerald-400"
                                            style={{ fontWeight: 600, letterSpacing: "0.1em" }}
                                        >
                                            Escolha seu horário
                                        </span>
                                    </div>
                                    <p
                                        className="text-xs sm:text-sm truncate"
                                        style={{ color: "rgba(255,255,255,0.45)" }}
                                    >
                                        Confirmação pro{" "}
                                        <span style={{ color: "rgba(255,255,255,0.75)" }}>{form.email}</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep("qualify")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-all duration-150"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                                        color: "rgba(255,255,255,0.6)",
                                        fontWeight: 600,
                                    }}
                                >
                                    <ArrowLeft className="h-3 w-3" />
                                    Voltar
                                </button>
                            </div>

                            {leadId ? (
                                <NativeScheduler
                                    demoRequestId={leadId}
                                    leadName={form.name}
                                    leadEmail={form.email}
                                    onScheduled={handleEventScheduled}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Preparando agenda...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 4: DONE ─────────────────────── */}
                    {step === "done" && (
                        <div className="py-16 sm:py-24 px-6 text-center landing-fade-in">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                                style={{
                                    background: "rgba(16,185,129,0.12)",
                                    boxShadow: "0 0 0 1px rgba(16,185,129,0.2), 0 8px 24px rgba(16,185,129,0.15)",
                                }}
                            >
                                <Check className="h-6 w-6 text-emerald-400" strokeWidth={2.5} />
                            </div>

                            <h3
                                className="font-heading mb-3"
                                style={{
                                    fontWeight: 700,
                                    fontSize: "1.5rem",
                                    letterSpacing: "-0.03em",
                                    color: "rgba(255,255,255,0.95)",
                                }}
                            >
                                Demo confirmada!
                            </h3>

                            <p
                                className="max-w-md mx-auto mb-4"
                                style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", lineHeight: 1.6 }}
                            >
                                Acabamos de enviar os detalhes pro{" "}
                                <span style={{ color: "rgba(255,255,255,0.7)" }}>{form.email}</span>. Até lá!
                            </p>

                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
                                style={{
                                    color: "rgba(52,211,153,0.9)",
                                    background: "rgba(16,185,129,0.08)",
                                    boxShadow: "0 0 0 1px rgba(16,185,129,0.2)",
                                    fontWeight: 600,
                                }}
                            >
                                <Sparkles className="h-3 w-3" />
                                Vamos preparar tudo pro seu contexto
                            </div>
                        </div>
                    )}
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
                    {["Sem compromisso", "Demonstração personalizada", "Tira todas as suas dúvidas"].map((t) => (
                        <div
                            key={t}
                            className="flex items-center gap-1.5"
                            style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontWeight: 500 }}
                        >
                            <Check className="h-3 w-3 text-emerald-500/50" strokeWidth={2.5} />
                            {t}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Styles for inputs (shared) ───────────────── */}
            <style>{`
                .demo-input {
                    width: 100%;
                    padding: 12px 14px 12px 40px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 500;
                    color: rgba(255,255,255,0.9);
                    background: rgba(255,255,255,0.04);
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
                    outline: none;
                    transition: box-shadow 150ms ease, background 150ms ease;
                }
                .demo-input:focus {
                    background: rgba(255,255,255,0.05);
                    box-shadow: 0 0 0 1.5px rgba(16,185,129,0.4), 0 0 0 4px rgba(16,185,129,0.08);
                }
                .demo-input.demo-input-error {
                    box-shadow: 0 0 0 1.5px rgba(244,63,94,0.45), 0 0 0 4px rgba(244,63,94,0.08);
                }
                .demo-input.demo-input-error:focus {
                    box-shadow: 0 0 0 1.5px rgba(244,63,94,0.6), 0 0 0 4px rgba(244,63,94,0.1);
                }
                .demo-input::placeholder {
                    color: rgba(255,255,255,0.35);
                }
                textarea.demo-input {
                    padding-left: 14px !important;
                }
            `}</style>
        </section>
    );
};

// ── Helpers ───────────────────────────────────────────────

function StepDot({ active, done, label, n }: { active: boolean; done: boolean; label: string; n: number }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs tabular-nums"
                style={{
                    background: active
                        ? "rgba(16,185,129,0.15)"
                        : done
                            ? "rgba(16,185,129,0.2)"
                            : "rgba(255,255,255,0.04)",
                    boxShadow: active
                        ? "0 0 0 1.5px rgba(16,185,129,0.5), 0 0 0 4px rgba(16,185,129,0.08)"
                        : done
                            ? "0 0 0 1px rgba(16,185,129,0.3)"
                            : "0 0 0 1px rgba(255,255,255,0.08)",
                    color: active || done ? "#34d399" : "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                }}
            >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </div>
            <span
                className="text-xs hidden sm:inline"
                style={{
                    color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                    fontWeight: active ? 600 : 500,
                }}
            >
                {label}
            </span>
        </div>
    );
}

function FormField({
    icon: Icon,
    children,
    error,
    hint,
}: {
    icon: React.ElementType;
    children: React.ReactNode;
    error?: string;
    hint?: string;
}) {
    return (
        <div>
            <div className="relative">
                <Icon
                    className="absolute left-3.5 top-[22px] -translate-y-1/2 h-4 w-4 pointer-events-none z-10"
                    style={{ color: error ? "rgba(244,63,94,0.8)" : "rgba(255,255,255,0.25)" }}
                />
                {children}
            </div>
            {error ? (
                <p className="text-[11px] mt-1.5 ml-1" style={{ color: "rgba(244,63,94,0.85)", fontWeight: 500 }}>
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[10px] mt-1 ml-1" style={{ color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

function QuestionBlock({
    icon: Icon,
    label,
    hint,
    required,
    children,
}: {
    icon: React.ElementType;
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2.5">
                <Icon className="h-3.5 w-3.5 text-emerald-400/80" />
                <label
                    className="text-sm"
                    style={{
                        color: "rgba(255,255,255,0.85)",
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                    }}
                >
                    {label}
                    {required && <span className="text-emerald-400 ml-1">*</span>}
                </label>
            </div>
            {hint && (
                <p className="text-[11px] mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {hint}
                </p>
            )}
            {children}
        </div>
    );
}
