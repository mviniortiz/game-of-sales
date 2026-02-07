import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const storageKey = "gamesales-theme";
const legacyStorageKeys = ["vyzon-theme"];

const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem(storageKey) ?? legacyStorageKeys.map(key => localStorage.getItem(key)).find(Boolean);
  if (stored === "light") return "light";
  if (stored === "dark") return "dark";
  return "dark"; // Default to dark mode for Sales Command Center experience
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem(storageKey, theme);
    legacyStorageKeys.forEach(key => localStorage.removeItem(key));
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      className="gap-2 border-border bg-card text-foreground hover:bg-muted shadow-sm"
    >
      {theme === "light" ? (
        <>
          <Moon className="h-4 w-4 text-indigo-600" />
          Escuro
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 text-amber-400" />
          Claro
        </>
      )}
    </Button>
  );
};

