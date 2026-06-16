import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";

// Tema por contexto (2026-05-26). A homepage nova ("Central Comercial com EVA")
// e o app logado são light-first (bg-white / --vyz-* claros em :root). As
// páginas legadas do origin (SEO /crm-*, personas /para-*, relatório público
// /r/*) são dark-only (bg-[#06080a] / text-white).
// Decidimos o tema pelo pathname antes do React montar; isso também neutraliza
// o "dark" legado no localStorage que deixava a home nova e o app ilegíveis.
if (typeof window !== "undefined") {
  const path = window.location.pathname;
  const LEGACY_DARK = ["/para-", "/crm-", "/r/"];
  const isLegacyDark = LEGACY_DARK.some((p) => path.startsWith(p));

  if (isLegacyDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (typeof window !== "undefined") {
  const isLanding =
    window.location.pathname === "/" || window.location.pathname === "/landing";

  // captureAttribution precisa rodar IMEDIATAMENTE: salva gclid/UTM no
  // sessionStorage assim que usuário chega do ad. Barato, só lê URL.
  import("./lib/attribution").then((m) => m.captureAttribution());

  // initAnalytics carrega gtag.js (~320KB gzip GA4+GAds) — aguarda primeira
  // interação OU timeout 4s. Mesmo pattern do Meta Pixel em index.html —
  // tira gtag da janela TBT do Lighthouse sem perder conversions (usuário
  // sempre interage antes de submeter form de demo).
  let analyticsBooted = false;
  const bootAnalytics = () => {
    if (analyticsBooted) return;
    analyticsBooted = true;
    cleanupAnalytics();
    initAnalytics();
  };
  const analyticsEvents: Array<keyof WindowEventMap> = [
    "pointerdown",
    "keydown",
    "scroll",
    "touchstart",
  ];
  const analyticsOpts: AddEventListenerOptions = { once: true, passive: true, capture: true };
  const cleanupAnalytics = () => {
    analyticsEvents.forEach((ev) => window.removeEventListener(ev, bootAnalytics, analyticsOpts));
  };
  analyticsEvents.forEach((ev) => window.addEventListener(ev, bootAnalytics, analyticsOpts));
  setTimeout(bootAnalytics, 4000);

  // Sentry é pesado (~150KB gzip), mantém lazy fora da landing
  if (!isLanding) {
    let fired = false;
    const boot = () => {
      if (fired) return;
      fired = true;
      cleanup();
      import("./lib/sentry").then((sentry) => sentry.initSentry());
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    const opts: AddEventListenerOptions = { once: true, passive: true };
    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, boot, opts));
    };

    events.forEach((ev) => window.addEventListener(ev, boot, opts));
    setTimeout(boot, 4000);
  }
}
