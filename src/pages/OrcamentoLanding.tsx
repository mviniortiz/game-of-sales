import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackDemoConversion, FUNNEL_EVENTS } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";

// Landing de validação de UMA dor: "mandou o orçamento e o cliente sumiu".
// Cadastro vai pra demo_requests com source='orcamento_teste' (o SDR automático
// ignora essa origem; o contato é manual). Copy em
// G:\Vyzon\validacao-agenda\landing-orcamento-copy.md.

const SOURCE = "orcamento_teste";

const BUSINESS_TYPES = ["Estética ou clínica", "Prestador de serviço", "Loja", "Agência", "Outro"];
const WEEKLY_RANGES = ["Até 5", "De 5 a 20", "Mais de 20"];

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
    red: "#f97373",
} as const;

type FormState = {
    name: string;
    phone: string;
    email: string;
    business: string;
    weekly: string;
};

const EMPTY_FORM: FormState = { name: "", phone: "", email: "", business: "", weekly: "" };

const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    return digits.startsWith("55") && digits.length >= 12 ? `+${digits}` : `+55${digits}`;
};

const OrcamentoLanding = () => {
    useEffect(() => {
        document.title = "Mandou o orçamento e o cliente sumiu? | Vyzon";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const previous = meta?.content;
        if (meta) {
            meta.content =
                "A EVA acompanha os orçamentos que você manda pelo WhatsApp e, se o cliente some, prepara a retomada pra você aprovar. Teste fechado pra 20 negócios.";
        }
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => {
            if (wasDark) html.classList.add("dark");
            if (meta && previous !== undefined) meta.content = previous;
        };
    }, []);

    useEffect(() => {
        trackEvent(FUNNEL_EVENTS.LANDING_VIEW, { page: "orcamento" });
    }, []);

    return (
        <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <Header />
            <main>
                <Hero />
                <ProductMock />
                <Pain />
                <HowItWorks />
                <NotABot />
                <SignupForm />
            </main>
            <Footer />
        </div>
    );
};

const Header = () => (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--lp-ink)" }}>
            Vyzon
        </Link>
        <a href="#teste" className="vz-btn vz-btn--primary vz-btn--sm">
            <span>Quero entrar no teste</span>
        </a>
    </header>
);

const Hero = () => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-10 pt-14 text-center md:px-8 md:pb-14 md:pt-24">
        <h1
            className="lp-display mx-auto max-w-3xl landing-fade-in-up-lg landing-delay-100"
            style={{ fontSize: "clamp(2rem, 5.6vw, 4.25rem)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "#050505", textWrap: "balance" }}
        >
            Mandou o orçamento
            <br />
            <span className="lp-serif" style={{ color: "#050505" }}>
                e o cliente sumiu?
            </span>
        </h1>
        <p
            className="mx-auto mt-7 max-w-[560px] landing-fade-in-up-lg landing-delay-200"
            style={{ fontSize: "clamp(0.9375rem, 1.3vw, 1.0625rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.68)" }}
        >
            A EVA acompanha cada orçamento que você envia pelo WhatsApp. Se o cliente some, ela escreve a mensagem de
            retomada e manda pro seu celular. Você responde 1 e ela sai em seu nome.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 landing-fade-in-up-lg landing-delay-300">
            <a href="#teste" className="vz-btn vz-btn--primary">
                <span>Quero entrar no teste</span>
                <span className="vz-btn__arrow" aria-hidden="true">
                    →
                </span>
            </a>
            <span className="text-sm" style={{ color: "var(--lp-ink-55)" }}>
                Estamos abrindo pra 20 negócios. Sem cartão.
            </span>
        </div>
    </section>
);

// Mockup do produto: à esquerda os orçamentos acompanhados, à direita o
// WhatsApp do dono recebendo a retomada pronta.
const QUOTES = [
    { client: "Juliana M.", service: "Limpeza de pele + peeling", value: "R$ 1.850", sent: "há 2 dias", status: "sem resposta", tone: DARK.amber },
    { client: "Carlos R.", service: "Projeto elétrico", value: "R$ 4.200", sent: "há 5 h", status: "aguardando", tone: DARK.muted },
    { client: "Studio Nara", service: "Identidade visual", value: "R$ 3.600", sent: "há 4 dias", status: "retomada enviada", tone: DARK.green },
    { client: "Paulo T.", service: "Harmonização", value: "R$ 2.900", sent: "há 1 h", status: "aguardando", tone: DARK.muted },
    { client: "Ana Beatriz", service: "Cílios fio a fio", value: "R$ 280", sent: "há 6 dias", status: "fechou", tone: DARK.green },
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
                        <span className="font-medium">Orçamentos acompanhados</span>
                        <span style={{ color: DARK.dim, fontSize: 12 }}>esta semana · 5</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left" style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ color: DARK.dim, fontSize: 12 }}>
                                    {["Cliente", "Serviço", "Valor", "Enviado", "Situação"].map((h) => (
                                        <th key={h} className="px-4 py-2 font-normal" style={{ borderBottom: `1px solid ${DARK.line}` }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {QUOTES.map((q) => (
                                    <tr key={q.client} style={{ borderBottom: `1px solid ${DARK.line}` }}>
                                        <td className="px-3 py-2.5 whitespace-nowrap">{q.client}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: DARK.muted }}>
                                            {q.service}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{q.value}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: DARK.muted }}>
                                            {q.sent}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-2">
                                                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: q.tone, display: "inline-block" }} />
                                                {q.status}
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
                            <span style={{ color: DARK.dim, fontSize: 12 }}>EVA · orçamento 2 dias sem resposta</span>
                            <p className="mt-1">
                                Juliana M., limpeza de pele + peeling, R$ 1.850. Rascunho da retomada:
                            </p>
                            <p className="mt-2" style={{ color: DARK.muted }}>
                                “Oi Juliana, tudo bem? Passando pra saber se ficou alguma dúvida no orçamento. Se quiser,
                                consigo te encaixar ainda essa semana.”
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
                                Enviado pra Juliana do seu número, com o seu nome.
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

const Pain = () => (
    <section className="mx-auto w-full max-w-[720px] px-5 pb-16 md:px-8 md:pb-24">
        <h2 className="lp-display text-3xl leading-tight md:text-4xl" style={{ color: "#050505" }}>
            O filme de toda semana
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
            Você monta o orçamento com urgência. Explica tudo, manda caprichado. E aí, silêncio. Você até pensa em cobrar
            um retorno, mas a semana engole e você esquece. Na semana seguinte são mais dez orçamentos e o mesmo filme.
        </p>
        <p className="mt-6 border-l-2 pl-4 text-[15px] leading-relaxed" style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-55)" }}>
            62% dos consumidores já desistiram de uma compra por demora na resposta. Opinion Box e Mobile Time, Panorama
            Mensageria 2025.
        </p>
    </section>
);

const STEPS = [
    {
        title: "Conecte o WhatsApp que você já usa",
        body: "Leitura de QR, sem trocar de número. Seus clientes continuam falando com você no mesmo lugar.",
    },
    {
        title: "Mande seus orçamentos como sempre",
        body: "A EVA reconhece quando um orçamento saiu e passa a acompanhar cada um.",
    },
    {
        title: "Cliente sumiu? A retomada chega pronta",
        body: "Dois dias sem resposta e você recebe a mensagem no seu WhatsApp. 1 envia, 2 descarta, ou você escreve a sua.",
    },
];

const HowItWorks = () => (
    <section className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8 md:pb-24">
        <h2 className="lp-display text-3xl leading-tight md:text-4xl" style={{ color: "#050505" }}>
            Como funciona
        </h2>
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
        <h2 className="lp-display text-3xl leading-tight md:text-4xl" style={{ color: "#050505" }}>
            Não é robô falando com seu cliente
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
            Nada sai sem você aprovar. A mensagem vai do seu número, com o seu nome, no seu tom. Se você não responder,
            ela não sai. Em 48 horas o rascunho expira sozinho.
        </p>
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
        form.business !== "" &&
        form.weekly !== "";

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
            company: form.business,
            biggest_pain: `Orçamentos por semana: ${form.weekly}`,
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
        trackEvent(FUNNEL_EVENTS.ORCAMENTO_LEAD, { business: form.business, weekly: form.weekly });
        void trackDemoConversion({ email: payload.email, phone, leadId });
        try {
            (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Lead", { content_name: SOURCE });
        } catch {
            // analytics nunca derruba o cadastro
        }
        setSubmitting(false);
        setDone(true);
    };

    return (
        <section id="teste" className="mx-auto w-full max-w-[720px] px-5 pb-20 md:px-8 md:pb-28">
            <div className="border-t pt-10" style={{ borderColor: "var(--lp-line)" }}>
                <h2 className="lp-display text-3xl leading-tight md:text-4xl" style={{ color: "#050505" }}>
                    Entrar no teste
                </h2>
                <p className="mt-3 text-[15px]" style={{ color: "var(--lp-ink-55)" }}>
                    20 negócios, sem cartão. O Markus te chama no WhatsApp pra combinar.
                </p>

                {done ? (
                    <div className="mt-8 rounded-[10px] border p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                        <p className="text-lg font-medium" style={{ color: "var(--lp-ink)" }}>
                            Recebemos.
                        </p>
                        <p className="mt-1 text-[15px]" style={{ color: "var(--lp-ink-70)" }}>
                            O Markus vai te chamar no WhatsApp pra combinar o teste.
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
                            <Field label="Tipo de negócio">
                                <select className={inputCls} style={inputStyle} value={form.business} onChange={set("business")}>
                                    <option value="">Escolha</option>
                                    {BUSINESS_TYPES.map((b) => (
                                        <option key={b} value={b}>
                                            {b}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Orçamentos por semana">
                                <select className={inputCls} style={inputStyle} value={form.weekly} onChange={set("weekly")}>
                                    <option value="">Escolha</option>
                                    {WEEKLY_RANGES.map((w) => (
                                        <option key={w} value={w}>
                                            {w}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        {error && (
                            <p className="text-sm" role="alert" style={{ color: "#b42318" }}>
                                {error}
                            </p>
                        )}
                        <div className="mt-2">
                            <ButtonV2 type="submit" disabled={!valid || submitting} showArrow>
                                {submitting ? "Enviando" : "Entrar na lista do teste"}
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
        <nav className="flex gap-5">
            <Link to="/politica-privacidade">Privacidade</Link>
            <Link to="/termos-de-servico">Termos</Link>
        </nav>
    </footer>
);

export default OrcamentoLanding;
