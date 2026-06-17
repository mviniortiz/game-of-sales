import { useState, useEffect, lazy, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroRedesign } from "@/components/landing/redesign/HeroRedesign";
import { ProblemaChapter } from "@/components/landing/redesign/ProblemaChapter";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { AgentStudioSection } from "@/components/landing/AgentStudioSection";
import { PilaresSection } from "@/components/landing/PilaresSection";
import { TrustNoteSection } from "@/components/landing/TrustNoteSection";
import { smoothScrollToId, scrollToLazyAnchor, useHashScrollOnMount } from "@/hooks/useLandingAnchor";

const EvaAISection = lazy(() => import("@/components/landing/EvaAISection").then((m) => ({ default: m.EvaAISection })));
const FAQSection = lazy(() => import("@/components/landing/FAQSection").then((m) => ({ default: m.FAQSection })));
const DemoScheduleSection = lazy(() => import("@/components/landing/DemoScheduleSection").then((m) => ({ default: m.DemoScheduleSection })));
const FinalCTA = lazy(() => import("@/components/landing/FinalCTA").then((m) => ({ default: m.FinalCTA })));
const PricingSection = lazy(() => import("@/components/landing/sections/PricingSection").then((m) => ({ default: m.PricingSection })));
const LandingFooter = lazy(() => import("@/components/landing/sections/LandingFooter").then((m) => ({ default: m.LandingFooter })));

const Safe = ({ children }: { children: ReactNode }) => (
    <ErrorBoundary fallback={null}>{children}</ErrorBoundary>
);

/**
 * /redesign — proposta de landing reestruturada (evolução editorial).
 * Hero masthead + capítulo "Problema" no novo sistema; demais capítulos
 * reusam as seções atuais (mesma alma --lp-*) na nova ordem. Copy intocada.
 */
const LandingRedesign = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    useHashScrollOnMount();

    const scrollToDemo = () => {
        window.dispatchEvent(new CustomEvent("vyzon:hydrate-all"));
        if (smoothScrollToId("demo-form-start")) return;
        scrollToLazyAnchor("agendar-demo");
        const start = Date.now();
        const wait = () => {
            if (smoothScrollToId("demo-form-start")) return;
            if (Date.now() - start < 2500) requestAnimationFrame(wait);
        };
        requestAnimationFrame(wait);
    };

    const goToRegister = (planId?: string) => navigate(`/onboarding?plan=${planId || "plus"}`);

    return (
        <div className="min-h-screen w-full selection:bg-blue-700/20" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <LandingNav onCTAClick={scrollToDemo} onLoginClick={() => navigate("/auth")} />

            {/* 00 · HERO */}
            <HeroRedesign
                onScheduleDemoClick={scrollToDemo}
                onHowItWorksClick={() => scrollToLazyAnchor("how-it-works")}
            />

            {/* 01 · PROBLEMA */}
            <Safe><ProblemaChapter /></Safe>

            {/* 02 · COMO FUNCIONA (a prova) */}
            <div id="how-it-works">
                <Safe><ProductShowcase /></Safe>
            </div>

            {/* 03 · A CENTRAL (banda escura) */}
            <Safe><AgentStudioSection onCTAClick={scrollToDemo} /></Safe>

            {/* 04 · A EVA */}
            <LazyOnVisible minHeight="700px">
                <Safe><EvaAISection onCTAClick={() => smoothScrollToId("pricing")} /></Safe>
            </LazyOnVisible>

            {/* 05 · PARA QUEM É */}
            <Safe><PilaresSection /></Safe>

            {/* 06 · POR QUE EXISTE */}
            <Safe><TrustNoteSection /></Safe>

            {/* 07 · DEMO */}
            <LazyOnVisible minHeight="320px" id="agendar-demo">
                <Safe><DemoScheduleSection /></Safe>
            </LazyOnVisible>

            {/* 08 · PREÇOS */}
            <LazyOnVisible minHeight="900px" id="pricing">
                <Safe>
                    <PricingSection onPlanSelect={goToRegister} onScheduleDemo={scrollToDemo} />
                </Safe>
            </LazyOnVisible>

            {/* 09 · DÚVIDAS */}
            <LazyOnVisible minHeight="600px">
                <div id="faq">
                    <Safe><FAQSection /></Safe>
                </div>
            </LazyOnVisible>

            {/* 10 · CTA FINAL */}
            <LazyOnVisible minHeight="400px">
                <Safe>
                    <FinalCTA onCTAClick={() => goToRegister("pro")} onScheduleDemoClick={scrollToDemo} />
                </Safe>
            </LazyOnVisible>

            <LazyOnVisible minHeight="300px">
                <Safe>
                    <LandingFooter
                        onNavClick={(id) => scrollToLazyAnchor(id)}
                        onLoginClick={() => navigate("/auth")}
                        onRegisterClick={() => goToRegister("plus")}
                    />
                </Safe>
            </LazyOnVisible>
        </div>
    );
};

export default LandingRedesign;
