// PublicReport
// Página pública white-label consumida via /r/:token.
// Não usa AuthProvider/TenantProvider — vive fora do AppShell (ver App.tsx).
// Chama a edge function `public-report` diretamente com o anon key, e a
// RPC `get_public_report` (SECURITY DEFINER) valida token/expiração/revogação.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Lock, ShieldAlert, Loader2, TrendingUp } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Stage =
    | "lead"
    | "qualification"
    | "proposal"
    | "negotiation"
    | "closed_won"
    | "closed_lost";

type PipelineRow = {
    stage: Stage;
    count: number;
    value: number;
};

type ReportMetrics = {
    total_deals: number;
    won_deals: number;
    won_value: number;
    pipeline_value: number;
    weighted_forecast: number;
    win_rate: number;
};

type ForecastMonth = {
    month: string;
    won: number;
    weighted: number;
    pipeline: number;
    deals: number;
};

type ReportPayload = {
    ok: true;
    report: {
        title: string;
        client_name: string | null;
        logo_url: string | null;
        period_days: number;
        enabled_metrics: Record<string, boolean>;
    };
    company: {
        name: string;
        logo_url: string | null;
    };
    pipeline: PipelineRow[];
    metrics: ReportMetrics;
    forecast_monthly?: ForecastMonth[];
};

type ErrorPayload = {
    ok: false;
    error: "invalid_token" | "not_found" | "rpc_error" | "internal_error";
};

const STAGE_LABEL: Record<Stage, string> = {
    lead: "Lead",
    qualification: "Qualificação",
    proposal: "Proposta",
    negotiation: "Negociação",
    closed_won: "Ganho",
    closed_lost: "Perdido",
};

const STAGE_ORDER: Stage[] = [
    "lead",
    "qualification",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
];

const currency = (n: number) =>
    n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
    });

const integer = (n: number) => n.toLocaleString("pt-BR");

const formatMonth = (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};

// ═══════════════════════════════════════════════════════════════════════════
export default function PublicReport() {
    const { token } = useParams<{ token: string }>();
    const [state, setState] = useState<"loading" | "ok" | "error">("loading");
    const [data, setData] = useState<ReportPayload | null>(null);
    const [errorKind, setErrorKind] = useState<ErrorPayload["error"] | null>(null);

    useEffect(() => {
        if (!token) {
            setState("error");
            setErrorKind("invalid_token");
            return;
        }

        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(
                    `${SUPABASE_URL}/functions/v1/public-report?token=${encodeURIComponent(token)}`,
                    {
                        signal: controller.signal,
                        headers: {
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                    }
                );
                const json = (await res.json()) as ReportPayload | ErrorPayload;
                if ("ok" in json && json.ok) {
                    setData(json);
                    setState("ok");
                } else {
                    setErrorKind((json as ErrorPayload).error ?? "internal_error");
                    setState("error");
                }
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                setErrorKind("internal_error");
                setState("error");
            }
        })();

        return () => controller.abort();
    }, [token]);

    useEffect(() => {
        if (state === "ok" && data) {
            document.title = data.report.client_name
                ? `${data.report.title} · ${data.report.client_name}`
                : data.report.title;
        }
    }, [state, data]);

    if (state === "loading") return <LoadingState />;
    if (state === "error") return <ErrorState kind={errorKind ?? "internal_error"} />;
    return <ReportDashboard data={data!} />;
}

// ═══════════════════════════════════════════════════════════════════════════
function LoadingState() {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: "var(--vyz-bg, #06080a)" }}
        >
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#00E37A" }} />
                <span
                    className="font-mono"
                    style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}
                >
                    CARREGANDO RELATÓRIO…
                </span>
            </div>
        </div>
    );
}

function ErrorState({ kind }: { kind: ErrorPayload["error"] }) {
    const map: Record<ErrorPayload["error"], { title: string; body: string; icon: typeof Lock }> = {
        invalid_token: {
            title: "Link inválido",
            body: "Esse relatório não existe ou o link está malformado. Peça um novo pro time que enviou.",
            icon: ShieldAlert,
        },
        not_found: {
            title: "Relatório indisponível",
            body: "Esse link expirou ou foi revogado pela agência. Entre em contato pra receber um atualizado.",
            icon: Lock,
        },
        rpc_error: {
            title: "Não foi possível carregar",
            body: "Tivemos um problema temporário. Tente recarregar em alguns segundos.",
            icon: ShieldAlert,
        },
        internal_error: {
            title: "Erro ao carregar",
            body: "Algo deu errado do nosso lado. Tente novamente em instantes.",
            icon: ShieldAlert,
        },
    };
    const { title, body, icon: Icon } = map[kind];

    return (
        <div
            className="min-h-screen flex items-center justify-center px-6"
            style={{ background: "var(--vyz-bg, #06080a)" }}
        >
            <div className="max-w-md w-full text-center">
                <div
                    className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <Icon className="h-6 w-6" style={{ color: "rgba(255,255,255,0.6)" }} />
                </div>
                <h1
                    className="font-heading mb-2"
                    style={{
                        fontSize: "1.6rem",
                        fontWeight: 800,
                        color: "#F3F7FF",
                        letterSpacing: "-0.02em",
                    }}
                >
                    {title}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem", lineHeight: 1.55 }}>
                    {body}
                </p>
                <div
                    className="mt-8 font-mono inline-flex items-center gap-1.5"
                    style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}
                >
                    <span>POWERED BY</span>
                    <span style={{ color: "#00E37A", fontWeight: 700 }}>VYZON</span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function ReportDashboard({ data }: { data: ReportPayload }) {
    const { report, company, pipeline, metrics, forecast_monthly } = data;
    const enabled = report.enabled_metrics;
    const forecastMonths = forecast_monthly ?? [];
    const maxMonthlyTotal = Math.max(
        1,
        ...forecastMonths.map((m) => m.won + m.weighted)
    );

    const logo = report.logo_url || company.logo_url;
    const displayName = report.client_name || company.name;

    const pipelineSorted = useMemo(() => {
        const order = new Map(STAGE_ORDER.map((s, i) => [s, i]));
        return [...pipeline].sort((a, b) => (order.get(a.stage) ?? 99) - (order.get(b.stage) ?? 99));
    }, [pipeline]);

    const maxPipelineValue = Math.max(1, ...pipelineSorted.map((p) => p.value));

    return (
        <div className="min-h-screen" style={{ background: "var(--vyz-bg, #06080a)", color: "#F3F7FF" }}>
            {/* ═══ Header ═══════════════════════════════════════════════════ */}
            <header
                className="sticky top-0 z-10 backdrop-blur-sm"
                style={{
                    background: "rgba(6,8,10,0.85)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {logo ? (
                            <img
                                src={logo}
                                alt={displayName}
                                className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                                style={{ background: "rgba(255,255,255,0.06)" }}
                            />
                        ) : (
                            <div
                                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                    background: "linear-gradient(135deg, rgba(91,155,255,0.18), rgba(0,227,122,0.18))",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                <BarChart3 className="h-4 w-4" style={{ color: "#33FF9E" }} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div
                                className="truncate"
                                style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F3F7FF" }}
                            >
                                {displayName}
                            </div>
                            <div
                                className="font-mono truncate"
                                style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}
                            >
                                {report.title.toUpperCase()} · ÚLTIMOS {report.period_days}D
                            </div>
                        </div>
                    </div>
                    <span
                        className="font-mono flex-shrink-0 px-2 py-1 rounded"
                        style={{
                            fontSize: "0.58rem",
                            color: "#33FF9E",
                            background: "rgba(0,227,122,0.12)",
                            border: "1px solid rgba(0,227,122,0.25)",
                            letterSpacing: "0.1em",
                        }}
                    >
                        AO VIVO
                    </span>
                </div>
            </header>

            {/* ═══ Conteúdo ═════════════════════════════════════════════════ */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* Métricas core */}
                {enabled.core_metrics !== false && (
                    <section>
                        <SectionLabel>MÉTRICAS · PERÍODO</SectionLabel>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MetricTile
                                label="Total de deals"
                                value={integer(metrics.total_deals)}
                                tone="neutral"
                            />
                            <MetricTile
                                label="Deals ganhos"
                                value={integer(metrics.won_deals)}
                                hint={`${metrics.win_rate}% win rate`}
                                tone="good"
                            />
                            <MetricTile
                                label="Receita ganha"
                                value={currency(metrics.won_value)}
                                tone="good"
                            />
                            <MetricTile
                                label="Pipeline aberto"
                                value={currency(metrics.pipeline_value)}
                                tone="neutral"
                            />
                        </div>
                    </section>
                )}

                {/* Forecast */}
                {enabled.forecast !== false && (
                    <section>
                        <SectionLabel>FORECAST · PONDERADO</SectionLabel>
                        <div
                            className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                            style={{
                                background: "linear-gradient(90deg, rgba(91,155,255,0.08), rgba(0,227,122,0.08))",
                                border: "1px solid rgba(91,155,255,0.25)",
                            }}
                        >
                            <div>
                                <div
                                    className="font-mono mb-1"
                                    style={{
                                        fontSize: "0.62rem",
                                        color: "rgba(91,155,255,0.9)",
                                        letterSpacing: "0.1em",
                                        fontWeight: 600,
                                    }}
                                >
                                    PROJEÇÃO DE FECHAMENTO
                                </div>
                                <div
                                    className="font-heading"
                                    style={{
                                        fontSize: "2rem",
                                        fontWeight: 800,
                                        color: "#F3F7FF",
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    {currency(metrics.won_value + metrics.weighted_forecast)}
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <div
                                    className="font-mono"
                                    style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}
                                >
                                    {currency(metrics.won_value)} fechado
                                </div>
                                <div
                                    className="font-mono"
                                    style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}
                                >
                                    + {currency(metrics.weighted_forecast)} ponderado
                                </div>
                                <div
                                    className="font-mono mt-1 inline-flex items-center gap-1"
                                    style={{ fontSize: "0.74rem", color: "#33FF9E", fontWeight: 700 }}
                                >
                                    <TrendingUp className="h-3 w-3" strokeWidth={3} />
                                    {metrics.win_rate}% win rate
                                </div>
                            </div>
                        </div>

                        {forecastMonths.length > 0 && (
                            <div className="mt-5">
                                <div
                                    className="font-mono mb-2"
                                    style={{
                                        fontSize: "0.62rem",
                                        color: "rgba(255,255,255,0.4)",
                                        letterSpacing: "0.1em",
                                        fontWeight: 600,
                                    }}
                                >
                                    PRÓXIMOS 6 MESES · POR DATA PREVISTA DE FECHAMENTO
                                </div>
                                <div
                                    className="rounded-xl p-4"
                                    style={{
                                        background: "rgba(11,14,18,0.6)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div className="space-y-2">
                                        {forecastMonths.map((m, i) => {
                                            const totalPct = Math.min(
                                                100,
                                                ((m.won + m.weighted) / maxMonthlyTotal) * 100
                                            );
                                            const wonPct =
                                                m.won + m.weighted > 0
                                                    ? (m.won / (m.won + m.weighted)) * totalPct
                                                    : 0;
                                            return (
                                                <div key={m.month} className="flex items-center gap-3">
                                                    <div
                                                        className="font-mono flex-shrink-0"
                                                        style={{
                                                            width: "64px",
                                                            fontSize: "0.72rem",
                                                            color: "rgba(255,255,255,0.65)",
                                                        }}
                                                    >
                                                        {formatMonth(m.month)}
                                                    </div>
                                                    <div
                                                        className="flex-1 h-5 rounded flex overflow-hidden"
                                                        style={{ background: "rgba(255,255,255,0.03)" }}
                                                    >
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${wonPct}%` }}
                                                            transition={{
                                                                delay: i * 0.04,
                                                                duration: 0.5,
                                                                ease: "easeOut",
                                                            }}
                                                            style={{
                                                                background:
                                                                    "linear-gradient(90deg, rgba(0,227,122,0.7), rgba(0,227,122,0.95))",
                                                            }}
                                                        />
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${totalPct - wonPct}%` }}
                                                            transition={{
                                                                delay: i * 0.04 + 0.1,
                                                                duration: 0.5,
                                                                ease: "easeOut",
                                                            }}
                                                            style={{
                                                                background:
                                                                    "linear-gradient(90deg, rgba(91,155,255,0.6), rgba(91,155,255,0.85))",
                                                            }}
                                                        />
                                                    </div>
                                                    <div
                                                        className="font-mono flex-shrink-0 text-right"
                                                        style={{
                                                            width: "110px",
                                                            fontSize: "0.76rem",
                                                            fontWeight: 700,
                                                            color: "#F3F7FF",
                                                        }}
                                                    >
                                                        {currency(m.won + m.weighted)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div
                                        className="mt-3 pt-3 flex items-center gap-4 font-mono"
                                        style={{
                                            borderTop: "1px solid rgba(255,255,255,0.05)",
                                            fontSize: "0.66rem",
                                            color: "rgba(255,255,255,0.5)",
                                            letterSpacing: "0.04em",
                                        }}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 rounded-sm"
                                                style={{ background: "#00E37A" }}
                                            />
                                            FECHADO
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <span
                                                className="h-2 w-2 rounded-sm"
                                                style={{ background: "#5B9BFF" }}
                                            />
                                            PONDERADO
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Pipeline por estágio */}
                {enabled.pipeline_summary !== false && pipelineSorted.length > 0 && (
                    <section>
                        <SectionLabel>PIPELINE · POR ESTÁGIO</SectionLabel>
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: "rgba(11,14,18,0.6)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="p-5 space-y-2">
                                {pipelineSorted.map((row, i) => {
                                    const barPct = Math.min(100, (row.value / maxPipelineValue) * 100);
                                    const isWon = row.stage === "closed_won";
                                    const isLost = row.stage === "closed_lost";
                                    return (
                                        <div key={row.stage} className="flex items-center gap-3">
                                            <div
                                                className="truncate"
                                                style={{
                                                    width: "28%",
                                                    fontSize: "0.8rem",
                                                    color: "rgba(255,255,255,0.75)",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {STAGE_LABEL[row.stage]}
                                            </div>
                                            <div
                                                className="font-mono flex-shrink-0"
                                                style={{
                                                    width: "48px",
                                                    fontSize: "0.74rem",
                                                    color: "rgba(255,255,255,0.55)",
                                                }}
                                            >
                                                {integer(row.count)}
                                            </div>
                                            <div
                                                className="flex-1 h-6 rounded"
                                                style={{ background: "rgba(255,255,255,0.03)" }}
                                            >
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${barPct}%` }}
                                                    transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                                                    className="h-full rounded"
                                                    style={{
                                                        background: isWon
                                                            ? "linear-gradient(90deg, rgba(0,227,122,0.65), rgba(0,227,122,0.95))"
                                                            : isLost
                                                            ? "linear-gradient(90deg, rgba(239,68,68,0.45), rgba(239,68,68,0.7))"
                                                            : "linear-gradient(90deg, rgba(91,155,255,0.55), rgba(91,155,255,0.85))",
                                                    }}
                                                />
                                            </div>
                                            <div
                                                className="font-mono flex-shrink-0 text-right"
                                                style={{
                                                    width: "110px",
                                                    fontSize: "0.82rem",
                                                    fontWeight: 700,
                                                    color: "#F3F7FF",
                                                }}
                                            >
                                                {currency(row.value)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* ═══ Rodapé ═══════════════════════════════════════════════════ */}
            <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 mt-10">
                <div
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                    <p
                        className="font-mono"
                        style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em" }}
                    >
                        ATUALIZADO EM TEMPO REAL · DADOS DOS ÚLTIMOS {report.period_days} DIAS
                    </p>
                    <a
                        href="https://vyzon.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}
                    >
                        <span>POWERED BY</span>
                        <span style={{ color: "#00E37A", fontWeight: 700 }}>VYZON</span>
                    </a>
                </div>
            </footer>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="font-mono mb-3"
            style={{
                fontSize: "0.68rem",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.1em",
                fontWeight: 600,
            }}
        >
            {children}
        </div>
    );
}

function MetricTile({
    label,
    value,
    hint,
    tone,
}: {
    label: string;
    value: string;
    hint?: string;
    tone: "good" | "neutral";
}) {
    return (
        <div
            className="rounded-xl p-4"
            style={{
                background: "rgba(11,14,18,0.6)",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div
                className="font-mono mb-2"
                style={{
                    fontSize: "0.62rem",
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                }}
            >
                {label.toUpperCase()}
            </div>
            <div
                className="font-heading"
                style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: tone === "good" ? "#33FF9E" : "#F3F7FF",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                }}
            >
                {value}
            </div>
            {hint && (
                <div
                    className="font-mono mt-1"
                    style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.45)" }}
                >
                    {hint}
                </div>
            )}
        </div>
    );
}
