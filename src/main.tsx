import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";
import App from "./App.tsx";
import "./index.css";

initSentry();
initAnalytics();

const THEME_STORAGE_KEY = "vyzon-theme";
const LEGACY_THEME_KEYS = ["vyzon-theme"];

// Apply stored theme preference before React mounts (persistent light/dark)
if (typeof window !== "undefined") {
  const storedTheme =
    localStorage.getItem(THEME_STORAGE_KEY) ??
    LEGACY_THEME_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  // Default to dark; only remove if explicitly stored as light
  if (storedTheme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }

  // Migrate legacy keys to the new brand key
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
