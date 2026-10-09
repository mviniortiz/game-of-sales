import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion, FUNNEL_EVENTS } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { logLandingEvent } from "@/lib/landingFunnel";
import { whatsappUrl } from "@/config/contact";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot, EvaBotStage } from "@/components/eva/EvaBot";

// Home de produção desde 29/09/2026: integradores de energia solar, oferta de
// entrada = Raio-X grátis das propostas paradas no WhatsApp. SEO desta
// página fica no index.html; manter em
// sincronia (title, description, FAQPage e o <noscript>).
//
// Cadastro vai pra demo_requests com source='orcamento_teste': o trigger do SDR
// automático ignora essa origem (migration 20260914_sdr_outreach_skip_orcamento),
// senão o dono do negócio receberia o pitch de agência. O contato é manual.

const SOURCE = "orcamento_teste";
// Raio-X automático: cadastro e, depois, /raio-x no app.
const RAIO_X_AUTO = "/criar-conta?segmento=energia_solar";
const FUNNEL_PAGE = "solar";
// Markus viajando de 10 a 13/10/2026: quem pede a conversa sabe quando vai ser chamado.
// O aviso some sozinho na quarta; apagar esta função e os dois usos depois disso.
const markusFora = () => Date.now() < Date.parse("2026-10-14T08:00:00-03:00");

// Um ângulo por anúncio: a página repete a dor que a pessoa acabou de ver.
// "sumiu" é a home; os outros vivem em /raio-x/:angulo (noindex).
export type SolarAngle = "sumiu" | "parado" | "vou-pensar";

// kicker: a linha acima da headline repete a dor do anúncio; a headline vende a
// oferta (o que, em quanto tempo, de graça) e a sub explica o Raio-X.
type AngleCopy = { kicker: string; h1: string; h1Accent: string; sub: string; pain: string };

const ANGLES: Record<SolarAngle, AngleCopy> = {
    sumiu: {
        kicker: "Mandou o orçamento de energia solar e o cliente sumiu?",
        h1: "Veja em 3 minutos quanto dinheiro está parado",
        h1Accent: "nos orçamentos do seu WhatsApp.",
        sub: "O Raio-X lê o seu WhatsApp e lista cada proposta que ficou sem resposta, e há quantos dias. Você confere e vê quanto está parado.",
        pain: "Você pega a conta de luz, dimensiona o sistema e manda um orçamento caprichado. O cliente diz que vai ver em casa. E some. Você está em cima de outro telhado. O orçamento de R$ 25 mil fica perdido no meio de duzentas conversas.",
    },
    parado: {
        kicker: "Para integrador de energia solar",
        h1: "Quanto dinheiro está parado",
        h1Accent: "no seu WhatsApp agora?",
        sub: "Doze propostas de R$ 25 mil sem resposta são R$ 300 mil esperando alguém chamar de volta. O Raio-X mostra o seu número de verdade, proposta por proposta.",
        pain: "Ninguém soma as propostas que ficaram sem resposta. Cada uma parece pequena sozinha, perdida entre o grupo da obra, o fornecedor e o cliente novo. Somadas, quase sempre dão mais do que o faturamento do mês.",
    },
    "vou-pensar": {
        kicker: "O cliente disse que ia pensar e sumiu?",
        h1: "“Vou pensar”",
        h1Accent: "quase nunca é um não.",
        sub: "É uma dúvida que o cliente não falou: a parcela, a garantia, alguém em casa. O Vyzon acha esses orçamentos no seu WhatsApp e escreve a mensagem que pergunta no que ele ficou pensando.",
        pain: "O cliente diz que vai pensar e você respeita o tempo dele. Passa um dia, três, uma semana. Ninguém pergunta o que ficou faltando, e a dúvida que dava pra resolver numa mensagem vira proposta perdida pro concorrente que ligou de volta.",
    },
};

const TITLE = "Propostas de energia solar paradas no WhatsApp | Vyzon";
const DESCRIPTION =
    "Mandou o orçamento de energia solar e o cliente sumiu? O Vyzon mostra quais clientes pararam de responder no seu WhatsApp e deixa a mensagem pronta para chamar de novo. Raio-X grátis.";


const WHATSAPP_MESSAGE = "Oi, Markus. Quero o Raio-X das minhas propostas de energia solar.";

// Tokens do mockup escuro (referência: dashboard denso, Geist 14px, cantos retos).
const DARK = {
    bg: "#161616",
    line: "#232323",
    text: "#f9fbff",
    muted: "#7f7f7f",
    dim: "#676767",
    green: "#00b562",
    amber: "#fbbf24",
} as const;

type FormState = {
    name: string;
    phone: string;
    email: string;
};

// Três campos: quem chega frio do anúncio desistia diante de cinco. Empresa e
// volume de propostas o Markus pergunta na conversa.
const EMPTY_FORM: FormState = { name: "", phone: "", email: "" };

const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("55") && digits.length >= 12 ? `+${digits}` : `+55${digits}`;
};

// Uma visita por ângulo e carregamento de página (o StrictMode do dev roda o efeito duas vezes).
const viewedAngles = new Set<SolarAngle>();

const SolarLanding = ({ angle = "sumiu" }: { angle?: SolarAngle }) => {
    const copy = ANGLES[angle];
    const trackWhatsappClick = (placement: string) => {
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { page: "home_solar", cta: "whatsapp", placement });
        logLandingEvent(FUNNEL_PAGE, angle, "whatsapp_click", { placement });
    };
    const trackFormCta = (placement: string) => logLandingEvent(FUNNEL_PAGE, angle, "cta_click", { placement });

    useEffect(() => {
        document.title = TITLE;
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) meta.content = DESCRIPTION;
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        const prevRobots = robots?.content;
        if (robots && angle !== "sumiu") robots.content = "noindex, follow";
        return () => {
            if (wasDark) html.classList.add("dark");
            if (robots && prevRobots !== undefined) robots.content = prevRobots;
        };
    }, [angle]);

    useEffect(() => {
        if (window.location.hash !== "#raio-x") return;
        const id = requestAnimationFrame(() => document.getElementById("raio-x")?.scrollIntoView({ block: "start" }));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        trackEvent(FUNNEL_EVENTS.LANDING_VIEW, { page: "home_solar", angle });
        if (!viewedAngles.has(angle)) {
            viewedAngles.add(angle);
            logLandingEvent(FUNNEL_PAGE, angle, "view", { path: window.location.pathname });
        }
        const seen = new Set<string>();
        const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max <= 0) return;
            const ratio = window.scrollY / max;
            for (const [mark, event] of [[0.5, "scroll_50"], [0.9, "scroll_90"]] as const) {
                if (ratio >= mark && !seen.has(event)) {
                    seen.add(event);
                    logLandingEvent(FUNNEL_PAGE, angle, event);
                }
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [angle]);

    return (
        <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <Header onCta={() => trackFormCta("header")} />
            <main>
                <Hero copy={copy} onCta={() => trackFormCta("hero")} onWhatsapp={() => trackWhatsappClick("hero")} />
                <ProductMock />
                <HowItWorks />
                <Pain text={copy.pain} />
                <WhatYouGet />
                <NoDiaADia />
                <NotABot />
                <Faq />
                <SignupForm angle={angle} onWhatsapp={trackWhatsappClick} />
            </main>
            <Footer />
        </div>
    );
};

const Header = ({ onCta }: { onCta: () => void }) => (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Vyzon, início">
            <ThemeLogo className="h-[22px] w-auto" />
        </Link>
        <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm" style={{ color: "var(--lp-ink-55)" }}>
                Entrar
            </Link>
            <Link to={RAIO_X_AUTO} className="vz-btn vz-btn--primary vz-btn--sm" onClick={onCta}>
                <span>Fazer meu Raio-X</span>
            </Link>
        </div>
    </header>
);

const Hero = ({ copy, onCta, onWhatsapp }: { copy: AngleCopy; onCta: () => void; onWhatsapp: () => void }) => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-10 pt-10 text-center md:px-8 md:pb-14 md:pt-20">
        <p className="mx-auto max-w-[620px] text-[15px] font-semibold landing-fade-in-up-lg" style={{ color: "#050505", textWrap: "balance" }}>
            {copy.kicker}
        </p>
        <h1
            className="lp-display mx-auto mt-4 max-w-4xl landing-fade-in-up-lg landing-delay-100"
            style={{ fontSize: "clamp(2rem, 5.2vw, 4rem)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "#050505", textWrap: "balance" }}
        >
            {copy.h1}{" "}
            <span className="lp-serif" style={{ color: "#050505" }}>
                {copy.h1Accent}
            </span>
        </h1>
        <p
            className="mx-auto mt-7 max-w-[580px] landing-fade-in-up-lg landing-delay-200"
            style={{ fontSize: "clamp(1rem, 1.3vw, 1.0625rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.8)" }}
        >
            {copy.sub}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 landing-fade-in-up-lg landing-delay-300">
            <Link to={RAIO_X_AUTO} className="vz-btn vz-btn--primary" onClick={onCta}>
                <span>Ver quanto está parado</span>
                <span className="vz-btn__arrow" aria-hidden="true">
                    →
                </span>
            </Link>
            <span className="text-[15px] font-medium" style={{ color: "rgba(5,5,5,0.78)" }}>
                Grátis · 3 minutos · nada é enviado aos seus clientes
            </span>
            <span className="text-sm" style={{ color: "rgba(5,5,5,0.62)" }}>
                Prefere fazer comigo?{" "}
                <a href="#raio-x" className="underline underline-offset-4">
                    Peça o Raio-X
                </a>{" "}
                ou{" "}
                <a href={whatsappUrl(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" onClick={onWhatsapp}>
                    chame no WhatsApp
                </a>
                .
            </span>
        </div>
    </section>
);

// Mockup do produto: as propostas acompanhadas e o WhatsApp do dono recebendo
// a retomada no mesmo formato da aprovação real (buildDraftMessage em
// supabase/functions/_shared/whatsappApproval.ts). Dados de exemplo. Lista em
// vez de tabela: no celular a situação de cada proposta precisa caber na tela.
const PROPOSALS = [
    { client: "Residência Oliveira", system: "6,2 kWp", value: "R$ 24.900", sent: "há 2 dias", status: "sem resposta", tone: DARK.amber },
    { client: "Mercado Bom Preço", system: "38 kWp", value: "R$ 118.000", sent: "há 6 h", status: "aguardando", tone: DARK.muted },
    { client: "Sítio Santa Luzia", system: "15 kWp", value: "R$ 52.300", sent: "há 5 dias", status: "chamou de novo", tone: DARK.green },
    { client: "Clínica Vida", system: "11 kWp", value: "R$ 39.800", sent: "há 4 dias", status: "sem resposta", tone: DARK.amber },
    { client: "Casa Fernandes", system: "4,5 kWp", value: "R$ 18.700", sent: "há 9 dias", status: "fechou", tone: DARK.green },
];

// O total do exemplo sobe até o valor final na primeira tela: mostra o resultado
// do Raio-X antes de a pessoa rolar. Começa no valor final (prerender e
// movimento reduzido mostram o número pronto) e só anima no navegador.
const PARADO_EXEMPLO = 64700;
const CountUp = ({ to, ms = 1100, delay = 450 }: { to: number; ms?: number; delay?: number }) => {
    const [n, setN] = useState(to);
    useLayoutEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setN(0);
        let raf = 0;
        const t0 = performance.now() + delay;
        const step = (now: number) => {
            const k = Math.min(1, Math.max(0, (now - t0) / ms));
            setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
            if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [to, ms, delay]);
    return <>{n.toLocaleString("pt-BR")}</>;
};

const Dot = ({ color }: { color: string }) => (
    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: color, display: "inline-block", flexShrink: 0 }} />
);

const ProductMock = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-24" aria-label="Como a EVA aparece pra você">
        <div
            className="overflow-hidden"
            style={{
                background: DARK.bg,
                color: DARK.text,
                border: `1px solid ${DARK.line}`,
                borderRadius: 12,
                fontFamily: "Geist, Inter, system-ui, sans-serif",
                fontSize: 14,
                boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 30px 60px -30px rgba(15,23,42,0.45)",
            }}
        >
            <div className="grid md:grid-cols-[1.5fr_1fr]">
                <div className="min-w-0 md:border-r" style={{ borderColor: DARK.line }}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${DARK.line}` }}>
                        <span className="font-medium">Propostas acompanhadas</span>
                        <span className="inline-flex items-center gap-2 tabular-nums" style={{ color: DARK.amber, fontSize: 12.5 }}>
                            <Dot color={DARK.amber} />
                            R$ <CountUp to={PARADO_EXEMPLO} /> parados
                        </span>
                    </div>
                    <ul>
                        {PROPOSALS.map((p, i) => (
                            <li
                                key={p.client}
                                className={`mock-row flex items-center justify-between gap-3 px-4 py-3${p.status === "sem resposta" ? " mock-row--parada" : ""}`}
                                style={{ borderBottom: `1px solid ${DARK.line}`, animationDelay: p.status === "sem resposta" ? `${200 + i * 110}ms, 1700ms` : `${200 + i * 110}ms` }}
                            >
                                <div className="min-w-0">
                                    <p className="truncate">{p.client}</p>
                                    <p className="mt-0.5 truncate tabular-nums" style={{ color: DARK.dim, fontSize: 12.5 }}>
                                        {p.system} · enviada {p.sent}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="tabular-nums">{p.value}</p>
                                    <p className="mt-0.5 inline-flex items-center gap-1.5" style={{ color: p.tone === DARK.muted ? DARK.muted : p.tone, fontSize: 12.5 }}>
                                        <Dot color={p.tone} />
                                        {p.status}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="hidden px-4 py-4 md:block" style={{ color: DARK.dim, fontSize: 12.5 }}>
                        Cada proposta que sai do seu WhatsApp entra nessa lista sozinha. Você não cadastra nada.
                    </p>
                </div>

                {/* Duas conversas do WhatsApp do dono, uma embaixo da outra: a EVA
                    entrega o rascunho e ele responde 1; a mensagem sai do número dele
                    para o Carlos. */}
                <div className="flex flex-col border-t md:border-t-0" style={{ background: WA.bg, borderColor: DARK.line, fontFamily: "Inter, system-ui, sans-serif" }}>
                    <WaHeader avatar={<EvaBot size={32} />} name="EVA" sub="online" />
                    <div className="flex flex-col gap-1 px-3 pb-4 pt-3">
                        <WaDay>Hoje</WaDay>
                        <WaBubble time="09:02" tail>
                            <p className="font-semibold">EVA [A2] rascunho pronto</p>
                            <p className="mt-1" style={{ color: WA.meta }}>
                                Lead: Carlos · Residência Oliveira
                                <br />
                                Por que agora: 2 dias sem resposta depois da proposta
                            </p>
                            <p className="mt-1.5">
                                Oi, Carlos, tudo bem? Conseguiu olhar a proposta do sistema? Se ajudar, te mando a simulação com financiamento pra
                                comparar com a sua conta de luz de hoje.
                            </p>
                            <p className="mt-1.5" style={{ color: WA.meta }}>
                                Responda A2 1 para enviar, A2 2 para descartar, ou escreva o texto corrigido.
                            </p>
                        </WaBubble>
                        <WaBubble out time="09:03" tail>
                            A2 1
                        </WaBubble>
                        <WaBubble time="09:03" tail>
                            EVA Enviado para Carlos.
                        </WaBubble>
                    </div>

                    <WaHeader
                        avatar={
                            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: "#6a7175", color: "#fff" }}>
                                C
                            </span>
                        }
                        name="Carlos · Residência Oliveira"
                        sub="online"
                    />
                    <div className="flex flex-1 flex-col gap-1 px-3 pb-4 pt-3">
                        <WaBubble out time="09:03" tail>
                            Oi, Carlos, tudo bem? Conseguiu olhar a proposta do sistema? Se ajudar, te mando a simulação com financiamento pra comparar com a
                            sua conta de luz de hoje.
                        </WaBubble>
                        <WaBubble time="09:05" tail>
                            Oi! Consegui sim, pode mandar a simulação.
                        </WaBubble>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// Cores do WhatsApp no modo escuro, para o mockup parecer o app de verdade.
const WA = {
    bg: "#0b141a",
    bar: "#202c33",
    in: "#202c33",
    out: "#005c4b",
    text: "#e9edef",
    meta: "#8696a0",
    read: "#53bdeb",
} as const;

const WaHeader = ({ avatar, name, sub }: { avatar: ReactNode; name: string; sub: string }) => (
    <div className="flex items-center gap-3 px-3.5 py-2.5" style={{ background: WA.bar }}>
        {avatar}
        <div className="min-w-0 leading-tight">
            <p className="truncate text-[14.5px] font-medium" style={{ color: WA.text }}>
                {name}
            </p>
            <p className="text-[12px]" style={{ color: WA.meta }}>
                {sub}
            </p>
        </div>
    </div>
);

const WaDay = ({ children }: { children: ReactNode }) => (
    <span className="mx-auto mb-1 rounded-md px-2.5 py-1 text-[11.5px]" style={{ background: "#182229", color: WA.meta }}>
        {children}
    </span>
);

// Dois tiques azuis: entregue e lida.
const WaTicks = () => (
    <svg width="16" height="11" viewBox="0 0 16 11" aria-label="lida" role="img">
        <path d="M11.07.66 4.93 8.1 2.2 5.43.97 6.68l3.96 3.9 7.4-9.1zM15.1.66 8.96 8.1l-.76-.75-1.23 1.25 2.06 2.03 7.4-9.1z" fill={WA.read} />
    </svg>
);

const WaBubble = ({ out, time, tail, children }: { out?: boolean; time: string; tail?: boolean; children: ReactNode }) => (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
        <div
            className="max-w-[88%] px-2.5 pb-1.5 pt-1.5 text-[13.5px] leading-[1.4]"
            style={{
                background: out ? WA.out : WA.in,
                color: WA.text,
                borderRadius: 8,
                borderTopLeftRadius: !out && tail ? 0 : 8,
                borderTopRightRadius: out && tail ? 0 : 8,
                boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
            }}
        >
            {children}
            <span className="float-right ml-2.5 mt-1 inline-flex items-center gap-1 text-[11px] leading-none" style={{ color: out ? "rgba(233,237,239,0.6)" : WA.meta }}>
                {time}
                {out && <WaTicks />}
            </span>
        </div>
    </div>
);

const Eyebrow = ({ children }: { children: ReactNode }) => (
    <p className="text-[13px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--lp-ink-40)" }}>
        {children}
    </p>
);

const SectionTitle = ({ children, light }: { children: ReactNode; light?: boolean }) => (
    <h2 className="lp-display mt-2 text-[30px] leading-[1.08] md:text-[44px]" style={{ color: light ? "#f9fbff" : "#050505", letterSpacing: "-0.035em", textWrap: "balance" }}>
        {children}
    </h2>
);

// A mesma história dos anúncios: a proposta esfria dia a dia, e o 2º dia é onde
// a EVA entra.
const TIMELINE = [
    { day: "Terça", title: "Proposta enviada", body: "6,2 kWp, R$ 24.900, PDF caprichado." },
    { day: "Quarta", title: "“Vou ver em casa”", body: "O cliente leu inteiro e respondeu isso." },
    { day: "Quinta", title: "Silêncio", body: "Você está em cima de outro telhado.", eva: true },
    { day: "+1 semana", title: "Duzentas conversas depois", body: "A proposta desceu na lista do WhatsApp." },
    { day: "+2 semanas", title: "Outra empresa instalou", body: "Ninguém disse não. Ninguém chamou de volta." },
];

const Pain = ({ text }: { text: string }) => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-28">
        <div className="max-w-[720px]">
            <Eyebrow>O filme de toda semana</Eyebrow>
            <SectionTitle>Proposta não morre num dia. Ela esfria.</SectionTitle>
            <p className="mt-5 text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-70)" }}>
                {text}
            </p>
        </div>

        <ol className="relative mt-10 grid gap-0 md:mt-14 md:grid-cols-5 md:gap-4">
            {TIMELINE.map((t, i) => (
                <li key={t.day} className="relative flex gap-4 pb-7 md:block md:pb-0">
                    {/* trilho: vertical no celular, horizontal no computador */}
                    {i < TIMELINE.length - 1 && (
                        <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-px md:left-5 md:top-[7px] md:h-px md:w-full" style={{ background: "var(--lp-line)" }} />
                    )}
                    <span
                        aria-hidden="true"
                        className="relative z-[1] mt-1 block h-[15px] w-[15px] shrink-0 rounded-full border-2 md:mt-0"
                        style={{
                            borderColor: t.eva ? "var(--lp-eva)" : i >= 3 ? "#b42318" : "var(--lp-ink-40)",
                            background: t.eva ? "var(--lp-eva)" : "var(--lp-paper)",
                        }}
                    />
                    <div className="md:mt-4">
                        <p className="text-[13px] font-medium tabular-nums" style={{ color: "var(--lp-ink-40)" }}>
                            {t.day}
                        </p>
                        <p className="mt-1 text-[16px] font-medium leading-snug" style={{ color: i >= 3 ? "#b42318" : "var(--lp-ink)" }}>
                            {t.title}
                        </p>
                        <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-55)" }}>
                            {t.body}
                        </p>
                        {t.eva && (
                            <div className="mt-3 rounded-[10px] border p-3 text-[13.5px] leading-snug" style={{ borderColor: "rgba(109,40,217,0.25)", background: "var(--lp-white)", color: "var(--lp-ink-90)" }}>
                                <p className="flex items-center gap-2 font-medium" style={{ color: "var(--lp-eva)" }}>
                                    <EvaBot size={22} state="alert" />
                                    Com o Vyzon
                                </p>
                                <p className="mt-1">A EVA te avisa aqui, com a mensagem pronta.</p>
                            </div>
                        )}
                    </div>
                </li>
            ))}
        </ol>

        <div className="mt-10 flex flex-col gap-3 rounded-[12px] border p-5 sm:flex-row sm:items-center sm:gap-6 md:mt-14 md:p-6" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
            <p className="lp-display shrink-0 text-[44px] leading-none tabular-nums md:text-[56px]" style={{ color: "#050505", letterSpacing: "-0.04em" }}>
                62%
            </p>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                dos consumidores já desistiram de uma compra por demora na resposta.
                <span className="mt-1 block text-[13px]" style={{ color: "var(--lp-ink-40)" }}>
                    Opinion Box e Mobile Time, Panorama Mensageria 2025.
                </span>
            </p>
        </div>
    </section>
);

const REPORT_ITEMS = [
    "Quantos orçamentos você mandou nos últimos 90 dias.",
    "Quais ficaram sem resposta, e há quantos dias.",
    "Quanto eles somam.",
    "A mensagem pronta para chamar cada cliente de novo, do seu jeito.",
];

const WhatYouGet = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-28">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
                <Eyebrow>O Raio-X</Eyebrow>
                <SectionTitle>No Raio-X, as maiores propostas paradas já vêm com a mensagem pronta</SectionTitle>
                <ul className="mt-7 space-y-4">
                    {REPORT_ITEMS.map((item, i) => (
                        <li key={item} className="flex gap-3.5 text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-70)" }}>
                            <span
                                aria-hidden="true"
                                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-medium tabular-nums"
                                style={{ background: "var(--lp-ink)", color: "var(--lp-white)" }}
                            >
                                {i + 1}
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
                <p className="mt-6 text-[16px] font-medium leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink)" }}>
                    Uma integradora com mais de 2 anos faz, em média, 22 orçamentos por mês. Quantos dos seus ficaram sem resposta?
                </p>
                <p className="mt-2 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                    Fonte: Greener, Estudo Estratégico de Geração Distribuída, pesquisa de julho e agosto de 2025.
                </p>
            </div>
            <ReportPreview />
        </div>
    </section>
);

/** Miniatura do relatório de verdade (/relatorio/:token), com dados de exemplo. */
const ReportPreview = () => (
    <figure
        className="rounded-[14px] border p-5 md:p-6"
        style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 24px 48px -28px rgba(15,23,42,0.28)" }}
        aria-label="Exemplo de Raio-X"
    >
        <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--lp-ink-40)" }}>
            <span>Raio-X das propostas</span>
            <span>exemplo</span>
        </div>
        <p className="lp-display mt-3 text-[40px] leading-none tabular-nums md:text-[48px]" style={{ color: "#050505", letterSpacing: "-0.045em" }}>
            R$ 101.000
        </p>
        <p className="mt-2 text-[14px]" style={{ color: "var(--lp-ink-55)" }}>
            em propostas paradas nos últimos 30 dias
        </p>
        <ul className="mt-5 divide-y rounded-[10px] border" style={{ borderColor: "var(--lp-line)" }}>
            {[
                ["Carlos", "R$ 23.900", "Esperando você há 2 dias", true],
                ["Padaria Trigo Bom", "R$ 61.200", "Sem resposta há 8 dias", false],
                ["Ana Paula", "R$ 15.900", "Respondeu e parou", false],
            ].map(([name, value, status, urgent]) => (
                <li key={name as string} className="flex items-center justify-between gap-3 px-3.5 py-3" style={{ borderColor: "var(--lp-line)" }}>
                    <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-medium" style={{ color: "var(--lp-ink)" }}>
                            {name}
                        </p>
                        <p className="text-[12.5px]" style={{ color: urgent ? "var(--lp-blue)" : "var(--lp-ink-55)" }}>
                            {status}
                        </p>
                    </div>
                    <span className="shrink-0 text-[14.5px] font-medium tabular-nums" style={{ color: "var(--lp-ink)" }}>
                        {value}
                    </span>
                </li>
            ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-70)" }}>
            <EvaBot size={20} still />
            Mensagem pronta para chamar cada um de novo.
        </p>
    </figure>
);

const STEPS = [
    {
        title: "Crie sua conta",
        body: "Nome, WhatsApp e e-mail. Não pede cartão.",
    },
    {
        title: "Conecte o seu WhatsApp",
        body: "Como no WhatsApp Web, por um código no celular. O número continua o mesmo. Nada é enviado para cliente.",
    },
    {
        title: "Veja o que ficou parado",
        body: "Em uns 3 minutos aparece cada orçamento sem resposta, há quantos dias e quanto vale. Com a mensagem pronta para chamar de novo.",
    },
];

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-28">
        <Eyebrow>3 minutos</Eyebrow>
        <SectionTitle>Crie a conta, conecte o WhatsApp e veja o seu número</SectionTitle>
        <ol className="mt-8 grid gap-3 md:mt-10 md:grid-cols-3 md:gap-4">
            {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-[12px] border p-5 md:p-6" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                    <span
                        className="flex h-8 w-8 items-center justify-center rounded-full border text-[14px] font-medium tabular-nums"
                        style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink)" }}
                        aria-hidden="true"
                    >
                        {i + 1}
                    </span>
                    <h3 className="mt-4 text-[18px] font-medium leading-snug" style={{ color: "var(--lp-ink)" }}>
                        {s.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        {s.body}
                    </p>
                </li>
            ))}
        </ol>
    </section>
);

// O produto depois do Raio-X, só com o que existe no app: aviso da EVA no 2º dia
// (eva-quote-followup + aprovação por WhatsApp), placar /orcamentos, Inbox por
// prioridade e funil com o valor parado no topo.
const NO_DIA = [
    ["Avisa no 2º dia sem resposta", "No seu WhatsApp, com a mensagem pronta. Você responde 1 e ela sai do seu número."],
    ["Lista de orçamentos", "Todo orçamento que sai do seu WhatsApp entra na lista sozinho. Você vê quem respondeu, quem sumiu e quanto está parado."],
    ["Conversas em ordem", "Primeiro o cliente que está esperando você. Depois os orçamentos parados, do maior para o menor."],
    ["Funil de vendas", "Do primeiro contato até o fechado, com quanto vale cada etapa e quanto está parado."],
] as const;

const NoDiaADia = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-28">
        <Eyebrow>Depois do Raio-X</Eyebrow>
        <SectionTitle>Assinando, a EVA avisa no 2º dia de cada proposta nova</SectionTitle>
        <p className="mt-4 max-w-[560px] text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-70)" }}>
            O Raio-X mostra o que já ficou parado. Com o Vyzon ligado, nenhum orçamento novo fica esquecido.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-10 md:gap-4">
            {NO_DIA.map(([titulo, texto]) => (
                <li key={titulo} className="rounded-[12px] border p-5 md:p-6" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                    <h3 className="text-[18px] font-medium leading-snug" style={{ color: "var(--lp-ink)" }}>
                        {titulo}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        {texto}
                    </p>
                </li>
            ))}
        </ul>
    </section>
);

const GUARANTEES = [
    ["Nada sai sem você", "A EVA escreve. Quem decide se a mensagem vai é você, respondendo 1."],
    ["Do seu número, no seu tom", "O cliente recebe do mesmo WhatsApp de sempre, com o seu nome."],
    ["Esqueceu de responder?", "Ela não manda. Depois de 48 horas, a mensagem é descartada."],
] as const;

// O dia da EVA em cinco estados, na mesma ordem do produto real.
const EVA_STEPS = [
    { state: "idle", text: "Esperando a próxima proposta sair" },
    { state: "thinking", text: "Lendo as conversas do seu WhatsApp" },
    { state: "alert", text: "Achei: Carlos, 2 dias sem resposta" },
    { state: "talking", text: "Escrevendo a mensagem do seu jeito" },
    { state: "happy", text: "Você respondeu 1. Enviada do seu número" },
] as const;

const NotABot = () => (
    <section className="py-16 md:py-24" style={{ background: "#0d1421" }}>
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-4 sm:px-5 md:grid-cols-[1fr_360px] md:gap-14 md:px-8">
        <div className="order-2 md:order-1">
            <p className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.08em]" style={{ color: "#a78bfa" }}>
                EVA, sua companheira
            </p>
            <SectionTitle light>Nada sai para o seu cliente sem o seu ok</SectionTitle>
            <p className="mt-4 max-w-[600px] text-[16px] leading-relaxed md:text-[17px]" style={{ color: "rgba(249,251,255,0.7)" }}>
                É uma companheira que lembra das propostas por você e deixa a mensagem pronta. Quem fala com o cliente continua sendo você.
            </p>
            <ul className="mt-10 grid gap-3">
                {GUARANTEES.map(([title, body]) => (
                    <li key={title} className="rounded-[12px] border p-5 md:p-6" style={{ borderColor: "rgba(249,251,255,0.12)", background: "rgba(249,251,255,0.03)" }}>
                        <h3 className="text-[17px] font-medium" style={{ color: "#f9fbff" }}>
                            {title}
                        </h3>
                        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "rgba(249,251,255,0.65)" }}>
                            {body}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
        <div className="order-1 flex justify-center rounded-[20px] border px-6 py-10 md:order-2 md:py-14" style={{ borderColor: "rgba(249,251,255,0.1)", background: "radial-gradient(circle at 50% 35%, rgba(52,80,138,0.35), rgba(13,20,33,0) 70%)" }}>
            <EvaBotStage
                steps={[...EVA_STEPS]}
                size={128}
                renderText={(text) => (
                    <p className="min-h-[48px] max-w-[260px] text-center text-[16px] font-medium leading-snug" style={{ color: "#f9fbff" }}>
                        {text}
                    </p>
                )}
            />
        </div>
        </div>
    </section>
);

// Espelhado no FAQPage do index.html: mudou aqui, muda lá.
const FAQ = [
    {
        q: "O que é o Raio-X?",
        a: "É uma lista dos orçamentos que você mandou pelo WhatsApp nos últimos 90 dias e que ficaram sem resposta. Mostra há quantos dias cada um está parado, quanto eles somam e a mensagem pronta para chamar cada cliente de novo. É grátis.",
    },
    {
        q: "Quanto custa?",
        a: "O Raio-X é grátis. Se depois você quiser que a EVA acompanhe as suas propostas todo mês, o Vyzon custa R$ 497 por mês, com tudo liberado para até 10 pessoas da equipe. Não tem teste: o Raio-X já mostra o que o Vyzon acha no seu WhatsApp.",
    },
    {
        q: "O que vocês fazem com as minhas conversas?",
        a: "Elas ficam na sua conta do Vyzon e servem só pra montar o seu Raio-X. Você desconecta o número quando quiser.",
    },
    {
        q: "Preciso trocar de número ou de celular?",
        a: "Não. Você continua usando o mesmo WhatsApp de sempre.",
    },
    {
        q: "A EVA responde meus clientes sozinha?",
        a: "Não. Ela escreve a mensagem e manda pra você. Só sai se você responder 1.",
    },
];

const Faq = () => (
    <section className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-16 sm:px-5 md:px-8 md:pb-24 md:pt-24">
        <SectionTitle>O que todo integrador pergunta antes</SectionTitle>
        <div className="mt-6">
            {FAQ.map((f) => (
                <details key={f.q} className="group border-t py-4" style={{ borderColor: "var(--lp-line)" }}>
                    <summary
                        className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden"
                        style={{ color: "var(--lp-ink)" }}
                    >
                        {f.q}
                        <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" style={{ color: "var(--lp-ink-40)" }}>
                            +
                        </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        {f.a}
                    </p>
                </details>
            ))}
        </div>
    </section>
);

const SignupForm = ({ angle, onWhatsapp }: { angle: SolarAngle; onWhatsapp: (placement: string) => void }) => {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const started = useRef(false);
    const markStart = () => {
        if (started.current) return;
        started.current = true;
        logLandingEvent(FUNNEL_PAGE, angle, "form_start");
    };

    const phoneDigits = form.phone.replace(/\D/g, "");
    // O botão fica sempre clicável: se faltar algo, o envio diz o quê (botão
    // cinza sem explicação parecia site quebrado).
    const faltando = [
        form.name.trim().length < 2 && "seu nome",
        !(phoneDigits.length === 10 || phoneDigits.length === 11) && "WhatsApp com DDD",
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && "e-mail",
    ].filter(Boolean) as string[];
    const valid = faltando.length === 0;
    const [tentou, setTentou] = useState(false);

    const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!valid) {
            setTentou(true);
            return;
        }
        setSubmitting(true);
        setError(null);
        const phone = normalizePhone(form.phone);
        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            phone,
            biggest_pain: "Energia solar",
            source: SOURCE,
            ...getAttribution(),
        };
        const { data, error: rpcError } = await supabase.rpc("submit_demo_request", { payload });
        if (rpcError) {
            setSubmitting(false);
            setError("Não deu certo. Tenta de novo ou me chama direto no WhatsApp.");
            logLandingEvent(FUNNEL_PAGE, angle, "form_error", { code: rpcError.code ?? "rpc" });
            return;
        }
        const leadId = typeof data === "string" ? data : undefined;
        trackEvent(FUNNEL_EVENTS.ORCAMENTO_LEAD, { segment: "energia_solar", angle });
        logLandingEvent(FUNNEL_PAGE, angle, "form_submit");
        void trackDemoConversion({ email: payload.email, phone, leadId });
        try {
            (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Lead", { content_name: "raio_x_solar" });
        } catch {
            // analytics nunca derruba o cadastro
        }
        setSubmitting(false);
        setDone(true);
    };

    return (
        <section id="raio-x" className="mx-auto w-full max-w-[1120px] scroll-mt-6 px-4 pb-20 sm:px-5 md:px-8 md:pb-28">
            <div
                className="grid gap-8 rounded-[16px] border p-5 sm:p-7 md:grid-cols-[1fr_1.1fr] md:gap-12 md:p-10"
                style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 24px 48px -32px rgba(15,23,42,0.25)" }}
            >
            <div>
                <Eyebrow>Grátis, sem cartão</Eyebrow>
                <SectionTitle>Prefere fazer o Raio-X comigo?</SectionTitle>
                <p className="mt-3 text-[15px] leading-relaxed md:text-[16px]" style={{ color: "var(--lp-ink-70)" }}>
                    {markusFora()
                        ? "O Markus está fora até quarta (14/10) e te chama no WhatsApp quando voltar, pra marcar 20 minutos e montar o Raio-X com você. Se quiser na hora, sozinho, "
                        : "O Markus te chama no WhatsApp pra marcar 20 minutos e montar o Raio-X com você. Se quiser na hora, sozinho, "}
                    <Link to={RAIO_X_AUTO} className="underline underline-offset-4">faça o automático</Link>.
                </p>
                <ul className="mt-6 hidden space-y-2.5 text-[15px] md:block" style={{ color: "var(--lp-ink-70)" }}>
                    {["Sem trocar de número", "Você vê o seu número na hora", "Nenhuma mensagem sai para os seus clientes"].map((t) => (
                        <li key={t} className="flex items-center gap-2.5">
                            <Dot color="var(--lp-live)" />
                            {t}
                        </li>
                    ))}
                </ul>
            </div>
            <div>

                {done ? (
                    <div className="rounded-[10px] border p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                        <p className="text-lg font-medium" style={{ color: "var(--lp-ink)" }}>
                            Recebemos, {form.name.trim().split(" ")[0]}.
                        </p>
                        <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                            {markusFora()
                                ? "O Markus volta na quarta (14/10) e te chama no WhatsApp pra marcar os 20 minutos. Se não quiser esperar, dá pra ver o seu Raio-X agora mesmo, em 3 minutos."
                                : "O Markus te chama no WhatsApp pra marcar os 20 minutos. Se não quiser esperar, dá pra ver o seu Raio-X agora mesmo, em 3 minutos."}
                        </p>
                        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                            <Link
                                to={RAIO_X_AUTO}
                                state={{ nome: form.name.trim(), email: form.email.trim(), whats: form.phone.trim() }}
                                onClick={() => logLandingEvent(FUNNEL_PAGE, angle, "cta_click", { placement: "form_done" })}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lp-ink)] px-6 text-[15px] font-semibold text-white"
                            >
                                Ver meu Raio-X agora →
                            </Link>
                            <a
                                href={whatsappUrl(`Oi Markus, sou ${form.name.trim()}. Acabei de pedir o Raio-X no site.`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => onWhatsapp("form_done")}
                                className="inline-flex h-12 items-center justify-center rounded-full border px-6 text-[15px] font-semibold"
                                style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink)" }}
                            >
                                Falar com o Markus agora
                            </a>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} onFocus={markStart} className="grid gap-4" noValidate>
                        <Field label="Seu nome">
                            <input className={inputCls} style={inputStyle} value={form.name} onChange={set("name")} autoComplete="name" />
                        </Field>
                        <Field label="Seu WhatsApp (com DDD)">
                            <input
                                className={inputCls}
                                style={inputStyle}
                                value={form.phone}
                                onChange={set("phone")}
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="(11) 99999-9999"
                            />
                        </Field>
                        <Field label="Seu e-mail">
                            <input className={inputCls} style={inputStyle} value={form.email} onChange={set("email")} inputMode="email" autoComplete="email" />
                        </Field>
                        {tentou && !valid && (
                            <p className="text-sm" role="alert" style={{ color: "#b42318" }}>
                                Falta preencher: {faltando.join(", ")}.
                            </p>
                        )}
                        {error && (
                            <p className="text-sm" role="alert" style={{ color: "#b42318" }}>
                                {error}{" "}
                                <a href={whatsappUrl(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="underline" onClick={() => onWhatsapp("form_error")}>
                                    Abrir WhatsApp
                                </a>
                            </p>
                        )}
                        <div className="mt-2">
                            <ButtonV2 type="submit" disabled={submitting} showArrow>
                                {submitting ? "Enviando" : "Pedir meu Raio-X"}
                            </ButtonV2>
                        </div>
                    </form>
                )}
            </div>
            </div>
        </section>
    );
};

const inputCls = "h-11 w-full rounded-[10px] border px-3.5 text-[16px] outline-none focus-visible:ring-2";
const inputStyle = {
    borderColor: "var(--lp-line)",
    background: "var(--lp-white)",
    color: "var(--lp-ink)",
} as const;

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="grid gap-1.5 text-sm" style={{ color: "var(--lp-ink-70)" }}>
        <span>{label}</span>
        {children}
    </label>
);

const Footer = () => (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm md:px-8" style={{ color: "var(--lp-ink-40)" }}>
        <span>Vyzon</span>
        <nav className="flex flex-wrap gap-5">
            <Link to="/politica-privacidade">Privacidade</Link>
            <Link to="/termos-de-servico">Termos</Link>
        </nav>
    </footer>
);

export default SolarLanding;
