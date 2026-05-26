import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";

// Tema por contexto (hotfix 2026-05-26). A landing pública é dark-only
// (textos brancos hardcoded sobre --vyz-bg escuro); o app logado é light-first
// (bg-white / text-slate-*). Um tema global único quebrava um dos dois e o
// "dark" legado no localStorage deixava o app novo ilegível. Decidimos pelo
// pathname antes do React montar:
//   - rotas públicas (landing / SEO / comparativos / relatório público) -> dark
//   - app logado (catch-all do AppShell) -> light
if (typeof window !== "undefined") {
  const path = window.location.pathname;
  const PUBLIC_EXACT = new Set(["/", "/landing"]);
  const PUBLIC_PREFIX = ["/alternativa", "/para-", "/crm-", "/r/"];
  const isPublicLanding =
    PUBLIC_EXACT.has(path) || PUBLIC_PREFIX.some((p) => path.startsWith(p));

  if (isPublicLanding) {
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
