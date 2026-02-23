import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LogIn } from "lucide-react";
import brandLogoWhite from "@/assets/logo-only.png";

interface LandingNavProps {
    onLoginClick: () => void;
    onCTAClick: () => void;
}

const NAV_LINKS = [
    { label: "Como funciona", anchor: "how-it-works" },
    { label: "Casos de uso", anchor: "use-cases" },
    { label: "Preços", anchor: "pricing" },
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

    // Lock body scroll when drawer open
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
            {/* ── Sticky Nav Bar ───────────────────────────────────── */}
            <motion.header
                className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
                style={{
                    background: scrolled
                        ? "rgba(5,10,21,0.88)"
                        : "transparent",
                    backdropFilter: scrolled ? "blur(18px) saturate(160%)" : "none",
                    borderBottom: scrolled
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "1px solid transparent",
                    boxShadow: scrolled
                        ? "0 8px 32px rgba(0,0,0,0.35)"
                        : "none",
                }}
                initial={{ y: -64, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                    {/* Logo */}
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="flex items-center gap-2.5 flex-shrink-0"
                    >
                        <img src={brandLogoWhite} alt="Game Sales" className="h-8 w-auto" />
                    </button>

                    {/* Desktop links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => (
                            <button
                                key={link.anchor}
                                onClick={() => handleAnchor(link.anchor)}
                                className="relative px-4 py-2 rounded-lg text-sm transition-colors duration-150 group"
                                style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}
                                onMouseEnter={(e) =>
                                    ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)")
                                }
                                onMouseLeave={(e) =>
                                    ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)")
                                }
                            >
                                <span className="relative z-10">{link.label}</span>
                                {/* Hover pill */}
                                <span
                                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                    style={{ background: "rgba(255,255,255,0.05)" }}
                                />
                            </button>
                        ))}
                    </nav>

                    {/* Desktop CTAs */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={onLoginClick}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all duration-150"
                            style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}
                            onMouseEnter={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.color = "rgba(255,255,255,0.85)";
                                b.style.background = "rgba(255,255,255,0.06)";
                            }}
                            onMouseLeave={(e) => {
                                const b = e.currentTarget as HTMLButtonElement;
                                b.style.color = "rgba(255,255,255,0.5)";
                                b.style.background = "transparent";
                            }}
                        >
                            <LogIn className="h-3.5 w-3.5" />
                            Entrar
                        </button>

                        <motion.button
                            onClick={onCTAClick}
                            className="relative overflow-hidden flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm text-white"
                            style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                boxShadow: "0 4px 18px rgba(16,185,129,0.3)",
                                fontWeight: 600,
                            }}
                            whileHover={{ scale: 1.03, boxShadow: "0 6px 24px rgba(16,185,129,0.42)" }}
                            whileTap={{ scale: 0.97 }}
                        >
                            {/* Shimmer */}
                            <motion.span
                                className="absolute inset-0 rounded-xl"
                                style={{
                                    background:
                                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                                }}
                                animate={{ x: ["-120%", "220%"] }}
                                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
                            />
                            <span className="relative">Começar agora</span>
                            <ArrowRight className="relative h-3.5 w-3.5" />
                        </motion.button>
                    </div>

                    {/* Mobile: Entrar + Hamburguer */}
                    <div className="flex md:hidden items-center gap-2">
                        <button
                            onClick={onLoginClick}
                            className="text-xs px-3 py-2 rounded-lg"
                            style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
                            aria-label="Menu"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {mobileOpen ? (
                                    <motion.span
                                        key="close"
                                        initial={{ rotate: -45, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 45, opacity: 0 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <X className="h-4.5 w-4.5" />
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        key="menu"
                                        initial={{ rotate: 45, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -45, opacity: 0 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <Menu className="h-4.5 w-4.5" />
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* ── Mobile Drawer ─────────────────────────────────────── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 z-40 md:hidden"
                            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                        />

                        {/* Drawer panel */}
                        <motion.div
                            className="fixed top-0 right-0 bottom-0 z-50 w-[280px] flex flex-col md:hidden"
                            style={{
                                background: "rgba(7,12,24,0.97)",
                                backdropFilter: "blur(24px)",
                                borderLeft: "1px solid rgba(255,255,255,0.07)",
                                boxShadow: "-24px 0 80px rgba(0,0,0,0.5)",
                            }}
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        >
                            {/* Drawer header */}
                            <div
                                className="flex items-center justify-between px-5 h-16 border-b"
                                style={{ borderColor: "rgba(255,255,255,0.06)" }}
                            >
                                <img src={brandLogoWhite} alt="Game Sales" className="h-7 w-auto" />
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Nav links */}
                            <nav className="flex flex-col px-3 py-4 gap-1 flex-1">
                                {NAV_LINKS.map((link, i) => (
                                    <motion.button
                                        key={link.anchor}
                                        onClick={() => handleAnchor(link.anchor)}
                                        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left transition-colors"
                                        style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, fontSize: "0.9375rem" }}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.06 + i * 0.05 }}
                                        onMouseEnter={(e) => {
                                            const b = e.currentTarget as HTMLButtonElement;
                                            b.style.color = "rgba(255,255,255,0.9)";
                                            b.style.background = "rgba(255,255,255,0.04)";
                                        }}
                                        onMouseLeave={(e) => {
                                            const b = e.currentTarget as HTMLButtonElement;
                                            b.style.color = "rgba(255,255,255,0.6)";
                                            b.style.background = "transparent";
                                        }}
                                    >
                                        <span
                                            className="w-1 h-1 rounded-full flex-shrink-0"
                                            style={{ background: "rgba(16,185,129,0.5)" }}
                                        />
                                        {link.label}
                                    </motion.button>
                                ))}
                            </nav>

                            {/* Drawer CTAs */}
                            <div
                                className="px-4 py-5 border-t flex flex-col gap-2"
                                style={{ borderColor: "rgba(255,255,255,0.06)" }}
                            >
                                <button
                                    onClick={() => { onLoginClick(); setMobileOpen(false); }}
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm transition-colors"
                                    style={{
                                        color: "rgba(255,255,255,0.55)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        background: "rgba(255,255,255,0.03)",
                                        fontWeight: 500,
                                    }}
                                >
                                    <LogIn className="h-4 w-4" />
                                    Entrar na minha conta
                                </button>

                                <motion.button
                                    onClick={() => { onCTAClick(); setMobileOpen(false); }}
                                    className="relative overflow-hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm text-white"
                                    style={{
                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        boxShadow: "0 4px 20px rgba(16,185,129,0.32)",
                                        fontWeight: 700,
                                    }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <motion.span
                                        className="absolute inset-0 rounded-xl"
                                        style={{
                                            background:
                                                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)",
                                        }}
                                        animate={{ x: ["-120%", "220%"] }}
                                        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                                    />
                                    <span className="relative">Começar agora</span>
                                    <ArrowRight className="relative h-4 w-4" />
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
