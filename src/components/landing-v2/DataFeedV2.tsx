import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import whatsappLogo from "@/assets/integrations/whatsapp.svg";
import metaLogo from "@/assets/integrations/meta.svg";
import typeformLogo from "@/assets/integrations/typeform.svg";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import zapierLogo from "@/assets/integrations/zapier.svg";
import { Reveal } from "./Reveal";

// LP — DATA FEEDING IN. Canais reais (logos da strip de integrações) alimentando a
// fila de leituras da EVA. Técnica do reverseui adaptada: paths pontilhados
// (dasharray 0.1/3) + UM linearGradient animado (pulso viaja de cima pra baixo) +
// máscara que apaga os dots longe do painel. Dados FICTÍCIOS, sem mensagem literal
// do lead — só a leitura da EVA (privacidade).
const FEED = [
    { name: "Marina Costa", channel: "WhatsApp", read: "Pronta pra proposta", time: "agora" },
    { name: "Rafael Duarte", channel: "Formulário", read: "Pediu prazo. Follow-up amanhã", time: "2 min" },
    { name: "Beatriz Nunes", channel: "Instagram", read: "Orçamento confirmado", time: "9 min" },
    { name: "Carlos Menezes", channel: "WhatsApp", read: "Esfriou há 3 dias. Retomar", time: "14 min" },
    { name: "Ana Ribeiro", channel: "Indicação", read: "Decisora entrou na conversa", time: "21 min" },
    { name: "Pedro Antunes", channel: "WhatsApp", read: "Comparando com outra agência", time: "33 min" },
];

// Paths do reverseui transpostos pra vertical (x↔y): nascem no topo (x espalhado)
// e convergem pro centro na base (entrada do painel). viewBox 288×202.
const PATHS = [
    "M100 0V55.022C100 61.8914 101.769 68.6451 105.137 74.6324L130.863 120.368C134.231 126.355 136 133.109 136 139.978V201.5",
    "M60 0V48.2171C60 59.2463 64.5539 69.7861 72.5854 77.3451L115.415 117.655C123.446 125.214 128 135.754 128 146.783V201.5",
    "M188 0V55.022C188 61.8914 186.231 68.6451 182.863 74.6324L157.137 120.368C153.769 126.355 152 133.109 152 139.978V201.5",
    "M228 0V48.2171C228 59.2463 223.446 69.7861 215.415 77.3451L172.585 117.655C164.554 125.214 160 135.754 160 146.783V201.5",
    "M287 0V41.7852C287 56.4929 278.929 70.0142 265.983 76.994L189.017 118.49C176.071 125.47 168 138.991 168 153.699V202",
    "M144 0L145 201",
    "M1 0V41.5946C1 56.3171 9.08744 69.8495 22.0537 76.823L98.9463 118.177C111.913 125.15 120 138.683 120 153.405V201.5",
];

// Logo em cada nascente de path, ordenada pelo x do topo (1, 60, 100, 144, 188, 228, 287).
const SOURCES: { x: number; name: string; logo: string }[] = [
    { x: 1, name: "Instagram / Meta", logo: metaLogo },
    { x: 60, name: "Hotmart", logo: hotmartLogo },
    { x: 100, name: "Typeform", logo: typeformLogo },
    { x: 144, name: "WhatsApp", logo: whatsappLogo },
    { x: 188, name: "RD Station", logo: rdstationLogo },
    { x: 228, name: "Kiwify", logo: kiwifyLogo },
    { x: 287, name: "Zapier", logo: zapierLogo },
];

const CYCLE = 14; // s — fila inteira entra, segura e recomeça

export const DataFeedV2 = () => {
    const reduceMotion = useReducedMotion();

    return (
        <section className="px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-6xl">
                <Reveal className="mb-12 max-w-2xl sm:mb-16">
                    <p className="lp-mono" style={{ color: "rgba(5,5,5,0.48)" }}>De onde o lead vem</p>
                    <h2
                        className="lp-display mt-4"
                        style={{ fontSize: "clamp(2rem, 4.6vw, 3.2rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
                    >
                        Tudo que entra, a EVA já leu.
                    </h2>
                    <p className="mt-5 max-w-xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(5,5,5,0.68)" }}>
                        WhatsApp, Instagram, formulário do site, indicação. Cada conversa que chega vira uma
                        leitura: quem está pronto, quem esfriou, qual o próximo passo. Nada depende de alguém
                        lembrar de anotar.
                    </p>
                </Reveal>

                <Reveal delay={120} className="flex flex-col items-center">
                    {/* Nascentes: chips com as logos reais dos canais */}
                    <div className="relative w-full max-w-[460px]">
                        <div className="relative" style={{ height: 44 }}>
                            {SOURCES.map((s) => (
                                <div
                                    key={s.name}
                                    className="absolute top-0 flex h-10 w-10 -translate-x-1/2 items-center justify-center"
                                    style={{
                                        left: `${(s.x / 288) * 100}%`,
                                        backgroundColor: "#fff",
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        borderRadius: 10,
                                        boxShadow: "0 1px 2px rgba(13,20,33,0.05)",
                                    }}
                                >
                                    <img src={s.logo} alt={s.name} className="h-5 w-5 object-contain" loading="lazy" />
                                </div>
                            ))}
                        </div>

                        {/* Fan de paths pontilhados com pulso descendo até o painel */}
                        <svg viewBox="0 0 288 202" fill="none" aria-hidden className="mt-1 h-auto w-full">
                            {PATHS.map((d) => (
                                <Fragment key={d}>
                                    <path
                                        d={d}
                                        stroke="#0d1421"
                                        mask="url(#lp-feed-mask)"
                                        strokeLinecap="round"
                                        strokeOpacity="0.22"
                                        strokeWidth="2"
                                        strokeDasharray="0.1 3"
                                    />
                                    {!reduceMotion && (
                                        <path
                                            d={d}
                                            stroke="url(#lp-feed-pulse)"
                                            mask="url(#lp-feed-mask)"
                                            strokeLinecap="round"
                                            strokeWidth="2"
                                            strokeDasharray="0.1 3"
                                        />
                                    )}
                                </Fragment>
                            ))}
                            <defs>
                                {/* Dots somem perto das nascentes, firmes perto do painel */}
                                <linearGradient id="lp-feed-mask-grad" x1="0" y1="202" x2="0" y2="16" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="white" />
                                    <stop offset="1" stopColor="white" stopOpacity="0" />
                                </linearGradient>
                                <mask id="lp-feed-mask" maskUnits="userSpaceOnUse">
                                    <rect width="288" height="202" fill="url(#lp-feed-mask-grad)" />
                                </mask>
                                {/* Um único gradiente compartilhado: pulso sincronizado em todos os paths */}
                                <motion.linearGradient
                                    id="lp-feed-pulse"
                                    x1="0"
                                    x2="0"
                                    y1="-50%"
                                    y2="50%"
                                    gradientUnits="userSpaceOnUse"
                                    animate={{ y1: ["-50%", "100%"], y2: ["50%", "150%"] }}
                                    transition={{ duration: 1.6, ease: "linear", repeat: Infinity, repeatDelay: 0.4 }}
                                >
                                    <stop offset="0.35" stopColor="var(--lp-blue)" stopOpacity="0" />
                                    <stop offset="0.45" stopColor="var(--lp-blue)" />
                                    <stop offset="0.55" stopColor="var(--lp-blue)" />
                                    <stop offset="0.65" stopColor="var(--lp-blue)" stopOpacity="0" />
                                </motion.linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* Painel: fila de leituras da EVA entrando linha a linha, em loop */}
                    <div
                        className="w-full max-w-[460px] overflow-hidden"
                        style={{
                            backgroundColor: "#fff",
                            border: "1px solid rgba(0,0,0,0.08)",
                            borderRadius: "var(--lp-radius)",
                            boxShadow: "0 1px 3px rgba(13,20,33,0.06)",
                        }}
                    >
                        <div className="flex gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: "rgba(13,20,33,0.12)" }} />
                            ))}
                        </div>
                        {FEED.map((row, i) => {
                            const t0 = (i * 1.6) / CYCLE; // entrada escalonada dentro do ciclo
                            return (
                                <motion.div
                                    key={row.name}
                                    className="flex items-baseline gap-3 px-4 py-3"
                                    style={{ borderBottom: i < FEED.length - 1 ? "1px solid rgba(0,0,0,0.05)" : undefined }}
                                    animate={
                                        reduceMotion
                                            ? undefined
                                            : {
                                                  opacity: [0, 0, 1, 1, 0],
                                                  y: [14, 14, 0, 0, 0],
                                              }
                                    }
                                    transition={{
                                        duration: CYCLE,
                                        times: [0, t0, t0 + 0.035, 0.92, 1],
                                        ease: "easeOut",
                                        repeat: Infinity,
                                    }}
                                >
                                    <span className="shrink-0 font-medium" style={{ fontSize: "0.875rem", color: "#050505" }}>
                                        {row.name}
                                    </span>
                                    <span className="lp-mono hidden shrink-0 sm:inline" style={{ color: "rgba(5,5,5,0.38)" }}>
                                        {row.channel}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate" style={{ fontSize: "0.875rem", color: "rgba(5,5,5,0.62)" }}>
                                        {row.read}
                                    </span>
                                    <span className="lp-mono shrink-0" style={{ color: "rgba(5,5,5,0.35)" }}>
                                        {row.time}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
