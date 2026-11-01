import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { logLandingEvent } from "@/lib/landingFunnel";
import { CONTACT, whatsappUrl } from "@/config/contact";
import { PLANS, formatPrice } from "@/config/plans";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";

// Home de produção: integradores de energia solar. Desde 01/11/2026 a página
// vende sozinha, sem conversa marcada com o Markus: o botão do topo leva à
// calculadora, que não pede conexão, e a oferta leva ao cadastro. Isso desfaz a
// decisão anterior, de quando o cadastro era o botão principal e o anúncio de
// out/2026 deu 9 cliques e 0 cadastros (conectar o WhatsApp num site
// recém-conhecido é pedir muito). Se o cadastro travar de novo, olhe aqui.
// SEO desta página fica no index.html; manter em sincronia (title, description,
// FAQPage e o <noscript>).

const AvisoDemo = lazy(() => import("@/components/landing/AvisoDemo"));

// Raio-X automático: cadastro e, depois, /raio-x no app.
const RAIO_X_AUTO = "/criar-conta?segmento=energia_solar";
const FUNNEL_PAGE = "solar";
const PRECO = formatPrice(PLANS.pro.monthlyPrice);

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
                <Numbers />
                <Calculator angle={angle} onCta={() => trackFormCta("calc")} />
                <ProductMock />
                <ConhecaEva />
                <HowItWorks />
                <Offer onCta={() => trackFormCta("oferta")} />
                <Objections />
                <Faq />
                <RaioXFinal onCta={() => trackFormCta("final")} />
            </main>
            <Footer onSuporte={() => trackWhatsappClick("footer")} />
        </div>
    );
};

// Sistema "Lume em campo" (bloco LP.9 do index.css; referência em
// https://claude.ai/artifact/L2qfp4yTM3RBvSL3yN5mjo): a Lume é a estrela, sobre
// creme e faixas chapadas de sol e noite, com Geist, a fonte do app, em tudo e a fatura e a
// conversa de WhatsApp como objetos gráficos.

const Header = ({ onCta }: { onCta: () => void }) => (
    <div className="vs-topo">
        <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-5 sm:px-5 md:px-8">
            <Link to="/" aria-label="Vyzon, início">
                <ThemeLogo className="h-[22px] w-auto" />
            </Link>
            <div className="flex items-center gap-4">
                <Link to="/auth" className="text-sm font-medium" style={{ color: "var(--lp-ink-muted)" }}>
                    Entrar
                </Link>
                <Link to={RAIO_X_AUTO} className="vs-btn" style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }} onClick={onCta}>
                    Criar conta
                </Link>
            </div>
        </header>
    </div>
);

// A Lume sentada na borda de cima de um cartão. O pai precisa ser relative.
const EvaSentada = ({ size, state, children }: { size: number; state?: EvaBotState; children?: ReactNode }) => (
    <span className="vs-sentada" style={{ ["--s-eva" as string]: `${size}px` }}>
        {children ?? <EvaBot size={size} state={state} />}
    </span>
);

// A Lume passa pelo dia da proposta enquanto está na tela. Com movimento
// reduzido, fica no primeiro estado.
const DIA_DA_EVA: { estado: EvaBotState; fala: string }[] = [
    { estado: "idle", fala: "Proposta enviada. Ela fica de olho." },
    { estado: "thinking", fala: "Lendo a conversa." },
    { estado: "alert", fala: "Dois dias sem resposta. Ela te avisa." },
    { estado: "talking", fala: "Escrevendo a mensagem de retomada." },
    { estado: "happy", fala: "Você aprovou. Saiu do seu número." },
];
const useDiaDaEva = () => {
    const ref = useRef<HTMLSpanElement>(null);
    const [i, setI] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let id = 0;
        const io = new IntersectionObserver(([entry]) => {
            window.clearInterval(id);
            if (entry.isIntersecting) id = window.setInterval(() => setI((n) => (n + 1) % DIA_DA_EVA.length), 2800);
        });
        io.observe(el);
        return () => {
            io.disconnect();
            window.clearInterval(id);
        };
    }, []);
    return { ref, ...DIA_DA_EVA[i] };
};

// A Lume apresentada de perto, depois que a página já mostrou o que ela entrega.
const ConhecaEva = () => {
    const { ref, estado, fala } = useDiaDaEva();
    return (
        <section className="mx-auto w-full max-w-[1120px] px-4 pt-20 sm:px-5 md:px-8 md:pt-32" aria-label="Conheça a Lume">
            <div className="vs-conheca vs-noite">
                <div className="relative z-[1] max-w-[520px]">
                    <p className="vs-label">Quem faz isso por você</p>
                    <h2 className="vs-display mt-3 text-[40px] leading-[1.02] md:text-[64px]">Conheça a Lume</h2>
                    <p className="mt-4 text-[17px] leading-relaxed md:text-[19px]" style={{ color: "var(--lp-ink-muted)" }}>
                        Ela acompanha cada proposta que sai do seu WhatsApp, te avisa quando o cliente para de responder e deixa a mensagem pronta. Quem decide o que sai é você.
                    </p>
                    <p key={fala} className="vs-conheca__fala mt-6 text-[19px] font-bold" style={{ color: "var(--lp-sol)" }} aria-live="polite">
                        {fala}
                    </p>
                </div>
                <span ref={ref} className="vs-conheca__bot">
                    <EvaBot size={420} state={estado} />
                </span>
            </div>
        </section>
    );
};

// Texto à esquerda e, à direita, o aviso que chega no WhatsApp do dono: o
// produto inteiro numa olhada. O fim do título leva o marca-texto da tela.
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
                <a href="#conta" className="vs-btn" onClick={onCta}>
                    Me mostra quanto tá parado
                </a>
                <p className="text-[14px]" style={{ color: "var(--lp-ink-subtle)" }}>
                    Leva 30 segundos e não precisa conectar nada.
                </p>
            </div>
            <PriceLine className="mt-7 max-w-[520px]" />
        </div>
        <AvisoNoWhatsApp />
        </div>
    </section>
);

// A demo do topo vem em pedaço separado: o título, que é o LCP, não espera por ela.
// A caixa reserva o espaço do palco, sem CLS.
const AvisoNoWhatsApp = () => (
    <figure className="vs-palco mx-auto w-full max-w-[420px] self-end landing-fade-in-up-lg landing-delay-200" aria-label="Exemplo: o aviso que chega no seu WhatsApp no 2º dia">
        <div className="relative aspect-[420/640] md:aspect-[420/600]">
            <Suspense fallback={null}>
                <AvisoDemo />
            </Suspense>
        </div>
    </figure>
);

// Preço à vista, como na Heliux ("R$ 390 até 90 placas" no topo). Vem de
// src/config/plans.ts.
const PriceLine = ({ className = "" }: { className?: string }) => (
    <p className={`text-[14.5px] leading-snug ${className}`} style={{ color: "var(--lp-ink-muted)" }}>
        <strong className="vs-num text-[17px] font-semibold" style={{ color: "var(--lp-ink)" }}>
            {PRECO} por mês
        </strong>
        , tudo liberado para até 10 pessoas. Sem contrato.
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
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-32" aria-label="Números">
        <ul className="vs-prova">
            {NUMBERS.map(([n, texto, fonte]) => (
                <li key={n} className="vs-prova__item">
                    <p className="vs-num vs-azul text-[72px] font-semibold leading-none md:text-[88px]">{n}</p>
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

// A conta que o dono faz sozinho, sem conectar nada: quantos orçamentos manda e
// quantos fecha ele sabe de cabeça, e "quantos ficaram sem resposta" não. Começa na
// média da Greener (25 por mês, 18% viram venda) e os números passam a ser dele. A
// conta vai junto na mensagem do WhatsApp. Mantém o prefill da automação de leads.
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const TICKETS = [15000, 25000, 40000, 80000];

const Calculator = ({ angle, onCta }: { angle: SolarAngle; onCta: () => void }) => {
    const [orcamentos, setOrcamentos] = useState(25);
    const [vendas, setVendas] = useState(5);
    const [ticket, setTicket] = useState(25000);
    const usou = useRef(false);
    const marcar = () => {
        if (usou.current) return;
        usou.current = true;
        logLandingEvent(FUNNEL_PAGE, angle, "calc_use");
    };
    const semVenda = Math.max(0, orcamentos - vendas);
    const total = semVenda * ticket;
    const mudaOrcamentos = (d: number) => {
        marcar();
        const novo = Math.min(500, Math.max(1, orcamentos + d));
        setOrcamentos(novo);
        setVendas((v) => Math.min(v, novo));
    };
    const mudaVendas = (d: number) => {
        marcar();
        setVendas((v) => Math.min(orcamentos, Math.max(0, v + d)));
    };

    // Faixa noite de ponta a ponta e o resultado em forma de fatura: o dono vive
    // de conta de luz, e aqui a conta é a do dinheiro parado. A Lume, sentada na
    // fatura, se assusta quando a conta passa de zero.
    return (
        <section id="conta" className="vs-noite scroll-mt-4 py-16 md:py-32" aria-label="Calculadora">
            <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-4 sm:px-5 md:grid-cols-2 md:gap-14 md:px-8">
                <div>
                    <Eyebrow light>Faça a conta sem conectar nada</Eyebrow>
                    <SectionTitle light>Quanto fica pelo caminho todo mês?</SectionTitle>
                    <Contador className="mt-8" rotulo="Orçamentos que você manda por mês" valor={orcamentos} muda={mudaOrcamentos} />
                    <Contador className="mt-6" rotulo="Quantos desses viram venda" valor={vendas} muda={mudaVendas} />
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
                                            ? { background: "var(--lp-sol)", color: "var(--lp-ink)", borderColor: "var(--lp-sol)" }
                                            : { background: "transparent", color: "var(--lp-white)", borderColor: "rgba(255,255,255,0.5)" }
                                    }
                                >
                                    {brl(t)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="mt-6 max-w-[460px] text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-subtle)" }}>
                        A conta começa na média do mercado (Greener, 1º semestre de 2026). Troque pelos seus números.
                    </p>
                </div>
                <div className="relative mt-24 min-w-0 md:mt-16">
                <EvaSentada size={132} state={total > 0 ? "alert" : "idle"} />
                <div className="vs-fatura flex min-w-0 flex-col">
                    <div className="vs-fatura__topo">
                        <span className="vs-fatura__titulo">Sua conta do mês</span>
                        <span className="vs-fatura__ref">pela sua conta</span>
                    </div>
                    <dl className="mt-3 grid gap-2">
                        <div className="vs-fatura__linha">
                            <dt>Orçamentos que não viraram venda</dt>
                            <dd className="vs-num">{semVenda}</dd>
                        </div>
                        <div className="vs-fatura__linha">
                            <dt>Valor médio de cada um</dt>
                            <dd className="vs-num">{brl(ticket)}</dd>
                        </div>
                    </dl>
                    <div className="vs-fatura__total mt-4 pt-4">
                        <p className="text-[14.5px]" style={{ color: "var(--lp-ink-muted)" }}>
                            O que ficou pelo caminho
                        </p>
                        <p className="vs-num mt-1 text-[48px] font-semibold leading-none md:text-[60px]">
                            <span className="vs-marca">{brl(total)}</span>
                        </p>
                        <p className="mt-3 text-[14.5px]" style={{ color: "var(--lp-ink-muted)" }}>
                            Nem tudo isso volta. O Vyzon acompanha o que ainda dá para chamar de volta, por {PRECO} por mês.
                        </p>
                    </div>
                    <Link to={RAIO_X_AUTO} onClick={onCta} className="vs-btn mt-6 self-stretch sm:self-start">
                        Ver meu número de verdade
                    </Link>
                </div>
                </div>
            </div>
        </section>
    );
};

const Contador = ({ rotulo, valor, muda, className }: { rotulo: string; valor: number; muda: (d: number) => void; className: string }) => (
    <div className={className}>
        <p className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {rotulo}
        </p>
        <div className="mt-2 flex items-center gap-3">
            <button type="button" aria-label={`${rotulo}: menos um`} onClick={() => muda(-1)} className={stepperCls}>
                −
            </button>
            <output className="vs-num w-16 text-center text-[38px] font-semibold" style={{ color: "var(--lp-sol)" }} aria-live="polite">
                {valor}
            </output>
            <button type="button" aria-label={`${rotulo}: mais um`} onClick={() => muda(1)} className={stepperCls}>
                +
            </button>
        </div>
    </div>
);

const stepperCls =
    "h-11 w-11 rounded-full border-2 border-white/60 text-[20px] text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none";

// A vida de um orçamento, do envio ao aviso, com a Lume em cada dia. O 2º dia é o
// único cartão noite, porque é ali que o Vyzon entra.
const HOW: readonly (readonly [EvaBotState, string, string, string])[] = [
    ["idle", "Uma vez", "Conecte o seu WhatsApp", "Pelo código no celular, como no WhatsApp Web. O número continua o mesmo."],
    ["thinking", "Dia 0", "Mande orçamento como sempre", "Cada proposta que sai do seu WhatsApp entra na lista sozinha. Você não cadastra nada."],
    ["pondering", "Dia 1", "O cliente visualiza e não responde", "Ficou pensando na parcela, na garantia ou na conversa em casa. Você segue o seu dia."],
    ["alert", "Dia 2", "Chega o aviso com a mensagem pronta", "No seu tom. Você responde 1 e ela sai do seu número."],
];

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-5 md:px-8 md:py-32" aria-label="Como funciona">
        <Eyebrow>Como funciona</Eyebrow>
        <SectionTitle>
            Você continua no WhatsApp. <span className="vs-azul">O Vyzon lembra por você.</span>
        </SectionTitle>
        <ol className="vs-tempo mt-10 md:mt-14">
            {HOW.map(([estado, dia, titulo, texto], i) => (
                <li key={titulo} className={`vs-tempo__passo${i === HOW.length - 1 ? " vs-noite" : ""}`}>
                    <EvaBot size={96} state={estado} />
                    <p className="vs-label mt-2">{dia}</p>
                    <h3 className="vs-display mt-1.5 text-[21px] leading-[1.15]" style={{ letterSpacing: "-0.01em" }}>
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

// Só o que existe no app: aviso da Lume no 2º dia (eva-quote-followup + aprovação
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

const Offer = ({ onCta }: { onCta: () => void }) => (
    <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-5 md:px-8 md:pb-32" aria-label="O que está incluso">
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
            <div className="vs-preco vs-noite mt-4 self-start md:mt-0">
                <p className="flex items-baseline gap-2">
                    <span className="vs-num text-[80px] font-semibold leading-[0.95]" style={{ color: "var(--lp-sol)" }}>
                        {PRECO}
                    </span>
                    <span className="text-[16px]" style={{ color: "var(--lp-ink-muted)" }}>
                        por mês
                    </span>
                </p>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                    Pagamento por Pix ou cartão.
                </p>
                <p className="mt-4 border-t pt-4 text-[15px] font-semibold leading-relaxed" style={{ borderColor: "var(--lp-line)" }}>
                    Sem contrato: você paga mês a mês e para quando quiser.
                </p>
                <div className="mt-6 flex flex-col">
                    <Link to={RAIO_X_AUTO} className="vs-btn vs-btn--sol" onClick={onCta}>
                        Criar minha conta
                    </Link>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                    Você cria a conta, vê o Raio-X grátis e só paga se quiser continuar.
                </p>
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
    <section className="mx-auto w-full max-w-[1120px] px-4 pt-16 sm:px-5 md:px-8 md:pt-32" aria-label="Como o Vyzon aparece pra você">
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
                                <p className="vs-num text-[18px] font-bold">{p.value}</p>
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
    <h2 className="vs-display mt-3 text-[34px] leading-[1.02] md:text-[52px]" style={{ color: light ? "var(--lp-white)" : "var(--lp-ink)" }}>
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
    <section className="vs-sol py-16 md:py-32" aria-label="Objeções">
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

// Espelhado no FAQPage do index.html: mudou aqui, muda lá.
const FAQ = [
    {
        q: "O que é o Raio-X?",
        a: "É uma lista dos orçamentos que você mandou pelo WhatsApp nos últimos 90 dias e que ficaram sem resposta. Mostra há quantos dias cada um está parado, quanto eles somam e a mensagem pronta para chamar cada cliente de novo. É grátis.",
    },
    {
        q: "Quanto custa?",
        a: `O Raio-X é grátis. Se depois você quiser que a Lume acompanhe as suas propostas todo mês, o Vyzon custa ${PRECO} por mês, com tudo liberado para até 10 pessoas da equipe. Não tem teste: o Raio-X já mostra o que o Vyzon acha no seu WhatsApp.`,
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
    <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-16 sm:px-5 md:grid-cols-[0.8fr_1.2fr] md:gap-14 md:px-8 md:py-32">
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

// O fim da página repete o caminho grátis. A âncora #raio-x é usada pelos links
// /#raio-x de fora da home.
const RaioXFinal = ({ onCta }: { onCta: () => void }) => (
    <section id="raio-x" className="mx-auto w-full max-w-[1120px] scroll-mt-6 px-4 pb-20 pt-24 sm:px-5 md:px-8 md:pb-28">
        <div className="vs-cartao relative rounded-[22px] p-5 sm:p-7 md:p-10" style={{ background: "var(--lp-white)" }}>
            <EvaSentada size={132} state="idle" />
            <Eyebrow>Grátis, sem compromisso</Eyebrow>
            <SectionTitle>Veja o que ficou sem resposta no seu WhatsApp</SectionTitle>
            <p className="mt-5 max-w-[620px] text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-muted)" }}>
                Você cria a conta, conecta o WhatsApp pelo QR e em cerca de 3 minutos recebe a lista dos orçamentos parados nos últimos 90 dias, com quanto eles somam. Sem cartão.
            </p>
            <div className="mt-6 flex flex-col items-stretch sm:items-start">
                <Link to={RAIO_X_AUTO} className="vs-btn" onClick={onCta}>
                    Ver meu Raio-X grátis
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
            <Link to="/politica-privacidade">Privacidade</Link>
            <Link to="/termos-de-servico">Termos</Link>
        </nav>
    </footer>
);

export default SolarLanding;
