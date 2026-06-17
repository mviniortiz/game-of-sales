import { useState, useEffect, lazy, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HeroSection } from "@/components/landing/HeroSection";
import { PilaresSection } from "@/components/landing/PilaresSection";
import { AgentStudioSection } from "@/components/landing/AgentStudioSection";
import { PainPoints } from "@/components/landing/PainPoints";
import { TrustNoteSection } from "@/components/landing/TrustNoteSection";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { LandingNav } from "@/components/landing/LandingNav";
import { ConversationThread } from "@/components/landing/ConversationThread";
import { EvaEasterEgg } from "@/components/landing/EvaEasterEgg";
import { NavigatingOverlay } from "@/components/landing/sections/NavigatingOverlay";
import { scrollToLazyAnchor, smoothScrollToId, useHashScrollOnMount } from "@/hooks/useLandingAnchor";

// LP.2 2026-05-25: narrativa simplificada. Removidos do render (e dos imports):
// FlowSection (Central de Comando standalone), PipelineSection, LigacoesSection
// (Base de Conhecimento standalone), UseCasesSection (Para cada papel) e
// DemoVideoPlayer — conteúdo redundante absorvido por Solução/EVA/Fluxo.
// LP.3 2026-06-09: removida também a CentralComercialSection ("Tudo que o
// comercial precisa") — repetia dor + benefícios; resultados absorvidos pela
// microcopy dos módulos em AgentStudioSection. Entrou TrustNoteSection (prova
// honesta antes do agendamento).
const EvaAISection = lazy(() =>
    import("@/components/landing/EvaAISection").then((m) => ({ default: m.EvaAISection }))
);
const FAQSection = lazy(() =>
    import("@/components/landing/FAQSection").then((m) => ({ default: m.FAQSection }))
);
const DemoScheduleSection = lazy(() =>
    import("@/components/landing/DemoScheduleSection").then((m) => ({ default: m.DemoScheduleSection }))
);
const FinalCTA = lazy(() =>
    import("@/components/landing/FinalCTA").then((m) => ({ default: m.FinalCTA }))
);
const PricingSection = lazy(() =>
    import("@/components/landing/sections/PricingSection").then((m) => ({ default: m.PricingSection }))
);
const LandingFooter = lazy(() =>
    import("@/components/landing/sections/LandingFooter").then((m) => ({ default: m.LandingFooter }))
);

const preloadOnboarding = () => import("@/pages/Onboarding");

// Resiliência por seção: isola cada bloco da landing. Se uma seção quebra
// (ex.: dependência de runtime falha), ela cai sozinha — `fallback={null}` —
// sem substituir a página inteira pela tela de erro full-screen. O erro
// continua sendo capturado no Sentry pelo ErrorBoundary.
const Safe = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary fallback={null}>{children}</ErrorBoundary>
);

const LandingPage = () => {
    const navigate = useNavigate();
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        trackEvent(FUNNEL_EVENTS.LANDING_VIEW);
        // LP.5: dica do easter egg pra quem abre o console (a EVA lê com você)
        try {
            console.log(
                "%c EVA %c estou lendo esta página com você. quer me ver? digite e·v·a — em qualquer lugar.",
                "background:#6d28d9;color:#fff;font-weight:700;border-radius:3px;padding:2px 6px;",
                "color:#6d28d9;font-weight:500;"
            );
        } catch {
            /* console nunca quebra UX */
        }
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    // Tráfego pago (gclid/fbclid/utm_source=google|facebook): pre-hidrata TODO
    // o lazy content pra não renderizar "demo-form-start" só depois do scroll.
    // Sem isso, visitantes de ad scrollam para um placeholder vazio (minHeight 320px)
    // e saem antes do form carregar — causa do drop-off 157 CTA → 30 form_rendered.
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const isAdTraffic =
                params.has("gclid") ||
                params.has("fbclid") ||
                params.get("utm_source") === "google" ||
                params.get("utm_source") === "facebook";
            if (isAdTraffic) {
                // Delay curto pra não bloquear LCP; rIC preferencial.
                const dispatch = () => window.dispatchEvent(new CustomEvent("vyzon:hydrate-all"));
                const idle = (window as typeof window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback;
                if (idle) idle(dispatch, { timeout: 2000 });
                else setTimeout(dispatch, 600);
            }
        } catch {
            /* ignore */
        }
    }, []);

    useHashScrollOnMount();

    // Scroll pro form de demo + tracking do CTA de origem (Nav, Hero, Pricing, FinalCTA).
    // Força hydrate de TODO lazy content imediatamente — sem isso o scroll caía em
    // placeholder 320px vazio e usuários clicavam 6,59x/user achando que travou.
    // Fallback wait loop (2,5s) ainda fica de rede pra casos de import lento.
    const scrollToDemo = (location: string) => {
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { target: "demo", location });
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

    const goToRegister = (planId?: string) => {
        const plan = planId || "plus";
        setSelectedPlan(plan);
        setIsNavigating(true);
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { plan });
        preloadOnboarding();
        navigate(`/onboarding?plan=${plan}`);
    };

    return (
        <div className="min-h-screen w-full selection:bg-blue-700/20" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            {isNavigating && <NavigatingOverlay plan={selectedPlan} />}

            {/* LP.5: fio da conversa desenhando com o scroll (xl+) + easter egg da EVA */}
            <ConversationThread />
            <EvaEasterEgg />

            <LandingNav
                onCTAClick={() => scrollToDemo("nav")}
                onLoginClick={() => navigate("/auth")}
            />

            {/* 1 · HERO */}
            <HeroSection
                onCTAClick={() => scrollToLazyAnchor("pricing")}
                onDemoClick={() => scrollToLazyAnchor("how-it-works")}
                onScheduleDemoClick={() => scrollToDemo("hero")}
                onLoginClick={() => navigate("/auth")}
            />

            {/* 2 · PROBLEMA */}
            <Safe><PainPoints /></Safe>

            {/* 3 · PROVA VISUAL DE PRODUTO (mock CSS) — âncora "Como funciona" */}
            <div id="how-it-works">
                <Safe><ProductShowcase /></Safe>
            </div>

            {/* 4 · COMO O VYZON RESOLVE */}
            <Safe><AgentStudioSection onCTAClick={() => scrollToDemo("solucao")} /></Safe>

            {/* 5 · EVA */}
            <LazyOnVisible minHeight="700px">
                <Safe><EvaAISection onCTAClick={() => smoothScrollToId("pricing")} /></Safe>
            </LazyOnVisible>

            {/* 6 · PARA QUEM É */}
            <Safe><PilaresSection /></Safe>

            {/* 7 · CONFIANÇA (por que o Vyzon existe — sem prova social inventada) */}
            <Safe><TrustNoteSection /></Safe>

            {/* 8 · CTA / DEMO (alvo de todos os CTAs "Agendar") */}
            <LazyOnVisible minHeight="320px" id="agendar-demo">
                <Safe>
                    <DemoScheduleSection />
                </Safe>
            </LazyOnVisible>

            {/* 9 · PRICING */}
            <LazyOnVisible minHeight="900px" id="pricing">
                <Safe>
                    <PricingSection
                        onPlanSelect={goToRegister}
                        onScheduleDemo={scrollToDemo}
                    />
                </Safe>
            </LazyOnVisible>

            {/* FAQ */}
            <LazyOnVisible minHeight="600px">
                <div id="faq">
                    <Safe><FAQSection /></Safe>
                </div>
            </LazyOnVisible>

            {/* CTA FINAL */}
            <LazyOnVisible minHeight="400px">
                <Safe>
                    <FinalCTA
                        onCTAClick={() => goToRegister("pro")}
                        onScheduleDemoClick={() => scrollToDemo("final_cta")}
                    />
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

export default LandingPage;
