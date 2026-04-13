import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const storageKey = "vyzon-theme";

const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem(storageKey);
  if (stored === "light") return "light";
  if (stored === "dark") return "dark";
  return "dark"; // Default to dark mode
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return { theme, toggle };
};

export const ThemeToggle = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4 shrink-0 text-amber-400" />
          {!collapsed && <span>Modo claro</span>}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 shrink-0 text-emerald-400" />
          {!collapsed && <span>Modo escuro</span>}
        </>
      )}
    </button>
  );
};

