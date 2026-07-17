// Logos REAIS (funcionando hoje) — coloridas. Lista auditada 2026-07-17 contra
// src/pages/Integracoes.tsx (status "available") + canais nativos (WhatsApp via
// Evolution, Meta Lead Ads via lead-webhook). Pagar.me testada e2e; Slack e
// Discord NO AR (notificações da EVA). Eduzz e Monetizze removidas.
import whatsappLogo from "@/assets/integrations/whatsapp.svg";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import asaasLogo from "@/assets/integrations/asaas.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";
import greennLogo from "@/assets/integrations/greenn.webp";
import notazzLogo from "@/assets/integrations/notazz.png";
import googleCalendarLogo from "@/assets/integrations/google-calendar.webp";
import googleSheetsLogo from "@/assets/integrations/google-sheets.svg";
import metaLogo from "@/assets/integrations/meta.svg";
import caktoLogo from "@/assets/integrations/cakto.webp";
import braipLogo from "@/assets/integrations/braip.webp";
import slackLogo from "@/assets/integrations/slack.svg";
import discordLogo from "@/assets/integrations/discord.svg";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";

// Logos "em breve" — mono/apagadas. Roadmap real (Stripe, Celetus) +
// ferramentas do mercado. Notion fica aqui até o 1º sync real validar.
import stripeLogo from "@/assets/integrations/stripe.svg";
import celetusLogo from "@/assets/integrations/celetus.webp";
import makeLogo from "@/assets/integrations/make.svg";
import calendlyLogo from "@/assets/integrations/calendly.svg";
import googleadsLogo from "@/assets/integrations/googleads.svg";
import notionLogo from "@/assets/integrations/notion.svg";
import typeformLogo from "@/assets/integrations/typeform.svg";
import trelloLogo from "@/assets/integrations/trello.svg";
import clickupLogo from "@/assets/integrations/clickup.svg";
import hubspotLogo from "@/assets/integrations/hubspot.svg";
import pipedriveLogo from "@/assets/integrations/pipedrive.svg";
import n8nLogo from "@/assets/integrations/n8n.svg";
import mondayLogo from "@/assets/integrations/monday.svg";

// LP.6 (v2) — vitrine de integrações HONESTA em carrossel (a órbita foi
// removida em 2026-07-17 a pedido do Markus: peso percebido na máquina real).
// Faixa 1 ("no ar"): tiles pílula papel+hairline com logo + nome. Faixa 2
// ("em breve"): logos mono apagadas em rotação reversa. Marquee CSS puro,
// fade nas bordas (sem backdrop-filter), pausa no hover;
// prefers-reduced-motion vira scroll manual.

// wordmark: o arquivo do logo já é a marca escrita — o tile não repete o nome.
// h: altura da imagem no tile (webp com respiro interno precisam de mais).
type LiveLogo = { src: string; alt: string; label?: string; wordmark?: boolean; h?: number };

const LIVE: LiveLogo[] = [
    { src: whatsappLogo, alt: "WhatsApp", label: "WhatsApp" },
    { src: rdstationLogo, alt: "RD Station", wordmark: true, h: 22 },
    { src: mercadopagoLogo, alt: "Mercado Pago", label: "Mercado Pago" },
    { src: hotmartLogo, alt: "Hotmart", label: "Hotmart", h: 24 },
    { src: kiwifyLogo, alt: "Kiwify", label: "Kiwify" },
    { src: metaLogo, alt: "Meta Lead Ads", label: "Meta Lead Ads" },
    { src: googleSheetsLogo, alt: "Google Sheets", label: "Google Sheets" },
    { src: asaasLogo, alt: "Asaas", wordmark: true, h: 20 },
    { src: pagarmeLogo, alt: "Pagar.me", wordmark: true, h: 22 },
    { src: zapierLogo, alt: "Zapier", label: "Zapier" },
    { src: greennLogo, alt: "Greenn", label: "Greenn", h: 24 },
    { src: caktoLogo, alt: "Cakto", label: "Cakto", h: 22 },
    { src: braipLogo, alt: "Braip", label: "Braip", h: 22 },
    { src: notazzLogo, alt: "Notazz", wordmark: true, h: 25 },
    { src: googleCalendarLogo, alt: "Google Calendar", label: "Google Calendar" },
    { src: slackLogo, alt: "Slack", label: "Slack" },
    { src: discordLogo, alt: "Discord", label: "Discord" },
];

const SOON = [
    { src: stripeLogo, alt: "Stripe" },
    { src: celetusLogo, alt: "Celetus" },
    { src: makeLogo, alt: "Make" },
    { src: calendlyLogo, alt: "Calendly" },
    { src: googleadsLogo, alt: "Google Ads" },
    { src: notionLogo, alt: "Notion" },
    { src: typeformLogo, alt: "Typeform" },
    { src: trelloLogo, alt: "Trello" },
    { src: clickupLogo, alt: "ClickUp" },
    { src: hubspotLogo, alt: "HubSpot" },
    { src: pipedriveLogo, alt: "Pipedrive" },
    { src: n8nLogo, alt: "n8n" },
    { src: mondayLogo, alt: "monday.com" },
];

const MARQUEE_CSS = `
.vz-int-mq { position: relative; overflow: hidden; }
.vz-int-mq::before, .vz-int-mq::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 96px; z-index: 2;
  pointer-events: none;
}
.vz-int-mq::before { left: 0; background: linear-gradient(to right, var(--lp-paper) 18%, transparent); }
.vz-int-mq::after { right: 0; background: linear-gradient(to left, var(--lp-paper) 18%, transparent); }
.vz-int-mq__track {
  display: flex; align-items: center; gap: var(--mq-gap, 16px); width: max-content;
  animation: vz-int-scroll var(--mq-dur, 50s) linear infinite;
}
.vz-int-mq__track--rev { animation-direction: reverse; }
.vz-int-mq:hover .vz-int-mq__track { animation-play-state: paused; }

/* Tile "no ar": papel branco + hairline, logo + nome. */
.vz-int-tile {
  display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0;
  height: 52px; padding: 0 18px;
  background: var(--lp-white, #ffffff);
  border: 1px solid var(--lp-line);
  border-radius: 999px;
}
.vz-int-tile img { height: 20px; width: auto; object-fit: contain; display: block; flex-shrink: 0; }
.vz-int-tile span {
  font-size: 13.5px; font-weight: 500; color: var(--lp-ink-70);
  white-space: nowrap; letter-spacing: -0.01em;
}

.vz-int-mq__logo { width: auto; object-fit: contain; flex-shrink: 0; }
.vz-int-mq__logo--soon {
  filter: grayscale(1); opacity: 0.38;
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.vz-int-mq__logo--soon:hover { opacity: 0.75; }
@keyframes vz-int-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (max-width: 640px) {
  .vz-int-mq::before, .vz-int-mq::after { width: 44px; }
  .vz-int-tile { height: 46px; padding: 0 14px; gap: 8px; }
  .vz-int-tile img { height: 17px; }
  .vz-int-tile span { font-size: 12.5px; }
}
@media (prefers-reduced-motion: reduce) {
  /* Sem animação o track transbordaria escondido: vira scroll manual. */
  .vz-int-mq { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .vz-int-mq::before, .vz-int-mq::after { content: none; }
  .vz-int-mq__track { animation: none; }
  .vz-int-mq__logo--soon { transition: none; }
}
`;

export const IntegrationsStripV2 = () => {
    return (
        <section className="px-5 py-16 sm:py-20" style={{ backgroundColor: "var(--lp-paper)" }}>
            <style>{MARQUEE_CSS}</style>
            <div className="mx-auto max-w-6xl">
                <p
                    className="text-center"
                    style={{ fontSize: "15px", color: "var(--lp-ink-55)", letterSpacing: "-0.01em" }}
                >
                    Conecta com as ferramentas que sua agência já usa. No ar hoje:
                </p>

                {/* Faixa 1 — No ar (trilho de tiles logo + nome) */}
                <div className="vz-int-mq mt-8" style={{ "--mq-dur": "55s" } as React.CSSProperties}>
                    <div className="vz-int-mq__track">
                        {[...LIVE, ...LIVE].map((logo, i) => (
                            <div key={`${logo.alt}-${i}`} className="vz-int-tile" aria-hidden={i >= LIVE.length}>
                                <img
                                    src={logo.src}
                                    alt={i < LIVE.length ? logo.alt : ""}
                                    loading="lazy"
                                    style={logo.h ? { height: logo.h } : undefined}
                                />
                                {!logo.wordmark && <span>{logo.label}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divisória editorial */}
                <div className="mt-10 flex items-center justify-center gap-4" aria-hidden>
                    <span className="h-px w-10" style={{ background: "var(--lp-line)" }} />
                    <span style={{ fontSize: "12.5px", color: "var(--lp-ink-40)", letterSpacing: "0.02em" }}>
                        Em breve
                    </span>
                    <span className="h-px w-10" style={{ background: "var(--lp-line)" }} />
                </div>

                {/* Faixa 2 — Em breve (carrossel reverso, mono apagado) */}
                <div
                    className="vz-int-mq mt-6"
                    style={{ "--mq-dur": "65s", "--mq-gap": "48px" } as React.CSSProperties}
                >
                    <div className="vz-int-mq__track vz-int-mq__track--rev">
                        {[...SOON, ...SOON].map((logo, i) => (
                            <img
                                key={`${logo.alt}-${i}`}
                                src={logo.src}
                                alt={i < SOON.length ? `${logo.alt} (em breve)` : ""}
                                aria-hidden={i >= SOON.length}
                                loading="lazy"
                                className="vz-int-mq__logo vz-int-mq__logo--soon"
                                style={{ height: 20 }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
