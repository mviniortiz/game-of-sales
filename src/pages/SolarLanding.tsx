import { lazy, Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { logLandingEvent } from "@/lib/landingFunnel";
import { CONTACT, whatsappUrl } from "@/config/contact";
import { PLANS, formatPrice } from "@/config/plans";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";

// Home de produção: integradores de energia solar. Uma ação só na página
// inteira, criar a conta e ver as propostas paradas (o Raio-X grátis), com o
// mesmo texto em todo botão.
// Por quê (04/11/2026, landing_events dos últimos 30 dias): 665 sessões viram a
// página, só 69 passaram do topo, 17 clicaram no botão do topo e 13 criaram a
// conta. O topo decide quase tudo; o resto é lido por 1 em cada 10. Por isso a
// página ficou curta: topo, como funciona em 3 passos, objeções, preço, FAQ e
// o fim com o mesmo botão. A calculadora saiu: o número grande seguido de "nem
// tudo isso volta" fazia a pessoa fazer conta e desconfiar.
// Nomes: Vyzon é o produto, a Lume é quem faz o trabalho (o aviso real no
// WhatsApp começa com "Lume", EVA_PREFIX em _shared/whatsappApproval.ts).
// SEO desta página fica no index.html; manter em sincronia (title, description,
// FAQPage e o <noscript>).

const AvisoDemo = lazy(() => import("@/components/landing/AvisoDemo"));

// Cadastro e, depois, /raio-x no app (conectar o WhatsApp e ler 90 dias).
const RAIO_X_AUTO = "/criar-conta?segmento=energia_solar";
const FUNNEL_PAGE = "solar";
const PRECO = formatPrice(PLANS.pro.monthlyPrice);

// O mesmo botão em toda a página. A linha de baixo diz o que acontece depois,
// conferida no fluxo real: SignupV2 (grátis, sem cartão) e RaioXAuto (conecta
// pelo QR ou código, lê 90 dias, "leva uns 3 minutos").
const CTA = "Ver minhas propostas paradas";
const CTA_DEPOIS = "Grátis e sem cartão. Você cria a conta, conecta o WhatsApp e em uns 3 minutos vê as propostas paradas dos últimos 90 dias.";

// Um ângulo por anúncio: a página repete a dor que a pessoa acabou de ver.
// "sumiu" é a home; os outros vivem em /raio-x/:angulo (noindex).
export type SolarAngle = "sumiu" | "parado" | "vou-pensar";

// kicker: a linha acima da headline repete a dor do anúncio; a headline é a
// promessa concreta, com prazo, no molde das páginas que anunciam há semanas
// para integrador (Heliux: "Protocolamos seu projeto em até 24h").
type AngleCopy = { kicker: string; h1: string; h1Accent: string; sub: string };

const ANGLES: Record<SolarAngle, AngleCopy> = {
    sumiu: {
        kicker: "Mandou o orçamento de energia solar e o cliente sumiu?",
        h1: "No 2º dia sem resposta, a mensagem pra chamar de volta",
        h1Accent: "chega pronta no seu WhatsApp.",
        sub: "A Lume, assistente do Vyzon, acompanha cada orçamento que você manda. Você responde 1 e a mensagem sai do seu número, com o seu nome. Nada vai pro cliente sem você aprovar.",
    },
    parado: {
        kicker: "Para integrador de energia solar",
        h1: "Quanto dinheiro está parado",
        h1Accent: "no seu WhatsApp agora?",
        sub: "Doze propostas de R$ 25 mil sem resposta são R$ 300 mil esperando alguém chamar de volta. O Vyzon mostra o seu número de verdade, proposta por proposta.",
    },
    "vou-pensar": {
        kicker: "O cliente disse que ia pensar e sumiu?",
        h1: "“Vou pensar”",
        h1Accent: "quase nunca é um não.",
        sub: "É uma dúvida que o cliente não falou: a parcela, a garantia, alguém em casa. O Vyzon acha esses orçamentos no seu WhatsApp e escreve a mensagem que pergunta no que ele ficou pensando.",
    },
};

const TITLE = "Propostas de energia solar paradas no WhatsApp | Vyzon";
const DESCRIPTION =
    "Mandou o orçamento de energia solar e o cliente sumiu? No 2º dia sem resposta, a mensagem pra chamar de volta chega pronta no seu WhatsApp. Você responde 1 e ela sai do seu número.";

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
        // Uma vez por seção: mostra em que ponto da página quem chega desiste.
        const vistas = new Set<Element>();
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting || vistas.has(e.target)) continue;
                vistas.add(e.target);
                const nome = e.target.getAttribute("aria-label") || e.target.id || e.target.querySelector("h2")?.textContent || "";
                logLandingEvent(FUNNEL_PAGE, angle, "section_view", { secao: nome.trim().slice(0, 60) });
            }
        }, { threshold: 0.35 });
        document.querySelectorAll("main > section").forEach((s) => io.observe(s));
        return () => {
            window.removeEventListener("scroll", onScroll);
            io.disconnect();
        };
    }, [angle]);

    return (
        <div className="lp-v2 lp-solar min-h-screen">
            <Header onCta={() => trackFormCta("header")} />
            <main>
                <Hero copy={copy} onCta={() => trackFormCta("hero")} />
                <Numero />
                <HowItWorks />
                <Objections />
                <Offer onCta={() => trackFormCta("oferta")} />
                <Faq />
                <Final onCta={() => trackFormCta("final")} />
            </main>
            <Footer onSuporte={() => trackWhatsappClick("footer")} />
        </div>
    );
};

// Sistema "Lume em campo" (bloco LP.9 do index.css; referência em
// https://claude.ai/artifact/L2qfp4yTM3RBvSL3yN5mjo): a Lume é a estrela, sobre
// creme e faixas chapadas de sol e noite, com Geist, a fonte do app, em tudo e a
// conversa de WhatsApp como objeto gráfico.

// O botão do cabeçalho tem o mesmo texto dos outros. No celular ele sai (o do
// topo já aparece na primeira tela) e fica o "Entrar", de quem já é cliente.
const Header = ({ onCta }: { onCta: () => void }) => (
    <div className="vs-topo">
        <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-4 py-5 sm:px-5 md:px-8">
            <Link to="/" aria-label="Vyzon, início" className="shrink-0">
                <ThemeLogo className="h-[22px] w-auto" />
            </Link>
            <div className="flex items-center gap-4">
                <Link to="/blog" className="vs-topo__link text-sm font-medium">
                    Blog
                </Link>
                <Link to="/auth" className="vs-topo__link text-sm font-medium">
                    Entrar
                </Link>
                <Link to={RAIO_X_AUTO} className="vs-btn !hidden sm:!inline-flex" style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }} onClick={onCta}>
                    {CTA}
                </Link>
            </div>
        </header>
    </div>
);

// A Lume sentada na borda de cima de um cartão. O pai precisa ser relative.
const EvaSentada = ({ size, state }: { size: number; state?: EvaBotState }) => (
    <span className="vs-sentada" style={{ ["--s-eva" as string]: `${size}px` }}>
        <EvaBot size={size} state={state} />
    </span>
);

// Texto à esquerda e, à direita, o aviso que chega no WhatsApp do dono: o
// produto inteiro numa olhada. Um botão e uma linha dizendo o que vem depois.
const Hero = ({ copy, onCta }: { copy: AngleCopy; onCta: () => void }) => (
    <section className="vs-topo overflow-hidden" aria-label="Topo">
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-4 pt-4 sm:px-5 md:grid-cols-[1.12fr_0.88fr] md:gap-12 md:px-8 md:pt-10">
            <div className="md:pb-24">
                <p className="text-[16px] font-bold landing-fade-in-up-lg">{copy.kicker}</p>
                {/* Letra forte em vez da serifa editorial: as páginas que convertem com
                    integrador (Heliux, Azume, InfinitePay) falam alto e direto. */}
                <h1
                    className="vs-display mt-4 max-w-[530px] landing-fade-in-up-lg landing-delay-100"
                    style={{ fontSize: "clamp(2.25rem, 3.75vw, 3.2rem)", lineHeight: 1.04, textWrap: "pretty" }}
                >
                    {copy.h1} <span className="vs-marca vs-marca--draw">{copy.h1Accent}</span>
                </h1>
                <p
                    className="mt-5 max-w-[540px] landing-fade-in-up-lg landing-delay-200 md:mt-6"
                    style={{ fontSize: "clamp(1.0625rem, 1.4vw, 1.1875rem)", lineHeight: 1.55, color: "var(--lp-ink-muted)" }}
                >
                    {copy.sub}
                </p>
                <div className="mt-7 flex flex-col items-stretch gap-3 landing-fade-in-up-lg landing-delay-300 sm:items-start md:mt-8">
                    <Link to={RAIO_X_AUTO} className="vs-btn" onClick={onCta}>
                        {CTA}
                    </Link>
                    <p className="max-w-[440px] text-[14px] leading-snug" style={{ color: "var(--lp-ink-muted)" }}>
                        {CTA_DEPOIS}
                    </p>
                </div>
            </div>
            <AvisoNoWhatsApp />
        </div>
    </section>
);

// A demo do topo vem em pedaço separado: o título, que é o LCP, não espera por ela.
// A caixa reserva o espaço do palco, sem CLS.
const AvisoNoWhatsApp = () => (
    <figure className="vs-palco mx-auto w-full max-w-[420px] self-end landing-fade-in-up-lg landing-delay-200" aria-label="Exemplo: o aviso da Lume que chega no seu WhatsApp no 2º dia">
        <div className="relative aspect-[420/640] md:aspect-[420/600]">
            <Suspense fallback={null}>
                <AvisoDemo />
            </Suspense>
        </div>
    </figure>
);

// Um número de mercado com fonte, logo abaixo do topo, no lugar de depoimento:
// ainda não há cliente pagante para citar, e número inventado é proibido.
const Numero = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pt-12 sm:px-5 md:px-8 md:pt-16" aria-label="Números">
        <div className="flex flex-col gap-3 border-y py-7 md:flex-row md:items-center md:gap-10 md:py-9" style={{ borderColor: "var(--lp-line)" }}>
            <p className="vs-num vs-azul shrink-0 text-[64px] font-semibold leading-none md:text-[80px]">18%</p>
            <div>
                <p className="max-w-[560px] text-[17px] leading-relaxed md:text-[18px]">
                    dos orçamentos viram venda, em média, numa integradora. Quatro em cada cinco se perdem.
                </p>
                <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--lp-ink-subtle)" }}>
                    Greener, Estudo Estratégico de Geração Distribuída, 1º semestre de 2026.
                </p>
            </div>
        </div>
    </section>
);

// O ciclo contado uma vez só, em 3 passos, com a lista de propostas ao lado (a
// única coisa que o celular do topo não mostra). Tudo confere com o código:
// proposta detectada no webhook (_shared/quoteTracking.ts, PDF ou texto com
// valor), aviso depois de 2 dias (eva-quote-followup), aprovação 1/2 pelo
// WhatsApp e rascunho que expira em 48h (_shared/whatsappApproval.ts).
const PASSOS = [
    ["Você manda a proposta pelo WhatsApp", "Em PDF ou em texto, do jeito que já faz. Ela entra sozinha na lista, com o valor e o dia do envio. Você não cadastra nada."],
    ["No 2º dia sem resposta, a Lume te avisa", "No seu WhatsApp, com a mensagem pronta pra chamar o cliente de volta."],
    ["Você responde 1 e ela sai do seu número", "Com o seu nome. Responde 2 e ela é descartada. Se você não responder em 48 horas, nada sai."],
] as const;

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-5 md:px-8 md:py-28" aria-label="Como funciona">
        <Eyebrow>Como funciona</Eyebrow>
        <SectionTitle>
            Você manda o orçamento como sempre. <span className="vs-azul">A Lume lembra por você.</span>
        </SectionTitle>
        <div className="mt-10 grid items-start gap-14 md:mt-14 md:grid-cols-[1fr_1.1fr] md:gap-14">
            <div>
                <ol className="flex flex-col gap-8">
                    {PASSOS.map(([titulo, texto], i) => (
                        <li key={titulo} className="flex gap-4">
                            <span
                                aria-hidden="true"
                                className="vs-num flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold"
                                style={i === 1 ? { background: "var(--lp-noite)", color: "var(--lp-sol)" } : { background: "var(--lp-white)", color: "var(--lp-ink)" }}
                            >
                                {i + 1}
                            </span>
                            <div>
                                <h3 className="vs-display text-[22px] leading-[1.15] md:text-[24px]" style={{ letterSpacing: "-0.01em" }}>
                                    {titulo}
                                </h3>
                                <p className="mt-2 max-w-[440px] text-[16px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                                    {texto}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
                <p className="mt-10 max-w-[480px] border-t pt-5 text-[15px] leading-relaxed" style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-muted)" }}>
                    Antes, uma vez só: você conecta o WhatsApp pelo QR Code ou por um código, como no WhatsApp Web. O número continua o mesmo.
                </p>
            </div>
            <ListaDePropostas />
        </div>
    </section>
);

// Dados de exemplo. Lista em vez de tabela: no celular a situação de cada
// proposta precisa caber na tela. A Residência Oliveira é o Carlos do topo.
type Estado = "espera" | "ok" | "neutro";
const PROPOSALS: { client: string; system: string; value: string; sent: string; status: string; estado: Estado }[] = [
    { client: "Residência Oliveira", system: "6,2 kWp", value: "R$ 24.900", sent: "há 2 dias", status: "sem resposta", estado: "espera" },
    { client: "Mercado Bom Preço", system: "38 kWp", value: "R$ 118.000", sent: "há 6 h", status: "aguardando", estado: "neutro" },
    { client: "Sítio Santa Luzia", system: "15 kWp", value: "R$ 52.300", sent: "há 5 dias", status: "chamou de novo", estado: "ok" },
    { client: "Clínica Vida", system: "11 kWp", value: "R$ 39.800", sent: "há 4 dias", status: "sem resposta", estado: "espera" },
    { client: "Casa Fernandes", system: "4,5 kWp", value: "R$ 18.700", sent: "há 9 dias", status: "fechou", estado: "ok" },
];
// Soma das que estão "sem resposta" acima.
const PARADO_EXEMPLO = 64700;

const ListaDePropostas = () => (
    <figure className="relative mt-16 min-w-0 md:mt-0">
        <EvaSentada size={112} state="alert" />
        <div className="vs-conversa">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--lp-line)" }}>
                <span className="font-semibold">Propostas acompanhadas</span>
                <span className="vs-carimbo vs-carimbo--espera">
                    <span className="vs-num text-[14px]">
                        R$ <CountUp to={PARADO_EXEMPLO} />
                    </span>
                    &nbsp;parados
                </span>
            </div>
            <ul>
                {PROPOSALS.map((p) => (
                    <li key={p.client} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--lp-line)" }}>
                        <div className="min-w-0">
                            <p className="truncate font-medium">{p.client}</p>
                            <p className="mt-0.5 truncate text-[13px]" style={{ color: "var(--lp-ink-subtle)" }}>
                                <span className="vs-num text-[14.5px]">{p.system}</span> · enviada {p.sent}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <p className="vs-num text-[18px] font-bold">{p.value}</p>
                            <span className={`vs-carimbo vs-carimbo--${p.estado}`}>{p.status}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
        <figcaption className="mt-3 text-[13px]" style={{ color: "var(--lp-ink-subtle)" }}>
            Exemplo da lista no Vyzon.
        </figcaption>
    </figure>
);

// O total do exemplo sobe até o valor final quando a página abre. Começa no
// valor final (prerender e movimento reduzido mostram o número pronto) e só
// anima no navegador.
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

const Eyebrow = ({ children }: { children: ReactNode }) => <p className="vs-label">{children}</p>;

const SectionTitle = ({ children }: { children: ReactNode }) => (
    <h2 className="vs-display mt-3 text-[34px] leading-[1.02] md:text-[52px]" style={{ color: "var(--lp-ink)" }}>
        {children}
    </h2>
);

// As frases são as que os donos de integradora responderam na prospecção de
// out/2026; ficaram as 4 mais fortes. As respostas só citam o que existe no app:
// detecção de proposta no webhook (_shared/quoteTracking.ts) e aprovação por
// WhatsApp com expiração de 48h.
const OBJECTIONS = [
    [
        "Quem visualiza e some não tem interesse.",
        "Ele mandou a conta de luz e pediu orçamento. Interesse tinha. O que falta, muitas vezes, é alguém perguntar no que ele ficou pensando: a parcela, a garantia, a conversa em casa.",
    ],
    ["Já tenho CRM.", "CRM só funciona se alguém cadastra cada orçamento. No Vyzon, o orçamento que sai do seu WhatsApp entra na lista sozinho."],
    ["Não tenho tempo pra mais um sistema.", "Você não precisa abrir o Vyzon todo dia. O aviso chega no seu WhatsApp e você responde 1."],
    [
        "Não quero robô falando com meu cliente.",
        "Nada sai sem você responder 1. A mensagem vai do seu número, com o seu nome. Se você não responder, em 48 horas ela é descartada.",
    ],
] as const;

const Objections = () => (
    <section className="vs-sol py-16 md:py-28" aria-label="Objeções">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-5 md:px-8">
            <div className="flex items-end justify-between gap-6">
                <div>
                    <Eyebrow>Antes que você diga</Eyebrow>
                    <SectionTitle>O que a gente mais ouve de dono de integradora</SectionTitle>
                </div>
                <span className="hidden shrink-0 md:block">
                    <EvaBot size={150} state="pondering" />
                </span>
            </div>
            <ul className="mt-10 md:mt-12">
                {OBJECTIONS.map(([fala, resposta]) => (
                    <li
                        key={fala}
                        className="grid gap-3 border-t py-6 md:grid-cols-[1fr_1.25fr] md:gap-12 md:py-8"
                        style={{ borderColor: "var(--lp-line)" }}
                    >
                        <p className="vs-display text-[23px] leading-[1.15] md:text-[26px]" style={{ letterSpacing: "-0.01em" }}>
                            “{fala}”
                        </p>
                        <p className="text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-muted)" }}>
                            {resposta}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    </section>
);

// Só o que existe no app e serve ao objetivo: aviso da Lume no 2º dia
// (eva-quote-followup + aprovação por WhatsApp), placar /orcamentos com o valor
// lido do PDF (quote-pdf-amount), até 10 usuários e 1 WhatsApp (plans.ts). Mais
// de um número é o plano Escala, sem preço, pelo formulário de /escala.
const INCLUDED = [
    "A Lume acompanha cada orçamento e te avisa no 2º dia sem resposta, com a mensagem pronta",
    "A lista de todos os orçamentos: quem respondeu, quem sumiu e quanto vale",
    "Até 10 pessoas da sua equipe e 1 WhatsApp da empresa",
];

// Fundadoras (plans.ts, 03/11/2026): as 10 primeiras não pagam nunca; o time
// libera a conta na mão (AdminCompanyDetail) e avisa no WhatsApp, como diz o
// /upgrade. Sem contagem de vagas: o código não tem esse número.
const Offer = ({ onCta }: { onCta: () => void }) => (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-5 md:px-8 md:py-28" aria-label="Preço">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:gap-10">
            <div>
                <Eyebrow>Preço</Eyebrow>
                <SectionTitle>
                    Nenhuma proposta esquecida, <span className="vs-azul">num plano só</span>
                </SectionTitle>
                <ul className="mt-7 space-y-3.5">
                    {INCLUDED.map((item) => (
                        <li key={item} className="flex gap-3 text-[16px] leading-relaxed md:text-[17px]">
                            <Check aria-hidden="true" width={20} height={20} strokeWidth={2.5} className="mt-[3px] shrink-0" style={{ color: "var(--lp-ok)" }} />
                            {item}
                        </li>
                    ))}
                </ul>
                <p className="mt-8 text-[15px]" style={{ color: "var(--lp-ink-muted)" }}>
                    Vende por mais de um WhatsApp?{" "}
                    <Link to="/escala" className="vs-azul font-semibold underline underline-offset-4" onClick={() => trackEvent("escala_cta_click", { origem: "home" })}>
                        Veja o plano Escala
                    </Link>
                </p>
            </div>
            <div className="vs-preco vs-noite mt-4 self-start md:mt-0">
                <p className="text-[15px] font-semibold">As 10 primeiras integradoras</p>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="vs-num whitespace-nowrap text-[80px] font-semibold leading-[0.95]" style={{ color: "var(--lp-sol)" }}>
                        R$ 0
                    </span>
                    <span className="text-[16px]" style={{ color: "var(--lp-ink-muted)" }}>
                        por mês, para sempre
                    </span>
                </p>
                <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                    Em troca, você conta pra gente o que funciona e o que falta. Se a sua integradora for uma das 10, a gente libera a conta sem cobrar e te avisa no WhatsApp.
                </p>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                    Da 11ª em diante, {PRECO} por mês no cartão de crédito.
                </p>
                <p className="mt-4 border-t pt-4 text-[15px] font-semibold leading-relaxed" style={{ borderColor: "var(--lp-line)" }}>
                    Sem contrato: você para quando quiser.
                </p>
                <div className="mt-6 flex flex-col">
                    <Link to={RAIO_X_AUTO} className="vs-btn vs-btn--sol" onClick={onCta}>
                        {CTA}
                    </Link>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                    Ver as propostas paradas é grátis pra qualquer integradora, sem cartão.
                </p>
            </div>
        </div>
    </section>
);

// Espelhado no FAQPage do index.html: mudou aqui, muda lá. O nome Raio-X só
// aparece aqui, já explicado na mesma frase.
const FAQ = [
    {
        q: "O que acontece depois que eu crio a conta?",
        a: "Você conecta o WhatsApp e a Lume lê os últimos 90 dias. Em uns 3 minutos sai o Raio-X, a lista dos orçamentos que ficaram sem resposta: há quantos dias cada um está parado, quanto eles somam e a mensagem pronta para os maiores. É grátis, e nada é enviado para cliente nenhum.",
    },
    {
        q: "Quanto custa?",
        a: `As 10 primeiras integradoras usam o Vyzon de graça, para sempre, com tudo liberado para até 10 pessoas da equipe. Em troca, contam pra gente o que funciona e o que falta. Da 11ª em diante, o Vyzon custa ${PRECO} por mês, sem contrato.`,
    },
    {
        q: "O que vocês fazem com as minhas conversas?",
        a: "Elas ficam na sua conta do Vyzon e servem pra Lume achar as propostas paradas e escrever a retomada. Você desconecta o número quando quiser.",
    },
    {
        q: "Preciso trocar de número ou de celular?",
        a: "Não. Você continua usando o mesmo WhatsApp de sempre.",
    },
];

// Na mesma grade das outras seções: título à esquerda, perguntas à direita.
const Faq = () => (
    <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 pb-16 sm:px-5 md:grid-cols-[0.8fr_1.2fr] md:gap-14 md:px-8 md:pb-28" aria-label="Perguntas">
        <div>
            <Eyebrow>Perguntas</Eyebrow>
            <SectionTitle>O que todo integrador pergunta antes</SectionTitle>
        </div>
        <div>
            {FAQ.map((f) => (
                <details key={f.q} className="group border-t py-4" style={{ borderColor: "var(--lp-line)" }}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                        {f.q}
                        <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" style={{ color: "var(--lp-ink-subtle)" }}>
                            +
                        </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                        {f.a}
                    </p>
                </details>
            ))}
        </div>
    </section>
);

// O fim da página repete o mesmo botão. A âncora #raio-x é usada pelos links
// /#raio-x de fora da home.
const Final = ({ onCta }: { onCta: () => void }) => (
    <section id="raio-x" className="mx-auto w-full max-w-[1120px] scroll-mt-6 px-4 pb-20 pt-16 sm:px-5 md:px-8 md:pb-28">
        <div className="vs-cartao relative rounded-[22px] p-5 sm:p-7 md:p-10" style={{ background: "var(--lp-white)" }}>
            <EvaSentada size={132} state="idle" />
            <Eyebrow>Grátis e sem cartão</Eyebrow>
            <SectionTitle>Veja o que ficou sem resposta no seu WhatsApp</SectionTitle>
            <p className="mt-5 max-w-[620px] text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-muted)" }}>
                Você cria a conta, conecta o WhatsApp pelo QR Code e em uns 3 minutos vê os orçamentos parados nos últimos 90 dias, com quanto eles somam. Nada é enviado para cliente nenhum.
            </p>
            <div className="mt-6 flex flex-col items-stretch sm:items-start">
                <Link to={RAIO_X_AUTO} className="vs-btn" onClick={onCta}>
                    {CTA}
                </Link>
            </div>
        </div>
    </section>
);

const Footer = ({ onSuporte }: { onSuporte: () => void }) => (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm sm:px-5 md:px-8" style={{ color: "var(--lp-ink-subtle)" }}>
        <span>Vyzon</span>
        <nav className="flex flex-wrap gap-5">
            <a href={whatsappUrl(CONTACT.defaultMessage)} target="_blank" rel="noopener noreferrer" onClick={onSuporte}>
                Suporte no WhatsApp
            </a>
            <Link to="/blog">Blog</Link>
            <Link to="/politica-privacidade">Privacidade</Link>
            <Link to="/termos-de-servico">Termos</Link>
        </nav>
    </footer>
);

export default SolarLanding;
