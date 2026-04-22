import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Vyzon landing (full-dark, fora do modo app). Trocar em index.css.
        vyz: {
          bg: "var(--vyz-bg)",
          "surface-1": "var(--vyz-surface-1)",
          "surface-2": "var(--vyz-surface-2)",
          "surface-3": "var(--vyz-surface-3)",
          "surface-elevated": "var(--vyz-surface-elevated)",
          "border-subtle": "var(--vyz-border-subtle)",
          border: "var(--vyz-border)",
          "border-strong": "var(--vyz-border-strong)",
          "text-primary": "var(--vyz-text-primary)",
          "text-strong": "var(--vyz-text-strong)",
          text: "var(--vyz-text)",
          "text-muted": "var(--vyz-text-muted)",
          "text-soft": "var(--vyz-text-soft)",
          "text-dim": "var(--vyz-text-dim)",
          accent: "var(--vyz-accent)",
          "accent-light": "var(--vyz-accent-light)",
          "accent-dark": "var(--vyz-accent-dark)",
          "accent-soft-4": "var(--vyz-accent-soft-4)",
          "accent-soft-6": "var(--vyz-accent-soft-6)",
          "accent-soft-8": "var(--vyz-accent-soft-8)",
          "accent-soft-10": "var(--vyz-accent-soft-10)",
          "accent-soft-12": "var(--vyz-accent-soft-12)",
          "accent-border": "var(--vyz-accent-border)",
          "accent-border-strong": "var(--vyz-accent-border-strong)",
          "accent-text": "var(--vyz-accent-text)",
        },
      },
      boxShadow: {
        "vyz-cta": "var(--vyz-shadow-cta)",
        "vyz-cta-sm": "var(--vyz-shadow-cta-sm)",
        "vyz-panel": "var(--vyz-shadow-panel)",
        "vyz-mock": "var(--vyz-shadow-mock)",
      },
      backgroundImage: {
        "vyz-accent": "var(--vyz-gradient-accent)",
        "vyz-hero-text": "var(--vyz-gradient-hero-text)",
        "vyz-top-glow": "var(--vyz-gradient-top-glow)",
        "vyz-section-glow": "var(--vyz-gradient-section-glow)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionProperty: {
        colors: "color, background-color",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "orbit": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "orbit": "orbit 20s linear infinite",
        "shimmer": "shimmer 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
