import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion, FUNNEL_EVENTS } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { whatsappUrl } from "@/config/contact";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

// Home de produção desde 29/09/2026: integradores de energia solar, oferta de
// entrada = Raio-X grátis das propostas paradas no WhatsApp. A landing de
// agência vive em /agencias. SEO desta página fica no index.html; manter em
// sincronia (title, description, FAQPage e o <noscript>).
//
// Cadastro vai pra demo_requests com source='orcamento_teste': o trigger do SDR
// automático ignora essa origem (migration 20260914_sdr_outreach_skip_orcamento),
// senão o dono do negócio receberia o pitch de agência. O contato é manual.

const SOURCE = "orcamento_teste";

const TITLE = "Propostas de energia solar paradas no WhatsApp | Vyzon";
const DESCRIPTION =
    "Mandou a proposta e o cliente sumiu? O Vyzon mostra quais propostas de energia solar pararam no seu WhatsApp e entrega a retomada pronta. Raio-X grátis.";

const MONTHLY_RANGES = ["Até 10", "De 10 a 30", "Mais de 30"];

const WHATSAPP_MESSAGE = "Oi, Markus. Quero o Raio-X das minhas propostas de energia solar.";

// Tokens do mockup escuro (referência: dashboard denso, Geist 14px, cantos retos).
const DARK = {
    bg: "#161616",
    panel: "#1c1c1c",
    line: "#232323",
    lineStrong: "#303030",
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
    company: string;
    monthly: string;
};

const EMPTY_FORM: FormState = { name: "", phone: "", email: "", company: "", monthly: "" };

const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("55") && digits.length >= 12 ? `+${digits}` : `+55${digits}`;
};

const trackWhatsappClick = (placement: string) =>
    trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { page: "home_solar", cta: "whatsapp", placement });

const SolarLanding = () => {
    useEffect(() => {
        document.title = TITLE;
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) meta.content = DESCRIPTION;
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    useEffect(() => {
        trackEvent(FUNNEL_EVENTS.LANDING_VIEW, { page: "home_solar" });
    }, []);

    return (
        <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <Header />
            <main>
                <Hero />
                <ProductMock />
                <Pain />
                <WhatYouGet />
                <HowItWorks />
                <NotABot />
                <Faq />
                <SignupForm />
            </main>
            <Footer />
        </div>
    );
};

const Header = () => (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Vyzon, início">
            <ThemeLogo className="h-[22px] w-auto" />
        </Link>
        <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm" style={{ color: "var(--lp-ink-55)" }}>
                Entrar
            </Link>
            <a href="#raio-x" className="vz-btn vz-btn--primary vz-btn--sm">
                <span>Pedir Raio-X</span>
            </a>
        </div>
    </header>
);

const Hero = () => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-10 pt-14 text-center md:px-8 md:pb-14 md:pt-24">
        <h1
            className="lp-display mx-auto max-w-4xl landing-fade-in-up-lg landing-delay-100"
            style={{ fontSize: "clamp(2rem, 5.2vw, 4rem)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "#050505", textWrap: "balance" }}
        >
            Mandou a proposta de energia solar{" "}
            <span className="lp-serif" style={{ color: "#050505" }}>
                e o cliente sumiu?
            </span>
        </h1>
        <p
            className="mx-auto mt-7 max-w-[580px] landing-fade-in-up-lg landing-delay-200"
            style={{ fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.68)" }}
        >
            O Vyzon lê as conversas de orçamento do seu WhatsApp e mostra quais propostas pararam, há quantos dias e
            quanto valem. Para cada uma, a mensagem de retomada já vem pronta.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 landing-fade-in-up-lg landing-delay-300">
            <div className="flex flex-wrap items-center justify-center gap-3">
                <a href="#raio-x" className="vz-btn vz-btn--primary">
                    <span>Quero meu Raio-X grátis</span>
                    <span className="vz-btn__arrow" aria-hidden="true">
                        →
                    </span>
                </a>
                <a
                    href={whatsappUrl(WHATSAPP_MESSAGE)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vz-btn vz-btn--secondary"
                    onClick={() => trackWhatsappClick("hero")}
                >
                    <span>Falar no WhatsApp</span>
                </a>
            </div>
            <span className="text-sm" style={{ color: "var(--lp-ink-55)" }}>
                Grátis, sem cartão. Você recebe em até 24 horas.
            </span>
        </div>
    </section>
);

// Mockup do produto: à esquerda as propostas acompanhadas, à direita o
// WhatsApp do dono recebendo a retomada pronta. Dados de exemplo.
const PROPOSALS = [
    { client: "Residência Oliveira", system: "6,2 kWp", value: "R$ 24.900", sent: "há 2 dias", status: "sem resposta", tone: DARK.amber },
    { client: "Mercado Bom Preço", system: "38 kWp", value: "R$ 118.000", sent: "há 6 h", status: "aguardando", tone: DARK.muted },
    { client: "Sítio Santa Luzia", system: "15 kWp", value: "R$ 52.300", sent: "há 5 dias", status: "retomada enviada", tone: DARK.green },
    { client: "Clínica Vida", system: "11 kWp", value: "R$ 39.800", sent: "há 1 dia", status: "aguardando", tone: DARK.muted },
    { client: "Casa Fernandes", system: "4,5 kWp", value: "R$ 18.700", sent: "há 9 dias", status: "fechou", tone: DARK.green },
];

const ProductMock = () => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8 md:pb-24" aria-label="Como a EVA aparece pra você">
        <div
            className="overflow-hidden"
            style={{
                background: DARK.bg,
                color: DARK.text,
                border: `1px solid ${DARK.line}`,
                borderRadius: 8,
                fontFamily: "Geist, Inter, system-ui, sans-serif",
                fontSize: 14,
            }}
        >
            <div className="grid md:grid-cols-[1.6fr_1fr]">
                <div className="min-w-0" style={{ borderRight: `1px solid ${DARK.line}` }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${DARK.line}` }}>
                        <span className="font-medium">Propostas acompanhadas</span>
                        <span style={{ color: DARK.dim, fontSize: 12 }}>exemplo</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left" style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ color: DARK.dim, fontSize: 12 }}>
                                    {["Cliente", "Sistema", "Valor", "Enviada", "Situação"].map((h) => (
                                        <th key={h} className="px-4 py-2 font-normal" style={{ borderBottom: `1px solid ${DARK.line}` }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {PROPOSALS.map((p) => (
                                    <tr key={p.client} style={{ borderBottom: `1px solid ${DARK.line}` }}>
                                        <td className="px-3 py-2.5 whitespace-nowrap">{p.client}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums" style={{ color: DARK.muted }}>
                                            {p.system}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{p.value}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: DARK.muted }}>
                                            {p.sent}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-2">
                                                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: p.tone, display: "inline-block" }} />
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col" style={{ background: DARK.panel }}>
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${DARK.line}` }}>
                        <span className="font-medium">Seu WhatsApp</span>
                        <span style={{ color: DARK.dim, fontSize: 12 }}> · hoje, 09:02</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                        <Bubble from="eva">
                            <span style={{ color: DARK.dim, fontSize: 12 }}>EVA · proposta 2 dias sem resposta</span>
                            <p className="mt-1">Residência Oliveira, 6,2 kWp, R$ 24.900. Rascunho da retomada:</p>
                            <p className="mt-2" style={{ color: DARK.muted }}>
                                “Oi, Carlos, tudo bem? Conseguiu olhar a proposta do sistema? Se ajudar, te mando a simulação
                                com financiamento pra comparar com a sua conta de luz de hoje.”
                            </p>
                            <p className="mt-2" style={{ color: DARK.dim, fontSize: 12 }}>
                                Responda <b style={{ color: DARK.text }}>1</b> pra enviar, <b style={{ color: DARK.text }}>2</b> pra
                                descartar, ou escreva a sua versão.
                            </p>
                        </Bubble>
                        <Bubble from="owner">1</Bubble>
                        <Bubble from="eva">
                            <span className="inline-flex items-center gap-2">
                                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: DARK.green, display: "inline-block" }} />
                                Enviado pro Carlos do seu número, com o seu nome.
                            </span>
                        </Bubble>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const Bubble = ({ from, children }: { from: "eva" | "owner"; children: ReactNode }) => (
    <div
        className={`max-w-[92%] px-3 py-2.5 ${from === "owner" ? "self-end" : "self-start"}`}
        style={{
            background: from === "owner" ? "#1f3a2c" : DARK.bg,
            border: `1px solid ${from === "owner" ? "#2b5a40" : DARK.lineStrong}`,
            borderRadius: 6,
            lineHeight: 1.45,
        }}
    >
        {children}
    </div>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
    <h2 className="lp-display text-3xl leading-tight md:text-4xl" style={{ color: "#050505" }}>
        {children}
    </h2>
);

const Pain = () => (
    <section className="mx-auto w-full max-w-[720px] px-5 pb-16 md:px-8 md:pb-24">
        <SectionTitle>O filme de toda semana</SectionTitle>
        <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
            Você pega a conta de luz, dimensiona o sistema, faz a simulação e manda uma proposta caprichada. O cliente
            responde que vai conversar em casa. E some. Enquanto isso você está em cima de outro telhado, e a proposta
            de R$ 25 mil fica parada no meio de duzentas conversas.
        </p>
        <p className="mt-6 border-l-2 pl-4 text-[15px] leading-relaxed" style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-55)" }}>
            62% dos consumidores já desistiram de uma compra por demora na resposta. Opinion Box e Mobile Time, Panorama
            Mensageria 2025.
        </p>
    </section>
);

const REPORT_ITEMS = [
    "Quantas propostas saíram nas conversas que você mandou.",
    "Quais ficaram sem resposta, e há quantos dias.",
    "Quanto elas somam, pelo valor que aparece na conversa.",
    "A mensagem de retomada pronta pra cada cliente, no seu tom.",
];

const WhatYouGet = () => (
    <section className="mx-auto w-full max-w-[720px] px-5 pb-16 md:px-8 md:pb-24">
        <SectionTitle>O que vem no Raio-X</SectionTitle>
        <ul className="mt-6 grid gap-0">
            {REPORT_ITEMS.map((item) => (
                <li
                    key={item}
                    className="border-t py-4 text-[17px] leading-relaxed"
                    style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-70)" }}
                >
                    {item}
                </li>
            ))}
        </ul>
        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink)" }}>
            E uma conta simples: se uma dessas propostas fechar, quanto isso paga?
        </p>
    </section>
);

const STEPS = [
    {
        title: "Você manda as conversas",
        body: "Exporta de 10 a 15 conversas de orçamento pelo próprio WhatsApp, ou conecta o número por QR code, sem trocar de número.",
    },
    {
        title: "Em até 24 horas, o Raio-X",
        body: "Você recebe quais propostas pararam, quanto valem e a retomada pronta de cada uma.",
    },
    {
        title: "Se quiser, a EVA segue acompanhando",
        body: "Cada proposta nova que sai do seu WhatsApp passa a ser acompanhada. Dois dias sem resposta e a retomada chega pronta no seu celular.",
    },
];

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8 md:pb-24">
        <SectionTitle>Como funciona</SectionTitle>
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((s, i) => (
                <li key={s.title} className="border-t pt-5" style={{ borderColor: "var(--lp-line)" }}>
                    <span className="text-sm tabular-nums" style={{ color: "var(--lp-ink-40)" }}>
                        0{i + 1}
                    </span>
                    <h3 className="mt-2 text-lg font-medium leading-snug" style={{ color: "var(--lp-ink)" }}>
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

const NotABot = () => (
    <section className="mx-auto w-full max-w-[720px] px-5 pb-16 md:px-8 md:pb-24">
        <SectionTitle>Não é robô falando com seu cliente</SectionTitle>
        <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
            Nada sai sem você aprovar. A mensagem vai do seu número, com o seu nome, no seu tom. Se você não responder,
            ela não sai. Em 48 horas o rascunho expira sozinho.
        </p>
    </section>
);

// Espelhado no FAQPage do index.html: mudou aqui, muda lá.
const FAQ = [
    {
        q: "Quanto custa?",
        a: "O Raio-X é grátis. Se depois você quiser que a EVA acompanhe as suas propostas todo mês, custa R$ 197 por mês.",
    },
    {
        q: "O que vocês fazem com as minhas conversas?",
        a: "Usamos só para montar o seu Raio-X. Depois da entrega, apagamos os arquivos que você mandou.",
    },
    {
        q: "Preciso trocar de número ou de celular?",
        a: "Não. Você continua usando o mesmo WhatsApp de sempre.",
    },
    {
        q: "A EVA responde meus clientes sozinha?",
        a: "Não. Ela escreve a retomada e manda pra você. A mensagem só sai se você aprovar.",
    },
];

const Faq = () => (
    <section className="mx-auto w-full max-w-[720px] px-5 pb-16 md:px-8 md:pb-24">
        <SectionTitle>Perguntas</SectionTitle>
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

const SignupForm = () => {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const phoneDigits = form.phone.replace(/\D/g, "");
    const valid =
        form.name.trim().length >= 2 &&
        (phoneDigits.length === 10 || phoneDigits.length === 11) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
        form.company.trim().length >= 2 &&
        form.monthly !== "";

    const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!valid || submitting) return;
        setSubmitting(true);
        setError(null);
        const phone = normalizePhone(form.phone);
        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            phone,
            company: form.company.trim(),
            biggest_pain: `Energia solar. Propostas por mês: ${form.monthly}`,
            source: SOURCE,
            ...getAttribution(),
        };
        const { data, error: rpcError } = await supabase.rpc("submit_demo_request", { payload });
        if (rpcError) {
            setSubmitting(false);
            setError("Não deu certo. Tenta de novo ou me chama direto no WhatsApp.");
            return;
        }
        const leadId = typeof data === "string" ? data : undefined;
        trackEvent(FUNNEL_EVENTS.ORCAMENTO_LEAD, { segment: "energia_solar", monthly: form.monthly });
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
        <section id="raio-x" className="mx-auto w-full max-w-[720px] scroll-mt-6 px-5 pb-20 md:px-8 md:pb-28">
            <div className="border-t pt-10" style={{ borderColor: "var(--lp-line)" }}>
                <SectionTitle>Pedir meu Raio-X</SectionTitle>
                <p className="mt-3 text-[15px]" style={{ color: "var(--lp-ink-55)" }}>
                    Grátis. O Markus te chama no WhatsApp pra combinar o envio das conversas.
                </p>

                {done ? (
                    <div className="mt-8 rounded-[10px] border p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                        <p className="text-lg font-medium" style={{ color: "var(--lp-ink)" }}>
                            Recebemos.
                        </p>
                        <p className="mt-1 text-[15px]" style={{ color: "var(--lp-ink-70)" }}>
                            O Markus vai te chamar no WhatsApp pra combinar o Raio-X.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="mt-8 grid gap-4" noValidate>
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nome da empresa">
                                <input className={inputCls} style={inputStyle} value={form.company} onChange={set("company")} autoComplete="organization" />
                            </Field>
                            <Field label="Propostas por mês">
                                <select className={inputCls} style={inputStyle} value={form.monthly} onChange={set("monthly")}>
                                    <option value="">Escolha</option>
                                    {MONTHLY_RANGES.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        {error && (
                            <p className="text-sm" role="alert" style={{ color: "#b42318" }}>
                                {error}{" "}
                                <a href={whatsappUrl(WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="underline" onClick={() => trackWhatsappClick("form_error")}>
                                    Abrir WhatsApp
                                </a>
                            </p>
                        )}
                        <div className="mt-2">
                            <ButtonV2 type="submit" disabled={!valid || submitting} showArrow>
                                {submitting ? "Enviando" : "Pedir meu Raio-X"}
                            </ButtonV2>
                        </div>
                    </form>
                )}
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
            <Link to="/agencias">Para agências</Link>
            <Link to="/politica-privacidade">Privacidade</Link>
            <Link to="/termos-de-servico">Termos</Link>
        </nav>
    </footer>
);

export default SolarLanding;
