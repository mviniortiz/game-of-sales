import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const THEME_STORAGE_KEY = "gamesales-theme";
const LEGACY_THEME_KEYS = ["vyzon-theme"];

// Apply stored theme preference before React mounts (persistent light/dark)
if (typeof window !== "undefined") {
  const storedTheme =
    localStorage.getItem(THEME_STORAGE_KEY) ??
    LEGACY_THEME_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  const isDark = storedTheme === "dark";
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
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
