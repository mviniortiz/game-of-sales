import { ThemeLogo } from "@/components/ui/ThemeLogo";

// Logos REAIS (funcionando hoje) — coloridas. Lista auditada 2026-07-17 contra
// src/pages/Integracoes.tsx (status "available") + canais nativos (WhatsApp via
// Evolution, Meta Lead Ads via lead-webhook). Slack e Discord estão NO AR
// (notificações da EVA), não em "em breve".
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

// Logos "em breve" — mono/apagadas. Inclui o roadmap real do produto
// (Stripe, Pagar.me, Celetus, em /integracoes) + ferramentas do mercado.
import stripeLogo from "@/assets/integrations/stripe.svg";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";
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

// LP.6 (v2) — vitrine de integrações HONESTA.
// Desktop: ÓRBITA — o Vyzon no centro, canais do dia a dia no anel interno,
// checkouts/gateways/ferramentas no anel externo, girando devagar (anéis em
// direções opostas; cada tile contra-rotaciona pra ficar sempre de pé).
// Mobile: carrossel de pílulas (órbita de 18 logos não cabe legível em 393px).
// "Em breve" é uma linha estática apagada nos dois casos. CSS puro, pausa no
// hover, prefers-reduced-motion desliga o giro (e vira scroll no mobile).

type LiveLogo = { src: string; alt: string; label?: string; wordmark?: boolean; h?: number };

// Anel interno — canais e rotina (emblemas reconhecíveis, tiles circulares).
const RING_INNER: LiveLogo[] = [
    { src: whatsappLogo, alt: "WhatsApp" },
    { src: metaLogo, alt: "Meta Lead Ads" },
    { src: googleCalendarLogo, alt: "Google Calendar" },
    { src: slackLogo, alt: "Slack" },
    { src: googleSheetsLogo, alt: "Google Sheets" },
    { src: discordLogo, alt: "Discord" },
];

// Anel externo — checkouts, gateways e ferramentas (pílulas com nome).
const RING_OUTER: LiveLogo[] = [
    { src: rdstationLogo, alt: "RD Station", wordmark: true, h: 17 },
    { src: hotmartLogo, alt: "Hotmart", label: "Hotmart", h: 20 },
    { src: kiwifyLogo, alt: "Kiwify", label: "Kiwify", h: 18 },
    { src: mercadopagoLogo, alt: "Mercado Pago", label: "Mercado Pago", h: 18 },
    { src: asaasLogo, alt: "Asaas", wordmark: true, h: 15 },
    { src: zapierLogo, alt: "Zapier", label: "Zapier", h: 18 },
    { src: greennLogo, alt: "Greenn", label: "Greenn", h: 20 },
    { src: caktoLogo, alt: "Cakto", label: "Cakto", h: 18 },
    { src: braipLogo, alt: "Braip", label: "Braip", h: 18 },
    { src: notazzLogo, alt: "Notazz", wordmark: true, h: 20 },
];

// Carrossel mobile: todas as 18 conexões no ar.
const LIVE_ALL: LiveLogo[] = [
    { src: whatsappLogo, alt: "WhatsApp", label: "WhatsApp" },
    { src: rdstationLogo, alt: "RD Station", wordmark: true, h: 22 },
    { src: mercadopagoLogo, alt: "Mercado Pago", label: "Mercado Pago" },
    { src: hotmartLogo, alt: "Hotmart", label: "Hotmart", h: 24 },
    { src: kiwifyLogo, alt: "Kiwify", label: "Kiwify" },
    { src: metaLogo, alt: "Meta Lead Ads", label: "Meta Lead Ads" },
    { src: googleSheetsLogo, alt: "Google Sheets", label: "Google Sheets" },
    { src: asaasLogo, alt: "Asaas", wordmark: true, h: 20 },
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
    { src: pagarmeLogo, alt: "Pagar.me" },
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

// Palco da órbita (desktop)
const STAGE = 640;
const R_INNER = 108;
const R_OUTER = 236;

const ORBIT_CSS = `
/* ── Órbita (desktop) ── */
.vz-orbit { position: relative; width: ${STAGE}px; height: ${STAGE}px; margin: 0 auto; }
.vz-orbit__guide {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  border: 1px solid var(--lp-line); border-radius: 999px; pointer-events: none;
}
.vz-orbit__ring { position: absolute; inset: 0; animation: vz-orbit-spin var(--dur) linear infinite; }
.vz-orbit__ring--rev { animation-direction: reverse; }
.vz-orbit__seat { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
/* width: max-content — o seat tem largura 0, e sem isso o shrink-to-fit
   colapsa tiles cujo único conteúdo é uma imagem (wordmarks sumiam). */
.vz-orbit__unrot { position: absolute; width: max-content; }
.vz-orbit__item { animation: vz-orbit-spin var(--dur) linear infinite reverse; }
.vz-orbit__ring--rev .vz-orbit__item { animation-direction: normal; }
.vz-orbit:hover .vz-orbit__ring, .vz-orbit:hover .vz-orbit__item { animation-play-state: paused; }
@keyframes vz-orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.vz-orbit__center {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 92px; height: 92px; border-radius: 999px; display: flex;
  align-items: center; justify-content: center;
  background: var(--lp-white, #fff); border: 1px solid var(--lp-line);
  box-shadow: 0 10px 30px -18px rgba(13, 20, 33, 0.25);
  z-index: 2;
}

/* Tiles */
.vz-int-tile {
  display: inline-flex; align-items: center; gap: 9px; flex-shrink: 0;
  background: var(--lp-white, #ffffff);
  border: 1px solid var(--lp-line);
  border-radius: 999px;
}
.vz-int-tile--pill { height: 42px; padding: 0 15px; }
.vz-int-tile--round { width: 54px; height: 54px; justify-content: center; }
.vz-int-tile img { width: auto; object-fit: contain; display: block; flex-shrink: 0; }
.vz-int-tile--round img { height: 24px; }
.vz-int-tile span {
  font-size: 12.5px; font-weight: 500; color: var(--lp-ink-70);
  white-space: nowrap; letter-spacing: -0.01em;
}

/* ── Carrossel (mobile) ── */
.vz-int-mq { position: relative; overflow: hidden; }
.vz-int-mq::before, .vz-int-mq::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 44px; z-index: 2;
  pointer-events: none;
}
.vz-int-mq::before { left: 0; background: linear-gradient(to right, var(--lp-paper) 18%, transparent); }
.vz-int-mq::after { right: 0; background: linear-gradient(to left, var(--lp-paper) 18%, transparent); }
.vz-int-mq__track {
  display: flex; align-items: center; gap: 14px; width: max-content;
  animation: vz-int-scroll 60s linear infinite;
}
.vz-int-mq:hover .vz-int-mq__track { animation-play-state: paused; }
.vz-int-mq .vz-int-tile--pill { height: 46px; padding: 0 14px; }
.vz-int-mq .vz-int-tile img { height: 17px; }
@keyframes vz-int-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ── Em breve (linha estática) ── */
.vz-int-soon {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  column-gap: 36px; row-gap: 18px;
}
.vz-int-soon img {
  height: 18px; width: auto; object-fit: contain;
  filter: grayscale(1); opacity: 0.38;
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.vz-int-soon img:hover { opacity: 0.75; }

@media (prefers-reduced-motion: reduce) {
  .vz-orbit__ring, .vz-orbit__item, .vz-int-mq__track { animation: none; }
  .vz-int-mq { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .vz-int-mq::before, .vz-int-mq::after { content: none; }
  .vz-int-soon img { transition: none; }
}
`;

const OrbitTile = ({ logo }: { logo: LiveLogo }) => {
    const round = !logo.label && !logo.wordmark;
    return (
        <div className={`vz-int-tile ${round ? "vz-int-tile--round" : "vz-int-tile--pill"}`} title={logo.alt}>
            <img src={logo.src} alt={logo.alt} loading="lazy" style={logo.h ? { height: logo.h } : undefined} />
            {logo.label && <span>{logo.label}</span>}
        </div>
    );
};

const OrbitRing = ({
    logos,
    radius,
    duration,
    reverse,
    startDeg,
}: {
    logos: LiveLogo[];
    radius: number;
    duration: string;
    reverse?: boolean;
    startDeg: number;
}) => (
    <div
        className={`vz-orbit__ring${reverse ? " vz-orbit__ring--rev" : ""}`}
        style={{ "--dur": duration } as React.CSSProperties}
    >
        {logos.map((logo, i) => {
            const deg = startDeg + (360 / logos.length) * i;
            return (
                <div key={logo.alt} className="vz-orbit__seat" style={{ transform: `rotate(${deg}deg) translateX(${radius}px)` }}>
                    <div className="vz-orbit__unrot" style={{ transform: `translate(-50%, -50%) rotate(${-deg}deg)` }}>
                        <div className="vz-orbit__item" style={{ "--dur": duration } as React.CSSProperties}>
                            <OrbitTile logo={logo} />
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
);

export const IntegrationsStripV2 = () => {
    return (
        <section className="px-5 py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: "var(--lp-paper)" }}>
            <style>{ORBIT_CSS}</style>
            <div className="mx-auto max-w-6xl">
                <p
                    className="text-center"
                    style={{ fontSize: "15px", color: "var(--lp-ink-55)", letterSpacing: "-0.01em" }}
                >
                    Tudo que sua agência já usa, conectado ao Vyzon. No ar hoje:
                </p>

                {/* Desktop — órbita */}
                <div className="hidden sm:block mt-6">
                    <div className="vz-orbit" aria-label="Integrações ativas do Vyzon">
                        <div className="vz-orbit__guide" style={{ width: R_INNER * 2, height: R_INNER * 2 }} />
                        <div className="vz-orbit__guide" style={{ width: R_OUTER * 2, height: R_OUTER * 2 }} />
                        <div className="vz-orbit__center">
                            <ThemeLogo variant="iconOnly" className="h-10 w-auto" alt="Vyzon" />
                        </div>
                        <OrbitRing logos={RING_INNER} radius={R_INNER} duration="80s" startDeg={-90} />
                        <OrbitRing logos={RING_OUTER} radius={R_OUTER} duration="140s" reverse startDeg={-75} />
                    </div>
                </div>

                {/* Mobile — carrossel de pílulas */}
                <div className="sm:hidden vz-int-mq mt-8">
                    <div className="vz-int-mq__track">
                        {[...LIVE_ALL, ...LIVE_ALL].map((logo, i) => (
                            <div key={`${logo.alt}-${i}`} className="vz-int-tile vz-int-tile--pill" aria-hidden={i >= LIVE_ALL.length}>
                                <img
                                    src={logo.src}
                                    alt={i < LIVE_ALL.length ? logo.alt : ""}
                                    loading="lazy"
                                    style={logo.h ? { height: logo.h } : undefined}
                                />
                                {!logo.wordmark && <span>{logo.label}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divisória editorial */}
                <div className="mt-12 sm:mt-10 flex items-center justify-center gap-4" aria-hidden>
                    <span className="h-px w-10" style={{ background: "var(--lp-line)" }} />
                    <span style={{ fontSize: "12.5px", color: "var(--lp-ink-40)", letterSpacing: "0.02em" }}>
                        Em breve
                    </span>
                    <span className="h-px w-10" style={{ background: "var(--lp-line)" }} />
                </div>

                {/* Em breve — linha estática apagada */}
                <div className="vz-int-soon mt-7 mx-auto max-w-3xl">
                    {SOON.map((logo) => (
                        <img key={logo.alt} src={logo.src} alt={`${logo.alt} (em breve)`} loading="lazy" title={logo.alt} />
                    ))}
                </div>
            </div>
        </section>
    );
};
