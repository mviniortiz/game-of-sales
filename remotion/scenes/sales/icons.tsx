import React from "react";

// Lucide-style SVG icons (compact)
type P = { s?: number; c?: string; fill?: string };

const base = (s: number, c: string) =>
    ({
        width: s,
        height: s,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: c,
        strokeWidth: 2,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    });

export const Icon = {
    Trophy: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    ),
    Crown: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
            <path d="M5 21h14" />
        </svg>
    ),
    Sparkles: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    ),
    Bot: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    ),
    MessageCircle: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    ),
    Mic: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
    ),
    Image: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    ),
    Phone: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    Send: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
            <path d="m21.854 2.147-10.94 10.939" />
        </svg>
    ),
    BarChart: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <line x1="12" x2="12" y1="20" y2="10" />
            <line x1="18" x2="18" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
    ),
    TrendingUp: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    ),
    Target: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    ),
    Users: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    DollarSign: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    Zap: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    Rocket: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
    ),
    Flame: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    ),
    Star: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    Check: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    CheckCircle: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    Calendar: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    ),
    Lock: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    ArrowRight: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    CheckCheck: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M18 6 7 17l-5-5" />
            <path d="m22 10-7.5 7.5L13 16" />
        </svg>
    ),
    Brain: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
        </svg>
    ),
    Plus: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    ),
    Search: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    ),
    Filter: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    ),
    Bell: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    ),
    Mail: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    ),
    Link: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    ),
    PlayCircle: ({ s = 20, c = "currentColor" }: P) => (
        <svg {...base(s, c)}>
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
    ),
    Heart: ({ s = 20, c = "currentColor", fill = "none" }: P) => (
        <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    ),
};
