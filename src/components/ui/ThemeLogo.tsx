import { useId } from "react";
import { MarkPieces, VyzonMark } from "@/components/brand/VyzonMark";

export type ThemeLogoVariant = "default" | "inverse" | "iconOnly" | "negative" | "monochrome";

interface ThemeLogoProps {
  className?: string;
  alt?: string;
  /** Legacy shorthand — prefer `variant="iconOnly"`. */
  iconOnly?: boolean;
  /**
   * `default` — marca em duas cores + "vyzon" na cor do texto do tema
   * `inverse` — duas cores sobre fundo escuro fixo (peça e nome brancos)
   * `iconOnly` — só o ícone de app (com fundo)
   * `negative` — tudo branco, para fundo escuro ou de cor
   * `monochrome` — marca e nome em currentColor
   */
  variant?: ThemeLogoVariant;
}

// Assinatura num SVG só, para marca e nome escalarem juntos pela altura do
// className (h-6, h-8...). Medidas em unidades do viewBox: a marca ocupa 68x69;
// "vyzon" em Geist 600 corpo 64 mede 167 de largura (medido em 07/10/2026),
// com a faixa da altura-x centrada na marca.
const LOCKUP_VIEWBOX = "0 0 251 69";

export const ThemeLogo = ({ className = "h-10 w-auto", alt = "Vyzon", iconOnly, variant }: ThemeLogoProps) => {
  const uid = useId().replace(/:/g, "");
  const resolvedVariant: ThemeLogoVariant = iconOnly ? "iconOnly" : variant ?? "default";

  if (resolvedVariant === "iconOnly") {
    return <VyzonMark variant="icon" size="100%" title={alt} className={`${className} aspect-square`} />;
  }

  const color =
    resolvedVariant === "negative" || resolvedVariant === "inverse"
      ? "#FFFFFF"
      : resolvedVariant === "monochrome"
        ? "currentColor"
        : "hsl(var(--foreground))";

  return (
    <svg viewBox={LOCKUP_VIEWBOX} className={className} role="img" aria-label={alt} style={{ color, overflow: "visible" }}>
      <g transform="translate(-16 -14.5)">
        <MarkPieces uid={uid} duo={resolvedVariant === "default" || resolvedVariant === "inverse"} />
      </g>
      <text
        x="82"
        y="51.5"
        fill="currentColor"
        fontFamily="Geist, Inter, system-ui, sans-serif"
        fontWeight={600}
        fontSize={64}
        letterSpacing={-3.2}
      >
        vyzon
      </text>
    </svg>
  );
};
