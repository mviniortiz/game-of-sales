// Hub visual de integrações para a landing (estilo "processador central + trilhas").
// Vyzon no centro, logos reais orbitando, trilhas SVG com pulso de dados.
// Dark theme (combina com IntegrationsSection). Sem opacity:0 em scroll-reveal
// (evita bug de WebView, ver feedback_whileinview_opacity); respeita
// prefers-reduced-motion. Inserido dentro da IntegrationsSection, abaixo do título.

import { ThemeLogo } from "@/components/ui/ThemeLogo";

import asaasLogo from "@/assets/integrations/asaas.svg";
import braipLogo from "@/assets/integrations/braip.webp";
import caktoLogo from "@/assets/integrations/cakto.webp";
import discordLogo from "@/assets/integrations/discord.svg";
import eduzzLogo from "@/assets/integrations/eduzz.webp";
import googleCalendarLogo from "@/assets/integrations/google-calendar.webp";
import googleSheetsLogo from "@/assets/integrations/google-sheets.svg";
import greennLogo from "@/assets/integrations/greenn.webp";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import monetizzeLogo from "@/assets/integrations/monetizze.webp";
import notazzLogo from "@/assets/integrations/notazz.png";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import slackLogo from "@/assets/integrations/slack.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";

// Ordenado pra distribuir bem visualmente no anel (alterna marcas largas/quadradas).
const HUB: { name: string; logo: string }[] = [
    { name: "Hotmart", logo: hotmartLogo },
    { name: "Kiwify", logo: kiwifyLogo },
    { name: "Mercado Pago", logo: mercadopagoLogo },
    { name: "Asaas", logo: asaasLogo },
    { name: "Slack", logo: slackLogo },
    { name: "Zapier", logo: zapierLogo },
    { name: "Google Calendar", logo: googleCalendarLogo },
    { name: "Eduzz", logo: eduzzLogo },
    { name: "Greenn", logo: greennLogo },
    { name: "RD Station", logo: rdstationLogo },
    { name: "Google Sheets", logo: googleSheetsLogo },
    { name: "Discord", logo: discordLogo },
    { name: "Monetizze", logo: monetizzeLogo },
    { name: "Cakto", logo: caktoLogo },
    { name: "Braip", logo: braipLogo },
    { name: "Notazz", logo: notazzLogo },
];

const R = 41; // raio do anel em % do container
const nodes = HUB.map((it, i) => {
    const angle = (-90 + (360 / HUB.length) * i) * (Math.PI / 180);
    return {
        ...it,
        x: 50 + R * Math.cos(angle),
        y: 50 + R * Math.sin(angle),
    };
});

export const IntegrationHub = () => {
    return (
        <div
            className="relative mx-auto w-full"
            style={{ maxWidth: 560, aspectRatio: "1 / 1" }}
            role="img"
            aria-label="Vyzon no centro conectada às integrações: Hotmart, Kiwify, Mercado Pago, Asaas, Slack, Zapier, Google Calendar, Eduzz, Greenn, RD Station, Google Sheets, Discord, Monetizze, Cakto, Braip e Notazz."
        >
            <style>{`
                @keyframes vyzHubFlow { to { stroke-dashoffset: 6; } }
                @keyframes vyzHubSpin { to { transform: rotate(360deg); } }
                .vyz-hub-flow { animation: vyzHubFlow 1.8s linear infinite; }
                .vyz-hub-ring { animation: vyzHubSpin 26s linear infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .vyz-hub-flow, .vyz-hub-ring { animation: none !important; }
                }
            `}</style>

            {/* Glow central */}
            <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                aria-hidden="true"
                style={{
                    width: "60%",
                    height: "60%",
                    background:
                        "radial-gradient(circle, rgba(0,227,122,0.16) 0%, rgba(0,227,122,0.04) 40%, transparent 70%)",
                }}
            />

            {/* Trilhas */}
            <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                {/* base estática */}
                {nodes.map((n) => (
                    <line
                        key={`base-${n.name}`}
                        x1="50"
                        y1="50"
                        x2={n.x}
                        y2={n.y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="0.35"
                    />
                ))}
                {/* pulso de dados */}
                {nodes.map((n, i) => (
                    <line
                        key={`flow-${n.name}`}
                        x1="50"
                        y1="50"
                        x2={n.x}
                        y2={n.y}
                        stroke="rgba(0,227,122,0.6)"
                        strokeWidth="0.4"
                        strokeLinecap="round"
                        strokeDasharray="1.5 4.5"
                        className="vyz-hub-flow"
                        style={{ animationDelay: `${(i % 8) * 0.18}s` }}
                    />
                ))}
            </svg>

            {/* Nós (logos) */}
            {nodes.map((n) => (
                <div
                    key={n.name}
                    className="absolute"
                    style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
                    title={n.name}
                >
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white sm:h-[52px] sm:w-[52px]"
                        style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}
                    >
                        <img
                            src={n.logo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-5 w-5 object-contain sm:h-7 sm:w-7"
                        />
                    </div>
                </div>
            ))}

            {/* Centro: Vyzon */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                    {/* anéis */}
                    <div
                        className="vyz-hub-ring absolute rounded-full"
                        style={{ inset: "-18px", border: "1.5px dashed rgba(0,227,122,0.35)" }}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute rounded-full"
                        style={{ inset: "-30px", border: "1px solid rgba(0,227,122,0.15)" }}
                        aria-hidden="true"
                    />
                    {/* chip */}
                    <div
                        className="relative flex h-[88px] w-[88px] items-center justify-center rounded-2xl sm:h-24 sm:w-24"
                        style={{
                            background: "linear-gradient(135deg, #0F1828 0%, #0B1018 100%)",
                            border: "1px solid rgba(0,227,122,0.45)",
                            boxShadow: "0 0 44px rgba(0,227,122,0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
                        }}
                    >
                        <ThemeLogo iconOnly className="h-12 w-12 sm:h-14 sm:w-14" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationHub;
