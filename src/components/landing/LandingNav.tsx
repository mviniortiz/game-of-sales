import { useState, useEffect, useRef } from "react";
import { Menu, X, ArrowRight, LogIn, ChevronDown, Rocket, Megaphone, Building2 } from "lucide-react";
import brandLogoDark from "@/assets/logo-dark.png";
import { scrollToLazyAnchor } from "@/hooks/useLandingAnchor";

interface LandingNavProps {
    onLoginClick: () => void;
    onCTAClick: () => void;
}

type NavItem =
    | { kind: "anchor"; label: string; anchor: string }
    | {
          kind: "dropdown";
          label: string;
          items: Array<{
              label: string;
              sub: string;
              href: string;
              icon: typeof Rocket;
              soon?: boolean;
          }>;
      };

const NAV_LINKS: NavItem[] = [
    { kind: "anchor", label: "Como funciona", anchor: "how-it-works" },
    { kind: "anchor", label: "Funcionalidades", anchor: "features" },
    { kind: "anchor", label: "Eva", anchor: "eva" },
    { kind: "anchor", label: "Preços", anchor: "pricing" },
    {
        kind: "dropdown",
        label: "Soluções",
        items: [
            {
                label: "Para Infoprodutores",
                sub: "Hotmart, Kiwify e Greenn nativos",
                href: "/para-infoprodutores",
                icon: Rocket,
            },
            {
                label: "Para Agências",
                sub: "Multi-cliente, multi-pipeline",
                href: "/para-agencias",
                icon: Megaphone,
                soon: true,
            },
            {
                label: "Para Imobiliárias",
                sub: "Corretores, lead e visita",
                href: "/para-imobiliarias",
                icon: Building2,
                soon: true,
            },
        ],
    },
];

// Cross-page: quem clica em navbar fora da landing (ex.: /para-infoprodutores)
// vai pro hash da landing — LandingPage reprocessa o hash no mount.
const scrollTo = (anchor: string) => {
    if (window.location.pathname !== "/" && window.location.pathname !== "/landing") {
        window.location.href = `/#${anchor}`;
        return;
    }
    scrollToLazyAnchor(anchor);
};

export const LandingNav = ({ onLoginClick, onCTAClick }: LandingNavProps) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [solutionsOpen, setSolutionsOpen] = useState(false);
    const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 72);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const handleAnchor = (anchor: string) => {
        scrollTo(anchor);
        setMobileOpen(false);
    };

    const openDropdown = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setSolutionsOpen(true);
    };
    const scheduleClose = () => {
        closeTimer.current = setTimeout(() => setSolutionsOpen(false), 120);
    };

    return (
        <>
            <header
                className="fixed top-0 inset-x-0 z-50 landing-fade-in"
                style={{
                    background: scrolled ? "rgba(6,8,10,0.85)" : "transparent",
                    backdropFilter: scrolled ? "blur(12px)" : "none",
                    WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
                    borderBottom: scrolled ? "1px solid var(--vyz-border)" : "1px solid transparent",
                    boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="flex items-center gap-2.5 flex-shrink-0"
                    >
                        <img src={brandLogoDark} alt="Vyzon" width={320} height={60} className="h-6 sm:h-8 w-auto" />
                    </button>

                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => {
                            if (link.kind === "anchor") {
                                return (
                                    <button
                                        key={link.anchor}
                                        onClick={() => handleAnchor(link.anchor)}
                                        className="relative px-4 py-2 rounded-lg text-sm transition-colors duration-150 group hover:text-white"
                                        style={{ color: "var(--vyz-text-muted)", fontWeight: 500 }}
                                    >
                                        <span className="relative z-10">{link.label}</span>
                                        <span
                                            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                            style={{ background: "var(--vyz-border-strong)" }}
                                        />
                                    </button>
                                );
                            }
                            // dropdown
                            return (
                                <div
                                    key={link.label}
                                    className="relative"
                                    onMouseEnter={openDropdown}
                                    onMouseLeave={scheduleClose}
                                >
                                    <button
                                        onClick={() => setSolutionsOpen((v) => !v)}
                                        className="relative flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-colors duration-150 group hover:text-white"
                                        style={{
                                            color: solutionsOpen ? "var(--vyz-text-primary)" : "var(--vyz-text-muted)",
                                            fontWeight: 500,
                                        }}
                                        aria-expanded={solutionsOpen}
                                    >
                                        <span className="relative z-10">{link.label}</span>
                                        <ChevronDown
                                            className="relative z-10 h-3.5 w-3.5 transition-transform duration-200"
                                            strokeWidth={2}
                                            style={{ transform: solutionsOpen ? "rotate(180deg)" : "none" }}
                                        />
                                        <span
                                            className="absolute inset-0 rounded-lg transition-opacity duration-150"
                                            style={{
                                                background: "var(--vyz-border-strong)",
                                                opacity: solutionsOpen ? 1 : 0,
                                            }}
                                        />
                                    </button>

                                    <div
                                        className="absolute left-1/2 top-full pt-3 -translate-x-1/2 transition-all duration-200"
                                        style={{
                                            opacity: solutionsOpen ? 1 : 0,
                                            transform: `translate(-50%, ${solutionsOpen ? "0" : "-4px"})`,
                                            pointerEvents: solutionsOpen ? "auto" : "none",
                                        }}
                                    >
                                        <div
                                            className="w-[320px] rounded-2xl p-2"
                                            style={{
                                                background: "rgba(11,14,18,0.98)",
                                                backdropFilter: "blur(20px)",
                                                border: "1px solid var(--vyz-border-strong)",
                                                boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px var(--vyz-surface-2)",
                                            }}
                                        >
                                            {link.items.map((item) => {
                                                const Icon = item.icon;
                                                const content = (
                                                    <>
                                                        <div
                                                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                                                            style={{
                                                                background: item.soon ? "var(--vyz-surface-2)" : "var(--vyz-accent-soft-10)",
                                                                border: `1px solid ${item.soon ? "var(--vyz-border)" : "var(--vyz-accent-border)"}`,
                                                            }}
                                                        >
                                                            <Icon
                                                                className="h-4 w-4"
                                                                strokeWidth={2}
                                                                style={{ color: item.soon ? "var(--vyz-text-dim)" : "var(--vyz-accent-light)" }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--vyz-text-primary)" }}>
                                                                    {item.label}
                                                                </span>
                                                                {item.soon && (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
                                                                        style={{
                                                                            background: "var(--vyz-border-subtle)",
                                                                            color: "var(--vyz-text-soft)",
                                                                            fontWeight: 700,
                                                                            letterSpacing: "0.05em",
                                                                        }}
                                                                    >
                                                                        em breve
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: "0.75rem", color: "var(--vyz-text-soft)", marginTop: 2 }}>
                                                                {item.sub}
                                                            </div>
                                                        </div>
                                                        {!item.soon && (
                                                            <ArrowRight
                                                                className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-hover/item:translate-x-0.5"
                                                                strokeWidth={2}
                                                                style={{ color: "var(--vyz-text-dim)" }}
                                                            />
                                                        )}
                                                    </>
                                                );
                                                const commonClasses = "group/item flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-colors";
                                                const commonStyle = {
                                                    background: "transparent",
                                                    cursor: item.soon ? "not-allowed" : "pointer",
                                                };
                                                if (item.soon) {
                                                    return (
                                                        <div
                                                            key={item.label}
                                                            className={commonClasses}
                                                            style={{ ...commonStyle, opacity: 0.65 }}
                                                        >
                                                            {content}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <a
                                                        key={item.label}
                                                        href={item.href}
                                                        onClick={() => setSolutionsOpen(false)}
                                                        className={`${commonClasses} no-underline hover:bg-white/5`}
                                                        style={commonStyle}
                                                    >
                                                        {content}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={onLoginClick}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-white/10 hover:text-white"
                            style={{ color: "var(--vyz-text-muted)", fontWeight: 500 }}
                        >
                            <LogIn className="h-3.5 w-3.5" />
                            Entrar
                        </button>

                        <a
                            href="#agendar-demo"
                            onClick={(e) => { e.preventDefault(); onCTAClick(); }}
                            className="relative overflow-hidden flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm text-white transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97] no-underline"
                            style={{
                                background: "linear-gradient(135deg, var(--vyz-accent) 0%, var(--vyz-accent-dark) 100%)",
                                boxShadow: "var(--vyz-shadow-cta-sm)",
                                fontWeight: 600,
                            }}
                        >
                            <span className="relative">Agendar demo</span>
                            <ArrowRight className="relative h-3.5 w-3.5" />
                        </a>
                    </div>

                    <div className="flex md:hidden items-center gap-2">
                        <button
                            onClick={onLoginClick}
                            className="text-xs px-3 py-2 rounded-lg"
                            style={{ color: "var(--vyz-text-muted)", fontWeight: 500 }}
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{ background: "var(--vyz-border-strong)", color: "var(--vyz-text-strong)" }}
                            aria-label="Menu"
                        >
                            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile drawer — CSS-only transition */}
            <div
                className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
                    mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                onClick={() => setMobileOpen(false)}
            />
            <div
                className={`fixed top-0 right-0 bottom-0 z-50 w-[min(280px,90vw)] flex flex-col md:hidden transition-transform duration-300 ease-out ${
                    mobileOpen ? "translate-x-0" : "translate-x-full"
                }`}
                style={{
                    background: "rgba(10,13,16,0.97)",
                    backdropFilter: "blur(16px)",
                    borderLeft: "1px solid var(--vyz-border)",
                    boxShadow: "-24px 0 80px rgba(0,0,0,0.4)",
                }}
            >
                <div
                    className="flex items-center justify-between px-5 h-16 border-b"
                    style={{ borderColor: "var(--vyz-border)" }}
                >
                    <img src={brandLogoDark} alt="Vyzon" width={320} height={60} className="h-7 w-auto" />
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Fechar menu"
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={{ background: "var(--vyz-border)", color: "var(--vyz-text-muted)" }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <nav className="flex flex-col px-3 py-4 gap-1 flex-1 overflow-y-auto">
                    {NAV_LINKS.map((link) => {
                        if (link.kind === "anchor") {
                            return (
                                <button
                                    key={link.anchor}
                                    onClick={() => handleAnchor(link.anchor)}
                                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left transition-colors hover:bg-white/5 hover:text-white"
                                    style={{ color: "var(--vyz-text-muted)", fontWeight: 500, fontSize: "0.9375rem" }}
                                >
                                    <span
                                        className="w-1 h-1 rounded-full flex-shrink-0"
                                        style={{ background: "rgba(16,185,129,0.5)" }}
                                    />
                                    {link.label}
                                </button>
                            );
                        }
                        // dropdown mobile: collapsible group
                        return (
                            <div key={link.label} className="flex flex-col">
                                <button
                                    onClick={() => setMobileSolutionsOpen((v) => !v)}
                                    className="flex items-center justify-between gap-3 w-full px-4 py-3.5 rounded-xl text-left transition-colors hover:bg-white/5 hover:text-white"
                                    style={{ color: "var(--vyz-text-muted)", fontWeight: 500, fontSize: "0.9375rem" }}
                                >
                                    <span className="flex items-center gap-3">
                                        <span
                                            className="w-1 h-1 rounded-full flex-shrink-0"
                                            style={{ background: "rgba(16,185,129,0.5)" }}
                                        />
                                        {link.label}
                                    </span>
                                    <ChevronDown
                                        className="h-4 w-4 transition-transform duration-200"
                                        style={{ transform: mobileSolutionsOpen ? "rotate(180deg)" : "none" }}
                                    />
                                </button>
                                <div
                                    className="overflow-hidden"
                                    style={{
                                        maxHeight: mobileSolutionsOpen ? "400px" : "0",
                                        opacity: mobileSolutionsOpen ? 1 : 0,
                                        transition: "opacity 0.2s ease-out",
                                    }}
                                >
                                    <div className="pl-4 pr-1 py-1 flex flex-col gap-1">
                                        {link.items.map((item) => {
                                            const Icon = item.icon;
                                            const inner = (
                                                <>
                                                    <div
                                                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                                                        style={{
                                                            background: item.soon ? "var(--vyz-surface-2)" : "var(--vyz-accent-soft-10)",
                                                            border: `1px solid ${item.soon ? "var(--vyz-border)" : "var(--vyz-accent-border)"}`,
                                                        }}
                                                    >
                                                        <Icon
                                                            className="h-3.5 w-3.5"
                                                            strokeWidth={2}
                                                            style={{ color: item.soon ? "var(--vyz-text-dim)" : "var(--vyz-accent-light)" }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}>
                                                                {item.label.replace("Para ", "")}
                                                            </span>
                                                            {item.soon && (
                                                                <span
                                                                    className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
                                                                    style={{
                                                                        background: "var(--vyz-border-subtle)",
                                                                        color: "var(--vyz-text-soft)",
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    em breve
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: "0.7rem", color: "var(--vyz-text-soft)", marginTop: 1 }}>
                                                            {item.sub}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                            const cls = "flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg transition-colors";
                                            if (item.soon) {
                                                return (
                                                    <div
                                                        key={item.label}
                                                        className={cls}
                                                        style={{ opacity: 0.55, cursor: "not-allowed" }}
                                                    >
                                                        {inner}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <a
                                                    key={item.label}
                                                    href={item.href}
                                                    onClick={() => setMobileOpen(false)}
                                                    className={`${cls} hover:bg-white/5 no-underline`}
                                                >
                                                    {inner}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div
                    className="px-4 py-5 border-t flex flex-col gap-2"
                    style={{ borderColor: "var(--vyz-border)" }}
                >
                    <button
                        onClick={() => { onLoginClick(); setMobileOpen(false); }}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm transition-colors"
                        style={{
                            color: "var(--vyz-text-muted)",
                            border: "1px solid var(--vyz-border-strong)",
                            background: "var(--vyz-surface-1)",
                            fontWeight: 500,
                        }}
                    >
                        <LogIn className="h-4 w-4" />
                        Entrar na minha conta
                    </button>

                    <a
                        href="#agendar-demo"
                        onClick={(e) => { e.preventDefault(); onCTAClick(); setMobileOpen(false); }}
                        className="relative overflow-hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm text-white transition-transform duration-150 active:scale-[0.97] no-underline"
                        style={{
                            background: "linear-gradient(135deg, var(--vyz-accent) 0%, var(--vyz-accent-dark) 100%)",
                            boxShadow: "0 4px 20px rgba(16,185,129,0.32)",
                            fontWeight: 700,
                        }}
                    >
                        <span className="relative">Agendar demo</span>
                        <ArrowRight className="relative h-4 w-4" />
                    </a>
                </div>
            </div>
        </>
    );
};
