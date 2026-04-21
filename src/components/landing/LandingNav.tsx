import { useState, useEffect } from "react";
import { Menu, X, ArrowRight, LogIn } from "lucide-react";
import brandLogoDark from "@/assets/logo-dark.png";

interface LandingNavProps {
    onLoginClick: () => void;
    onCTAClick: () => void;
}

const NAV_LINKS = [
    { label: "Funcionalidades", anchor: "features" },
    { label: "Eva", anchor: "eva" },
    { label: "Como funciona", anchor: "how-it-works" },
    { label: "Para quem", anchor: "use-cases" },
    { label: "Agendar demo", anchor: "agendar-demo" },
    { label: "FAQ", anchor: "faq" },
];

const scrollTo = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth" });
};

export const LandingNav = ({ onLoginClick, onCTAClick }: LandingNavProps) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

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

    return (
        <>
            <header
                className="fixed top-0 inset-x-0 z-50 transition-all duration-300 landing-fade-in"
                style={{
                    background: scrolled ? "rgba(6,8,10,0.85)" : "transparent",
                    backdropFilter: scrolled ? "blur(12px)" : "none",
                    WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
                    borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
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
                        {NAV_LINKS.map((link) => (
                            <button
                                key={link.anchor}
                                onClick={() => handleAnchor(link.anchor)}
                                className="relative px-4 py-2 rounded-lg text-sm transition-colors duration-150 group hover:text-white"
                                style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}
                            >
                                <span className="relative z-10">{link.label}</span>
                                <span
                                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                    style={{ background: "rgba(255,255,255,0.08)" }}
                                />
                            </button>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={onLoginClick}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-white/10 hover:text-white"
                            style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}
                        >
                            <LogIn className="h-3.5 w-3.5" />
                            Entrar
                        </button>

                        <a
                            href="#agendar-demo"
                            onClick={(e) => { e.preventDefault(); onCTAClick(); }}
                            className="relative overflow-hidden flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm text-white transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97] no-underline"
                            style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                boxShadow: "0 4px 18px rgba(16,185,129,0.3)",
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
                            style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)" }}
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
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "-24px 0 80px rgba(0,0,0,0.4)",
                }}
            >
                <div
                    className="flex items-center justify-between px-5 h-16 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                    <img src={brandLogoDark} alt="Vyzon" width={320} height={60} className="h-7 w-auto" />
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Fechar menu"
                        className="w-8 h-8 flex items-center justify-center rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <nav className="flex flex-col px-3 py-4 gap-1 flex-1">
                    {NAV_LINKS.map((link) => (
                        <button
                            key={link.anchor}
                            onClick={() => handleAnchor(link.anchor)}
                            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left transition-colors hover:bg-white/5 hover:text-white"
                            style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, fontSize: "0.9375rem" }}
                        >
                            <span
                                className="w-1 h-1 rounded-full flex-shrink-0"
                                style={{ background: "rgba(16,185,129,0.5)" }}
                            />
                            {link.label}
                        </button>
                    ))}
                </nav>

                <div
                    className="px-4 py-5 border-t flex flex-col gap-2"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                    <button
                        onClick={() => { onLoginClick(); setMobileOpen(false); }}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm transition-colors"
                        style={{
                            color: "rgba(255,255,255,0.6)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.03)",
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
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
