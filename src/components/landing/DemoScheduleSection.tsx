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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import NativeScheduler from "./NativeScheduler";

interface DemoScheduleSectionProps {
    /** @deprecated mantido por compat com usos antigos — scheduler agora é nativo */
    calendlyUrl?: string;
}

type Step = "contact" | "schedule" | "done";

interface FormState {
    name: string;
    email: string;
    company: string;
    phone: string;
}

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
    const canSubmit = isEmailValid && isPhoneValid && isNameValid && isCompanyValid;

    const validateContact = () => {
        const next: typeof errors = {};
        if (!isEmailValid) next.email = "Informe um e-mail válido";
        if (!isPhoneValid) next.phone = "Informe seu WhatsApp com DDD (10 ou 11 dígitos)";
        if (!isNameValid) next.name = "Informe seu nome";
        if (!isCompanyValid) next.company = "Informe o nome da empresa";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
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

        setIsSubmitting(true);

        const id = await saveLead();

        try {
            trackEvent("demo_request_submit", {
                source: "landing",
                has_company: !!form.company,
                lead_id: id || undefined,
            });
            void trackDemoConversion({
                email: form.email,
                phone: form.phone,
                leadId: id || undefined,
            });
            (window as any).fbq?.("track", "Lead", {
                content_name: "demo_request",
                content_category: "landing",
            });
            logStep("tracking_fired", { has_lead_id: !!id });
        } catch (err) {
            logStep("tracking_failed", { err: String(err).slice(0, 120) });
        }

        // Server-side Google Ads conversion upload (imune a adblocker/DNT).
        // Só faz sentido se tiver lead_id; gclid check é feito na edge function.
        if (id) {
            void supabase.functions
                .invoke("upload-ads-conversion", { body: { lead_id: id } })
                .then((r) => logStep("ads_upload_result", { ok: !r.error, skipped: (r.data as any)?.skipped }))
                .catch((err) => logStep("ads_upload_failed", { err: String(err).slice(0, 120) }));
        }

        setStep("schedule");
        setIsSubmitting(false);
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
                        Preenche seus dados em 30 segundos e escolhe o horário. A gente prepara a sessão focada no seu contexto. Sem pitch genérico.
                    </p>
                </div>

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
                                {/* Left on desktop — value props. On mobile: order-2 (below form) */}
                                <div className="order-2 md:order-1">
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
                                            "Eva (nossa IA) analisando seu funil na hora",
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

                                {/* Right on desktop — contact form. On mobile: order-1 (above benefits) */}
                                <form id="demo-form-start" onSubmit={handleContactSubmit} className="flex flex-col gap-3.5 order-1 md:order-2" noValidate>
                                    <p className="text-[11px] mb-0.5" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                                        Todos os campos são obrigatórios.
                                    </p>

                                    <FormField icon={Mail} error={errors.email}>
                                        <input
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            required
                                            placeholder="Seu e-mail"
                                            value={form.email}
                                            onChange={(e) => {
                                                setForm((p) => ({ ...p, email: e.target.value }));
                                                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                                            }}
                                            className={`demo-input ${errors.email ? "demo-input-error" : ""}`}
                                        />
                                    </FormField>

                                    <FormField icon={Phone} error={errors.phone} hint="Exemplo: (11) 99999-9999">
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            required
                                            placeholder="Seu WhatsApp com DDD"
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
                                            placeholder="Seu nome"
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
                                            placeholder="Nome da empresa"
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
                                        disabled={!canSubmit || isSubmitting}
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

                                    <p className="text-center text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                                        Sem compromisso · Cancela ou remarca quando quiser
                                    </p>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: SCHEDULE ─────── */}
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
                                    onClick={() => setStep("contact")}
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

                    {/* ── STEP 3: DONE ─────────────────────── */}
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
                                Vamos preparar tudo pro seu contexto
                            </div>
                        </div>
                    )}
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
                    {["Sem cartão de crédito", "Demonstração personalizada", "Atendimento humano"].map((t) => (
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
