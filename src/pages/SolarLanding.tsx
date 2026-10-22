import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion, FUNNEL_EVENTS } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { logLandingEvent } from "@/lib/landingFunnel";
import { whatsappUrl } from "@/config/contact";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
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
        <div className="lp-v2 lp-solar min-h-screen">
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

// Design system "Vyzon Solar" (bloco LP.8 do index.css; referência em
// https://claude.ai/artifact/Rm4n5dnbf8nPTb961BbsA2): azul é a cor dona,
// marca-texto amarelo uma vez por tela, números em Barlow Condensed (.vs-num)
// e a fatura e a conversa de WhatsApp como objetos gráficos.

const Header = ({ onWhatsapp }: { onWhatsapp: () => void }) => (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-5 sm:px-5 md:px-8">
        <Link to="/" aria-label="Vyzon, início">
            <ThemeLogo className="h-[22px] w-auto" />
        </Link>
        <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm" style={{ color: "var(--lp-ink-muted)" }}>
                Entrar
            </Link>
            <a
                href={whatsappUrl(WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="vs-btn"
                style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }}
                onClick={onWhatsapp}
            >
                Falar com o Markus
            </a>
        </div>
    </header>
);

const WaIcon = () => (
    <span className="vs-btn__wa" aria-hidden="true">
        <WhatsAppIcon />
    </span>
);

// Texto à esquerda e, à direita, o aviso que chega no WhatsApp do dono: o
// produto inteiro numa olhada. O fim do título leva o marca-texto da tela.
const Hero = ({ copy, onCta, onWhatsapp }: { copy: AngleCopy; onCta: () => void; onWhatsapp: () => void }) => (
    <section
        className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-4 pb-16 pt-4 sm:px-5 md:grid-cols-[1.12fr_0.88fr] md:px-8 md:pb-24 md:pt-14"
        aria-label="Topo"
    >
        <div>
            <p className="text-[15px] font-semibold landing-fade-in-up-lg">{copy.kicker}</p>
            {/* Archivo 800 em vez da serifa editorial: as páginas que convertem com
                integrador (Heliux, Azume, InfinitePay) falam alto e direto. */}
            <h1
                className="vs-display mt-4 landing-fade-in-up-lg landing-delay-100"
                style={{ fontSize: "clamp(2rem, 3.7vw, 3.05rem)", lineHeight: 1.04 }}
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
                <WhatsappCta placement={onWhatsapp}>Falar com o Markus no WhatsApp</WhatsappCta>
                <p className="text-[14px]" style={{ color: "var(--lp-ink-subtle)" }}>
                    Quem responde é o Markus, que criou o Vyzon. Sem compromisso.
                </p>
            </div>
            <PriceLine className="mt-7 max-w-[520px]" />
            <Link to={RAIO_X_AUTO} className="vs-azul mt-4 inline-block text-[14px] underline underline-offset-4" onClick={onCta}>
                Prefere ver sozinho? Veja em 3 minutos o que ficou sem resposta
            </Link>
        </div>
        <AvisoNoWhatsApp />
    </section>
);

const WhatsappCta = ({ placement, children }: { placement: () => void; children: ReactNode }) => (
    <a href={whatsappUrl(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="vs-btn" onClick={placement}>
        <WaIcon />
        <span>{children}</span>
    </a>
);

// O aviso no WhatsApp do dono, no formato da aprovação real
// (supabase/functions/_shared/whatsappApproval.ts), simplificado para "responda
// 1" sem o código curto nem nome interno. Dados de exemplo.
const AvisoNoWhatsApp = () => (
    <figure className="mx-auto w-full max-w-[420px] landing-fade-in-up-lg landing-delay-200" aria-label="Exemplo: o aviso que chega no seu WhatsApp no 2º dia">
        <div className="vs-conversa">
            <div className="vs-conversa__topo">
                <span className="vs-conversa__avatar" aria-hidden="true">
                    V
                </span>
                <div className="min-w-0">
                    <p className="vs-conversa__nome">Aviso do Vyzon</p>
                    <p className="vs-conversa__status">no seu WhatsApp</p>
                </div>
            </div>
            <div className="vs-conversa__corpo">
                <span className="vs-conversa__dia">Quarta</span>
                <div className="vs-bolha">
                    <p className="font-semibold">Mensagem pronta para o Carlos</p>
                    <p className="text-[13px]" style={{ color: "var(--lp-ink-muted)" }}>
                        Residência Oliveira · proposta de <span className="vs-num text-[15px] font-semibold">R$ 24.900</span> sem resposta há 2 dias
                    </p>
                    <p className="vs-bolha__rascunho">
                        Oi, Carlos, conseguiu olhar a proposta? Se ajudar, te mando a simulação com financiamento pra comparar com a sua conta de luz.
                    </p>
                    <p style={{ color: "var(--lp-ink-muted)" }}>Responda 1 e ela sai do seu número.</p>
                    <span className="vs-bolha__hora">09:02</span>
                </div>
                <div className="vs-bolha vs-bolha--saida">
                    1<span className="vs-bolha__hora">09:03</span>
                </div>
                <div className="vs-bolha">
                    Enviada para o Carlos.<span className="vs-bolha__hora">09:03</span>
                </div>
            </div>
        </div>
        <figcaption className="mt-3 text-right text-[12px]" style={{ color: "var(--lp-ink-subtle)" }}>
            Exemplo
        </figcaption>
    </figure>
);

// Preço à vista, como na Heliux ("R$ 390 até 90 placas" no topo). Escassez
// real: o preço de fundador vale para as 10 primeiras integradoras
// (src/config/plans.ts). Carimbo neutro: o marca-texto da tela é o do título.
const PriceLine = ({ className = "" }: { className?: string }) => (
    <p className={`flex items-start gap-3 text-[14.5px] leading-snug ${className}`} style={{ color: "var(--lp-ink-muted)" }}>
        <span className="vs-carimbo vs-carimbo--neutro mt-[1px]">Fundador</span>
        <span>
            <strong className="vs-num text-[17px]" style={{ color: "var(--lp-ink)" }}>
                R$ 97 por mês
            </strong>{" "}
            nos 3 primeiros meses para as 10 primeiras integradoras. Depois, R$ 197 por mês. Sem contrato.
        </span>
    </p>
);

// Números de mercado com fonte, no lugar de depoimento: ainda não há cliente
// pagante para citar, e número inventado é proibido (Claims Policy). Só número
// de fora, com estudo e período.
const NUMBERS = [
    ["18%", "dos orçamentos viram venda, em média, numa integradora. Quatro em cada cinco se perdem.", "Greener, Estudo Estratégico de Geração Distribuída, 1º semestre de 2026."],
    ["25", "orçamentos por mês faz uma integradora típica, com equipe de até 4 pessoas.", "Greener, Estudo Estratégico de Geração Distribuída, 1º semestre de 2026."],
] as const;

const Numbers = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-24" aria-label="Números">
        <ul className="vs-prova">
            {NUMBERS.map(([n, texto, fonte]) => (
                <li key={n} className="vs-prova__item">
                    <p className="vs-num text-[56px] font-bold leading-none md:text-[64px]">{n}</p>
                    <p className="mt-3 max-w-[440px] text-[16px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                        {texto}
                    </p>
                    <p className="mt-2 text-[12.5px]" style={{ color: "var(--lp-ink-subtle)" }}>
                        {fonte}
                    </p>
                </li>
            ))}
        </ul>
    </section>
);

// A conta que o dono faz sozinho: o número é dele, não nosso. É também a
// pergunta que valida o ICP (quantas propostas ficaram sem resposta no último
// mês e quanto somam), e a resposta vai junto na mensagem do WhatsApp. Mantém o
// prefill da automação de leads.
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

    // Faixa azul de ponta a ponta (a cor dona) e o resultado em forma de fatura:
    // o dono vive de conta de luz, e aqui a conta é a do dinheiro parado.
    return (
        <section className="py-16 md:py-24" style={{ background: "var(--lp-blue)", color: "var(--lp-white)" }} aria-label="Calculadora">
            <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-4 sm:px-5 md:grid-cols-2 md:gap-14 md:px-8">
                <div>
                    <Eyebrow light>Faça a conta da sua integradora</Eyebrow>
                    <SectionTitle light>Quanto está esperando alguém chamar de volta?</SectionTitle>
                    <div className="mt-8">
                        <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                            Orçamentos que ficaram sem resposta no último mês
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <button type="button" aria-label="Menos um" onClick={() => step(-1)} className={stepperCls}>
                                −
                            </button>
                            <output className="vs-num w-16 text-center text-[34px] font-bold" aria-live="polite">
                                {qtd}
                            </output>
                            <button type="button" aria-label="Mais um" onClick={() => step(1)} className={stepperCls}>
                                +
                            </button>
                        </div>
                    </div>
                    <div className="mt-6">
                        <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
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
                                    className="vs-num h-10 rounded-full border-2 px-4 text-[17px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                                    style={
                                        ticket === t
                                            ? { background: "var(--lp-white)", color: "var(--lp-ink)", borderColor: "var(--lp-white)" }
                                            : { background: "transparent", color: "var(--lp-white)", borderColor: "rgba(255,255,255,0.5)" }
                                    }
                                >
                                    {brl(t)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="vs-fatura flex min-w-0 flex-col">
                    <div className="vs-fatura__topo">
                        <span className="vs-fatura__titulo">Sua conta do último mês</span>
                        <span className="vs-fatura__ref">pela sua conta</span>
                    </div>
                    <dl className="mt-3 grid gap-2">
                        <div className="vs-fatura__linha">
                            <dt>Orçamentos sem resposta</dt>
                            <dd className="vs-num">{qtd}</dd>
                        </div>
                        <div className="vs-fatura__linha">
                            <dt>Valor médio de cada um</dt>
                            <dd className="vs-num">{brl(ticket)}</dd>
                        </div>
                    </dl>
                    <div className="vs-fatura__total mt-4 pt-4">
                        <p className="text-[14.5px]" style={{ color: "var(--lp-ink-muted)" }}>
                            Esperando alguém chamar de volta
                        </p>
                        <p className="vs-num mt-1 text-[48px] font-bold leading-none md:text-[60px]">
                            <span className="vs-marca">{brl(total)}</span>
                        </p>
                        <p className="mt-3 text-[14.5px]" style={{ color: "var(--lp-ink-muted)" }}>
                            O Vyzon custa R$ 197 por mês.
                        </p>
                    </div>
                    <a href={whatsappUrl(msg)} target="_blank" rel="noopener noreferrer" onClick={onWhatsapp} className="vs-btn mt-6 self-stretch sm:self-start">
                        <WaIcon />
                        <span>Mandar essa conta pro Markus</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

const stepperCls =
    "h-11 w-11 rounded-full border-2 border-white/60 text-[20px] text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none";

// A vida de um orçamento, do envio ao aviso. O 2º dia é o único marco em azul,
// porque é ali que o Vyzon entra.
const HOW = [
    ["1×", "Uma vez", "Conecte o seu WhatsApp", "Pelo código no celular, como no WhatsApp Web. O número continua o mesmo."],
    ["0", "Dia 0", "Mande orçamento como sempre", "Cada proposta que sai do seu WhatsApp entra na lista sozinha. Você não cadastra nada."],
    ["1", "Dia 1", "O cliente visualiza e não responde", "Ficou pensando na parcela, na garantia ou na conversa em casa. Você segue o seu dia."],
    ["2", "Dia 2", "Chega o aviso com a mensagem pronta", "No seu tom. Você responde 1 e ela sai do seu número."],
] as const;

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-5 md:px-8 md:py-24" aria-label="Como funciona">
        <Eyebrow>Como funciona</Eyebrow>
        <SectionTitle>
            Você continua no WhatsApp. <span className="vs-azul">O Vyzon lembra por você.</span>
        </SectionTitle>
        <ol className="vs-tempo mt-10 md:mt-14">
            {HOW.map(([marco, dia, titulo, texto], i) => (
                <li key={titulo} className={`vs-tempo__passo${i === HOW.length - 1 ? " vs-tempo__passo--aviso" : ""}`}>
                    <span className="vs-tempo__dia vs-num" aria-hidden="true">
                        {marco}
                    </span>
                    <p className="vs-label">{dia}</p>
                    <h3 className="vs-display mt-1.5 text-[19px] font-bold leading-snug" style={{ letterSpacing: "-0.01em" }}>
                        {titulo}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
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
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:gap-10">
            <div>
                <Eyebrow>O que está incluso</Eyebrow>
                <SectionTitle>
                    Tudo liberado, <span className="vs-azul">um preço só</span>
                </SectionTitle>
                <ul className="mt-7 space-y-3.5">
                    {INCLUDED.map((item) => (
                        <li key={item} className="flex gap-3 text-[16px] leading-relaxed md:text-[17px]">
                            <span aria-hidden="true" className="font-bold" style={{ color: "var(--lp-ok)" }}>
                                ✓
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="vs-preco self-start">
                <span className="vs-preco__etiqueta">Preço de fundador</span>
                <p className="flex items-baseline gap-2">
                    <span className="vs-num text-[72px] font-bold leading-[0.95]">R$ 97</span>
                    <span className="text-[16px]" style={{ color: "var(--lp-ink-muted)" }}>
                        por mês
                    </span>
                </p>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                    Nos 3 primeiros meses, para as 10 primeiras integradoras. Depois, R$ 197 por mês.
                </p>
                <p className="mt-4 border-t pt-4 text-[15px] font-semibold leading-relaxed" style={{ borderColor: "var(--lp-line)" }}>
                    Sem contrato: você paga mês a mês e para quando quiser.
                </p>
                <div className="mt-6 flex flex-col">
                    <WhatsappCta placement={onWhatsapp}>Quero o preço de fundador</WhatsappCta>
                </div>
            </div>
        </div>
    </section>
);

// Mockup do produto: as propostas acompanhadas e a conversa do Carlos depois
// da aprovação. Objetos do design system em vez do painel escuro: a conversa é
// o WhatsApp de verdade, claro. Dados de exemplo. Lista em vez de tabela: no
// celular a situação de cada proposta precisa caber na tela.
type Estado = "espera" | "ok" | "neutro";
const PROPOSALS: { client: string; system: string; value: string; sent: string; status: string; estado: Estado }[] = [
    { client: "Residência Oliveira", system: "6,2 kWp", value: "R$ 24.900", sent: "há 2 dias", status: "sem resposta", estado: "espera" },
    { client: "Mercado Bom Preço", system: "38 kWp", value: "R$ 118.000", sent: "há 6 h", status: "aguardando", estado: "neutro" },
    { client: "Sítio Santa Luzia", system: "15 kWp", value: "R$ 52.300", sent: "há 5 dias", status: "chamou de novo", estado: "ok" },
    { client: "Clínica Vida", system: "11 kWp", value: "R$ 39.800", sent: "há 4 dias", status: "sem resposta", estado: "espera" },
    { client: "Casa Fernandes", system: "4,5 kWp", value: "R$ 18.700", sent: "há 9 dias", status: "fechou", estado: "ok" },
];

// O total do exemplo sobe até o valor final quando a página abre. Começa no
// valor final (prerender e movimento reduzido mostram o número pronto) e só
// anima no navegador.
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

const ProductMock = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pt-16 sm:px-5 md:px-8 md:pt-24" aria-label="Como o Vyzon aparece pra você">
        <Eyebrow>Exemplo</Eyebrow>
        <SectionTitle>
            Cada proposta que sai do seu WhatsApp <span className="vs-azul">entra na lista sozinha</span>
        </SectionTitle>
        <div className="mt-10 grid items-start gap-6 md:mt-12 md:grid-cols-[1.25fr_1fr]">
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
                                <p className="vs-num text-[18px] font-semibold">{p.value}</p>
                                <span className={`vs-carimbo vs-carimbo--${p.estado}`}>{p.status}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="vs-conversa">
                <div className="vs-conversa__topo">
                    <span className="vs-conversa__avatar vs-conversa__avatar--cliente" aria-hidden="true">
                        C
                    </span>
                    <div className="min-w-0">
                        <p className="vs-conversa__nome truncate">Carlos · Residência Oliveira</p>
                        <p className="vs-conversa__status">online</p>
                    </div>
                </div>
                <div className="vs-conversa__corpo">
                    <span className="vs-conversa__dia">Segunda</span>
                    <div className="vs-bolha vs-bolha--saida">
                        Carlos, segue a proposta do sistema de <span className="vs-num text-[15.5px]">6,2 kWp</span>. Qualquer dúvida me chama.
                        <span className="vs-bolha__hora">09:14</span>
                    </div>
                    <span className="vs-conversa__dia">Quarta · 2 dias sem resposta</span>
                    <div className="vs-bolha vs-bolha--saida">
                        Oi, Carlos, conseguiu olhar a proposta? Se ajudar, te mando a simulação com financiamento pra comparar com a sua conta de luz.
                        <span className="vs-bolha__hora">09:03</span>
                    </div>
                    <div className="vs-bolha">
                        Oi! Consegui sim, pode mandar a simulação.<span className="vs-bolha__hora">09:05</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const Eyebrow = ({ children, light }: { children: ReactNode; light?: boolean }) => (
    <p className="vs-label" style={light ? { color: "rgba(255,255,255,0.8)" } : undefined}>
        {children}
    </p>
);

const SectionTitle = ({ children, light }: { children: ReactNode; light?: boolean }) => (
    <h2 className="vs-display mt-3 text-[30px] leading-[1.06] md:text-[42px]" style={{ color: light ? "var(--lp-white)" : "var(--lp-ink)" }}>
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
    ["Não tenho tempo pra mais um sistema.", "Você não precisa abrir o Vyzon todo dia. O aviso chega no seu WhatsApp e você responde 1."],
    [
        "Não quero robô falando com meu cliente.",
        "Nada sai sem você responder 1. A mensagem vai do seu número, com o seu nome. Se você não responder, em 48 horas ela é descartada.",
    ],
] as const;

const Objections = () => (
    <section className="py-16 md:py-24" style={{ background: "var(--lp-ink)" }} aria-label="Objeções">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-5 md:px-8">
            <Eyebrow light>Antes que você diga</Eyebrow>
            <SectionTitle light>O que a gente mais ouve de dono de integradora</SectionTitle>
            <ul className="mt-10 md:mt-12">
                {OBJECTIONS.map(([fala, resposta]) => (
                    <li
                        key={fala}
                        className="grid gap-3 border-t py-6 md:grid-cols-[1fr_1.25fr] md:gap-12 md:py-8"
                        style={{ borderColor: "rgba(255,255,255,0.14)" }}
                    >
                        <p className="vs-display text-[21px] font-bold leading-snug md:text-[24px]" style={{ color: "var(--lp-white)", letterSpacing: "-0.01em" }}>
                            <span style={{ color: "var(--lp-blue-tint)" }}>“</span>
                            {fala}
                            <span style={{ color: "var(--lp-blue-tint)" }}>”</span>
                        </p>
                        <p className="text-[16px] leading-relaxed md:text-[17px]" style={{ color: "rgba(255,255,255,0.78)" }}>
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

// Na mesma grade das outras seções: título à esquerda, perguntas à direita.
const Faq = () => (
    <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-16 sm:px-5 md:grid-cols-[0.8fr_1.2fr] md:gap-14 md:px-8 md:py-24">
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
                className="grid gap-8 rounded-[10px] border p-5 sm:p-7 md:grid-cols-[1fr_1.1fr] md:gap-12 md:p-10"
                style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", boxShadow: "0 1px 2px rgba(13,20,33,0.05), 0 14px 32px -18px rgba(13,20,33,0.3)" }}
            >
                <div>
                    <Eyebrow>Grátis, sem compromisso</Eyebrow>
                    <SectionTitle>20 minutos comigo pelo WhatsApp</SectionTitle>
                    {/* Quem atende, com nome: no lugar de depoimento, que ainda não existe. */}
                    <div className="mt-5 flex items-start gap-3.5">
                        <span
                            className="vs-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[20px]"
                            style={{ background: "var(--lp-blue)", color: "var(--lp-white)" }}
                            aria-hidden="true"
                        >
                            M
                        </span>
                        <p className="text-[15px] leading-relaxed md:text-[16px]" style={{ color: "var(--lp-ink-muted)" }}>
                            Sou o Markus, de Floripa. Estou construindo o Vyzon junto com as primeiras integradoras, e quem responde no WhatsApp sou eu. Nos 20
                            minutos eu te mostro funcionando, e você decide depois.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col items-stretch gap-3 sm:items-start">
                        <WhatsappCta placement={() => onWhatsapp("final")}>Falar com o Markus no WhatsApp</WhatsappCta>
                        <Link to={RAIO_X_AUTO} className="vs-azul text-[14px] underline underline-offset-4" onClick={() => onCta("final")}>
                            Prefere ver sozinho? Veja em 3 minutos o que ficou sem resposta
                        </Link>
                    </div>
                </div>
                <div>
                    <p className="mb-4 text-[15px] font-medium">Ou deixe seu número que eu te chamo.</p>

                    {done ? (
                        <div className="rounded-[10px] border p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                            <p className="text-lg font-medium">Recebemos, {form.name.trim().split(" ")[0]}.</p>
                            <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                                O Markus te chama no WhatsApp pra marcar os 20 minutos. Se não quiser esperar, dá pra ver o seu Raio-X agora mesmo, em 3 minutos.
                            </p>
                            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                                <Link
                                    to={RAIO_X_AUTO}
                                    state={{ nome: form.name.trim(), email: form.email.trim(), whats: form.phone.trim() }}
                                    onClick={() => logLandingEvent(FUNNEL_PAGE, angle, "cta_click", { placement: "form_done" })}
                                    className="vs-btn"
                                >
                                    Ver meu Raio-X agora
                                </Link>
                                <a
                                    href={whatsappUrl(`Oi Markus, sou ${form.name.trim()}. Acabei de pedir o Raio-X no site.`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onWhatsapp("form_done")}
                                    className="vs-btn vs-btn--vazado"
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
                                <button type="submit" className="vs-btn vs-btn--vazado" disabled={submitting}>
                                    {submitting ? "Enviando" : "Quero que o Markus me chame"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
};

const inputCls = "h-11 w-full rounded-[10px] border px-3.5 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)]";
const inputStyle = {
    borderColor: "var(--lp-line)",
    background: "var(--lp-white)",
    color: "var(--lp-ink)",
} as const;

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="grid gap-1.5 text-sm" style={{ color: "var(--lp-ink-muted)" }}>
        <span>{label}</span>
        {children}
    </label>
);

const Footer = () => (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm sm:px-5 md:px-8" style={{ color: "var(--lp-ink-subtle)" }}>
        <span>Vyzon</span>
        <nav className="flex flex-wrap gap-5">
            <Link to="/politica-privacidade">Privacidade</Link>
            <Link to="/termos-de-servico">Termos</Link>
        </nav>
    </footer>
);

export default SolarLanding;
