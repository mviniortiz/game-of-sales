import { useEffect, useState } from "react";
import {
    Calendar,
    ArrowRight,
    ArrowLeft,
    Check,
    User,
    Mail,
    Phone,
    Loader2,
    Briefcase,
    Target,
    Package,
    MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import NativeScheduler from "./NativeScheduler";

interface DemoScheduleSectionProps {
    /** @deprecated mantido por compat com usos antigos — scheduler agora é nativo */
    calendlyUrl?: string;
}

// Flow flipado (calendar-first): user escolhe horário ANTES de preencher dados.
// Reduz atrito (67% drop rendered→form_start no flow antigo) e segue padrão
// Calendly/Cal.com onde commitment escalona (slot < email < WhatsApp).
type Step = "schedule" | "contact" | "context" | "done";

interface FormState {
    name: string;
    email: string;
    phone: string;
}

interface PickedSlot {
    startIso: string;
    endIso: string;
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
        phone: "",
    });
    const [step, setStep] = useState<Step>("schedule");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<"email" | "phone" | "name", string>>>({});
    const [pickedSlot, setPickedSlot] = useState<PickedSlot | null>(null);
    const [bookError, setBookError] = useState<string | null>(null);
    // Etapa de contexto: lead descreve a empresa → gera demo personalizada
    const [leadId, setLeadId] = useState<string | null>(null);
    const [ctx, setCtx] = useState({ company: "", segment: "", offer: "", pain: "" });
    const [ctxLoading, setCtxLoading] = useState(false);

    useEffect(() => {
        logStep("rendered", { path: window.location.pathname, variant: "schedule_first" });
    }, []);

    const phoneDigits = form.phone.replace(/\D/g, "");
    const isPhoneValid = phoneDigits.length === 10 || phoneDigits.length === 11;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const isNameValid = form.name.trim().length >= 2;
    const canSubmit = isEmailValid && isPhoneValid && isNameValid;

    const validateContact = () => {
        const next: typeof errors = {};
        if (!isEmailValid) next.email = "Informe um e-mail válido";
        if (!isPhoneValid) next.phone = "Informe seu WhatsApp com DDD (10 ou 11 dígitos)";
        if (!isNameValid) next.name = "Informe seu nome";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSlotConfirm = (slot: { startIso: string; endIso: string }) => {
        setPickedSlot(slot);
        logStep("slot_picked", { start: slot.startIso });
        setStep("contact");
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        logStep("contact_submit", {
            has_email: !!form.email,
            has_phone: !!form.phone,
            has_name: !!form.name,
            has_slot: !!pickedSlot,
        });
        if (!validateContact()) {
            logStep("contact_blocked_validation");
            return;
        }
        if (!pickedSlot) {
            logStep("contact_missing_slot");
            setStep("schedule");
            return;
        }

        setIsSubmitting(true);
        setBookError(null);

        const id = await saveLead();

        try {
            trackEvent("demo_request_submit", {
                source: "landing",
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

        if (id) {
            void supabase.functions
                .invoke("upload-ads-conversion", { body: { lead_id: id } })
                .then((r) => logStep("ads_upload_result", { ok: !r.error, skipped: (r.data as any)?.skipped }))
                .catch((err) => logStep("ads_upload_failed", { err: String(err).slice(0, 120) }));
        }

        if (!id) {
            setBookError("Não conseguimos salvar seus dados. Tente novamente ou fale pelo WhatsApp.");
            setIsSubmitting(false);
            return;
        }

        // Com lead salvo, agora confirma o slot previamente escolhido
        try {
            const { data, error } = await supabase.functions.invoke("calendar-book", {
                body: {
                    demo_request_id: id,
                    start_iso: pickedSlot.startIso,
                    end_iso: pickedSlot.endIso,
                },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            logStep("demo_scheduled");
            try {
                trackEvent("demo_scheduled", { source: "landing_native" });
            } catch {
                /* analytics never breaks UX */
            }
            setLeadId(id);
            setStep("context");
        } catch (err) {
            logStep("book_failed", { err: String(err).slice(0, 120) });
            setBookError(
                err instanceof Error
                    ? `${err.message}. O horário pode ter sido preenchido — escolha outro.`
                    : "Não foi possível confirmar o horário. Escolha outro."
            );
            setStep("schedule");
            setPickedSlot(null);
        }

        setIsSubmitting(false);
    };

    const saveLead = async (): Promise<string | null> => {
        try {
            const attribution = getAttribution() || {};
            const phoneE164 = phoneDigits ? `+55${phoneDigits}` : form.phone;
            // RPC SECURITY DEFINER: insere e devolve o id. Insert direto com
            // .select() falhava pra visitante anônimo porque o RETURNING é
            // checado contra a policy de SELECT (que só existe p/ authenticated).
            const { data, error } = await supabase.rpc("submit_demo_request", {
                payload: {
                    name: form.name.trim() || "Lead",
                    email: form.email.trim().toLowerCase(),
                    company: null,
                    phone: phoneE164,
                    source: "landing_page",
                    ...attribution,
                },
            });

            if (error) {
                logStep("insert_failed", {
                    code: String(error.code || ""),
                    message: String(error.message || "").slice(0, 120),
                });
                return null;
            }

            const id = (data as string | null) || null;
            logStep("insert_success", { id: id ? "ok" : "null" });
            return id;
        } catch (err) {
            logStep("insert_threw", { err: String(err).slice(0, 120) });
            return null;
        }
    };

    // Lead descreve a empresa → dispara a montagem da demo personalizada.
    // Não bloqueia nada: a demo já está agendada; o resultado vai pro time por email.
    const handleContextSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadId || ctx.company.trim().length < 2) {
            setStep("done");
            return;
        }
        setCtxLoading(true);
        try {
            logStep("context_submit", {
                has_segment: !!ctx.segment, has_offer: !!ctx.offer, has_pain: !!ctx.pain,
            });
            await supabase.functions.invoke("create-personalized-demo", {
                body: {
                    demo_request_id: leadId,
                    company_name: ctx.company.trim(),
                    segment: ctx.segment.trim() || null,
                    offer: ctx.offer.trim() || null,
                    pain: ctx.pain.trim() || null,
                },
            });
            try { trackEvent("demo_context_submitted", { source: "landing" }); } catch { /* noop */ }
        } catch (err) {
            logStep("context_failed", { err: String(err).slice(0, 120) });
        }
        setCtxLoading(false);
        setStep("done");
    };

    return (
        <section
            className="lp-paper lp-paper--fine relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
            <div className="relative max-w-5xl mx-auto">
                {/* Estação do fio */}
                <div className="lp-station mb-12 sm:mb-14 landing-fade-in-up">
                    <span className="lp-station-node" />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                        07 · demonstração personalizada
                    </span>
                    <span className="lp-station-rule" />
                </div>

                {/* Section header */}
                <div className="mb-12 landing-fade-in-up">
                    <h2
                        className="font-satoshi mb-5 max-w-3xl"
                        style={{
                            fontWeight: 900,
                            fontSize: "clamp(1.7rem, 5vw, 3.1rem)",
                            lineHeight: 1.04,
                            letterSpacing: "-0.04em",
                            color: "var(--lp-ink)",
                        }}
                    >
                        Vamos montar uma demo{" "}
                        <span className="lp-serif" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                            sob medida
                        </span>{" "}
                        pro seu comercial
                    </h2>

                    <p
                        className="max-w-xl"
                        style={{ color: "var(--lp-ink-70)", fontSize: "1rem", lineHeight: 1.7 }}
                    >
                        Escolhe um horário livre, deixa seu contato e a gente prepara a sessão focada no seu contexto. Sem pitch genérico.
                    </p>
                </div>

                {/* Card container */}
                <div className="lp-frame relative landing-fade-in-up landing-delay-100">
                <div
                    id="demo-form-start"
                    className="relative rounded-[10px] overflow-hidden"
                    style={{
                        background: "var(--lp-white)",
                        border: "1px solid var(--lp-line)",
                        boxShadow: "0 24px 64px -32px rgba(13,20,33,0.22)",
                    }}
                >

                    {/* ── STEP 1: SCHEDULE (calendar-first) ─────── */}
                    {step === "schedule" && (
                        <div className="p-3 sm:p-6 md:p-8 landing-fade-in">
                            <div className="flex items-center gap-2 mb-1 px-1 sm:px-2">
                                <Calendar className="h-3.5 w-3.5 text-blue-700 flex-shrink-0" />
                                <span
                                    className="text-[10px] sm:text-xs uppercase tracking-wider text-blue-700"
                                    style={{ fontWeight: 600, letterSpacing: "0.1em" }}
                                >
                                    Escolha seu horário
                                </span>
                            </div>
                            <p
                                className="text-xs sm:text-sm mb-4 px-1 sm:px-2"
                                style={{ color: "rgba(10,10,10,0.52)" }}
                            >
                                30 minutos, 100% gratuito. Depois você confirma seus dados em 20 segundos.
                            </p>

                            {bookError && (
                                <div
                                    className="mb-3 px-3 py-2 rounded-lg text-xs"
                                    style={{
                                        background: "rgba(244,63,94,0.08)",
                                        boxShadow: "0 0 0 1px rgba(244,63,94,0.2)",
                                        color: "rgba(252,165,165,0.9)",
                                        fontWeight: 500,
                                    }}
                                >
                                    {bookError}
                                </div>
                            )}

                            <NativeScheduler
                                onSlotConfirm={handleSlotConfirm}
                                confirmLabel="Continuar"
                            />
                        </div>
                    )}

                    {/* ── STEP 2: CONTACT (confirm lead data) ─────────────────────── */}
                    {step === "contact" && (
                        <div className="p-6 sm:p-10 md:p-12 landing-fade-in">
                            {pickedSlot && (
                                <div
                                    className="flex items-center justify-between gap-3 mb-6 px-4 py-3 rounded-xl flex-wrap"
                                    style={{
                                        background: "rgba(21,86,192,0.06)",
                                        boxShadow: "0 0 0 1px rgba(21,86,192,0.15)",
                                    }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{ background: "rgba(21,86,192,0.14)" }}
                                        >
                                            <Calendar className="h-4 w-4 text-blue-700" />
                                        </div>
                                        <div className="min-w-0">
                                            <p
                                                className="text-[10px] uppercase tracking-wider"
                                                style={{ color: "rgba(21,86,192,0.75)", fontWeight: 600, letterSpacing: "0.1em" }}
                                            >
                                                Horário escolhido
                                            </p>
                                            <p className="text-sm" style={{ color: "rgba(10,10,10,0.85)", fontWeight: 600 }}>
                                                {formatSlotLabel(pickedSlot.startIso)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep("schedule");
                                            setPickedSlot(null);
                                            setBookError(null);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-all duration-150"
                                        style={{
                                            background: "rgba(10,10,10,0.06)",
                                            boxShadow: "0 0 0 1px rgba(10,10,10,0.08)",
                                            color: "rgba(10,10,10,0.6)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        Trocar
                                    </button>
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-start">
                                {/* Left on desktop — value props. On mobile: order-2 (below form) */}
                                <div className="order-2 md:order-1">
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                                        style={{
                                            background: "rgba(21,86,192,0.08)",
                                            border: "1px solid rgba(21,86,192,0.15)",
                                        }}
                                    >
                                        <Calendar className="h-3.5 w-3.5 text-blue-700" />
                                        <span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>
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
                                            color: "rgba(10,10,10,0.85)",
                                        }}
                                    >
                                        O que você vai levar
                                    </h3>

                                    <div className="flex flex-col gap-3">
                                        {[
                                            "Inbox e pipeline montados com seu contexto",
                                            "EVA analisando uma conversa real da sua agência",
                                            "Próximos passos sugeridos para seu time aprovar",
                                            "Integrações com o que você já usa",
                                            "Plano ideal pro tamanho do seu time",
                                        ].map((item) => (
                                            <div key={item} className="flex items-start gap-2.5">
                                                <div
                                                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                                                    style={{ background: "rgba(21,86,192,0.12)" }}
                                                >
                                                    <Check className="h-2.5 w-2.5 text-blue-700" strokeWidth={3} />
                                                </div>
                                                <span className="text-sm" style={{ color: "rgba(10,10,10,0.55)", lineHeight: 1.5 }}>
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right on desktop — contact form. On mobile: order-1 (above benefits) */}
                                <form onSubmit={handleContactSubmit} className="flex flex-col gap-3.5 order-1 md:order-2" noValidate>
                                    <p className="text-[11px] mb-0.5" style={{ color: "rgba(10,10,10,0.5)", fontWeight: 500 }}>
                                        Só mais 3 campos pra confirmar seu horário.
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

                                    {bookError && (
                                        <p className="text-[11px] mt-0.5 ml-1" style={{ color: "rgba(244,63,94,0.85)", fontWeight: 500 }}>
                                            {bookError}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={!canSubmit || isSubmitting}
                                        className="demo-submit-btn relative overflow-hidden flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl text-white group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: "linear-gradient(135deg, #1556C0 0%, #0E3E92 100%)",
                                            boxShadow:
                                                "0 0 0 1px rgba(21,86,192,0.3), 0 4px 24px rgba(21,86,192,0.3)",
                                            fontWeight: 700,
                                            fontSize: "0.95rem",
                                        }}
                                    >
                                        <span
                                            className="absolute inset-0 rounded-xl landing-shine"
                                            style={{
                                                background:
                                                    "linear-gradient(105deg, transparent 30%, rgba(10,10,10,0.08) 50%, transparent 70%)",
                                            }}
                                        />
                                        {isSubmitting ? (
                                            <Loader2 className="relative h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="relative h-4 w-4" />
                                                <span className="relative">Confirmar demo</span>
                                                <ArrowRight className="relative h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </button>

                                    <p className="text-center text-xs mt-1" style={{ color: "rgba(10,10,10,0.25)" }}>
                                        Sem compromisso · Cancela ou remarca quando quiser
                                    </p>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: CONTEXT (monta a demo personalizada) ───── */}
                    {step === "context" && (
                        <div className="p-6 sm:p-10 md:p-12 landing-fade-in">
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                                style={{ background: "rgba(21,86,192,0.08)", border: "1px solid rgba(21,86,192,0.15)" }}
                            >
                                <Check className="h-3.5 w-3.5 text-blue-700" strokeWidth={3} />
                                <span className="text-xs text-blue-700" style={{ fontWeight: 600 }}>
                                    Demo confirmada
                                </span>
                            </div>

                            <h3
                                className="font-heading mb-2"
                                style={{ fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.2, letterSpacing: "-0.03em", color: "rgba(10,10,10,0.9)" }}
                            >
                                Quer já chegar com tudo montado?
                            </h3>
                            <p className="mb-7 max-w-lg" style={{ color: "rgba(10,10,10,0.55)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                                Conta rápido sobre sua empresa e a gente prepara um ambiente da Vyzon com a cara do seu negócio pra mostrar na call. Leva 20 segundos.
                            </p>

                            <form onSubmit={handleContextSubmit} className="flex flex-col gap-3.5 max-w-lg" noValidate>
                                <FormField icon={Briefcase}>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nome da sua empresa"
                                        value={ctx.company}
                                        onChange={(e) => setCtx((p) => ({ ...p, company: e.target.value }))}
                                        className="demo-input"
                                        autoFocus
                                    />
                                </FormField>
                                <FormField icon={Target} hint="Ex: tráfego pago, social media, criação de sites">
                                    <input
                                        type="text"
                                        placeholder="Seu segmento / nicho"
                                        value={ctx.segment}
                                        onChange={(e) => setCtx((p) => ({ ...p, segment: e.target.value }))}
                                        className="demo-input"
                                    />
                                </FormField>
                                <FormField icon={Package}>
                                    <input
                                        type="text"
                                        placeholder="O que você vende"
                                        value={ctx.offer}
                                        onChange={(e) => setCtx((p) => ({ ...p, offer: e.target.value }))}
                                        className="demo-input"
                                    />
                                </FormField>
                                <FormField icon={MessageSquare} hint="O que mais te incomoda hoje no comercial">
                                    <input
                                        type="text"
                                        placeholder="Sua principal dor comercial"
                                        value={ctx.pain}
                                        onChange={(e) => setCtx((p) => ({ ...p, pain: e.target.value }))}
                                        className="demo-input"
                                    />
                                </FormField>

                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep("done")}
                                        disabled={ctxLoading}
                                        className="px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                                        style={{ background: "rgba(10,10,10,0.05)", color: "rgba(10,10,10,0.55)", fontWeight: 600 }}
                                    >
                                        Pular
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={ctxLoading || ctx.company.trim().length < 2}
                                        className="relative flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: "linear-gradient(135deg, #1556C0 0%, #0E3E92 100%)",
                                            boxShadow: "0 0 0 1px rgba(21,86,192,0.3), 0 4px 24px rgba(21,86,192,0.3)",
                                            fontWeight: 700, fontSize: "0.95rem",
                                        }}
                                    >
                                        {ctxLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Preparando seu ambiente...
                                            </>
                                        ) : (
                                            <>
                                                Preparar minha demo
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── STEP 4: DONE ─────────────────────── */}
                    {step === "done" && (
                        <div className="py-16 sm:py-24 px-6 text-center landing-fade-in">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                                style={{
                                    background: "rgba(21,86,192,0.12)",
                                    boxShadow: "0 0 0 1px rgba(21,86,192,0.2), 0 8px 24px rgba(21,86,192,0.15)",
                                }}
                            >
                                <Check className="h-6 w-6 text-blue-700" strokeWidth={2.5} />
                            </div>

                            <h3
                                className="font-heading mb-3"
                                style={{
                                    fontWeight: 700,
                                    fontSize: "1.5rem",
                                    letterSpacing: "-0.03em",
                                    color: "rgba(10,10,10,0.92)",
                                }}
                            >
                                Demo confirmada!
                            </h3>

                            <p
                                className="max-w-md mx-auto mb-4"
                                style={{ color: "rgba(10,10,10,0.52)", fontSize: "0.95rem", lineHeight: 1.6 }}
                            >
                                Acabamos de enviar os detalhes pro{" "}
                                <span style={{ color: "rgba(10,10,10,0.68)" }}>{form.email}</span>. Até lá!
                            </p>

                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
                                style={{
                                    color: "rgba(52,211,153,0.9)",
                                    background: "rgba(21,86,192,0.08)",
                                    boxShadow: "0 0 0 1px rgba(21,86,192,0.2)",
                                    fontWeight: 600,
                                }}
                            >
                                Vamos preparar tudo pro seu contexto
                            </div>
                        </div>
                    )}
                </div>
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-9">
                    {["Sem cartão de crédito", "Demonstração personalizada", "Atendimento humano"].map((t) => (
                        <div
                            key={t}
                            className="lp-mono flex items-center gap-1.5"
                            style={{ color: "var(--lp-ink-55)", textTransform: "none", letterSpacing: "0.03em" }}
                        >
                            <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: "var(--lp-live)" }} />
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
                    color: rgba(10,10,10,0.85);
                    background: rgba(10,10,10,0.06);
                    box-shadow: 0 0 0 1px rgba(10,10,10,0.08);
                    outline: none;
                    transition: box-shadow 150ms ease, background 150ms ease;
                }
                .demo-input:focus {
                    background: rgba(10,10,10,0.06);
                    box-shadow: 0 0 0 1.5px rgba(21,86,192,0.4), 0 0 0 4px rgba(21,86,192,0.08);
                }
                .demo-input.demo-input-error {
                    box-shadow: 0 0 0 1.5px rgba(244,63,94,0.45), 0 0 0 4px rgba(244,63,94,0.08);
                }
                .demo-input.demo-input-error:focus {
                    box-shadow: 0 0 0 1.5px rgba(244,63,94,0.6), 0 0 0 4px rgba(244,63,94,0.1);
                }
                .demo-input::placeholder {
                    color: rgba(10,10,10,0.5);
                }
                textarea.demo-input {
                    padding-left: 14px !important;
                }
            `}</style>
        </section>
    );
};

// ── Helpers ───────────────────────────────────────────────

// "Ter, 23 abr · 14:00" em pt-BR no fuso America/Sao_Paulo
function formatSlotLabel(startIso: string): string {
    try {
        const d = new Date(startIso);
        const datePart = new Intl.DateTimeFormat("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            timeZone: "America/Sao_Paulo",
        }).format(d);
        const timePart = new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
        }).format(d);
        const clean = datePart.replace(/\./g, "").replace(/-feira/, "");
        return `${clean} · ${timePart}`;
    } catch {
        return startIso;
    }
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
                    style={{ color: error ? "rgba(244,63,94,0.8)" : "rgba(10,10,10,0.25)" }}
                />
                {children}
            </div>
            {error ? (
                <p className="text-[11px] mt-1.5 ml-1" style={{ color: "rgba(244,63,94,0.85)", fontWeight: 500 }}>
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[10px] mt-1 ml-1" style={{ color: "rgba(10,10,10,0.45)", fontWeight: 500 }}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
