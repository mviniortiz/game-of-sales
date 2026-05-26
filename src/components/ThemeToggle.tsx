import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const storageKey = "vyzon-theme";

const getStoredTheme = (): Theme => {
  // App é light-first (bg-white / --vyz-* claros). O dark mode do app não está
  // finalizado (o primitivo ui/sidebar usa --sidebar-background escuro no .dark,
  // deixando o sidebar dark sobre conteúdo light). Forçamos light e ignoramos o
  // "dark" legado no localStorage que ressuscitava esse estado quebrado.
  // Reativar quando o tema escuro do app estiver completo.
  return "light";
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
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      className="flex items-center justify-center h-9 w-9 rounded-lg text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-emerald-400" />
      )}
    </button>
  );
};

