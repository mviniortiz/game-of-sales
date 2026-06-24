import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type Lenis from "lenis";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { trackBehavior, FUNNEL_EVENTS } from "@/lib/analytics";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { EvaDemoModal } from "@/components/landing-v2/EvaDemoModal";
import { HeroV2 } from "@/components/landing-v2/HeroV2";
import { IntegrationsStripV2 } from "@/components/landing-v2/IntegrationsStripV2";
import { ProofStripV2 } from "@/components/landing-v2/ProofStripV2";
import { EvaShowcaseV2 } from "@/components/landing-v2/EvaShowcaseV2";
import { FeaturesV2 } from "@/components/landing-v2/FeaturesV2";
import { SpecialistAgentsV2 } from "@/components/landing-v2/SpecialistAgentsV2";
import { PricingV2 } from "@/components/landing-v2/PricingV2";
import { HowItWorksV2 } from "@/components/landing-v2/HowItWorksV2";
import { FaqV2 } from "@/components/landing-v2/FaqV2";
import { FinalCtaV2 } from "@/components/landing-v2/FinalCtaV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";

// LP.6 — Landing v2 (rota /v2): redesign "handhold completo" construído do zero.
// A / continua sendo a landing de produção. Em construção, seção a seção.
const LandingV2 = () => {
    const navigate = useNavigate();
    const [demoOpen, setDemoOpen] = useState(false);
    const [toSignup, setToSignup] = useState(false);
    const lenisRef = useRef<Lenis | null>(null);

    // TRANSIÇÃO pro teste grátis: um véu escuro (cor do cadastro) cobre a landing
    // clara, pré-carrega o chunk do cadastro durante o véu, e então navega — sem
    // corte seco nem flash do loader.
    const goToSignup = (plan: string, source = "unknown") => {
        trackBehavior(FUNNEL_EVENTS.LANDING_CTA_CLICK, { cta: "trial", plan, source });
        if (toSignup) return;
        setToSignup(true);
        import("./SignupV2").catch(() => undefined);
        window.setTimeout(() => navigate(`/criar-conta?plan=${plan}`), 440);
    };

    // Abre a demo de voz tagueando a origem do clique.
    const openDemo = (source: string) => {
        trackBehavior(FUNNEL_EVENTS.DEMO_OPEN, { source });
        setDemoOpen(true);
    };

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    // SCROLL SUAVE (Lenis): inércia na rolagem. Desligado se a pessoa pediu
    // menos animação. raf loop + cleanup ao sair da página.
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let raf = 0;
        let cancelled = false;
        // Lenis carregado sob demanda (import dinâmico) — tira ~15KB do bundle
        // inicial da landing sem mudar o comportamento do scroll suave.
        import("lenis").then(({ default: Lenis }) => {
            if (cancelled) return;
            const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
            lenisRef.current = lenis;
            const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
            raf = requestAnimationFrame(loop);
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            lenisRef.current?.destroy();
            lenisRef.current = null;
        };
    }, []);

    // pausa o scroll suave enquanto a demo (iframe) está aberta
    useEffect(() => {
        const lenis = lenisRef.current;
        if (!lenis) return;
        if (demoOpen) lenis.stop(); else lenis.start();
    }, [demoOpen]);

    // vindo do blog: ?demo=1 abre a demo; ?go=<anchor> rola até a seção
    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get("demo") === "1") openDemo("url_param");
        const go = sp.get("go");
        let t: number | undefined;
        if (go) {
            t = window.setTimeout(() => {
                const el = document.getElementById(go);
                if (!el) return;
                if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: 0 });
                else el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 450);
        }
        if (sp.get("demo") || go) window.history.replaceState({}, "", window.location.pathname);
        return () => { if (t) clearTimeout(t); };
    }, []);

    // Analytics: view da landing + profundidade de scroll (25/50/75/100%, 1x cada).
    useEffect(() => {
        trackBehavior(FUNNEL_EVENTS.LANDING_VIEW, {});
        const seen = new Set<number>();
        const onScroll = () => {
            const el = document.documentElement;
            const max = el.scrollHeight - el.clientHeight;
            if (max <= 0) return;
            const pct = (el.scrollTop / max) * 100;
            for (const m of [25, 50, 75, 100]) {
                if (pct >= m && !seen.has(m)) { seen.add(m); trackBehavior(FUNNEL_EVENTS.LANDING_SCROLL_DEPTH, { depth: m }); }
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: 0 });
        else el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div
            className="lp-v2 min-h-screen w-full selection:bg-blue-700/20"
            style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}
        >
            <NavV2 onCTAClick={() => openDemo("nav")} onLoginClick={() => navigate("/auth")} onNavClick={scrollToId} onBlogClick={() => navigate("/blog")} />
            <HeroV2 onScheduleDemoClick={() => goToSignup("plus", "hero")} onSecondaryClick={() => openDemo("hero")} />
            <IntegrationsStripV2 />
            <ProofStripV2 />
            <EvaShowcaseV2 onStartDemo={() => openDemo("eva_showcase")} />
            <FeaturesV2 />
            <SpecialistAgentsV2 onCTAClick={() => goToSignup("plus", "specialists")} />
            <PricingV2 onTrial={(slug) => goToSignup(slug, "pricing")} onScheduleDemo={() => openDemo("pricing")} />
            <div id="how-it-works">
                <HowItWorksV2 onStart={() => goToSignup("plus", "how_it_works")} />
            </div>
            <FaqV2 />
            <FinalCtaV2 onScheduleDemoClick={() => openDemo("final_cta")} onSecondaryClick={() => scrollToId("how-it-works")} />
            <FooterV2 onNavClick={scrollToId} onLoginClick={() => navigate("/auth")} onBlogClick={() => navigate("/blog")} />
            <EvaDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} onCTAClick={() => goToSignup("plus", "demo_modal")} />

            {/* véu de transição pro cadastro (cor do cadastro), some ao trocar de rota */}
            {toSignup && (
                <div className="vz-signup-veil fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5" style={{ background: "#07080A" }}>
                    <div className="vz-veil-mark flex flex-col items-center gap-5" style={{ filter: "brightness(0) invert(1)" }}>
                        <ThemeLogo className="h-7 w-auto" />
                    </div>
                    <p className="vz-veil-mark lp-mono" style={{ color: "rgba(255,255,255,0.5)" }}>Preparando seu teste grátis…</p>
                </div>
            )}
        </div>
    );
};

export default LandingV2;
