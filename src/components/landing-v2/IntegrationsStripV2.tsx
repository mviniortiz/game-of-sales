// Logos REAIS (funcionando hoje) — coloridas.
import whatsappLogo from "@/assets/integrations/whatsapp.svg";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import asaasLogo from "@/assets/integrations/asaas.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";
import eduzzLogo from "@/assets/integrations/eduzz.webp";
import monetizzeLogo from "@/assets/integrations/monetizze.webp";
import greennLogo from "@/assets/integrations/greenn.webp";
import notazzLogo from "@/assets/integrations/notazz.png";
import googleCalendarLogo from "@/assets/integrations/google-calendar.webp";
import metaLogo from "@/assets/integrations/meta.svg";

// Logos "em breve" — mono (Simple Icons), renderizadas apagadas.
import makeLogo from "@/assets/integrations/make.svg";
import slackLogo from "@/assets/integrations/slack.svg";
import calendlyLogo from "@/assets/integrations/calendly.svg";
import googleadsLogo from "@/assets/integrations/googleads.svg";
import notionLogo from "@/assets/integrations/notion.svg";
import typeformLogo from "@/assets/integrations/typeform.svg";
import trelloLogo from "@/assets/integrations/trello.svg";
import clickupLogo from "@/assets/integrations/clickup.svg";
import hubspotLogo from "@/assets/integrations/hubspot.svg";
import pipedriveLogo from "@/assets/integrations/pipedrive.svg";
import n8nLogo from "@/assets/integrations/n8n.svg";
import discordLogo from "@/assets/integrations/discord.svg";
import mondayLogo from "@/assets/integrations/monday.svg";

// LP.6 (v2) — vitrine de integrações HONESTA em CARROSSEL: o que conecta de
// verdade hoje (coloridas) numa faixa, e o roadmap ("Em breve", mono apagado)
// noutra. Marquee CSS puro (sem JS), ~4-5 logos por vez, BLUR nas bordas (as que
// entram aparecem desfocadas e ganham foco no centro), pausa no hover. Respeita
// prefers-reduced-motion. Nada inventado.
const LIVE = [
    { src: whatsappLogo, alt: "WhatsApp", h: 26 },
    { src: rdstationLogo, alt: "RD Station", h: 24 },
    { src: mercadopagoLogo, alt: "Mercado Pago", h: 38 },
    { src: hotmartLogo, alt: "Hotmart", h: 32 },
    { src: kiwifyLogo, alt: "Kiwify", h: 30 },
    { src: metaLogo, alt: "Meta Lead Ads", h: 22 },
    { src: asaasLogo, alt: "Asaas", h: 18 },
    { src: zapierLogo, alt: "Zapier", h: 24 },
    { src: eduzzLogo, alt: "Eduzz", h: 26 },
    { src: monetizzeLogo, alt: "Monetizze", h: 24 },
    { src: greennLogo, alt: "Greenn", h: 24 },
    { src: notazzLogo, alt: "Notazz", h: 22 },
    { src: googleCalendarLogo, alt: "Google Calendar", h: 28 },
];

const SOON = [
    { src: makeLogo, alt: "Make" },
    { src: slackLogo, alt: "Slack" },
    { src: calendlyLogo, alt: "Calendly" },
    { src: googleadsLogo, alt: "Google Ads" },
    { src: notionLogo, alt: "Notion" },
    { src: typeformLogo, alt: "Typeform" },
    { src: trelloLogo, alt: "Trello" },
    { src: clickupLogo, alt: "ClickUp" },
    { src: hubspotLogo, alt: "HubSpot" },
    { src: pipedriveLogo, alt: "Pipedrive" },
    { src: n8nLogo, alt: "n8n" },
    { src: discordLogo, alt: "Discord" },
    { src: mondayLogo, alt: "monday.com" },
];

const MARQUEE_CSS = `
.vz-int-mq { position: relative; overflow: hidden; }
.vz-int-mq::before, .vz-int-mq::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 88px; z-index: 2;
  pointer-events: none;
  backdrop-filter: blur(2.5px); -webkit-backdrop-filter: blur(2.5px);
}
.vz-int-mq::before {
  left: 0;
  -webkit-mask-image: linear-gradient(to right, #000 28%, transparent);
  mask-image: linear-gradient(to right, #000 28%, transparent);
}
.vz-int-mq::after {
  right: 0;
  -webkit-mask-image: linear-gradient(to left, #000 28%, transparent);
  mask-image: linear-gradient(to left, #000 28%, transparent);
}
.vz-int-mq__track {
  display: flex; align-items: center; gap: 56px; width: max-content;
  animation: vz-int-scroll 40s linear infinite;
}
.vz-int-mq__track--rev { animation-direction: reverse; }
.vz-int-mq:hover .vz-int-mq__track { animation-play-state: paused; }
.vz-int-mq__logo { width: auto; object-fit: contain; flex-shrink: 0; }
.vz-int-mq__logo--soon {
  filter: grayscale(1); opacity: 0.4;
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.vz-int-mq__logo--soon:hover { opacity: 0.75; }
@keyframes vz-int-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .vz-int-mq__track { animation: none; }
  .vz-int-mq::before, .vz-int-mq::after { backdrop-filter: none; -webkit-backdrop-filter: none; }
  .vz-int-mq__logo--soon { transition: none; }
}
`;

export const IntegrationsStripV2 = () => {
    return (
        <section className="px-5 py-16 sm:py-20" style={{ backgroundColor: "var(--lp-paper)" }}>
            <style>{MARQUEE_CSS}</style>
            <div className="mx-auto max-w-6xl">
                <p className="lp-mono text-center" style={{ color: "var(--lp-ink-40)" }}>
                    Conecta com as ferramentas que sua agência já usa
                </p>

                {/* Faixa 1 — No ar (carrossel de logos coloridas) */}
                <div className="vz-int-mq mt-10">
                    <div className="vz-int-mq__track">
                        {[...LIVE, ...LIVE].map((logo, i) => (
                            <img
                                key={`${logo.alt}-${i}`}
                                src={logo.src}
                                alt={i < LIVE.length ? logo.alt : ""}
                                aria-hidden={i >= LIVE.length}
                                loading="lazy"
                                className="vz-int-mq__logo"
                                style={{ height: logo.h }}
                            />
                        ))}
                    </div>
                </div>

                {/* Divisória editorial (hairlines + rótulo mono, sem badge por logo) */}
                <div className="mt-12 flex items-center justify-center gap-4" aria-hidden>
                    <span className="h-px w-10" style={{ background: "var(--lp-line)" }} />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-40)" }}>Em breve</span>
                    <span className="h-px w-10" style={{ background: "var(--lp-line)" }} />
                </div>

                {/* Faixa 2 — Em breve (carrossel reverso, mono apagado) */}
                <div className="vz-int-mq mt-7">
                    <div className="vz-int-mq__track vz-int-mq__track--rev">
                        {[...SOON, ...SOON].map((logo, i) => (
                            <img
                                key={`${logo.alt}-${i}`}
                                src={logo.src}
                                alt={i < SOON.length ? `${logo.alt} (em breve)` : ""}
                                aria-hidden={i >= SOON.length}
                                loading="lazy"
                                className="vz-int-mq__logo vz-int-mq__logo--soon"
                                style={{ height: 22 }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
