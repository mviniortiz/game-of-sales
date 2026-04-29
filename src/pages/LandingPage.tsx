import { useState, useEffect, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { HeroSection } from "@/components/landing/HeroSection";
import { ImpactMetrics } from "@/components/landing/ImpactMetrics";
import { PainPoints } from "@/components/landing/PainPoints";
import { LandingNav } from "@/components/landing/LandingNav";
import { NavigatingOverlay } from "@/components/landing/sections/NavigatingOverlay";
import { scrollToLazyAnchor, smoothScrollToId, useHashScrollOnMount } from "@/hooks/useLandingAnchor";

const FlowSection = lazy(() =>
    import("@/components/landing/FlowSection").then((m) => ({ default: m.FlowSection }))
);
const ProductBentoGrid = lazy(() =>
    import("@/components/landing/ProductBentoGrid").then((m) => ({ default: m.ProductBentoGrid }))
);
const ComparisonSection = lazy(() =>
    import("@/components/landing/ComparisonSection").then((m) => ({ default: m.ComparisonSection }))
);
const DemoVideoPlayer = lazy(() =>
    import("@/components/landing/DemoVideoPlayer").then((m) => ({ default: m.DemoVideoPlayer }))
);
const UseCasesSection = lazy(() =>
    import("@/components/landing/UseCasesSection").then((m) => ({ default: m.UseCasesSection }))
);
const IntegrationsSection = lazy(() =>
    import("@/components/landing/IntegrationsSection").then((m) => ({ default: m.IntegrationsSection }))
);
// As 4 seções narrativas com imagem (Ritmo Comercial, Segunda-feira, Eva,
// War Room) estão desativadas até as imagens definitivas subirem em
// public/images/vyzon/. Para reativar: descomentar este import + os 4
// <LazyOnVisible> com <IdentityImageSection> mais abaixo.
// const IdentityImageSection = lazy(() =>
//     import("@/components/landing/IdentityImageSection").then((m) => ({ default: m.IdentityImageSection }))
// );
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
const LigacoesSection = lazy(() =>
    import("@/components/landing/sections/LigacoesSection").then((m) => ({ default: m.LigacoesSection }))
);
const PricingSection = lazy(() =>
    import("@/components/landing/sections/PricingSection").then((m) => ({ default: m.PricingSection }))
);
const LandingFooter = lazy(() =>
    import("@/components/landing/sections/LandingFooter").then((m) => ({ default: m.LandingFooter }))
);

const preloadOnboarding = () => import("@/pages/Onboarding");

const LandingPage = () => {
    const navigate = useNavigate();
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        trackEvent(FUNNEL_EVENTS.LANDING_VIEW);
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
        <div className="min-h-screen w-full bg-white text-gray-900 selection:bg-emerald-500/30">
            {isNavigating && <NavigatingOverlay plan={selectedPlan} />}

            <LandingNav
                onCTAClick={() => scrollToDemo("nav")}
                onLoginClick={() => navigate("/auth")}
            />

            <HeroSection
                onCTAClick={() => scrollToLazyAnchor("pricing")}
                onDemoClick={() => scrollToLazyAnchor("how-it-works")}
                onScheduleDemoClick={() => scrollToDemo("hero")}
                onTrialClick={() => goToRegister("plus")}
                onLoginClick={() => navigate("/auth")}
            />

            <ImpactMetrics />

            <PainPoints />

            {/* IdentityImageSection: Ritmo Comercial — desativada até a imagem real subir */}
            {/*
            <LazyOnVisible minHeight="600px">
                <IdentityImageSection
                    eyebrow="Ritmo Comercial"
                    title={<>Seu time não precisa de mais uma ferramenta. Precisa de <span className="text-emerald-400">ritmo comercial</span>.</>}
                    body="A maioria dos CRMs registra o que aconteceu. A Vyzon ajuda o time a decidir o que fazer agora: quem priorizar, onde agir, quanto falta para a meta e quem precisa de ajuda antes do fim do mês."
                    image={{
                        src: "/images/vyzon/ritmo-comercial-vyzon.webp",
                        alt: "Conceitos da Vyzon mostrando Ritmo Comercial, Placar Vivo e Eva como IA de próximo passo.",
                    }}
                    imageSide="right"
                    accent="emerald"
                />
            </LazyOnVisible>
            */}

            <LazyOnVisible minHeight="500px" id="how-it-works">
                <FlowSection />
            </LazyOnVisible>

            <LazyOnVisible minHeight="600px">
                <ProductBentoGrid />
            </LazyOnVisible>

            <LazyOnVisible minHeight="800px">
                <ComparisonSection onCTAClick={() => goToRegister("plus")} />
            </LazyOnVisible>

            <LazyOnVisible minHeight="320px" id="agendar-demo">
                <DemoScheduleSection />
            </LazyOnVisible>

            <LazyOnVisible minHeight="500px">
                <DemoVideoPlayer />
            </LazyOnVisible>

            {/* IdentityImageSection: Segunda-feira de manhã — desativada até a imagem real subir */}
            {/*
            <LazyOnVisible minHeight="700px">
                <IdentityImageSection
                    eyebrow="Segunda-feira de manhã"
                    title={<>O que muda na <span className="text-emerald-400">segunda-feira de manhã</span></>}
                    body="Quando a rotina comercial fica clara, vendedor, gestor e empresa param de operar no escuro."
                    image={{
                        src: "/images/vyzon/segunda-feira-vyzon.webp",
                        alt: "Cards da Vyzon mostrando como a rotina comercial melhora para vendedor, gestor e empresa.",
                    }}
                    imageSide="right"
                    accent="emerald"
                    bullets={[
                        "Vendedor: quanto falta para a meta",
                        "Vendedor: quais leads priorizar",
                        "Gestor: quem está acelerando",
                        "Gestor: onde agir antes do fim do mês",
                        "Empresa: menos planilha e print",
                        "Empresa: menos decisão no feeling",
                    ]}
                />
            </LazyOnVisible>
            */}

            <LazyOnVisible minHeight="600px">
                <div id="use-cases">
                    <UseCasesSection />
                </div>
            </LazyOnVisible>

            <LazyOnVisible minHeight="700px" id="integracoes">
                <IntegrationsSection />
            </LazyOnVisible>

            <LazyOnVisible minHeight="500px">
                <LigacoesSection onSeePlansClick={() => smoothScrollToId("pricing")} />
            </LazyOnVisible>

            {/* IdentityImageSection: Eva — desativada até a imagem real subir */}
            {/*
            <LazyOnVisible minHeight="650px" id="eva">
                <IdentityImageSection
                    eyebrow="Eva — IA de Próximo Passo"
                    title={<>Eva, a <span style={{ color: "#A855F7" }}>IA que orienta</span>, não substitui</>}
                    body="Eva ajuda vendedores a priorizar ações e gestores a identificar gargalos. Ela não promete vender sozinha; ela dá mais clareza para o time vender melhor."
                    image={{
                        src: "/images/vyzon/eva-ia-vyzon.webp",
                        alt: "Eva, IA da Vyzon, orientando vendedores com próximos passos e alertas comerciais em uma interface roxa.",
                    }}
                    imageSide="right"
                    accent="violet"
                    bullets={[
                        "Próximo passo sugerido",
                        "Oportunidades paradas",
                        "Gargalos por etapa",
                        "Clareza para o gestor",
                    ]}
                    cta={{ label: "Conhecer a Eva em uma demonstração", href: "#agendar-demo" }}
                />
            </LazyOnVisible>
            */}

            <LazyOnVisible minHeight="700px">
                <EvaAISection onCTAClick={() => smoothScrollToId("pricing")} />
            </LazyOnVisible>

            {/* IdentityImageSection: War Room — desativada até a imagem real subir */}
            {/*
            <LazyOnVisible minHeight="650px">
                <IdentityImageSection
                    eyebrow="War Room Comercial"
                    title={<>O <span style={{ color: "#3B82F6" }}>War Room</span> da sua equipe comercial</>}
                    body="Veja faturamento, negócios ganhos, conversão, performance por vendedor, funil e alertas inteligentes em uma visão preparada para decisões mais rápidas."
                    extra="Para gestores que precisam sair do feeling e acompanhar o pulso da operação com mais clareza."
                    image={{
                        src: "/images/vyzon/war-room-comercial-vyzon.webp",
                        alt: "War room comercial da Vyzon com painéis de faturamento, performance por vendedor, funil e alertas inteligentes.",
                    }}
                    imageSide="left"
                    accent="blue"
                />
            </LazyOnVisible>
            */}

            <LazyOnVisible minHeight="900px" id="pricing">
                <PricingSection
                    onPlanSelect={goToRegister}
                    onScheduleDemo={scrollToDemo}
                />
            </LazyOnVisible>

            <LazyOnVisible minHeight="600px">
                <div id="faq">
                    <FAQSection />
                </div>
            </LazyOnVisible>

            <LazyOnVisible minHeight="400px">
                <FinalCTA onCTAClick={() => goToRegister("pro")} onScheduleDemoClick={() => scrollToDemo("final_cta")} />
            </LazyOnVisible>

            <LazyOnVisible minHeight="300px">
                <LandingFooter
                    onNavClick={(id) => scrollToLazyAnchor(id)}
                    onLoginClick={() => navigate("/auth")}
                    onRegisterClick={() => goToRegister("plus")}
                />
            </LazyOnVisible>
        </div>
    );
};

export default LandingPage;
