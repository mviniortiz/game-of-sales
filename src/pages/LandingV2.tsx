import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    const goToRegister = () => navigate("/onboarding?plan=plus");
    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div
            className="lp-v2 min-h-screen w-full selection:bg-blue-700/20"
            style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}
        >
            <NavV2 onCTAClick={goToRegister} onLoginClick={() => navigate("/auth")} />
            <HeroV2 onScheduleDemoClick={goToRegister} onSecondaryClick={() => setDemoOpen(true)} />
            <IntegrationsStripV2 />
            <ProofStripV2 />
            <EvaShowcaseV2 onStartDemo={goToRegister} />
            <FeaturesV2 />
            <SpecialistAgentsV2 onCTAClick={goToRegister} />
            <div id="how-it-works">
                <HowItWorksV2 onStart={goToRegister} />
            </div>
            <FaqV2 />
            <FinalCtaV2 onScheduleDemoClick={goToRegister} onSecondaryClick={() => scrollToId("how-it-works")} />
            <FooterV2 onNavClick={scrollToId} onLoginClick={() => navigate("/auth")} />
            <EvaDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} onCTAClick={goToRegister} />
        </div>
    );
};

export default LandingV2;
