import { Plug, Sparkles, Webhook } from "lucide-react";

import asaasLogo from "@/assets/integrations/asaas.svg";
import braipLogo from "@/assets/integrations/braip.webp";
import caktoLogo from "@/assets/integrations/cakto.webp";
import celetusLogo from "@/assets/integrations/celetus.webp";
import eduzzLogo from "@/assets/integrations/eduzz.webp";
import googleCalendarLogo from "@/assets/integrations/google-calendar.webp";
import googleSheetsLogo from "@/assets/integrations/google-sheets.svg";
import greennLogo from "@/assets/integrations/greenn.webp";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import monetizzeLogo from "@/assets/integrations/monetizze.webp";
import notazzLogo from "@/assets/integrations/notazz.png";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import stripeLogo from "@/assets/integrations/stripe.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";

// Lista derivada do registry interno (src/pages/Integracoes.tsx). Toda integração
// listada aqui precisa existir como webhook real, edge function ativa ou status
// "available"/"roadmap" no produto. Não inserir nada que não esteja confirmado.
type IntegrationStatus = "available" | "soon";

type IntegrationItem = {
    name: string;
    logo: string;
    status: IntegrationStatus;
    category: "lead" | "checkout" | "payment" | "productivity";
};

const AVAILABLE: readonly IntegrationItem[] = [
    { name: "Google Sheets", logo: googleSheetsLogo, status: "available", category: "lead" },
    { name: "Zapier", logo: zapierLogo, status: "available", category: "lead" },
    { name: "RD Station", logo: rdstationLogo, status: "available", category: "lead" },
    { name: "Hotmart", logo: hotmartLogo, status: "available", category: "checkout" },
    { name: "Kiwify", logo: kiwifyLogo, status: "available", category: "checkout" },
    { name: "Greenn", logo: greennLogo, status: "available", category: "checkout" },
    { name: "Cakto", logo: caktoLogo, status: "available", category: "checkout" },
    { name: "Braip", logo: braipLogo, status: "available", category: "checkout" },
    { name: "Monetizze", logo: monetizzeLogo, status: "available", category: "checkout" },
    { name: "Eduzz", logo: eduzzLogo, status: "available", category: "checkout" },
    { name: "Asaas", logo: asaasLogo, status: "available", category: "payment" },
    { name: "Mercado Pago", logo: mercadopagoLogo, status: "available", category: "payment" },
    { name: "Google Calendar", logo: googleCalendarLogo, status: "available", category: "productivity" },
    { name: "Notazz", logo: notazzLogo, status: "available", category: "productivity" },
];

const ROADMAP: readonly IntegrationItem[] = [
    { name: "Stripe", logo: stripeLogo, status: "soon", category: "payment" },
    { name: "Pagar.me", logo: pagarmeLogo, status: "soon", category: "payment" },
    { name: "Celetus", logo: celetusLogo, status: "soon", category: "payment" },
];

const OPEN_CHANNELS = [
    {
        title: "WhatsApp",
        body: "Conexão via Evolution API para o hub Pulse e copiloto de mensagens.",
    },
    {
        title: "Webhooks abertos",
        body: "Endpoint genérico autenticado por token para qualquer plataforma que dispare evento HTTP.",
    },
    {
        title: "Lead webhooks",
        body: "Capture leads de formulários e Google Sheets em tempo real, sem Zapier no meio.",
    },
];

const Logo = ({ name, src }: { name: string; src: string }) => (
    <div
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-white"
        aria-hidden="true"
    >
        <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-7 w-7 object-contain"
        />
    </div>
);

const IntegrationCard = ({ item }: { item: IntegrationItem }) => {
    const isSoon = item.status === "soon";
    return (
        <li
            className="flex items-center gap-3 rounded-xl p-3.5"
            style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                opacity: isSoon ? 0.78 : 1,
            }}
        >
            <Logo name={item.name} src={item.logo} />
            <div className="min-w-0 flex-1">
                <p
                    className="text-sm leading-tight"
                    style={{ fontWeight: 600, color: "rgba(255,255,255,0.92)" }}
                >
                    {item.name}
                </p>
                <p
                    className="mt-0.5 text-[11px]"
                    style={{
                        color: isSoon ? "rgba(255,255,255,0.5)" : "rgba(0,227,122,0.85)",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                    }}
                >
                    {isSoon ? "Em breve" : "Disponível"}
                </p>
            </div>
        </li>
    );
};

export const IntegrationsSection = () => {
    return (
        <section
            id="integracoes"
            className="relative overflow-hidden py-24 sm:py-28 px-4 sm:px-6 lg:px-8"
            style={{ background: "var(--vyz-bg)" }}
            aria-labelledby="integrations-title"
        >
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.07) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                <div className="text-center mb-12 sm:mb-14 landing-fade-in-up">
                    <span
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            background: "rgba(0,227,122,0.10)",
                            border: "1px solid rgba(0,227,122,0.22)",
                        }}
                    >
                        <Plug className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                        Integrações
                    </span>
                    <h2
                        id="integrations-title"
                        className="font-heading"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Conecte a Vyzon às ferramentas que sua{" "}
                        <span className="text-emerald-400">operação já usa</span>
                    </h2>
                    <p
                        className="mt-4 max-w-2xl mx-auto text-[15px] sm:text-base"
                        style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}
                    >
                        Centralize dados, reduza tarefas manuais e conecte sua rotina comercial às plataformas que já fazem parte da operação.
                    </p>
                </div>

                {/* Disponíveis */}
                <div className="landing-fade-in-up landing-delay-100">
                    <div className="flex items-center justify-between mb-5">
                        <h3
                            className="text-[13px]"
                            style={{
                                fontWeight: 600,
                                letterSpacing: "0.10em",
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.75)",
                            }}
                        >
                            Disponíveis hoje
                        </h3>
                        <span
                            className="text-[11px]"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                            {AVAILABLE.length} integrações nativas
                        </span>
                    </div>

                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {AVAILABLE.map((item) => (
                            <IntegrationCard key={item.name} item={item} />
                        ))}
                    </ul>
                </div>

                {/* No roadmap */}
                <div className="mt-12 sm:mt-14 landing-fade-in-up landing-delay-200">
                    <div className="flex items-center justify-between mb-5">
                        <h3
                            className="flex items-center gap-2 text-[13px]"
                            style={{
                                fontWeight: 600,
                                letterSpacing: "0.10em",
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.65)",
                            }}
                        >
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                            No roadmap
                        </h3>
                        <span
                            className="text-[11px]"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                            Sob consulta
                        </span>
                    </div>

                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {ROADMAP.map((item) => (
                            <IntegrationCard key={item.name} item={item} />
                        ))}
                    </ul>
                </div>

                {/* Conexões abertas */}
                <div className="mt-12 sm:mt-14 landing-fade-in-up landing-delay-300">
                    <div className="flex items-center gap-2 mb-5">
                        <h3
                            className="flex items-center gap-2 text-[13px]"
                            style={{
                                fontWeight: 600,
                                letterSpacing: "0.10em",
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.65)",
                            }}
                        >
                            <Webhook className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                            Conexões abertas
                        </h3>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {OPEN_CHANNELS.map((c) => (
                            <li
                                key={c.title}
                                className="rounded-xl p-4 sm:p-5"
                                style={{
                                    background: "rgba(255,255,255,0.025)",
                                    border: "1px solid rgba(255,255,255,0.07)",
                                }}
                            >
                                <p
                                    className="text-sm"
                                    style={{ fontWeight: 600, color: "rgba(255,255,255,0.92)" }}
                                >
                                    {c.title}
                                </p>
                                <p
                                    className="mt-1.5 text-[13px] leading-relaxed"
                                    style={{ color: "rgba(255,255,255,0.6)" }}
                                >
                                    {c.body}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>

                <p
                    className="mt-10 text-center text-[12.5px]"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                >
                    Não viu sua plataforma?{" "}
                    <a
                        href="#agendar-demo"
                        className="text-emerald-400 underline-offset-4 hover:underline"
                        style={{ fontWeight: 600 }}
                    >
                        Fale com a gente
                    </a>{" "}
                    — webhooks abertos atendem a maioria dos cenários.
                </p>
            </div>
        </section>
    );
};

export default IntegrationsSection;
