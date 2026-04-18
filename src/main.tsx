import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const THEME_STORAGE_KEY = "vyzon-theme";
const LEGACY_THEME_KEYS = ["vyzon-theme"];

// Apply stored theme preference before React mounts (persistent light/dark)
if (typeof window !== "undefined") {
  const storedTheme =
    localStorage.getItem(THEME_STORAGE_KEY) ??
    LEGACY_THEME_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  if (storedTheme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }

  if (!localStorage.getItem(THEME_STORAGE_KEY) && storedTheme) {
    localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
  }
  LEGACY_THEME_KEYS.forEach((key) => localStorage.removeItem(key));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Defer non-critical inits until after the user interacts (or 4s fallback).
// Isso mantém Sentry/Analytics fora da janela de TBT do Lighthouse.
if (typeof window !== "undefined") {
  const isLanding =
    window.location.pathname === "/" || window.location.pathname === "/landing";

  let fired = false;
  const boot = () => {
    if (fired) return;
    fired = true;
    cleanup();

    // Analytics + attribution são sempre necessários (gtag, UTM capture)
    Promise.all([import("./lib/analytics"), import("./lib/attribution")]).then(
      ([analytics, attribution]) => {
        analytics.initAnalytics();
        attribution.captureAttribution();
      }
    );

    // Sentry é pesado (~150KB gzip) — só inicializa fora da landing
    if (!isLanding) {
      import("./lib/sentry").then((sentry) => sentry.initSentry());
    }
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
