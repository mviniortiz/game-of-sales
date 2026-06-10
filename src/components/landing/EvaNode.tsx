// LP.4 2026-06-09: glifo próprio da EVA — um nó (anel + núcleo), o ponto onde
// a conversa é lida. Substitui o ícone Sparkle (clichê de IA) em toda a landing.
export const EvaNode = ({ size = 14, color = "currentColor", className = "" }: {
    size?: number;
    color?: string;
    className?: string;
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        className={className}
        aria-hidden="true"
    >
        <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.4" />
        <circle cx="7" cy="7" r="2.4" fill={color} />
    </svg>
);
