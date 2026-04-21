import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const THEME_STORAGE_KEY = "vyzon-theme";

// Apply stored theme preference before React mounts (persistent light/dark)
if (typeof window !== "undefined") {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
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

  // Analytics + attribution precisam rodar IMEDIATAMENTE:
  // - captureAttribution salva gclid/UTM no sessionStorage ao chegar do ad
  // - initAnalytics carrega gtag.js (GA4) antes do primeiro form submit
  // Se ficarem lazy atrás de user interaction, conversões podem ser perdidas.
  Promise.all([import("./lib/analytics"), import("./lib/attribution")]).then(
    ([analytics, attribution]) => {
      attribution.captureAttribution();
      analytics.initAnalytics();
    }
  );

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
