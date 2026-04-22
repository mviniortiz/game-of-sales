import logoIcon from "@/assets/logo-icon.png";

export type ThemeLogoVariant = "default" | "iconOnly" | "negative" | "monochrome";

interface ThemeLogoProps {
  className?: string;
  alt?: string;
  /** Legacy shorthand — prefer `variant="iconOnly"`. */
  iconOnly?: boolean;
  /**
   * `default` — símbolo 3D + wordmark Vyzon (padrão p/ fundos escuros)
   * `iconOnly` — só o símbolo (sem wordmark)
   * `negative` — wordmark branco (fundos brand/green sólidos)
   * `monochrome` — wordmark com cor atual (herda `currentColor`)
   */
  variant?: ThemeLogoVariant;
  /** Quando true, exibe a tagline "CRM DE VENDAS GAMIFICADO" abaixo do wordmark. */
  withTagline?: boolean;
}

/**
 * Vyzon logo conforme brand guide (2026):
 * - Símbolo 3D: V emerald + centro blue (PNG transparente)
 * - Wordmark: Sora 700 (Bold), tracking -0.035em
 * - Palette: #00E37A (accent), #1556C0 (azul), com variantes negativa/monocromática
 */
export const ThemeLogo = ({
  className = "h-10 w-auto",
  alt = "Vyzon",
  iconOnly,
  variant,
  withTagline = false,
}: ThemeLogoProps) => {
  const resolvedVariant: ThemeLogoVariant = iconOnly ? "iconOnly" : variant ?? "default";

  if (resolvedVariant === "iconOnly") {
    return <img src={logoIcon} alt={alt} className={`${className} object-contain`} draggable={false} />;
  }

  const wordmarkColor =
    resolvedVariant === "negative"
      ? "#FFFFFF"
      : resolvedVariant === "monochrome"
        ? "currentColor"
        : undefined;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={alt}>
      <img
        src={logoIcon}
        alt=""
        aria-hidden
        className="h-full w-auto object-contain"
        draggable={false}
        style={{ filter: "drop-shadow(0 0 12px rgba(0,227,122,0.28))" }}
      />
      <span className="flex flex-col leading-none">
        <span
          className="font-bold tracking-tight"
          style={{
            fontFamily: "Sora, Inter, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "0.95em",
            letterSpacing: "-0.035em",
            color: wordmarkColor ?? "var(--vyz-text-primary, hsl(var(--foreground)))",
          }}
        >
          Vyzon
        </span>
        {withTagline ? (
          <span
            className="mt-1"
            style={{
              fontFamily: "Sora, Inter, system-ui, sans-serif",
              fontWeight: 500,
              fontSize: "0.32em",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color:
                resolvedVariant === "negative"
                  ? "rgba(255,255,255,0.8)"
                  : resolvedVariant === "monochrome"
                    ? "currentColor"
                    : "var(--vyz-text-muted, #A0AEC0)",
            }}
          >
            CRM de Vendas Gamificado
          </span>
        ) : null}
      </span>
    </span>
  );
};
