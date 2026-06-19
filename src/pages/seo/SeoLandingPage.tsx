import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Check, Rocket, X } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { trackEvent } from "@/lib/analytics";
import type { SeoLandingConfig } from "./types";

const SCHEDULE_URL = "/#agendar-demo";
const TRIAL_URL = "/criar-conta?plan=plus";

type Props = { config: SeoLandingConfig };

export const SeoLandingPage = ({ config }: Props) => {
    const navigate = useNavigate();
    const canonical = `https://vyzon.com.br/${config.slug}`;

    useEffect(() => {
        // Title + meta description únicos por slug (atualiza em-place; o SPA
        // não recarrega o <head> entre rotas, então setamos no mount).
        document.title = config.seo.title;

        const setMeta = (selector: string, value: string) => {
            const el = document.querySelector<HTMLMetaElement>(selector);
            if (el) el.content = value;
        };
        setMeta('meta[name="description"]', config.seo.description);
        setMeta('meta[name="title"]', config.seo.title);
        setMeta('meta[property="og:title"]', config.seo.ogTitle || config.seo.title);
        setMeta('meta[property="og:description"]', config.seo.ogDescription || config.seo.description);
        setMeta('meta[property="og:url"]', canonical);
        setMeta('meta[name="twitter:title"]', config.seo.ogTitle || config.seo.title);
        setMeta('meta[name="twitter:description"]', config.seo.ogDescription || config.seo.description);
        setMeta('meta[name="twitter:url"]', canonical);

        const linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (linkCanonical) linkCanonical.href = canonical;

        trackEvent("seo_landing_view", { slug: config.slug });

        // Personas e SEO landings são dark-by-default; a homepage é light.
        const html = document.documentElement;
        html.classList.add("dark");
        return () => {
            html.classList.remove("dark");
        };
    }, [config.slug, config.seo.title, config.seo.description, config.seo.ogTitle, config.seo.ogDescription, canonical]);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                name: config.seo.title,
                description: config.seo.description,
                url: canonical,
            },
            {
                "@type": "FAQPage",
                mainEntity: config.faq.items.map((it) => ({
                    "@type": "Question",
                    name: it.q,
                    acceptedAnswer: { "@type": "Answer", text: it.a },
                })),
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Vyzon", item: "https://vyzon.com.br/" },
                    { "@type": "ListItem", position: 2, name: config.seo.title, item: canonical },
                ],
            },
        ],
    };

    const goDemo = (location: string) => {
        trackEvent("seo_landing_cta_click", { slug: config.slug, target: "demo", location });
        window.location.href = SCHEDULE_URL;
    };
    const goTrial = (location: string) => {
        trackEvent("seo_landing_cta_click", { slug: config.slug, target: "trial", location });
        navigate(TRIAL_URL);
    };

    return (
        <div
            className="min-h-screen w-full relative overflow-x-hidden"
            style={{ background: "var(--vyz-bg)", color: "var(--vyz-text-primary)" }}
        >
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

            {/* Background atmospheric — alinhado às personas */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
                <div
                    className="absolute inset-x-0 top-0 h-[800px]"
                    style={{
                        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "80px 80px",
                    }}
                />
            </div>

            <LandingNav
                onCTAClick={() => goDemo("nav")}
                onLoginClick={() => navigate("/auth")}
            />

            {/* ────────── HERO ────────── */}
            <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
                <div className="flex justify-center">
                    <span
                        className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 rounded-full px-3.5 py-1.5"
                        style={{
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            background: "rgba(0,227,122,0.10)",
                            border: "1px solid rgba(0,227,122,0.22)",
                            textTransform: "uppercase",
                        }}
                    >
                        {config.hero.badge}
                    </span>
                </div>
                <h1
                    className="font-heading mx-auto mt-5"
                    style={{
                        fontSize: "clamp(2rem, 6vw, 3.75rem)",
                        lineHeight: 1.08,
                        letterSpacing: "-0.035em",
                        maxWidth: "880px",
                        color: "rgba(255,255,255,0.96)",
                    }}
                >
                    {config.hero.h1}
                </h1>
                <p
                    className="mt-6 mx-auto"
                    style={{
                        fontSize: "clamp(1rem, 2vw, 1.18rem)",
                        lineHeight: 1.65,
                        maxWidth: "720px",
                        color: "rgba(255,255,255,0.7)",
                    }}
                >
                    {config.hero.subheadline}
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-9 max-w-md mx-auto sm:max-w-none">
                    <a
                        href={SCHEDULE_URL}
                        onClick={(e) => { e.preventDefault(); goDemo("hero"); }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold transition"
                        style={{
                            background: "linear-gradient(135deg, #00E37A, #00B266)",
                            color: "#06080a",
                            boxShadow: "0 16px 40px -12px rgba(0,227,122,0.55)",
                        }}
                    >
                        <Calendar className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        Agendar demonstração
                        <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                    </a>
                    <a
                        href={TRIAL_URL}
                        onClick={(e) => { e.preventDefault(); goTrial("hero"); }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-medium transition"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.92)",
                        }}
                    >
                        <Rocket className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        Testar grátis por 14 dias
                    </a>
                </div>
                <p className="mt-5 text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {config.hero.microcopy}
                </p>
            </section>

            {/* ────────── PAINS ────────── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl mx-auto" aria-labelledby={`${config.slug}-pains`}>
                <div className="text-center mb-10 sm:mb-14">
                    {config.pains.eyebrow && (
                        <p
                            className="text-xs uppercase mb-3 tracking-widest"
                            style={{ fontWeight: 500, color: "rgba(255,255,255,0.4)" }}
                        >
                            {config.pains.eyebrow}
                        </p>
                    )}
                    <h2
                        id={`${config.slug}-pains`}
                        className="font-heading"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                            lineHeight: 1.15,
                            letterSpacing: "-0.035em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        {config.pains.title}
                    </h2>
                    {config.pains.intro && (
                        <p
                            className="mt-4 max-w-2xl mx-auto text-[15px]"
                            style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}
                        >
                            {config.pains.intro}
                        </p>
                    )}
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {config.pains.items.map((item, i) => (
                        <li
                            key={i}
                            className="rounded-xl p-5 flex items-start gap-3"
                            style={{
                                background: "rgba(255,255,255,0.025)",
                                border: "1px solid rgba(239,68,68,0.18)",
                            }}
                        >
                            <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5"
                                style={{ background: "rgba(239,68,68,0.12)" }}
                                aria-hidden="true"
                            >
                                <X className="h-4 w-4 text-red-400" strokeWidth={2.5} />
                            </span>
                            <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
                                {item}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ────────── MECHANISM ────────── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl mx-auto" aria-labelledby={`${config.slug}-mechanism`}>
                <div className="text-center mb-10 sm:mb-14">
                    {config.mechanism.eyebrow && (
                        <p
                            className="text-xs uppercase mb-3 tracking-widest text-emerald-400"
                            style={{ fontWeight: 600, letterSpacing: "0.10em" }}
                        >
                            {config.mechanism.eyebrow}
                        </p>
                    )}
                    <h2
                        id={`${config.slug}-mechanism`}
                        className="font-heading"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                            lineHeight: 1.15,
                            letterSpacing: "-0.035em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        {config.mechanism.title}
                    </h2>
                    {config.mechanism.intro && (
                        <p
                            className="mt-4 max-w-2xl mx-auto text-[15px]"
                            style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}
                        >
                            {config.mechanism.intro}
                        </p>
                    )}
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {config.mechanism.blocks.map((block, i) => (
                        <li
                            key={i}
                            className="rounded-2xl p-6"
                            style={{
                                background: "rgba(255,255,255,0.025)",
                                border: "1px solid rgba(255,255,255,0.07)",
                            }}
                        >
                            <h3
                                className="font-heading text-[1.05rem] sm:text-[1.15rem]"
                                style={{
                                    fontWeight: 700,
                                    lineHeight: 1.25,
                                    letterSpacing: "-0.02em",
                                    color: "rgba(255,255,255,0.95)",
                                }}
                            >
                                {block.title}
                            </h3>
                            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                                {block.body}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ────────── COMPARISON ────────── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl mx-auto" aria-labelledby={`${config.slug}-compare`}>
                <h2
                    id={`${config.slug}-compare`}
                    className="font-heading text-center mb-10 sm:mb-12"
                    style={{
                        fontWeight: 700,
                        fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.035em",
                        color: "rgba(255,255,255,0.95)",
                    }}
                >
                    {config.comparison.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <div
                        className="rounded-2xl p-6 sm:p-7"
                        style={{
                            background: "linear-gradient(180deg, rgba(239,68,68,0.06), rgba(239,68,68,0.015))",
                            border: "1px solid rgba(239,68,68,0.22)",
                        }}
                    >
                        <p
                            className="text-[11px] mb-4 tracking-[0.2em] uppercase"
                            style={{ fontWeight: 700, color: "rgba(239,68,68,0.85)" }}
                        >
                            Sem Vyzon
                        </p>
                        <ul className="space-y-3">
                            {config.comparison.without.map((t) => (
                                <li key={t} className="flex items-start gap-3 text-[14px]" style={{ color: "rgba(255,255,255,0.78)" }}>
                                    <span
                                        className="flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                                        style={{ background: "rgba(239,68,68,0.15)" }}
                                        aria-hidden="true"
                                    >
                                        <X className="h-3 w-3 text-red-400" strokeWidth={3} />
                                    </span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div
                        className="rounded-2xl p-6 sm:p-7"
                        style={{
                            background: "linear-gradient(180deg, rgba(0,227,122,0.08), rgba(0,227,122,0.02))",
                            border: "1px solid rgba(0,227,122,0.30)",
                        }}
                    >
                        <p
                            className="text-[11px] mb-4 tracking-[0.2em] uppercase text-emerald-400"
                            style={{ fontWeight: 700 }}
                        >
                            Com Vyzon
                        </p>
                        <ul className="space-y-3">
                            {config.comparison.withVyzon.map((t) => (
                                <li key={t} className="flex items-start gap-3 text-[14px]" style={{ color: "rgba(255,255,255,0.92)", fontWeight: 500 }}>
                                    <span
                                        className="flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                                        style={{ background: "rgba(0,227,122,0.18)" }}
                                        aria-hidden="true"
                                    >
                                        <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />
                                    </span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ────────── INTEGRATIONS (genérico, com link pra seção real) ────────── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl mx-auto">
                <div
                    className="rounded-2xl p-6 sm:p-8 text-center"
                    style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.4rem, 3.5vw, 2rem)",
                            lineHeight: 1.2,
                            letterSpacing: "-0.03em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        {config.integrations.title}
                    </h2>
                    <p
                        className="mt-3 max-w-2xl mx-auto text-[15px]"
                        style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}
                    >
                        {config.integrations.body}
                    </p>
                    <p className="mt-5 text-[13px]">
                        <a
                            href="/#integracoes"
                            className="text-emerald-400 underline-offset-4 hover:underline inline-flex items-center gap-1.5"
                            style={{ fontWeight: 600 }}
                        >
                            Ver lista completa de integrações <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                        </a>
                    </p>
                </div>
            </section>

            {/* ────────── FAQ ────────── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-20 max-w-3xl mx-auto" aria-labelledby={`${config.slug}-faq`}>
                <h2
                    id={`${config.slug}-faq`}
                    className="font-heading text-center mb-8 sm:mb-10"
                    style={{
                        fontWeight: 700,
                        fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.035em",
                        color: "rgba(255,255,255,0.95)",
                    }}
                >
                    {config.faq.title}
                </h2>
                <div className="space-y-2.5">
                    {config.faq.items.map((item, i) => (
                        <details
                            key={i}
                            className="group rounded-xl p-5"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.07)",
                            }}
                        >
                            <summary className="cursor-pointer flex items-center justify-between gap-4 list-none">
                                <span className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
                                    {item.q}
                                </span>
                                <span
                                    className="text-2xl leading-none transition-transform group-open:rotate-45 flex-shrink-0 text-emerald-400"
                                    aria-hidden="true"
                                >
                                    +
                                </span>
                            </summary>
                            <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* ────────── RELATED (links cruzados) ────────── */}
            {config.related.length > 0 && (
                <section className="relative px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl mx-auto">
                    <p
                        className="text-xs uppercase mb-4 tracking-widest text-center"
                        style={{ fontWeight: 600, letterSpacing: "0.10em", color: "rgba(255,255,255,0.45)" }}
                    >
                        Continue lendo
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {config.related.map((r) => (
                            <li key={r.href}>
                                <a
                                    href={r.href}
                                    className="group block rounded-xl p-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                                    style={{
                                        background: "rgba(255,255,255,0.025)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <p className="text-[15px]" style={{ fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>
                                        {r.label}
                                    </p>
                                    <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                                        {r.description}
                                    </p>
                                    <span
                                        className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-emerald-400"
                                        style={{ fontWeight: 600 }}
                                    >
                                        Ler mais
                                        <ArrowRight
                                            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                                            strokeWidth={2.25}
                                            aria-hidden="true"
                                        />
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ────────── FINAL CTA ────────── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pb-24 max-w-4xl mx-auto">
                <div
                    className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center"
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.3), 0 40px 80px -16px rgba(0,0,0,0.4)",
                    }}
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                        style={{
                            background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(0,227,122,0.12) 0%, transparent 70%)",
                        }}
                    />
                    <h2
                        className="font-heading relative"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.4rem, 4vw, 2.5rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.96)",
                        }}
                    >
                        {config.finalCta.title}
                    </h2>
                    <p
                        className="mt-4 mx-auto max-w-2xl text-[15px] sm:text-base relative"
                        style={{ color: "rgba(255,255,255,0.58)", lineHeight: 1.65 }}
                    >
                        {config.finalCta.body}
                    </p>
                    <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-8 max-w-md mx-auto sm:max-w-none">
                        <a
                            href={SCHEDULE_URL}
                            onClick={(e) => { e.preventDefault(); goDemo("final_cta"); }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold transition"
                            style={{
                                background: "linear-gradient(135deg, #00E37A, #00B266)",
                                color: "#06080a",
                                boxShadow: "0 16px 40px -12px rgba(0,227,122,0.55)",
                            }}
                        >
                            <Calendar className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                            Agendar demonstração
                            <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        </a>
                        <a
                            href={TRIAL_URL}
                            onClick={(e) => { e.preventDefault(); goTrial("final_cta"); }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-medium transition"
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "rgba(255,255,255,0.92)",
                            }}
                        >
                            <Rocket className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                            Começar teste grátis
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SeoLandingPage;
