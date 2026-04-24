import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { trackEvent } from "@/lib/analytics";

const C = { brand: "#00E37A", brandDim: "#00B266", blue: "#1556C0", violet: "#8B5CF6", gold: "#F5B84A", red: "#EF4444" };

const COMPARISONS = [
    {
        slug: "alternativa-hubspot",
        name: "HubSpot",
        tagline: "Cobraria em dólar",
        description: "Plataforma global robusta. Vyzon entrega o CRM de vendas em Real, com WhatsApp nativo e sem câmbio.",
        accent: C.blue,
        why: "Preço em BRL, WhatsApp integrado, Hotmart/Kiwify nativos.",
    },
    {
        slug: "alternativa-ploomes",
        name: "Ploomes",
        tagline: "B2B tradicional vs time ágil",
        description: "Ploomes é forte em CPQ, Bling/Omie e processo enterprise. Vyzon é pra time que vive no WhatsApp.",
        accent: C.gold,
        why: "WhatsApp nativo, ranking ao vivo, setup em 1 dia.",
    },
    {
        slug: "alternativa-rd-station",
        name: "RD Station",
        tagline: "Marketing Automation vs Fundo de Funil",
        description: "RD é imbatível em Inbound e email. Vyzon é CRM de fundo de funil com WhatsApp e Eva IA.",
        accent: C.violet,
        why: "Fundo de funil WhatsApp-first com IA generativa.",
    },
    {
        slug: "alternativa-kommo",
        name: "Kommo",
        tagline: "Multi-canal global vs WhatsApp profundo",
        description: "Kommo é multi-canal (Instagram/Facebook/Telegram). Vyzon é WhatsApp-first, em Real, brasileiro.",
        accent: C.red,
        why: "BRL, Hotmart/Kiwify nativo, Eva IA generativa.",
    },
    {
        slug: "alternativa-pipedrive",
        name: "Pipedrive",
        tagline: "Pipeline global vs stack BR completa",
        description: "Pipedrive é referência em pipeline visual. Vyzon agrega o que falta: WhatsApp, infoprodutor, ranking, IA.",
        accent: C.blue,
        why: "WhatsApp + Hotmart + ranking + IA, tudo nativo em Real.",
    },
    {
        slug: "alternativa-agendor",
        name: "Agendor",
        tagline: "Brasileiro clássico vs brasileiro moderno",
        description: "Agendor é CRM BR tradicional com 10+ anos. Vyzon é a geração moderna: WhatsApp-first, dark mode, IA generativa.",
        accent: C.gold,
        why: "UX moderna, WhatsApp nativo, IA generativa, infoprodutor.",
    },
];

const AlternativasHub = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Alternativas Vyzon | HubSpot, Ploomes, RD Station, Kommo, Pipedrive, Agendor";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.content =
                "Compare o Vyzon com HubSpot, Ploomes, RD Station, Kommo, Pipedrive e Agendor. Preço, features, WhatsApp, integrações e quando cada um faz mais sentido.";
        }
        trackEvent("alternativas_hub_view", {});
    }, []);

    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Alternativas Vyzon: comparativos com CRMs do mercado",
        itemListElement: COMPARISONS.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `https://vyzon.com.br/${it.slug}`,
            name: `Vyzon vs ${it.name}`,
        })),
    };

    return (
        <div className="min-h-screen bg-[#06080a] text-white relative overflow-x-hidden">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    background: `
                        radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%),
                        radial-gradient(900px 500px at 90% 10%, rgba(21,86,192,0.06), transparent 60%)
                    `,
                }}
            />

            <LandingNav onCTAClick={() => { window.location.href = "/#agendar-demo"; }} onLoginClick={() => navigate("/auth")} />

            {/* HERO */}
            <section className="pt-28 md:pt-36 pb-16 px-6 max-w-5xl mx-auto">
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{ background: "rgba(0,227,122,0.08)", border: `1px solid ${C.brand}33`, color: C.brand }}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                    Comparativos
                </div>

                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    Antes de escolher,
                    <br />
                    <span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                        compare honesto
                    </span>
                    .
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    Não toda briga de CRM é Vyzon vs mundo. Cada um desses concorrentes brilha em
                    cenário específico, e a gente mostra onde vence e onde não. Seis comparações
                    escritas com dados públicos, preços em Real e disclaimer honesto.
                </p>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-xl">
                    {[
                        { label: "Comparativos", value: "6", accent: C.brand },
                        { label: "Concorrentes BR", value: "3", accent: C.gold },
                        { label: "Concorrentes globais", value: "3", accent: C.blue },
                    ].map((m) => (
                        <div key={m.label} className="p-3 md:p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: m.accent }}>
                                {m.value}
                            </div>
                            <div className="text-[11px] md:text-xs text-white/45 mt-1 uppercase tracking-wider font-medium">
                                {m.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* GRID de comparações */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    {COMPARISONS.map((c) => (
                        <button
                            key={c.slug}
                            onClick={() => {
                                trackEvent("alternativas_hub_click", { target: c.slug });
                                navigate(`/${c.slug}`);
                            }}
                            className="group p-6 md:p-7 rounded-2xl text-left transition hover:translate-y-[-2px]"
                            style={{
                                background: `linear-gradient(135deg, ${c.accent}10, transparent 60%)`,
                                border: `1px solid ${c.accent}25`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div
                                    className="text-[11px] font-bold tracking-[0.25em] uppercase"
                                    style={{ color: c.accent }}
                                >
                                    Vyzon vs {c.name}
                                </div>
                                <ArrowRight
                                    className="h-5 w-5 transition group-hover:translate-x-1"
                                    style={{ color: c.accent }}
                                />
                            </div>

                            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-3 leading-tight">
                                {c.tagline}
                            </h2>

                            <p className="text-white/65 text-[14px] leading-relaxed mb-5">{c.description}</p>

                            <div
                                className="text-[12px] font-medium rounded-lg px-3 py-2 inline-flex items-center gap-2"
                                style={{
                                    background: `${c.accent}10`,
                                    border: `1px solid ${c.accent}25`,
                                    color: "rgba(255,255,255,0.85)",
                                }}
                            >
                                <span className="font-bold" style={{ color: c.accent }}>
                                    Vyzon ganha em:
                                </span>
                                {c.why}
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="px-6 max-w-4xl mx-auto pb-28">
                <div
                    className="relative p-8 md:p-14 rounded-3xl text-center overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${C.brand}18, ${C.blue}10)`,
                        border: `1px solid ${C.brand}30`,
                    }}
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 opacity-40"
                        style={{
                            background: `
                                radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%),
                                radial-gradient(500px 250px at 80% 80%, ${C.blue}22, transparent 60%)
                            `,
                        }}
                    />

                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">
                        Ainda em dúvida?
                        <br />
                        <span
                            style={{
                                background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`,
                                WebkitBackgroundClip: "text",
                                backgroundClip: "text",
                                color: "transparent",
                            }}
                        >
                            Testa 14 dias
                        </span>
                        .
                    </h2>
                    <p className="text-white/65 mb-8 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed">
                        Ou entra num comparativo acima e vê lado a lado. Decisão com dado é sempre
                        melhor que decisão com propaganda.
                    </p>
                    <button
                        onClick={() => { window.location.href = "/#agendar-demo"; }}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition group"
                        style={{
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                            color: "#06080a",
                            boxShadow: `0 24px 60px -20px ${C.brand}88`,
                        }}
                    >
                        Começar agora
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default AlternativasHub;
