import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion, FUNNEL_EVENTS } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { logLandingEvent } from "@/lib/landingFunnel";
import { whatsappUrl } from "@/config/contact";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot } from "@/components/eva/EvaBot";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

// Home de produção: integradores de energia solar. O botão principal é a
// conversa de 20 min com o Markus no WhatsApp; o Raio-X automático fica como
// segunda opção, porque conectar o WhatsApp num site recém-conhecido é pedir
// muito (anúncio de out/2026: 9 cliques no botão, 0 cadastros). SEO desta
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
        sub: "Você responde 1 e ela sai do seu número, com o seu nome. O Vyzon acompanha cada orçamento que você manda e nunca fala com o cliente sem você aprovar.",
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
    "Mandou o orçamento de energia solar e o cliente sumiu? O Vyzon mostra quais clientes pararam de responder no seu WhatsApp e deixa a mensagem pronta para chamar de novo. Raio-X grátis.";


// Tem que conter o prefill da automação de leads (automations, 20261009_automations_ad_leads):
// é essa frase que faz a conversa virar lead do anúncio, lida pela EVA e avisada no grupo.
const WHATSAPP_MESSAGE = "Oi, Markus. Vi o site e topo os 20 minutos. Quero ver quanto está parado nos meus orçamentos de energia solar.";

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
        <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <Header onWhatsapp={() => trackWhatsappClick("header")} />
            <main>
                <Hero copy={copy} onCta={() => trackFormCta("hero")} onWhatsapp={() => trackWhatsappClick("hero")} />
                <Numbers />
                <Calculator angle={angle} onWhatsapp={() => trackWhatsappClick("calc")} />
                <ProductMock />
                <HowItWorks />
                <Offer onWhatsapp={() => trackWhatsappClick("oferta")} />
                <Objections />
                <Faq />
                <SignupForm angle={angle} onWhatsapp={trackWhatsappClick} onCta={trackFormCta} />
            </main>
            <Footer />
        </div>
    );
};

const Header = ({ onWhatsapp }: { onWhatsapp: () => void }) => (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Vyzon, início">
            <ThemeLogo className="h-[22px] w-auto" />
        </Link>
        <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm" style={{ color: "var(--lp-ink-55)" }}>
                Entrar
            </Link>
            <a href={whatsappUrl(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="vz-btn vz-btn--primary vz-btn--sm" onClick={onWhatsapp}>
                <span>Falar com o Markus</span>
            </a>
        </div>
    </header>
);

const Hero = ({ copy, onCta, onWhatsapp }: { copy: AngleCopy; onCta: () => void; onWhatsapp: () => void }) => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-8 pt-4 text-center md:px-8 md:pb-14 md:pt-20" aria-label="Topo">
        <p className="mx-auto max-w-[620px] text-[15px] font-semibold landing-fade-in-up-lg" style={{ color: "#050505", textWrap: "balance" }}>
            {copy.kicker}
        </p>
        {/* Sans pesada em vez da serifa editorial: as páginas que convertem com
            integrador (Heliux, Azume, SolarZ, InfinitePay) falam alto e direto. */}
        <h1
            className="lp-bold mx-auto mt-3 max-w-[920px] landing-fade-in-up-lg landing-delay-100 md:mt-4"
            style={{ fontSize: "clamp(2rem, 5.4vw, 4.1rem)", lineHeight: 1.04, color: "#050505", textWrap: "balance" }}
        >
            {copy.h1}{" "}
            <span style={{ color: "var(--lp-blue)" }}>{copy.h1Accent}</span>
        </h1>
        <p
            className="mx-auto mt-5 max-w-[600px] landing-fade-in-up-lg landing-delay-200 md:mt-6"
            style={{ fontSize: "clamp(1.0625rem, 1.4vw, 1.1875rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.78)" }}
        >
            {copy.sub}
        </p>
        <div className="mx-auto mt-7 flex max-w-[380px] flex-col items-stretch gap-3 landing-fade-in-up-lg landing-delay-300 md:mt-8">
            <WhatsappCta placement={onWhatsapp}>Falar com o Markus no WhatsApp</WhatsappCta>
            <p className="text-[14px]" style={{ color: "rgba(5,5,5,0.68)", textWrap: "balance" }}>
                Quem responde é o Markus, que criou o Vyzon. Sem compromisso.
            </p>
        </div>
        <PriceLine className="mx-auto mt-6 max-w-[520px]" />
        <Link to={RAIO_X_AUTO} className="mt-5 inline-block text-[14px] underline underline-offset-4" style={{ color: "var(--lp-ink-55)" }} onClick={onCta}>
            Prefere ver sozinho? Veja em 3 minutos o que ficou sem resposta
        </Link>
    </section>
);

const WhatsappCta = ({ placement, children }: { placement: () => void; children: ReactNode }) => (
    <a href={whatsappUrl(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="vz-btn vz-btn--primary justify-center gap-2" onClick={placement}>
        <WhatsAppIcon className="h-[18px] w-[18px]" />
        <span>{children}</span>
    </a>
);

// Preço à vista, como na Heliux ("R$ 390 até 90 placas" no topo). Escassez
// real: o preço de fundador vale para as 10 primeiras integradoras
// (src/config/plans.ts).
const PriceLine = ({ className = "" }: { className?: string }) => (
    <p className={`rounded-[12px] border px-4 py-3 text-[14.5px] leading-snug ${className}`} style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", color: "var(--lp-ink-70)" }}>
        <strong style={{ color: "var(--lp-ink)" }}>R$ 97 por mês</strong> nos 3 primeiros meses para as 10 primeiras integradoras. Depois, R$ 197 por mês. Sem
        contrato.
    </p>
);

// Números de mercado com fonte, no lugar de depoimento: ainda não há cliente
// pagante para citar, e número inventado é proibido (Claims Policy).
const NUMBERS = [
    ["22", "orçamentos por mês faz, em média, uma integradora com mais de 2 anos.", "Greener, Estudo Estratégico de Geração Distribuída, 2025."],
    ["62%", "dos consumidores já desistiram de uma compra por demora na resposta.", "Opinion Box e Mobile Time, Panorama Mensageria 2025."],
    ["2º dia", "sem resposta é quando o Vyzon te avisa, com a mensagem pronta.", "Como o Vyzon funciona."],
] as const;

const Numbers = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-14 sm:px-5 md:px-8 md:pb-20" aria-label="Números">
        <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
            {NUMBERS.map(([n, texto, fonte]) => (
                <li key={n} className="rounded-[12px] border p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                    <p className="lp-bold text-[40px] leading-none tabular-nums" style={{ color: "var(--lp-ink)" }}>
                        {n}
                    </p>
                    <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        {texto}
                    </p>
                    <p className="mt-2 text-[12.5px]" style={{ color: "var(--lp-ink-40)" }}>
                        {fonte}
                    </p>
                </li>
            ))}
        </ul>
    </section>
);

// A conta que o dono faz sozinho, no lugar do "R$ 101.000" de exemplo: o
// número é dele, não nosso. É também a pergunta que valida o ICP (quantas
// propostas ficaram sem resposta no último mês e quanto somam), e a resposta
// vai junto na mensagem do WhatsApp. Mantém o prefill da automação de leads.
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const TICKETS = [15000, 25000, 40000, 80000];

const Calculator = ({ angle, onWhatsapp }: { angle: SolarAngle; onWhatsapp: () => void }) => {
    const [qtd, setQtd] = useState(8);
    const [ticket, setTicket] = useState(25000);
    const usou = useRef(false);
    const marcar = () => {
        if (usou.current) return;
        usou.current = true;
        logLandingEvent(FUNNEL_PAGE, angle, "calc_use");
    };
    const total = qtd * ticket;
    const msg = `${WHATSAPP_MESSAGE} Pela minha conta: ${qtd} orçamentos sem resposta no último mês, uns ${brl(total)}.`;
    const step = (d: number) => {
        marcar();
        setQtd((q) => Math.min(200, Math.max(0, q + d)));
    };

    return (
        <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-24" aria-label="Calculadora">
            <div className="grid gap-8 rounded-[16px] p-6 md:grid-cols-2 md:gap-12 md:p-10" style={{ background: "var(--lp-ink)", color: "#f9fbff" }}>
                <div>
                    <p className="text-[13px] font-medium uppercase tracking-[0.08em]" style={{ color: "rgba(249,251,255,0.55)" }}>
                        Faça a conta da sua integradora
                    </p>
                    <h2 className="lp-bold mt-2 text-[28px] leading-[1.1] md:text-[38px]" style={{ textWrap: "balance" }}>
                        Quanto está esperando alguém chamar de volta?
                    </h2>
                    <div className="mt-7">
                        <p className="text-[15px]" style={{ color: "rgba(249,251,255,0.75)" }}>
                            Orçamentos que ficaram sem resposta no último mês
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <button type="button" aria-label="Menos um" onClick={() => step(-1)} className="h-11 w-11 rounded-full border text-[20px]" style={{ borderColor: "rgba(249,251,255,0.25)" }}>
                                −
                            </button>
                            <output className="lp-bold w-16 text-center text-[32px] tabular-nums" aria-live="polite">
                                {qtd}
                            </output>
                            <button type="button" aria-label="Mais um" onClick={() => step(1)} className="h-11 w-11 rounded-full border text-[20px]" style={{ borderColor: "rgba(249,251,255,0.25)" }}>
                                +
                            </button>
                        </div>
                    </div>
                    <div className="mt-6">
                        <p className="text-[15px]" style={{ color: "rgba(249,251,255,0.75)" }}>
                            Valor médio de um orçamento
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Valor médio de um orçamento">
                            {TICKETS.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    role="radio"
                                    aria-checked={ticket === t}
                                    onClick={() => {
                                        marcar();
                                        setTicket(t);
                                    }}
                                    className="h-10 rounded-full border px-4 text-[14.5px] font-medium transition-colors motion-reduce:transition-none"
                                    style={
                                        ticket === t
                                            ? { background: "#f9fbff", color: "var(--lp-ink)", borderColor: "#f9fbff" }
                                            : { borderColor: "rgba(249,251,255,0.25)", color: "#f9fbff" }
                                    }
                                >
                                    {brl(t)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex min-w-0 flex-col justify-center rounded-[12px] p-5 md:p-8" style={{ background: "rgba(249,251,255,0.06)" }}>
                    <p className="text-[15px]" style={{ color: "rgba(249,251,255,0.7)" }}>
                        Pela sua conta, no último mês:
                    </p>
                    <p className="lp-bold mt-2 text-[44px] leading-none tabular-nums md:text-[56px]">{brl(total)}</p>
                    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "rgba(249,251,255,0.75)" }}>
                        em orçamentos que ninguém chamou de volta. O Vyzon custa R$ 197 por mês.
                    </p>
                    <a
                        href={whatsappUrl(msg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onWhatsapp}
                        className="vz-btn mt-6 justify-center gap-2 self-stretch sm:self-start"
                        style={{ background: "#f9fbff", color: "var(--lp-ink)" }}
                    >
                        <WhatsAppIcon className="h-[18px] w-[18px]" />
                        <span>Mandar essa conta pro Markus</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

const HOW = [
    ["Conecte o seu WhatsApp", "Pelo código no celular, como no WhatsApp Web. O número continua o mesmo."],
    ["Mande orçamento como sempre", "Cada proposta que sai do seu WhatsApp entra na lista sozinha. Você não cadastra nada."],
    ["No 2º dia sem resposta, chega o aviso", "Com a mensagem pronta, no seu tom. Você responde 1 e ela sai do seu número."],
] as const;

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-24" aria-label="Como funciona">
        <Eyebrow>Como funciona</Eyebrow>
        <SectionTitle>Você continua no WhatsApp. O Vyzon lembra por você.</SectionTitle>
        <ol className="mt-8 grid gap-3 md:mt-10 md:grid-cols-3 md:gap-4">
            {HOW.map(([titulo, texto], i) => (
                <li key={titulo} className="rounded-[12px] border p-5 md:p-6" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                    <span className="lp-bold flex h-9 w-9 items-center justify-center rounded-full text-[15px]" style={{ background: "var(--lp-ink)", color: "#fff" }} aria-hidden="true">
                        {i + 1}
                    </span>
                    <h3 className="mt-4 text-[18px] font-semibold leading-snug" style={{ color: "var(--lp-ink)" }}>
                        {titulo}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        {texto}
                    </p>
                </li>
            ))}
        </ol>
    </section>
);

// Só o que existe no app: aviso da EVA no 2º dia (eva-quote-followup + aprovação
// por WhatsApp), placar /orcamentos, Inbox por prioridade, funil, até 10
// usuários (plans.ts) e o Raio-X automático (raio-x-build).
const INCLUDED = [
    "Aviso no 2º dia sem resposta, com a mensagem pronta",
    "Lista de todos os orçamentos: quem respondeu, quem sumiu e quanto vale",
    "Conversas em ordem: primeiro o cliente que está esperando você",
    "Funil de vendas com quanto vale cada etapa",
    "Até 10 pessoas da sua equipe",
    "Raio-X dos últimos 90 dias, grátis antes de assinar",
];

const Offer = ({ onWhatsapp }: { onWhatsapp: () => void }) => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-24" aria-label="O que está incluso">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:gap-10">
            <div>
                <Eyebrow>O que está incluso</Eyebrow>
                <SectionTitle>Tudo liberado, um preço só</SectionTitle>
                <ul className="mt-7 space-y-3.5">
                    {INCLUDED.map((item) => (
                        <li key={item} className="flex gap-3 text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-90)" }}>
                            <span aria-hidden="true" className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--lp-live)", color: "#fff" }}>
                                ✓
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="rounded-[16px] border p-6 md:p-8" style={{ borderColor: "var(--lp-ink)", background: "var(--lp-white)" }}>
                <p className="text-[14px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--lp-blue)" }}>
                    Preço de fundador
                </p>
                <p className="mt-3 flex items-baseline gap-2">
                    <span className="lp-bold text-[52px] leading-none tabular-nums" style={{ color: "var(--lp-ink)" }}>
                        R$ 97
                    </span>
                    <span className="text-[16px]" style={{ color: "var(--lp-ink-55)" }}>
                        por mês
                    </span>
                </p>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                    Nos 3 primeiros meses, para as 10 primeiras integradoras. Depois, R$ 197 por mês.
                </p>
                <p className="mt-4 border-t pt-4 text-[15px] leading-relaxed" style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-70)" }}>
                    Sem contrato: você paga mês a mês e para quando quiser.
                </p>
                <div className="mt-6 flex flex-col">
                    <WhatsappCta placement={onWhatsapp}>Quero o preço de fundador</WhatsappCta>
                </div>
            </div>
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
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-24" aria-label="Como o Vyzon aparece pra você">
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
    <h2 className="lp-bold mt-2 text-[30px] leading-[1.08] md:text-[42px]" style={{ color: light ? "#f9fbff" : "#050505", textWrap: "balance" }}>
        {children}
    </h2>
);

// As frases são as que os donos de integradora responderam na prospecção de
// out/2026. As respostas só citam o que existe no app: detecção de proposta no
// webhook (_shared/quoteTracking.ts) e aprovação por WhatsApp com expiração de 48h.
const OBJECTIONS = [
    [
        "Quem visualiza e some não tem interesse.",
        "Ele mandou a conta de luz e pediu orçamento. Interesse tinha. O que falta, muitas vezes, é alguém perguntar no que ele ficou pensando: a parcela, a garantia, a conversa em casa.",
    ],
    [
        "Meu sistema de proposta já avisa quando o cliente abre.",
        "Ótimo, saber que abriu é metade. A outra metade é chamar de volta no dia certo, com a mensagem certa, no meio de duzentas conversas. É isso que o Vyzon faz, pelo seu WhatsApp.",
    ],
    ["Já tenho CRM.", "CRM só funciona se alguém cadastra cada orçamento. No Vyzon, o orçamento que sai do seu WhatsApp entra na lista sozinho."],
    ["Não tenho tempo pra mais um sistema.", "Você não precisa abrir o Vyzon todo dia. O aviso chega no seu WhatsApp e você responde 1."],
    [
        "Não quero robô falando com meu cliente.",
        "Nada sai sem você responder 1. A mensagem vai do seu número, com o seu nome. Se você não responder, em 48 horas ela é descartada.",
    ],
] as const;

const Objections = () => (
    <section className="py-16 md:py-24" style={{ background: "#0d1421" }} aria-label="Objeções">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-5 md:px-8">
            <p className="text-[13px] font-medium uppercase tracking-[0.08em]" style={{ color: "rgba(249,251,255,0.5)" }}>
                Antes que você diga
            </p>
            <SectionTitle light>O que a gente mais ouve de dono de integradora</SectionTitle>
            <ul className="mt-10 md:mt-12">
                {OBJECTIONS.map(([fala, resposta]) => (
                    <li
                        key={fala}
                        className="grid gap-3 border-t py-6 md:grid-cols-[1fr_1.2fr] md:gap-12 md:py-8"
                        style={{ borderColor: "rgba(249,251,255,0.12)" }}
                    >
                        <p className="lp-serif text-[22px] leading-snug md:text-[26px]" style={{ color: "#f9fbff", textWrap: "balance" }}>
                            “{fala}”
                        </p>
                        <p className="text-[16px] leading-relaxed md:text-[17px]" style={{ color: "rgba(249,251,255,0.72)" }}>
                            {resposta}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    </section>
);

// Espelhado no FAQPage do index.html: mudou aqui, muda lá.
const FAQ = [
    {
        q: "Como é a conversa de 20 minutos?",
        a: "Você me chama no WhatsApp e a gente marca um horário. Eu te mostro o Vyzon funcionando e, se você quiser, montamos juntos a lista dos seus orçamentos que ficaram sem resposta. É grátis e você não precisa decidir nada na hora.",
    },
    {
        q: "O que é o Raio-X?",
        a: "É uma lista dos orçamentos que você mandou pelo WhatsApp nos últimos 90 dias e que ficaram sem resposta. Mostra há quantos dias cada um está parado, quanto eles somam e a mensagem pronta para chamar cada cliente de novo. É grátis.",
    },
    {
        q: "Quanto custa?",
        a: "O Raio-X é grátis. Se depois você quiser que a EVA acompanhe as suas propostas todo mês, o Vyzon custa R$ 197 por mês, com tudo liberado para até 10 pessoas da equipe. As 10 primeiras integradoras pagam R$ 97 por mês nos 3 primeiros meses. Não tem teste: o Raio-X já mostra o que o Vyzon acha no seu WhatsApp.",
    },
    {
        q: "O que vocês fazem com as minhas conversas?",
        a: "Elas ficam na sua conta do Vyzon e servem só pra montar o seu Raio-X. Você desconecta o número quando quiser.",
    },
    {
        q: "Preciso trocar de número ou de celular?",
        a: "Não. Você continua usando o mesmo WhatsApp de sempre.",
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

const SignupForm = ({ angle, onWhatsapp, onCta }: { angle: SolarAngle; onWhatsapp: (placement: string) => void; onCta: (placement: string) => void }) => {
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
                <Eyebrow>Grátis, sem compromisso</Eyebrow>
                <SectionTitle>20 minutos comigo pelo WhatsApp</SectionTitle>
                {/* Quem atende, com nome: no lugar de depoimento, que ainda não existe. */}
                <div className="mt-5 flex items-start gap-3.5">
                    <span className="lp-bold flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[20px]" style={{ background: "var(--lp-blue)", color: "#fff" }} aria-hidden="true">
                        M
                    </span>
                    <p className="text-[15px] leading-relaxed md:text-[16px]" style={{ color: "var(--lp-ink-70)" }}>
                        Sou o Markus, de Floripa. Estou construindo o Vyzon junto com as primeiras integradoras, e quem responde no WhatsApp sou eu. Nos 20
                        minutos eu te mostro funcionando, e você decide depois.
                    </p>
                </div>
                <div className="mt-6 flex flex-col items-stretch gap-3 sm:items-start">
                    <WhatsappCta placement={() => onWhatsapp("final")}>Falar com o Markus no WhatsApp</WhatsappCta>
                    <Link to={RAIO_X_AUTO} className="text-[14px] underline underline-offset-4" style={{ color: "var(--lp-ink-55)" }} onClick={() => onCta("final")}>
                        Prefere ver sozinho? Veja em 3 minutos o que ficou sem resposta
                    </Link>
                </div>
            </div>
            <div>
                <p className="mb-4 text-[15px] font-medium" style={{ color: "var(--lp-ink)" }}>
                    Ou deixe seu número que eu te chamo.
                </p>

                {done ? (
                    <div className="rounded-[10px] border p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                        <p className="text-lg font-medium" style={{ color: "var(--lp-ink)" }}>
                            Recebemos, {form.name.trim().split(" ")[0]}.
                        </p>
                        <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                            {"O Markus te chama no WhatsApp pra marcar os 20 minutos. Se não quiser esperar, dá pra ver o seu Raio-X agora mesmo, em 3 minutos."}
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
                            <ButtonV2 type="submit" variant="secondary" disabled={submitting}>
                                {submitting ? "Enviando" : "Quero que o Markus me chame"}
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
