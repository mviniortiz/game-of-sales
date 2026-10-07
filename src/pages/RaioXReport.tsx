import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

// Relatório do Raio-X (/relatorio/:token), aberto na conversa de 20 minutos e
// mandado depois pro integrador. Público pelo token; mostra só primeiro nome,
// valor, dias e a retomada sugerida, nunca o texto das conversas. Super admin
// vê o botão "Não é proposta", e os números se refazem a partir dos itens.

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

const RECENT_DAYS = 30;

const STATUS_LABEL: Record<Status, string> = {
    no_reply: "Sem resposta",
    went_quiet: "Respondeu e parou",
    your_turn: "Esperando você",
    talking: "Em conversa",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dias = (n: number) => (n === 0 ? "hoje" : n === 1 ? "há 1 dia" : `há ${n} dias`);

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

    const numbers = useMemo(() => {
        const valid = (report?.items ?? []).filter((i) => !i.excluded);
        const stuck = valid.filter((i) => i.status !== "talking");
        const recent = stuck.filter((i) => i.days_since_quote <= RECENT_DAYS);
        const sum = (l: Item[]) => l.reduce((a, i) => a + (i.amount ?? 0), 0);
        return {
            quotes: valid.length,
            stuck: stuck.length,
            recent: recent.length,
            recentValue: sum(recent),
            totalValue: sum(stuck),
            withoutValue: stuck.filter((i) => i.amount === null).length,
            yourTurn: stuck.filter((i) => i.status === "your_turn").length,
        };
    }, [report]);

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

    const headline = numbers.recentValue > 0 ? numbers.recentValue : numbers.totalValue;
    const headlineScope = numbers.recentValue > 0 ? "nos últimos 30 dias" : `nos últimos ${report.summary.window_days} dias`;
    const created = new Date(report.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <Shell>
            <header className="pt-10 md:pt-14">
                <p className="text-sm" style={{ color: "var(--lp-ink-55)" }}>
                    Raio-X das propostas · {report.company_name ?? "sua empresa"} · {created}
                </p>
                {numbers.stuck === 0 ? (
                    <h1 className="lp-display mt-4" style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", lineHeight: 1.05, letterSpacing: "-0.04em", color: "var(--lp-ink)" }}>
                        Nenhuma proposta parada.
                    </h1>
                ) : (
                    <>
                        <h1 className="lp-display mt-4" style={{ fontSize: "clamp(2.5rem, 9vw, 5rem)", lineHeight: 1, letterSpacing: "-0.045em", color: "var(--lp-ink)" }}>
                            {headline > 0 ? brl(headline) : `${numbers.stuck} propostas`}
                        </h1>
                        <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                            {headline > 0
                                ? `em propostas paradas no seu WhatsApp ${headlineScope}, pelo valor escrito nas conversas.`
                                : `paradas no seu WhatsApp ${headlineScope}. O valor está nos PDFs, que o Raio-X não abre.`}
                            {headline > 0 && numbers.withoutValue > 0 &&
                                ` Mais ${numbers.withoutValue} ${numbers.withoutValue === 1 ? "proposta" : "propostas"} com o valor só no PDF, fora dessa soma.`}
                        </p>
                    </>
                )}
            </header>

            <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border md:grid-cols-4" style={{ borderColor: "var(--lp-line)", background: "var(--lp-line)" }}>
                <Stat label="Propostas encontradas" value={numbers.quotes} />
                <Stat label="Paradas" value={numbers.stuck} />
                <Stat label="Cliente esperando você" value={numbers.yourTurn} highlight={numbers.yourTurn > 0} />
                <Stat label="Mensagens lidas" value={report.summary.messages_read.toLocaleString("pt-BR")} />
            </dl>

            <section className="mt-12" aria-labelledby="lista">
                <h2 id="lista" className="lp-display text-2xl md:text-3xl" style={{ color: "var(--lp-ink)" }}>
                    Proposta por proposta
                </h2>
                <ul className="mt-5">
                    {report.items.map((item, i) => (
                        <ItemRow key={i} item={item} isAdmin={isAdmin} onToggle={(ex) => void toggle(i, ex)} />
                    ))}
                </ul>
            </section>

            <section className="mt-14 rounded-[10px] border p-6 md:p-8" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                <h2 className="lp-display text-2xl" style={{ color: "var(--lp-ink)" }}>
                    Nenhuma mensagem foi enviada aos seus clientes.
                </h2>
                <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                    As retomadas acima são rascunhos. Com o Vyzon ligado, cada proposta nova que sai do seu WhatsApp passa a ser
                    acompanhada, e a retomada chega pronta no seu celular. Você responde 1 e ela sai, do seu número.
                </p>
                <Link to="/criar-conta?segmento=energia_solar" className="vz-btn vz-btn--primary mt-6 inline-flex">
                    <span>Testar 14 dias grátis</span>
                    <span className="vz-btn__arrow" aria-hidden="true">
                        →
                    </span>
                </Link>
            </section>

            <p className="mt-8 pb-14 text-sm leading-relaxed" style={{ color: "var(--lp-ink-40)" }}>
                Como contamos: PDF enviado (menos boleto, contrato e recibo) ou mensagem com valor e palavra de orçamento, nos últimos{" "}
                {report.summary.window_days} dias, fora de grupos. Parada: sem resposta há 2 dias ou mais, cliente que parou de responder há 3 dias
                ou mais, ou cliente esperando resposta há 1 dia ou mais. Valor só quando aparece escrito na conversa.
            </p>
        </Shell>
    );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
        <div className="mx-auto w-full max-w-[880px] px-5 md:px-8">
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
    <div className="px-4 py-4" style={{ background: "var(--lp-white)" }}>
        <dt className="text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
            {label}
        </dt>
        <dd className="mt-1 text-2xl font-medium tabular-nums" style={{ color: highlight ? "var(--lp-blue)" : "var(--lp-ink)", letterSpacing: "-0.02em" }}>
            {value}
        </dd>
    </div>
);

const ItemRow = ({ item, isAdmin, onToggle }: { item: Item; isAdmin: boolean; onToggle: (excluded: boolean) => void }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (!item.draft) return;
        try {
            await navigator.clipboard.writeText(item.draft);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // sem permissão de área de transferência: o texto continua selecionável
        }
    };
    const muted = item.excluded || item.status === "talking";
    return (
        <li className="border-t py-5" style={{ borderColor: "var(--lp-line)", opacity: item.excluded ? 0.45 : 1 }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[17px] font-medium" style={{ color: "var(--lp-ink)", textDecoration: item.excluded ? "line-through" : undefined }}>
                        {item.first_name ?? "Cliente"}
                    </span>
                    <span
                        className="rounded-full border px-2 py-0.5 text-[12px]"
                        style={{
                            borderColor: item.status === "your_turn" && !muted ? "var(--lp-blue)" : "var(--lp-line)",
                            color: item.status === "your_turn" && !muted ? "var(--lp-blue)" : "var(--lp-ink-55)",
                        }}
                    >
                        {item.excluded ? "Não é proposta" : STATUS_LABEL[item.status]}
                    </span>
                </div>
                <span className="text-[17px] tabular-nums" style={{ color: item.amount ? "var(--lp-ink)" : "var(--lp-ink-40)" }}>
                    {item.amount ? brl(item.amount) : "valor no PDF"}
                </span>
            </div>
            <p className="mt-1 text-[14px]" style={{ color: "var(--lp-ink-55)" }}>
                Proposta {dias(item.days_since_quote)}
                {item.status !== "no_reply" && item.status !== "talking" && ` · cliente falou ${dias(item.days_silent)}`}
                {item.kwp ? ` · ${item.kwp.toLocaleString("pt-BR")} kWp` : ""}
                {item.detected_by === "pdf" ? " · enviada em PDF" : ""}
            </p>
            {item.draft && !item.excluded && (
                <div className="mt-3 rounded-[10px] border p-4" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                    {item.reading && (
                        <p className="text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                            <span style={{ color: "var(--lp-eva)" }}>EVA</span> · {item.reading}
                        </p>
                    )}
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-90)" }}>
                        {item.draft}
                    </p>
                    <button
                        type="button"
                        onClick={() => void copy()}
                        className="mt-3 text-[13px] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] rounded"
                        style={{ color: "var(--lp-blue)" }}
                    >
                        {copied ? "Copiado" : "Copiar retomada"}
                    </button>
                </div>
            )}
            {isAdmin && (
                <button
                    type="button"
                    onClick={() => onToggle(!item.excluded)}
                    className="mt-2 text-[12px] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] rounded"
                    style={{ color: "var(--lp-ink-40)" }}
                >
                    {item.excluded ? "Voltar a contar" : "Não é proposta"}
                </button>
            )}
        </li>
    );
};

export default RaioXReport;
