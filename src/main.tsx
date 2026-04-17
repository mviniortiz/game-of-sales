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

// Defer non-critical inits: Sentry, analytics, attribution.
// Keeps them out of the critical path pra FCP/LCP.
const idle =
  (typeof window !== "undefined" && (window as any).requestIdleCallback) ||
  ((cb: () => void) => setTimeout(cb, 1));

idle(() => {
  Promise.all([
    import("./lib/sentry"),
    import("./lib/analytics"),
    import("./lib/attribution"),
  ]).then(([sentry, analytics, attribution]) => {
    sentry.initSentry();
    analytics.initAnalytics();
    attribution.captureAttribution();
  });
});
