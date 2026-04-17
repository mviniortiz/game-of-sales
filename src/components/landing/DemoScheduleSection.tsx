import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Check, User, Mail, Building2, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";

interface DemoScheduleSectionProps {
    calendlyUrl?: string;
}

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.phone) return;

        setIsSubmitting(true);

        try {
            trackEvent("demo_request_submit", {
                source: "landing",
                has_company: !!formData.company,
                has_phone: !!formData.phone,
            });

            const attribution = getAttribution() || {};
            await supabase
                .from("demo_requests")
                .insert({
                    name: formData.name || "Lead",
                    email: formData.email,
                    company: formData.company || null,
                    phone: formData.phone,
                    source: "landing_page",
                    status: "pending",
                    ...attribution,
                } as any);
        } catch (err) {
            console.error("Failed to save demo request:", err);
        }

        // Build Calendly URL with prefilled data
        const params = new URLSearchParams({
            name: formData.name,
            email: formData.email,
            ...(formData.phone ? { a1: formData.phone } : {}),
            ...(formData.company ? { a2: formData.company } : {}),
        });

        // Open Calendly in new tab and show confirmation instantly
        window.open(`${calendlyUrl}?${params.toString()}`, "_blank", "noopener");
        trackEvent("demo_scheduled", { source: "landing_calendly" });
        trackDemoConversion();
        // Meta Pixel: Lead event
        (window as any).fbq?.("track", "Lead", {
            content_name: "demo_request",
            content_category: "landing",
        });
        setStep("done");
        setIsSubmitting(false);
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
                <motion.div
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
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
                            funcionando na prática
                        </span>
                        ?
                    </h2>

                    <p
                        className="max-w-xl mx-auto"
                        style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", lineHeight: 1.7 }}
                    >
                        Agende uma demonstração gratuita de 30 minutos. Mostramos como o Vyzon
                        se adapta ao seu time e respondemos todas as suas dúvidas.
                    </p>
                </motion.div>

                {/* Card container */}
                <motion.div
                    className="relative rounded-2xl overflow-hidden"
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
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

                    <AnimatePresence mode="wait">
                        {/* Step 1: Lead form */}
                        {step === "form" && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="p-6 sm:p-10 md:p-14"
                            >
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
                                                "Dashboard e pipeline configurados para seu negócio",
                                                "Gamificação e ranking em tempo real",
                                                "Eva IA analisando dados do seu time",
                                                "Integrações com suas ferramentas atuais",
                                                "Plano ideal para o tamanho do seu time",
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
                                        <motion.button
                                            type="submit"
                                            disabled={isSubmitting || !formData.email || !formData.phone}
                                            className="relative overflow-hidden flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl text-white group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                boxShadow:
                                                    "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                                                fontWeight: 700,
                                                fontSize: "0.95rem",
                                            }}
                                            whileHover={
                                                !isSubmitting
                                                    ? {
                                                          scale: 1.02,
                                                          boxShadow:
                                                              "0 0 0 1px rgba(16,185,129,0.4), 0 8px 32px rgba(16,185,129,0.45)",
                                                      }
                                                    : {}
                                            }
                                            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                                        >
                                            {/* Shimmer */}
                                            <motion.span
                                                className="absolute inset-0 rounded-xl"
                                                style={{
                                                    background:
                                                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)",
                                                }}
                                                animate={{ x: ["-120%", "220%"] }}
                                                transition={{
                                                    duration: 2.2,
                                                    repeat: Infinity,
                                                    repeatDelay: 2,
                                                    ease: "easeInOut",
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
                                        </motion.button>

                                        <p
                                            className="text-center text-xs mt-1"
                                            style={{ color: "rgba(255,255,255,0.25)" }}
                                        >
                                            Sem compromisso. Cancele ou remarque a qualquer momento.
                                        </p>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Confirmation */}
                        {step === "done" && (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="py-16 sm:py-24 px-6 text-center"
                            >
                                <motion.div
                                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                                    style={{
                                        background: "rgba(16,185,129,0.12)",
                                        boxShadow: "0 0 0 1px rgba(16,185,129,0.2), 0 8px 24px rgba(16,185,129,0.15)",
                                    }}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                >
                                    <Check className="h-6 w-6 text-emerald-400" strokeWidth={2.5} />
                                </motion.div>

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
                                    Escolha o melhor horário na aba que acabou de abrir.
                                    A confirmação será enviada para{" "}
                                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{formData.email}</span>.
                                </p>

                                <a
                                    href={`${calendlyUrl}?email=${encodeURIComponent(formData.email)}${formData.name ? `&name=${encodeURIComponent(formData.name)}` : ""}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Trust signals */}
                <motion.div
                    className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                >
                    {[
                        "Sem compromisso",
                        "Demonstração personalizada",
                        "Tire todas suas dúvidas",
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
                </motion.div>
            </div>
        </section>
    );
};
