// Professional Logo Variations for Game Sales
// Using Emerald Green branding

interface LogoProps {
    variant?: 'icon' | 'full' | 'horizontal';
    className?: string;
}

// Variation 1: Modern Trophy + Upward Arrow
export const GameSalesLogoV1 = ({ variant = 'full', className = '' }: LogoProps) => {
    if (variant === 'icon') {
        return (
            <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Trophy base with growth arrow */}
                <circle cx="50" cy="50" r="45" fill="#10b981" opacity="0.1" />
                <path d="M50 20 L60 35 L75 35 L62 45 L67 60 L50 50 L33 60 L38 45 L25 35 L40 35 Z" fill="#10b981" />
                <path d="M45 55 L55 55 L55 75 L60 75 L50 85 L40 75 L45 75 Z" stroke="#10b981" strokeWidth="3" fill="#d1fae5" />
                <circle cx="50" cy="50" r="42" stroke="#10b981" strokeWidth="2" fill="none" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 300 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Icon */}
            <circle cx="40" cy="40" r="35" fill="#10b981" opacity="0.1" />
            <path d="M40 15 L48 27 L62 27 L51 35 L55 48 L40 40 L25 48 L29 35 L18 27 L32 27 Z" fill="#10b981" />
            <path d="M36 43 L44 43 L44 60 L48 60 L40 68 L32 60 L36 60 Z" stroke="#10b981" strokeWidth="2.5" fill="#d1fae5" />

            {/* Text */}
            <text x="85" y="50" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="700" fill="#1e293b">
                GAME <tspan fill="#10b981">SALES</tspan>
            </text>
        </svg>
    );
};

// Variation 2: Sleek "GS" Monogram with circular flow
export const GameSalesLogoV2 = ({ variant = 'full', className = '' }: LogoProps) => {
    if (variant === 'icon') {
        return (
            <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer ring with gradient */}
                <defs>
                    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" stroke="url(#emeraldGrad)" strokeWidth="4" fill="white" />

                {/* GS letters integrated */}
                <path d="M35 35 Q30 35 30 40 L30 60 Q30 65 35 65 L45 65 L45 58 L37 58 L37 52 L45 52 L45 45 L35 45 L35 42 L45 42 L45 35 Z" fill="#10b981" />
                <path d="M55 35 Q50 35 50 40 L50 45 Q50 48 53 48 L63 48 Q66 48 66 51 L66 58 Q66 61 63 61 L53 61 Q50 61 50 58 L50 55 L57 55 L57 58 L63 58 L63 51 L53 51 Q48 51 48 46 L48 40 Q48 35 53 35 L63 35 Q68 35 68 40 L68 45 L61 45 L61 42 L55 42 Z" fill="#1e293b" />

                {/* Subtle arrow indicator */}
                <path d="M70 25 L75 30 L70 35" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 320 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="emeraldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>

            {/* Icon */}
            <circle cx="40" cy="40" r="33" stroke="url(#emeraldGrad2)" strokeWidth="3" fill="white" />
            <path d="M28 28 Q24 28 24 32 L24 48 Q24 52 28 52 L36 52 L36 47 L29 47 L29 42 L36 42 L36 37 L28 37 L28 33 L36 33 L36 28 Z" fill="#10b981" />
            <path d="M44 28 Q40 28 40 32 L40 37 Q40 39 42 39 L50 39 Q52 39 52 41 L52 46 Q52 48 50 48 L42 48 Q40 48 40 46 L40 44 L45 44 L45 46 L50 46 L50 41 L42 41 Q38 41 38 37 L38 32 Q38 28 42 28 L50 28 Q54 28 54 32 L54 37 L49 37 L49 33 L44 33 Z" fill="#1e293b" />
            <path d="M56 20 L60 24 L56 28" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Text */}
            <text x="85" y="50" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="700" fill="#1e293b">
                GAME <tspan fill="#10b981">SALES</tspan>
            </text>
        </svg>
    );
};

// Variation 3: Abstract growth chart icon
export const GameSalesLogoV3 = ({ variant = 'full', className = '' }: LogoProps) => {
    if (variant === 'icon') {
        return (
            <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="emeraldGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                </defs>

                {/* Background circle */}
                <circle cx="50" cy="50" r="45" fill="url(#emeraldGrad3)" />

                {/* Growth bars */}
                <rect x="20" y="60" width="12" height="20" rx="2" fill="white" opacity="0.6" />
                <rect x="37" y="50" width="12" height="30" rx="2" fill="white" opacity="0.8" />
                <rect x="54" y="35" width="12" height="45" rx="2" fill="white" />

                {/* Arrow overlay */}
                <path d="M25 55 L45 35 L65 45 L75 25" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <polygon points="75,25 68,27 70,34" fill="white" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 320 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="emeraldGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>

            {/* Icon */}
            <circle cx="40" cy="40" r="35" fill="url(#emeraldGrad4)" />
            <rect x="16" y="50" width="9" height="15" rx="1.5" fill="white" opacity="0.6" />
            <rect x="29" y="42" width="9" height="23" rx="1.5" fill="white" opacity="0.8" />
            <rect x="42" y="30" width="9" height="35" rx="1.5" fill="white" />
            <path d="M20 45 L35 28 L50 36 L60 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polygon points="60,20 54,22 56,28" fill="white" />

            {/* Text */}
            <text x="85" y="50" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="700" fill="#1e293b">
                GAME <tspan fill="#10b981">SALES</tspan>
            </text>
        </svg>
    );
};

export default GameSalesLogoV2;
