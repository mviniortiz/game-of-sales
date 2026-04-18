import { useEffect, useState } from "react";
import { Calendar, ArrowRight, Check, User, Mail, Building2, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";

interface DemoScheduleSectionProps {
    calendlyUrl?: string;
}

// Funnel telemetry helper: console + GA4/Ads.
// Step names compõem funil: rendered → submit_attempt → tracking_fired →
// popup_opened|popup_blocked → insert_success|insert_failed
const logStep = (step: string, data?: Record<string, string | number | boolean>) => {
    try {
        // Preserva no console pra inspeção via remote debug / DevTools mobile.
        // eslint-disable-next-line no-console
        console.log(`[demo-form] ${step}`, data || {});
        trackEvent(`demo_form_${step}`, data);
    } catch {
        /* analytics never breaks UX */
    }
};

export const DemoScheduleSection = ({
    calendlyUrl = "https://calendly.com/mviniciusortiz48/demo-vyzon-com-br",
}: DemoScheduleSectionProps) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: "",
        phone: "",
    });
    const [step, setStep] = useState<"form" | "done">("form");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        logStep("rendered", { path: window.location.pathname });
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        logStep("submit_attempt", {
            has_email: !!formData.email,
            has_phone: !!formData.phone,
            has_name: !!formData.name,
            has_company: !!formData.company,
        });

        if (!formData.email || !formData.phone) {
            logStep("submit_blocked_validation");
            return;
        }

        setIsSubmitting(true);

        // 1) Dispara conversions IMEDIATAMENTE (síncrono, ainda no user gesture).
        try {
            trackEvent("demo_request_submit", {
                source: "landing",
                has_company: !!formData.company,
                has_phone: !!formData.phone,
            });
            trackEvent("demo_scheduled", { source: "landing_calendly" });
            trackDemoConversion();
            (window as any).fbq?.("track", "Lead", {
                content_name: "demo_request",
                content_category: "landing",
            });
            logStep("tracking_fired");
        } catch (err) {
            logStep("tracking_failed", { err: String(err).slice(0, 120) });
        }

        // 2) Abre Calendly dentro do user gesture pra evitar popup blocker no mobile.
        const params = new URLSearchParams({
            name: formData.name,
            email: formData.email,
            ...(formData.phone ? { a1: formData.phone } : {}),
            ...(formData.company ? { a2: formData.company } : {}),
        });
        const url = `${calendlyUrl}?${params.toString()}`;

        let popup: Window | null = null;
        try {
            popup = window.open(url, "_blank", "noopener");
        } catch (err) {
            logStep("popup_open_threw", { err: String(err).slice(0, 120) });
        }

        if (!popup) {
            logStep("popup_blocked_redirect");
            // Persistência em background — não espera pra redirecionar.
            saveLead(formData);
            window.location.href = url;
            return;
        }

        logStep("popup_opened");

        setStep("done");
        setIsSubmitting(false);

        // 3) Persiste o lead em background.
        saveLead(formData);
    };

    const saveLead = (data: typeof formData) => {
        (async () => {
            try {
                const attribution = getAttribution() || {};
                const { error } = await supabase.from("demo_requests").insert({
                    name: data.name || "Lead",
                    email: data.email,
                    company: data.company || null,
                    phone: data.phone,
                    source: "landing_page",
                    status: "pending",
                    ...attribution,
                } as any);

                if (error) {
                    logStep("insert_failed", {
                        code: String(error.code || ""),
                        message: String(error.message || "").slice(0, 120),
                    });
                } else {
                    logStep("insert_success");
                }
            } catch (err) {
                logStep("insert_threw", { err: String(err).slice(0, 120) });
            }
        })();
    };

    return (
        <section
            id="agendar-demo"
            className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#06080a" }}
        >
            {/* Subtle ambient glow */}
            <div
                className="absolute top-[-15%] left-[10%] w-[60%] h-[80%] rounded-full pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 55%)",
                }}
            />

            {/* Fine grid overlay */}
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
                <div className="text-center mb-14 landing-fade-in-up">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span
                            className="text-xs text-emerald-400"
                            style={{ fontWeight: 600, letterSpacing: "0.12em" }}
                        >
                            DEMONSTRAÇÃO GRATUITA
                        </span>
                    </div>

                    <h2
                        className="font-heading mb-5 max-w-3xl mx-auto"
                        style={{
                            fontWeight: 800,
                            fontSize: "clamp(1.6rem, 5vw, 3rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Quer ver o Vyzon{" "}
                        <span
                            style={{
                                background: "linear-gradient(135deg, #10b981, #34d399)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            rodando na prática
                        </span>
                        ?
                    </h2>

                    <p
                        className="max-w-xl mx-auto"
                        style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", lineHeight: 1.7 }}
                    >
                        Agenda uma demonstração gratuita de 30 minutos. A gente mostra como o Vyzon
                        se encaixa no seu time e responde todas as suas dúvidas.
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
                    {/* Top edge gradient */}
                    <div
                        className="absolute top-0 inset-x-0 h-px"
                        style={{
                            background:
                                "linear-gradient(90deg, transparent, rgba(16,185,129,0.5) 30%, rgba(20,184,166,0.4) 70%, transparent)",
                        }}
                    />

                    {step === "form" && (
                        <div className="p-6 sm:p-10 md:p-14 landing-fade-in">
                            <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                                {/* Left — value props */}
                                <div>
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                                        style={{
                                            background: "rgba(16,185,129,0.08)",
                                            border: "1px solid rgba(16,185,129,0.15)",
                                        }}
                                    >
                                        <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                                        <span
                                            className="text-xs text-emerald-400"
                                            style={{ fontWeight: 600 }}
                                        >
                                            30 min — 100% gratuito
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
                                        O que você vai ver na demo
                                    </h3>

                                    <div className="flex flex-col gap-3.5">
                                        {[
                                            "Painel e pipeline configurados pro seu negócio",
                                            "Gamificação e ranking em tempo real",
                                            "Eva analisando os dados do seu time",
                                            "Integrações com as ferramentas que você já usa",
                                            "Plano ideal pro tamanho do seu time",
                                        ].map((item) => (
                                            <div
                                                key={item}
                                                className="flex items-start gap-2.5"
                                            >
                                                <div
                                                    className="mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                                                    style={{
                                                        background: "rgba(16,185,129,0.12)",
                                                    }}
                                                >
                                                    <Check
                                                        className="h-2.5 w-2.5 text-emerald-400"
                                                        strokeWidth={3}
                                                    />
                                                </div>
                                                <span
                                                    className="text-sm"
                                                    style={{
                                                        color: "rgba(255,255,255,0.5)",
                                                        lineHeight: 1.5,
                                                    }}
                                                >
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right — form */}
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    {/* Email — required */}
                                    <div className="relative">
                                        <Mail
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                                            style={{ color: "rgba(255,255,255,0.25)" }}
                                        />
                                        <input
                                            type="email"
                                            required
                                            placeholder="Seu e-mail *"
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData((p) => ({ ...p, email: e.target.value }))
                                            }
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "rgba(255,255,255,0.9)",
                                                fontWeight: 500,
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)";
                                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)";
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        />
                                    </div>

                                    {/* Phone — required */}
                                    <div className="relative">
                                        <Phone
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                                            style={{ color: "rgba(255,255,255,0.25)" }}
                                        />
                                        <input
                                            type="tel"
                                            required
                                            placeholder="WhatsApp *"
                                            value={formData.phone}
                                            onChange={(e) =>
                                                setFormData((p) => ({ ...p, phone: e.target.value }))
                                            }
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "rgba(255,255,255,0.9)",
                                                fontWeight: 500,
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)";
                                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)";
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        />
                                    </div>

                                    {/* Name — optional */}
                                    <div className="relative">
                                        <User
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                                            style={{ color: "rgba(255,255,255,0.25)" }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Seu nome (opcional)"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData((p) => ({ ...p, name: e.target.value }))
                                            }
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "rgba(255,255,255,0.9)",
                                                fontWeight: 500,
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)";
                                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)";
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        />
                                    </div>

                                    {/* Company — optional */}
                                    <div className="relative">
                                        <Building2
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                                            style={{ color: "rgba(255,255,255,0.25)" }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Nome da empresa (opcional)"
                                            value={formData.company}
                                            onChange={(e) =>
                                                setFormData((p) => ({ ...p, company: e.target.value }))
                                            }
                                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "rgba(255,255,255,0.9)",
                                                fontWeight: 500,
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)";
                                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)";
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        />
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !formData.email || !formData.phone}
                                        className="demo-submit-btn relative overflow-hidden flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl text-white group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                            boxShadow:
                                                "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                                            fontWeight: 700,
                                            fontSize: "0.95rem",
                                        }}
                                    >
                                        {/* Shimmer */}
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

                                    <p
                                        className="text-center text-xs mt-1"
                                        style={{ color: "rgba(255,255,255,0.25)" }}
                                    >
                                        Sem compromisso. Cancela ou remarca quando quiser.
                                    </p>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Confirmation */}
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
                                Quase lá!
                            </h3>

                            <p
                                className="max-w-md mx-auto mb-4"
                                style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", lineHeight: 1.6 }}
                            >
                                Escolhe o melhor horário na aba que acabou de abrir.
                                A confirmação vai pro{" "}
                                <span style={{ color: "rgba(255,255,255,0.7)" }}>{formData.email}</span>.
                            </p>

                            <a
                                href={`${calendlyUrl}?email=${encodeURIComponent(formData.email)}${formData.name ? `&name=${encodeURIComponent(formData.name)}` : ""}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => logStep("reopen_calendly_click")}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200"
                                style={{
                                    color: "rgba(16,185,129,0.9)",
                                    background: "rgba(16,185,129,0.08)",
                                    boxShadow: "0 0 0 1px rgba(16,185,129,0.2)",
                                    fontWeight: 600,
                                }}
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Abrir calendário novamente
                            </a>
                        </div>
                    )}
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
                    {[
                        "Sem compromisso",
                        "Demonstração personalizada",
                        "Tira todas as suas dúvidas",
                    ].map((t) => (
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
        </section>
    );
};
