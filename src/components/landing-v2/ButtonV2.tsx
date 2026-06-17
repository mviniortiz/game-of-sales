import type { ButtonHTMLAttributes, ReactNode } from "react";

// LP.6 (v2) — botão pill premium/editorial. Primário PRETO, secundário outline.
// Estilos em index.css (.vz-btn). Sem ícones decorativos; seta "→" opcional.
interface ButtonV2Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "light" | "ghostlight";
    size?: "md" | "sm";
    showArrow?: boolean;
    children: ReactNode;
}

export const ButtonV2 = ({
    variant = "primary",
    size = "md",
    showArrow = false,
    children,
    className = "",
    ...rest
}: ButtonV2Props) => {
    const cls = `vz-btn vz-btn--${variant}${size === "sm" ? " vz-btn--sm" : ""} ${className}`.trim();
    return (
        <button type="button" className={cls} {...rest}>
            <span>{children}</span>
            {showArrow && (
                <span className="vz-btn__arrow" aria-hidden="true">
                    →
                </span>
            )}
        </button>
    );
};
