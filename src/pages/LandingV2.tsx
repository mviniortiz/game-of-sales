import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Lenis from "lenis";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { EvaDemoModal } from "@/components/landing-v2/EvaDemoModal";
import { HeroV2 } from "@/components/landing-v2/HeroV2";
import { IntegrationsStripV2 } from "@/components/landing-v2/IntegrationsStripV2";
import { ProofStripV2 } from "@/components/landing-v2/ProofStripV2";
import { EvaShowcaseV2 } from "@/components/landing-v2/EvaShowcaseV2";
import { FeaturesV2 } from "@/components/landing-v2/FeaturesV2";
import { SpecialistAgentsV2 } from "@/components/landing-v2/SpecialistAgentsV2";
import { HowItWorksV2 } from "@/components/landing-v2/HowItWorksV2";
import { FaqV2 } from "@/components/landing-v2/FaqV2";
import { FinalCtaV2 } from "@/components/landing-v2/FinalCtaV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";

// LP.6 — Landing v2 (rota /v2): redesign "handhold completo" construído do zero.
// A / continua sendo a landing de produção. Em construção, seção a seção.
const LandingV2 = () => {
    const navigate = useNavigate();
    const [demoOpen, setDemoOpen] = useState(false);
    const lenisRef = useRef<Lenis | null>(null);

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
        const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenisRef.current = lenis;
        let raf = 0;
        const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
        return () => { cancelAnimationFrame(raf); lenis.destroy(); lenisRef.current = null; };
    }, []);

    // pausa o scroll suave enquanto a demo (iframe) está aberta
    useEffect(() => {
        const lenis = lenisRef.current;
        if (!lenis) return;
        if (demoOpen) lenis.stop(); else lenis.start();
    }, [demoOpen]);

    const goToRegister = () => navigate("/onboarding?plan=plus");
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
            <NavV2 onCTAClick={() => setDemoOpen(true)} onLoginClick={() => navigate("/auth")} onNavClick={scrollToId} />
            <HeroV2 onScheduleDemoClick={goToRegister} onSecondaryClick={() => setDemoOpen(true)} />
            <IntegrationsStripV2 />
            <ProofStripV2 />
            <EvaShowcaseV2 onStartDemo={() => setDemoOpen(true)} />
            <FeaturesV2 />
            <SpecialistAgentsV2 onCTAClick={goToRegister} />
            <div id="how-it-works">
                <HowItWorksV2 onStart={goToRegister} />
            </div>
            <FaqV2 />
            <FinalCtaV2 onScheduleDemoClick={() => setDemoOpen(true)} onSecondaryClick={() => scrollToId("how-it-works")} />
            <FooterV2 onNavClick={scrollToId} onLoginClick={() => navigate("/auth")} />
            <EvaDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} onCTAClick={goToRegister} />
        </div>
    );
};

export default LandingV2;
