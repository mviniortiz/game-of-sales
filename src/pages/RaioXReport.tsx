import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot } from "@/components/eva/EvaBot";

// Relatório do Raio-X (/relatorio/:token), aberto na conversa de 20 minutos e
// mandado depois pro integrador, que quase sempre lê no celular. Público pelo
// token; mostra só primeiro nome, valor, dias e a retomada sugerida, nunca o
// texto das conversas. Super admin vê o botão "Não é proposta", e os números
// se refazem a partir dos itens.
//
// A retomada aparece do jeito que a EVA manda no WhatsApp do dono
// (buildDraftMessage em supabase/functions/_shared/whatsappApproval.ts). Se
// aquele formato mudar, este espelho muda junto.

type Status = "no_reply" | "went_quiet" | "your_turn" | "talking";

type Item = {
    first_name: string | null;
    status: Status;
    days_since_quote: number;
    days_silent: number;
    amount: number | null;
    kwp: number | null;
    detected_by: "pdf" | "text";
    reading: string | null;
    draft: string | null;
    excluded?: boolean;
};

type Report = {
    company_name: string | null;
    created_at: string;
    summary: { messages_read: number; window_days: number };
    items: Item[];
};

type Row = { item: Item; index: number; code: string | null };

const RECENT_DAYS = 30;

const STATUS_LABEL: Record<Status, string> = {
    no_reply: "Sem resposta",
    went_quiet: "Respondeu e parou",
    your_turn: "Esperando você",
    talking: "Em conversa",
};

// Mesma sequência de nextApprovalCode: A2, A3 ... A9, B2 ...
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_DIGITS = "23456789";
const codeAt = (n: number) => `${CODE_LETTERS[Math.floor(n / CODE_DIGITS.length)] ?? "Z"}${CODE_DIGITS[n % CODE_DIGITS.length]}`;

const WA_WALL = "#efeae2";
const WA_OUT = "#d9fdd3";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dias = (n: number) => (n === 0 ? "hoje" : n === 1 ? "há 1 dia" : `há ${n} dias`);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const RaioXReport = () => {
    const { token = "" } = useParams();
    const [report, setReport] = useState<Report | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        document.title = "Raio-X das propostas | Vyzon";
        const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        const prev = robots?.content;
        if (robots) robots.content = "noindex, nofollow";
        return () => {
            if (robots && prev !== undefined) robots.content = prev;
        };
    }, []);

    useEffect(() => {
        let alive = true;
        // RPC nova ainda fora dos tipos gerados.
        void supabase.rpc("get_raio_x_report" as never, { p_token: token } as never).then(({ data }) => {
            if (!alive) return;
            if (data) {
                setReport(data as unknown as Report);
                setState("ready");
            } else setState("missing");
        });
        void supabase.auth.getUser().then(async ({ data }) => {
            if (!data.user) return;
            const { data: me } = await supabase.from("profiles").select("is_super_admin").eq("id", data.user.id).maybeSingle();
            if (alive) setIsAdmin(Boolean(me?.is_super_admin));
        });
        return () => {
            alive = false;
        };
    }, [token]);

    const toggle = async (index: number, excluded: boolean) => {
        if (!report) return;
        const items = report.items.map((it, i) => (i === index ? { ...it, excluded } : it));
        setReport({ ...report, items });
        const { error } = await supabase.rpc("raio_x_set_excluded" as never, { p_token: token, p_index: index, p_excluded: excluded } as never);
        if (error) setReport(report);
    };

    const view = useMemo(() => {
        const all = report?.items ?? [];
        let drafted = 0;
        const rows: Row[] = all.map((item, index) => ({
            item,
            index,
            code: item.draft && !item.excluded && item.status !== "talking" ? codeAt(drafted++) : null,
        }));
        // O integrador não vê o que o Markus marcou como "não é proposta".
        const visible = rows.filter((r) => isAdmin || !r.item.excluded);
        const valid = rows.filter((r) => !r.item.excluded).map((r) => r.item);
        const stuck = valid.filter((i) => i.status !== "talking");
        const recent = stuck.filter((i) => i.days_since_quote <= RECENT_DAYS);
        const sum = (l: Item[]) => l.reduce((a, i) => a + (i.amount ?? 0), 0);
        const biggest = [...recent].filter((i) => i.amount).sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0] ?? null;
        const isStuck = (r: Row) => r.item.status !== "talking";
        return {
            quotes: valid.length,
            stuck: stuck.length,
            recentValue: sum(recent),
            totalValue: sum(stuck),
            withoutValue: stuck.filter((i) => i.amount === null).length,
            yourTurn: stuck.filter((i) => i.status === "your_turn").length,
            biggest,
            today: visible.filter((r) => isStuck(r) && r.item.status === "your_turn"),
            week: visible.filter((r) => isStuck(r) && r.item.status !== "your_turn" && r.item.days_since_quote <= RECENT_DAYS),
            cold: visible.filter((r) => isStuck(r) && r.item.status !== "your_turn" && r.item.days_since_quote > RECENT_DAYS),
            talking: visible.filter((r) => !isStuck(r)),
            example: rows.find((r) => r.code) ?? null,
        };
    }, [report, isAdmin]);

    if (state === "loading") {
        return (
            <Shell>
                <p className="py-24 text-center text-[15px]" style={{ color: "var(--lp-ink-55)" }} role="status">
                    Carregando o Raio-X…
                </p>
            </Shell>
        );
    }
    if (state === "missing" || !report) {
        return (
            <Shell>
                <div className="py-24 text-center">
                    <h1 className="lp-display text-3xl" style={{ color: "var(--lp-ink)" }}>
                        Raio-X não encontrado
                    </h1>
                    <p className="mt-3 text-[15px]" style={{ color: "var(--lp-ink-55)" }}>
                        Confira o link que você recebeu ou fale com o Markus no WhatsApp.
                    </p>
                </div>
            </Shell>
        );
    }

    const headline = view.recentValue > 0 ? view.recentValue : view.totalValue;
    const headlineScope = view.recentValue > 0 ? "nos últimos 30 dias" : `nos últimos ${report.summary.window_days} dias`;
    const created = new Date(report.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const rowProps = { isAdmin, onToggle: (index: number, ex: boolean) => void toggle(index, ex) };

    return (
        <Shell>
            <header className="pt-6 md:pt-12">
                <p className="text-[13px] md:text-sm" style={{ color: "var(--lp-ink-55)" }}>
                    Raio-X das propostas · {report.company_name ?? "sua empresa"} · {created}
                </p>
                {view.stuck === 0 ? (
                    <h1 className="lp-display mt-4" style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "var(--lp-ink)" }}>
                        Nenhuma proposta parada.
                    </h1>
                ) : (
                    <>
                        <h1 className="lp-display mt-3" style={{ fontSize: "clamp(2.6rem, 11vw, 5rem)", lineHeight: 1, letterSpacing: "-0.045em", color: "var(--lp-ink)" }}>
                            {headline > 0 ? brl(headline) : plural(view.stuck, "proposta", "propostas")}
                        </h1>
                        <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed md:text-[17px]" style={{ color: "var(--lp-ink-70)" }}>
                            {headline > 0
                                ? `em propostas paradas no seu WhatsApp ${headlineScope}, pelo valor escrito nas conversas.`
                                : `paradas no seu WhatsApp ${headlineScope}. O valor está nos PDFs, que o Raio-X não abre.`}
                            {headline > 0 && view.withoutValue > 0 &&
                                ` Mais ${plural(view.withoutValue, "proposta", "propostas")} com o valor só no PDF, fora dessa soma.`}
                        </p>
                        {view.biggest?.amount && (
                            <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-90)" }}>
                                A maior: {view.biggest.first_name ?? "cliente"}, <strong className="font-medium tabular-nums">{brl(view.biggest.amount)}</strong>,{" "}
                                {view.biggest.status === "your_turn"
                                    ? `esperando sua resposta ${dias(view.biggest.days_silent)}.`
                                    : `parada ${dias(view.biggest.days_silent)}.`}
                            </p>
                        )}
                    </>
                )}
            </header>

            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border md:mt-10 md:grid-cols-4" style={{ borderColor: "var(--lp-line)", background: "var(--lp-line)" }}>
                <Stat label="Propostas encontradas" value={view.quotes} />
                <Stat label="Paradas" value={view.stuck} />
                <Stat label="Cliente esperando você" value={view.yourTurn} highlight={view.yourTurn > 0} />
                <Stat label="Mensagens lidas" value={report.summary.messages_read.toLocaleString("pt-BR")} />
            </dl>

            {view.stuck > 0 && (
                <section className="mt-12 md:mt-14" aria-labelledby="plano">
                    <h2 id="plano" className="lp-display text-[26px] leading-tight md:text-3xl" style={{ color: "var(--lp-ink)" }}>
                        O que fazer com elas
                    </h2>
                    <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        Em ordem de urgência. Nas maiores, a EVA já escreveu a retomada no tom da sua conversa com o cliente.
                    </p>

                    <Group title="Responda hoje" hint="O cliente mandou a última mensagem e ninguém respondeu." rows={view.today} {...rowProps} />
                    <Group title="Retome esta semana" hint="Proposta dos últimos 30 dias, sem resposta ou com o cliente quieto." rows={view.week} {...rowProps} />
                    <Group title="Esfriaram" hint="Mais de 30 dias. Vale uma mensagem nova, não uma cobrança." rows={view.cold} collapsed {...rowProps} />
                    {view.talking.length > 0 && (
                        <Group title="Em conversa" hint="Ainda andando. Nada a fazer por enquanto." rows={view.talking} collapsed {...rowProps} />
                    )}
                </section>
            )}

            <Companion example={view.example} />

            <section className="mt-12 rounded-[10px] border p-5 md:mt-14 md:p-8" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                <h2 className="lp-display text-[24px] leading-tight md:text-2xl" style={{ color: "var(--lp-ink)" }}>
                    Nenhuma mensagem foi enviada aos seus clientes.
                </h2>
                <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                    As retomadas deste relatório são rascunhos. Com o Vyzon ligado, a EVA acompanha cada proposta nova que sai do seu WhatsApp e te chama
                    quando ela para. Você confere, responde 1 e a mensagem sai do seu número.
                </p>
                <Link to="/criar-conta?segmento=energia_solar" className="vz-btn vz-btn--primary mt-6 inline-flex w-full justify-center sm:w-auto">
                    <span>Testar 14 dias grátis</span>
                    <span className="vz-btn__arrow" aria-hidden="true">
                        →
                    </span>
                </Link>
            </section>

            <p className="mt-8 pb-14 text-[13px] leading-relaxed md:text-sm" style={{ color: "var(--lp-ink-40)" }}>
                Como contamos: PDF enviado (menos boleto, contrato e recibo) ou mensagem com valor e palavra de orçamento, nos últimos{" "}
                {report.summary.window_days} dias, fora de grupos. Parada: sem resposta há 2 dias ou mais, cliente que parou de responder há 3 dias
                ou mais, ou cliente esperando resposta há 1 dia ou mais. Valor só quando aparece escrito na conversa.
            </p>
        </Shell>
    );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
        <div className="mx-auto w-full max-w-[880px] px-4 sm:px-5 md:px-8">
            <div className="flex items-center justify-between py-5">
                <Link to="/" aria-label="Vyzon, início">
                    <ThemeLogo className="h-[22px] w-auto" />
                </Link>
            </div>
            {children}
        </div>
    </div>
);

const Stat = ({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) => (
    <div className="px-4 py-3.5 md:py-4" style={{ background: "var(--lp-white)" }}>
        <dt className="text-[12.5px] md:text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
            {label}
        </dt>
        <dd className="mt-1 text-[22px] font-medium tabular-nums md:text-2xl" style={{ color: highlight ? "var(--lp-blue)" : "var(--lp-ink)", letterSpacing: "-0.02em" }}>
            {value}
        </dd>
    </div>
);

type RowProps = { isAdmin: boolean; onToggle: (index: number, excluded: boolean) => void };

const Group = ({ title, hint, rows, collapsed, ...rowProps }: { title: string; hint: string; rows: Row[]; collapsed?: boolean } & RowProps) => {
    if (rows.length === 0) return null;
    const head = (
        <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-medium" style={{ color: "var(--lp-ink)" }}>
                {title} <span className="tabular-nums" style={{ color: "var(--lp-ink-40)" }}>· {rows.length}</span>
            </h3>
        </div>
    );
    const list = (
        <ul className="mt-3 space-y-3">
            {rows.map((r) => (
                <ItemCard key={r.index} row={r} {...rowProps} />
            ))}
        </ul>
    );
    if (collapsed) {
        return (
            <details className="group mt-8 border-t pt-5" style={{ borderColor: "var(--lp-line)" }}>
                <summary className="cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)]">
                    {head}
                    <p className="mt-1 text-[14px]" style={{ color: "var(--lp-ink-55)" }}>
                        {hint} <span className="underline underline-offset-4 group-open:hidden">Ver lista</span>
                    </p>
                </summary>
                {list}
            </details>
        );
    }
    return (
        <div className="mt-8 border-t pt-5" style={{ borderColor: "var(--lp-line)" }}>
            {head}
            <p className="mt-1 text-[14px]" style={{ color: "var(--lp-ink-55)" }}>
                {hint}
            </p>
            {list}
        </div>
    );
};

const ItemCard = ({ row, isAdmin, onToggle }: { row: Row } & RowProps) => {
    const { item, index, code } = row;
    const urgent = item.status === "your_turn" && !item.excluded;
    return (
        <li className="rounded-[10px] border p-4 md:p-5" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", opacity: item.excluded ? 0.5 : 1 }}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[17px] font-medium" style={{ color: "var(--lp-ink)", textDecoration: item.excluded ? "line-through" : undefined }}>
                        {item.first_name ?? "Cliente"}
                    </p>
                    <span
                        className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[12px]"
                        style={{ borderColor: urgent ? "var(--lp-blue)" : "var(--lp-line)", color: urgent ? "var(--lp-blue)" : "var(--lp-ink-55)" }}
                    >
                        {item.excluded ? "Não é proposta" : STATUS_LABEL[item.status]}
                    </span>
                </div>
                <span className="shrink-0 text-[17px] font-medium tabular-nums" style={{ color: item.amount ? "var(--lp-ink)" : "var(--lp-ink-40)" }}>
                    {item.amount ? brl(item.amount) : "valor no PDF"}
                </span>
            </div>
            <p className="mt-2 text-[14px] leading-snug" style={{ color: "var(--lp-ink-55)" }}>
                Proposta {dias(item.days_since_quote)}
                {item.status !== "no_reply" && item.status !== "talking" && ` · cliente falou ${dias(item.days_silent)}`}
                {item.kwp ? ` · ${item.kwp.toLocaleString("pt-BR")} kWp` : ""}
                {item.detected_by === "pdf" ? " · em PDF" : ""}
            </p>
            {code && item.draft && <DraftAsEva code={code} item={item} draft={item.draft} />}
            {isAdmin && (
                <button
                    type="button"
                    onClick={() => onToggle(index, !item.excluded)}
                    className="mt-3 rounded text-[12px] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)]"
                    style={{ color: "var(--lp-ink-40)" }}
                >
                    {item.excluded ? "Voltar a contar" : "Não é proposta"}
                </button>
            )}
        </li>
    );
};

/** A retomada como a EVA entrega no WhatsApp do dono, mais o atalho de enviar já. */
const DraftAsEva = ({ code, item, draft }: { code: string; item: Item; draft: string }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(draft);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // sem permissão de área de transferência: o texto continua selecionável
        }
    };
    return (
        <div className="mt-4">
            <p className="text-[12.5px]" style={{ color: "var(--lp-ink-55)" }}>
                Assim a EVA te chamaria no WhatsApp:
            </p>
            <div className="mt-2 rounded-[10px] p-2.5 sm:p-3" style={{ background: WA_WALL }}>
                <div className="max-w-[94%] rounded-[8px] rounded-tl-none px-3 py-2.5 text-[14.5px] leading-[1.45]" style={{ background: "#fff", color: "#111b21", boxShadow: "0 1px 0.5px rgba(11,20,26,.13)" }}>
                    <p className="flex items-center gap-2 font-medium">
                        <EvaBot size={20} still />
                        EVA [{code}] rascunho pronto
                    </p>
                    <p className="mt-2">Lead: {item.first_name ?? "cliente"}</p>
                    {item.reading && <p>Por que agora: {item.reading}</p>}
                    <p className="mt-2 whitespace-pre-line">{draft}</p>
                    <p className="mt-2" style={{ color: "#54656f" }}>
                        Responda {code} 1 para enviar, {code} 2 para descartar, ou escreva o texto corrigido.
                    </p>
                </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(draft)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] focus-visible:ring-offset-2"
                    style={{ background: "var(--lp-ink)", color: "var(--lp-white)" }}
                >
                    Enviar pelo WhatsApp
                </a>
                <button
                    type="button"
                    onClick={() => void copy()}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border px-5 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] focus-visible:ring-offset-2"
                    style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink)" }}
                    aria-live="polite"
                >
                    {copied ? "Copiado" : "Copiar texto"}
                </button>
            </div>
        </div>
    );
};

const STEPS = [
    ["Ela lê cada conversa", "Percebe quando sai uma proposta e quando o cliente para de responder."],
    ["No 2º dia sem resposta, te chama", "No seu WhatsApp, com a retomada já escrita no tom da conversa."],
    ["Você responde 1 e ela envia", "Do seu número. Responde 2 e descarta, ou escreve o texto do seu jeito."],
] as const;

/** A EVA como companheira: o fluxo de verdade, com o exemplo da maior parada. */
const Companion = ({ example }: { example: Row | null }) => (
    <section className="mt-14 md:mt-16" aria-labelledby="eva">
        <p className="flex items-center gap-3 text-[13px] font-medium" style={{ color: "var(--lp-eva)" }}>
            <EvaBot size={44} />
            EVA, sua companheira
        </p>
        <h2 id="eva" className="lp-display mt-2 text-[26px] leading-tight md:text-3xl" style={{ color: "var(--lp-ink)" }}>
            Uma companheira que lembra das propostas por você
        </h2>
        <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
            Você não abre sistema nenhum. Ela trabalha dentro do WhatsApp que você já usa, e nada sai para o cliente sem o seu ok.
        </p>
        <div className="mt-6 grid items-start gap-8 md:grid-cols-[1fr_320px] md:gap-10">
            <ol className="space-y-5">
                {STEPS.map(([title, body], i) => (
                    <li key={title} className="flex gap-4">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-medium tabular-nums"
                            style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", color: "var(--lp-ink)" }}
                            aria-hidden="true"
                        >
                            {i + 1}
                        </span>
                        <div>
                            <p className="text-[16px] font-medium" style={{ color: "var(--lp-ink)" }}>
                                {title}
                            </p>
                            <p className="mt-0.5 text-[14.5px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                                {body}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
            {example?.code && example.item.draft && <PhoneThread code={example.code} name={example.item.first_name} draft={example.item.draft} />}
        </div>
    </section>
);

const PhoneThread = ({ code, name, draft }: { code: string; name: string | null; draft: string }) => {
    const short = draft.length > 150 ? `${draft.slice(0, 147).trimEnd()}…` : draft;
    const bubble = "max-w-[88%] rounded-[8px] px-3 py-2 text-[13.5px] leading-[1.4]";
    return (
        <figure className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[22px] border" style={{ borderColor: "var(--lp-line)", background: WA_WALL }} aria-label="Exemplo da conversa com a EVA no WhatsApp">
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: "var(--lp-white)" }}>
                <EvaBot size={32} state="talking" />
                <div>
                    <p className="text-[14px] font-medium" style={{ color: "#111b21" }}>
                        EVA
                    </p>
                    <p className="text-[11.5px]" style={{ color: "#667781" }}>
                        no seu WhatsApp
                    </p>
                </div>
            </div>
            <div className="space-y-2 p-3">
                <div className={`${bubble} rounded-tl-none`} style={{ background: "#fff", color: "#111b21" }}>
                    <p className="font-medium">EVA [{code}] rascunho pronto</p>
                    <p className="mt-1">Lead: {name ?? "cliente"}</p>
                    <p className="mt-1.5" style={{ color: "#3b4a54" }}>
                        {short}
                    </p>
                </div>
                <div className={`${bubble} ml-auto rounded-tr-none`} style={{ background: WA_OUT, color: "#111b21", width: "fit-content" }}>
                    {code} 1
                </div>
                <div className={`${bubble} rounded-tl-none`} style={{ background: "#fff", color: "#111b21", width: "fit-content" }}>
                    EVA Enviado para {name ?? "o cliente"}.
                </div>
            </div>
        </figure>
    );
};

export default RaioXReport;
