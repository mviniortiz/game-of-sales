import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot } from "@/components/eva/EvaBot";

// Relatório do Raio-X (/relatorio/:token), aberto na conversa de 20 minutos e
// mandado depois pro integrador, que quase sempre lê no celular. Público pelo
// token; mostra só primeiro nome, valor, dias, o motivo de ter contado (nome do
// PDF ou trecho) e a retomada sugerida. Quem é da empresa do relatório (ou o
// super admin) confere: tira o que não é proposta e preenche o valor que faltou;
// os números se refazem a partir dos itens.
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
    /** Nome do PDF ou trecho do texto que fez a EVA contar como proposta. */
    evidencia?: string | null;
    amount_by_owner?: boolean;
};

type Report = {
    company_name: string | null;
    created_at: string;
    summary: { messages_read: number; window_days: number; descartadas?: number };
    items: Item[];
    can_edit?: boolean;
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

    const setAmount = async (index: number, amount: number | null) => {
        if (!report) return false;
        const prev = report;
        setReport({ ...report, items: report.items.map((it, i) => (i === index ? { ...it, amount, amount_by_owner: true } : it)) });
        const { error } = await supabase.rpc("raio_x_set_amount" as never, { p_token: token, p_index: index, p_amount: amount } as never);
        if (error) setReport(prev);
        return !error;
    };

    const isAdmin = Boolean(report?.can_edit);

    const view = useMemo(() => {
        const all = report?.items ?? [];
        let drafted = 0;
        const rows: Row[] = all.map((item, index) => ({
            item,
            index,
            code: item.draft && !item.excluded && item.status !== "talking" ? codeAt(drafted++) : null,
        }));
        // Quem só recebeu o link não vê o que foi marcado como "não é proposta".
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
    const rowProps = { isAdmin, onToggle: (index: number, ex: boolean) => void toggle(index, ex), onAmount: setAmount };

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
                                : `paradas no seu WhatsApp ${headlineScope}. ${isAdmin ? "Preencha o valor de cada uma abaixo para ver o total." : "O valor está nos PDFs, que o Raio-X não abre."}`}
                            {headline > 0 && view.withoutValue > 0 &&
                                ` Mais ${plural(view.withoutValue, "proposta", "propostas")} sem valor escrito, fora dessa soma.`}
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

            {isAdmin && view.quotes > 0 && (
                <div className="mt-6 rounded-[10px] border p-4 md:p-5" style={{ borderColor: "var(--lp-blue)", background: "var(--lp-white)" }}>
                    <p className="text-[15px] font-medium" style={{ color: "var(--lp-ink)" }}>
                        Confira em 1 minuto
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        Em cada proposta aparece o que me fez contar ela. Se não for proposta, toque em "Não é proposta". Se faltar o valor, preencha.
                        O total se refaz na hora.
                    </p>
                </div>
            )}

            {view.stuck > 0 && (
                <nav className="mt-8 grid grid-cols-3 gap-2 md:mt-10 md:gap-3" aria-label="Propostas por urgência">
                    <Faixa href="#hoje" titulo="Responda hoje" rows={view.today} tom="urgente" />
                    <Faixa href="#semana" titulo="Retome esta semana" rows={view.week} tom="normal" />
                    <Faixa href="#esfriaram" titulo="Esfriaram" rows={view.cold} tom="frio" />
                </nav>
            )}
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--lp-ink-55)" }}>
                Li {report.summary.messages_read.toLocaleString("pt-BR")} mensagens dos últimos {report.summary.window_days} dias e achei {plural(view.quotes, "proposta", "propostas")}.
                {(report.summary.descartadas ?? 0) > 0 &&
                    ` Deixei fora da conta ${plural(report.summary.descartadas ?? 0, "arquivo ou mensagem que não era proposta", "arquivos ou mensagens que não eram proposta")} (ficha técnica, boleto, comprovante, conversa pessoal).`}
            </p>

            {view.stuck > 0 && (
                <section className="mt-12 md:mt-14" aria-labelledby="plano">
                    <h2 id="plano" className="lp-display text-[26px] leading-tight md:text-3xl" style={{ color: "var(--lp-ink)" }}>
                        O que fazer com elas
                    </h2>
                    <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                        Em ordem de urgência. Nas maiores, a EVA já escreveu a retomada no tom da sua conversa com o cliente.
                    </p>

                    <Group id="hoje" title="Responda hoje" hint="O cliente mandou a última mensagem e ninguém respondeu." rows={view.today} {...rowProps} />
                    <Group id="semana" title="Retome esta semana" hint="Proposta dos últimos 30 dias, sem resposta ou com o cliente quieto." rows={view.week} {...rowProps} />
                    <Group id="esfriaram" title="Esfriaram" hint="Mais de 30 dias. Vale uma mensagem nova, não uma cobrança." rows={view.cold} collapsed {...rowProps} />
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
                <Link
                    to={isAdmin ? "/upgrade" : "/criar-conta?segmento=energia_solar"}
                    className="vz-btn vz-btn--primary mt-6 inline-flex w-full justify-center sm:w-auto"
                >
                    <span>{isAdmin ? "Ligar a EVA nas minhas propostas" : "Fazer o Raio-X do meu WhatsApp"}</span>
                    <span className="vz-btn__arrow" aria-hidden="true">
                        →
                    </span>
                </Link>
            </section>

            <p className="mt-8 pb-14 text-[13px] leading-relaxed md:text-sm" style={{ color: "var(--lp-ink-40)" }}>
                Como contamos: PDF enviado (menos boleto, contrato e recibo) ou mensagem com valor e palavra de orçamento, nos últimos{" "}
                {report.summary.window_days} dias, fora de grupos. Parada: sem resposta há 2 dias ou mais, cliente que parou de responder há 3 dias
                ou mais, ou cliente esperando resposta há 1 dia ou mais. Valor quando aparece escrito na conversa ou quando você preencheu.
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

const TOM = {
    urgente: { borda: "#F59E0B", fundo: "#FFFBEB", texto: "#92400E" },
    normal: { borda: "var(--lp-blue)", fundo: "var(--lp-white)", texto: "var(--lp-blue)" },
    frio: { borda: "var(--lp-line)", fundo: "var(--lp-white)", texto: "var(--lp-ink-55)" },
} as const;

/** Atalho de urgência no topo: quantas, quanto somam e leva ao grupo. */
const Faixa = ({ href, titulo, rows, tom }: { href: string; titulo: string; rows: Row[]; tom: keyof typeof TOM }) => {
    const ativos = rows.filter((r) => !r.item.excluded);
    const soma = ativos.reduce((a, r) => a + (r.item.amount ?? 0), 0);
    const c = TOM[tom];
    const vazio = ativos.length === 0;
    return (
        <a
            href={vazio ? undefined : href}
            aria-disabled={vazio || undefined}
            className="flex min-w-0 flex-col rounded-[10px] border px-3 py-3 transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] md:px-4 md:py-4 [&:not([aria-disabled])]:hover:-translate-y-0.5 motion-reduce:transition-none"
            style={{ borderColor: vazio ? "var(--lp-line)" : c.borda, background: vazio ? "var(--lp-white)" : c.fundo, opacity: vazio ? 0.6 : 1 }}
        >
            <span className="text-[12px] font-medium leading-tight md:text-[13px]" style={{ color: vazio ? "var(--lp-ink-55)" : c.texto }}>
                {titulo}
            </span>
            <span className="mt-1.5 text-[22px] font-medium leading-none tabular-nums md:text-[26px]" style={{ color: "var(--lp-ink)", letterSpacing: "-0.02em" }}>
                {ativos.length}
            </span>
            <span className="mt-1 truncate text-[12px] tabular-nums md:text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                {soma > 0 ? brl(soma) : vazio ? "nenhuma" : "sem valor"}
            </span>
        </a>
    );
};

type RowProps = {
    isAdmin: boolean;
    onToggle: (index: number, excluded: boolean) => void;
    onAmount: (index: number, amount: number | null) => Promise<boolean>;
};

const Group = ({ id, title, hint, rows, collapsed, ...rowProps }: { id?: string; title: string; hint: string; rows: Row[]; collapsed?: boolean } & RowProps) => {
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
            <details id={id} className="group mt-8 scroll-mt-6 border-t pt-5" style={{ borderColor: "var(--lp-line)" }}>
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
        <div id={id} className="mt-8 scroll-mt-6 border-t pt-5" style={{ borderColor: "var(--lp-line)" }}>
            {head}
            <p className="mt-1 text-[14px]" style={{ color: "var(--lp-ink-55)" }}>
                {hint}
            </p>
            {list}
        </div>
    );
};

const ItemCard = ({ row, isAdmin, onToggle, onAmount }: { row: Row } & RowProps) => {
    const { item, index, code } = row;
    const [editando, setEditando] = useState(false);
    const urgent = item.status === "your_turn" && !item.excluded;
    return (
        <li
            className="relative overflow-hidden rounded-[10px] border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-5"
            style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", opacity: item.excluded ? 0.5 : 1 }}
        >
            {urgent && <span className="absolute inset-y-0 left-0 w-1" style={{ background: "#F59E0B" }} aria-hidden />}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[17px] font-medium" style={{ color: "var(--lp-ink)", textDecoration: item.excluded ? "line-through" : undefined }}>
                        {item.first_name ?? "Cliente"}
                    </p>
                    <span
                        className="mt-1 inline-block rounded-full border px-2 py-0.5 text-[12px]"
                        style={{ borderColor: urgent ? "#F59E0B" : "var(--lp-line)", color: urgent ? "#92400E" : "var(--lp-ink-55)", background: urgent ? "#FFFBEB" : undefined }}
                    >
                        {item.excluded ? "Não é proposta" : STATUS_LABEL[item.status]}
                    </span>
                </div>
                {isAdmin && !item.excluded && (editando || !item.amount) ? (
                    <ValorInput
                        inicial={item.amount}
                        onSalvar={async (v) => {
                            if (await onAmount(index, v)) setEditando(false);
                        }}
                    />
                ) : (
                    <span className="shrink-0 text-right">
                        <span className="block text-[17px] font-medium tabular-nums" style={{ color: item.amount ? "var(--lp-ink)" : "var(--lp-ink-40)" }}>
                            {item.amount ? brl(item.amount) : "valor no PDF"}
                        </span>
                        {isAdmin && item.amount && !item.excluded && (
                            <button type="button" onClick={() => setEditando(true)} className="text-[12px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-40)" }}>
                                corrigir
                            </button>
                        )}
                    </span>
                )}
            </div>
            <p className="mt-2 text-[14px] leading-snug" style={{ color: "var(--lp-ink-55)" }}>
                Proposta {dias(item.days_since_quote)}
                {item.status !== "no_reply" && item.status !== "talking" && ` · cliente falou ${dias(item.days_silent)}`}
                {item.kwp ? ` · ${item.kwp.toLocaleString("pt-BR")} kWp` : ""}
            </p>
            {item.evidencia && (
                <p
                    className="mt-2 flex max-w-full items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12.5px]"
                    style={{ background: "var(--lp-paper)", color: "var(--lp-ink-70)" }}
                    title={item.evidencia}
                >
                    <span className="shrink-0" style={{ color: "var(--lp-ink-40)" }}>{item.detected_by === "pdf" ? "Arquivo" : "Mensagem"}</span>
                    <span className="truncate">{item.evidencia}</span>
                </p>
            )}
            {code && item.draft && !item.excluded && <Retomada item={item} draft={item.draft} />}
            {isAdmin && (
                <div className={`flex ${code && item.draft && !item.excluded ? "mt-2 justify-end" : "mt-3"}`}>
                    <button
                        type="button"
                        onClick={() => onToggle(index, !item.excluded)}
                        className="inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors hover:bg-[var(--lp-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)]"
                        style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-55)" }}
                    >
                        {item.excluded ? "Voltar a contar" : "Não é proposta"}
                    </button>
                </div>
            )}
        </li>
    );
};

/** Valor em reais digitado pelo dono quando o histórico não trouxe. */
const ValorInput = ({ inicial, onSalvar }: { inicial: number | null; onSalvar: (v: number | null) => void }) => {
    const [txt, setTxt] = useState(inicial ? String(inicial) : "");
    const valor = (() => {
        const limpo = txt.replace(/[^\d,]/g, "").replace(",", ".");
        const n = Number(limpo);
        return limpo && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    })();
    return (
        <form
            className="flex shrink-0 items-center gap-1.5"
            onSubmit={(e) => {
                e.preventDefault();
                if (valor) onSalvar(valor);
            }}
        >
            <label className="sr-only" htmlFor={`valor-${inicial ?? "novo"}`}>Valor da proposta</label>
            <span className="text-[14px]" style={{ color: "var(--lp-ink-55)" }}>R$</span>
            <input
                id={`valor-${inicial ?? "novo"}`}
                inputMode="numeric"
                placeholder="quanto era?"
                value={txt}
                onChange={(e) => setTxt(e.target.value)}
                className="h-9 w-28 rounded-[8px] border px-2.5 text-[16px] tabular-nums outline-none focus:ring-2 focus:ring-[var(--lp-blue)]"
                style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)", color: "var(--lp-ink)" }}
            />
            <button
                type="submit"
                disabled={!valor}
                className="h-9 rounded-full px-3 text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--lp-ink)" }}
            >
                Ok
            </button>
        </form>
    );
};

/** A retomada como ela chega ao cliente (balão verde, saindo do seu número), com
 *  a nota da EVA de por que agora e o atalho de enviar já. O formato do aviso
 *  da EVA no WhatsApp do dono aparece uma vez só, na seção da companheira. */
const Retomada = ({ item, draft }: { item: Item; draft: string }) => {
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
            {item.reading && (
                <p className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: "var(--lp-ink-70)" }}>
                    <span className="mt-[1px] shrink-0"><EvaBot size={18} still /></span>
                    <span>{item.reading}</span>
                </p>
            )}
            <div className="mt-2 rounded-[10px] p-2.5 sm:p-3" style={{ background: WA_WALL }}>
                <p className="mb-1.5 text-center text-[11px]" style={{ color: "#54656f" }}>
                    Retomada pronta para {item.first_name ?? "o cliente"}
                </p>
                <div
                    className="ml-auto max-w-[92%] rounded-[8px] rounded-tr-none px-3 py-2 text-[14.5px] leading-[1.45]"
                    style={{ background: WA_OUT, color: "#111b21", boxShadow: "0 1px 0.5px rgba(11,20,26,.13)" }}
                >
                    <p className="whitespace-pre-line">{draft}</p>
                    <p className="mt-0.5 text-right text-[11px]" style={{ color: "#667781" }}>do seu número</p>
                </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(draft)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[14px] font-medium transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] focus-visible:ring-offset-2 motion-reduce:transition-none"
                    style={{ background: "var(--lp-ink)", color: "var(--lp-white)" }}
                >
                    Enviar pelo WhatsApp
                </a>
                <button
                    type="button"
                    onClick={() => void copy()}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border px-5 text-[14px] font-medium transition-colors hover:bg-[var(--lp-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-blue)] focus-visible:ring-offset-2"
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
