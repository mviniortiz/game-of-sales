import { motion } from "framer-motion";
import { ArrowRight, Rocket, Megaphone, Factory, Users, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SegmentLink =
    | { kind: "page"; label: string; href: string }
    | { kind: "demo"; label: string };

type Segment = {
    icon: LucideIcon;
    tag: string;
    title: string;
    description: string;
    bullets: string[];
    link: SegmentLink;
};

const SEGMENTS: readonly Segment[] = [
    {
        icon: Rocket,
        tag: "Infoprodutores e mentorias",
        title: "Mais previsibilidade pro time de closers",
        description:
            "Controle closers, leads, follow-ups e vendas de produtos digitais com uma rotina comercial mais previsível.",
        bullets: [
            "Pipeline por funil de aquisição",
            "Vendas do checkout caindo direto no painel",
            "Ranking diário pra manter ritmo",
        ],
        link: { kind: "page", label: "Ver aplicação", href: "/para-infoprodutores" },
    },
    {
        icon: Megaphone,
        tag: "Agências e coprodutoras",
        title: "Visão de várias operações no mesmo lugar",
        description:
            "Acompanhe múltiplas operações, campanhas e times comerciais com metas, ranking e pipeline em tempo real.",
        bullets: [
            "Metas por equipe e por operação",
            "Ranking consolidado e por canal",
            "Histórico de deal pra cada cliente",
        ],
        link: { kind: "demo", label: "Falar com a gente" },
    },
    {
        icon: Factory,
        tag: "Indústrias e distribuidoras",
        title: "Visibilidade da carteira e do representante",
        description:
            "Dê mais visibilidade para vendedores, representantes, carteiras e oportunidades B2B.",
        bullets: [
            "Carteira de cliente por vendedor",
            "Funil B2B com etapas customizáveis",
            "Follow-up programado por oportunidade",
        ],
        link: { kind: "demo", label: "Falar com a gente" },
    },
    {
        icon: Users,
        tag: "Times SDR/Closer B2B",
        title: "Prospecção, qualificação e fechamento conectados",
        description:
            "Organize prospecção, qualificação, oportunidades e performance em um fluxo simples para o time usar.",
        bullets: [
            "Pipeline SDR → Closer integrado",
            "WhatsApp, calls e tarefas no mesmo deal",
            "Painel de show rate e taxa de conversão",
        ],
        link: { kind: "page", label: "Ver aplicação", href: "/para-saas-b2b" },
    },
];

export const UseCasesSection = () => {
    return (
        <section
            className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "var(--vyz-bg)" }}
            aria-labelledby="use-cases-title"
        >
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                aria-hidden="true"
                style={{
                    background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-12 sm:mb-14"
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            background: "rgba(0,227,122,0.1)",
                            border: "1px solid rgba(0,227,122,0.2)",
                            textTransform: "uppercase",
                        }}
                    >
                        Para quem é
                    </span>
                    <h2
                        id="use-cases-title"
                        className="font-heading mb-4"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Feito para times comerciais{" "}
                        <span className="text-emerald-400">que vivem de meta</span>
                    </h2>
                    <p
                        className="max-w-2xl mx-auto text-[15px] sm:text-base"
                        style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}
                    >
                        A Vyzon nasceu pra resolver adesão ao CRM, gestão de meta e ritmo comercial. Times de 3 a 30
                        vendedores, SDRs, closers ou representantes que vivem de pipeline, follow-up e número no fim do mês.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {SEGMENTS.map((seg, i) => {
                        const Icon = seg.icon;
                        const delayClass =
                            i === 0 ? "" : i === 1 ? "landing-delay-100" : i === 2 ? "landing-delay-200" : "landing-delay-300";
                        const isPage = seg.link.kind === "page";
                        const href = isPage ? seg.link.href : "#agendar-demo";
                        const ariaLabel = isPage
                            ? `Ver aplicação para ${seg.tag}`
                            : `Agendar demonstração — ${seg.tag} (em breve)`;
                        const LinkIcon = isPage ? ArrowRight : Calendar;

                        return (
                            <a
                                key={seg.tag}
                                href={href}
                                aria-label={ariaLabel}
                                className={`group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 landing-fade-in-up ${delayClass}`}
                            >
                                <div
                                    className="h-full rounded-2xl p-6 sm:p-7 flex flex-col gap-4 transition-colors group-hover:bg-white/[0.04]"
                                    style={{
                                        background: "rgba(255,255,255,0.025)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 12px 28px rgba(0,0,0,0.2)",
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-xl"
                                            style={{
                                                background: "rgba(0,227,122,0.10)",
                                                border: "1px solid rgba(0,227,122,0.22)",
                                            }}
                                            aria-hidden="true"
                                        >
                                            <Icon className="h-5 w-5 text-emerald-400" strokeWidth={1.9} />
                                        </div>
                                        {!isPage && (
                                            <span
                                                className="px-2 py-0.5 rounded text-[10px] uppercase"
                                                style={{
                                                    background: "rgba(255,255,255,0.06)",
                                                    color: "rgba(255,255,255,0.55)",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.08em",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                }}
                                            >
                                                Em breve
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <p
                                            className="text-[11px] mb-2"
                                            style={{
                                                fontWeight: 600,
                                                letterSpacing: "0.10em",
                                                textTransform: "uppercase",
                                                color: "rgba(0,227,122,0.85)",
                                            }}
                                        >
                                            {seg.tag}
                                        </p>
                                        <h3
                                            className="font-heading text-[1.1rem] sm:text-[1.2rem]"
                                            style={{
                                                fontWeight: 700,
                                                lineHeight: 1.25,
                                                letterSpacing: "-0.02em",
                                                color: "rgba(255,255,255,0.95)",
                                            }}
                                        >
                                            {seg.title}
                                        </h3>
                                    </div>

                                    <p
                                        className="text-[14px] leading-relaxed"
                                        style={{ color: "rgba(255,255,255,0.62)" }}
                                    >
                                        {seg.description}
                                    </p>

                                    <ul className="flex flex-col gap-2 mt-1">
                                        {seg.bullets.map((b) => (
                                            <li
                                                key={b}
                                                className="flex items-start gap-2.5 text-[13.5px]"
                                                style={{ color: "rgba(255,255,255,0.55)" }}
                                            >
                                                <span
                                                    className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                    style={{ background: "rgba(0,227,122,0.7)" }}
                                                    aria-hidden="true"
                                                />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <span
                                        className="mt-auto pt-2 inline-flex items-center gap-1.5 text-[13px]"
                                        style={{
                                            fontWeight: 600,
                                            color: isPage ? "rgba(0,227,122,0.9)" : "rgba(255,255,255,0.7)",
                                        }}
                                    >
                                        {seg.link.label}
                                        <LinkIcon
                                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                    </span>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default UseCasesSection;
