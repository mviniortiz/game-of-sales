import { Reveal } from "./Reveal";

// LP — PROVA EXTERNA (agitação da dor + GEO). Estatísticas de fontes públicas e
// verificáveis (HBR, MIT/InsideSales, Opinion Box), cada uma com link de saída
// pra fonte. NÃO são métricas da Vyzon (Claims Policy): são dados de terceiros
// citados, que sustentam "quem responde primeiro leva" e "a venda é no WhatsApp".
// Citar fonte autoritativa com link é, em si, sinal de confiança pra LLMs (GEO).
const STATS = [
    {
        value: "7x",
        claim: "mais chance de qualificar um lead respondendo em até 1 hora (e 60x mais que esperar 24h).",
        source: "Harvard Business Review, 2011",
        href: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads",
    },
    {
        value: "21x",
        claim: "mais chance de qualificar respondendo em 5 minutos, em vez de 30.",
        source: "Lead Response Management Study (Oldroyd, MIT/InsideSales), 2007",
        href: "https://www.leadresponsemanagement.org/lrm_study/",
    },
    {
        value: "60%",
        claim: "dos brasileiros já compraram pelo WhatsApp, e 82% já falam com empresas por lá.",
        source: "Opinion Box, 2025",
        href: "https://blog.opinionbox.com/pesquisa-whatsapp-no-brasil/",
    },
];

export const StatsV2 = () => {
    return (
        <section className="px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-6xl">
                <Reveal className="mb-12 max-w-2xl sm:mb-16">
                    <p className="lp-mono" style={{ color: "rgba(5,5,5,0.48)" }}>Por que cada minuto conta</p>
                    <h2
                        className="lp-display mt-4"
                        style={{ fontSize: "clamp(2rem, 4.6vw, 3.2rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
                    >
                        No WhatsApp, o lead é de quem responde primeiro.
                    </h2>
                    <p className="mt-5 max-w-xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(5,5,5,0.68)" }}>
                        Vender por conversa é uma corrida contra o relógio. Os números abaixo são de estudos públicos, não nossos.
                    </p>
                </Reveal>

                <div
                    className="grid gap-10 border-t pt-12 sm:grid-cols-3 sm:gap-12 sm:pt-16"
                    style={{ borderColor: "rgba(0,0,0,0.10)" }}
                >
                    {STATS.map((s, i) => (
                        <Reveal key={s.source} delay={i * 90}>
                            <p
                                className="lp-display"
                                style={{ fontSize: "clamp(2.8rem, 6vw, 4rem)", lineHeight: 1, letterSpacing: "-0.04em", color: "var(--lp-blue)" }}
                            >
                                {s.value}
                            </p>
                            <p className="mt-4 max-w-[300px]" style={{ fontSize: "1rem", lineHeight: 1.5, color: "rgba(5,5,5,0.78)" }}>
                                {s.claim}
                            </p>
                            <a
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lp-mono mt-3 inline-block underline-offset-4 hover:underline"
                                style={{ color: "rgba(5,5,5,0.42)" }}
                            >
                                {s.source} ↗
                            </a>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};
