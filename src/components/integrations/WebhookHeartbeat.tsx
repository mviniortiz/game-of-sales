import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkline } from "@/components/admin/Sparkline";

export interface HeartbeatLog {
    id: string;
    platform: string;
    event_type: string | null;
    status: string | null;
    error_message: string | null;
    created_at: string;
}

interface Props {
    logs: HeartbeatLog[];
    stats: {
        totalCount: number;
        successCount: number;
        errorCount: number;
    };
    platformNames: Record<string, string>;
    eventLabels: Record<string, string>;
}

function statusColor(status: string | null) {
    if (status === "success") return "#16A34A";
    if (status === "error") return "#DC2626";
    if (status === "processing") return "#D97706";
    return "#94A3B8";
}

export function WebhookHeartbeat({ logs, stats, platformNames, eventLabels }: Props) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(t);
    }, []);

    // Volume por minuto nos últimos 30 min (dado real)
    const series = useMemo(() => {
        const buckets = new Array(30).fill(0);
        const start = now - 30 * 60 * 1000;
        logs.forEach((l) => {
            const t = new Date(l.created_at).getTime();
            if (t >= start && t <= now) {
                buckets[Math.min(29, Math.floor((t - start) / 60000))]++;
            }
        });
        return buckets;
    }, [logs, now]);

    const lastEventAgoSec = useMemo(() => {
        if (!logs[0]) return null;
        return Math.floor((now - new Date(logs[0].created_at).getTime()) / 1000);
    }, [logs, now]);

    const eventsLastHour = useMemo(() => {
        const hourAgo = now - 60 * 60 * 1000;
        return logs.filter((l) => new Date(l.created_at).getTime() > hourAgo).length;
    }, [logs, now]);

    const successRate = useMemo(() => {
        const tot = stats.successCount + stats.errorCount;
        if (tot === 0) return 100;
        return Math.round((stats.successCount / tot) * 100);
    }, [stats]);

    const isLive = lastEventAgoSec !== null && lastEventAgoSec < 120;

    const kpis = [
        { label: "Eventos/h", value: String(eventsLastHour), color: "#2563EB", series },
        { label: "Taxa de sucesso", value: `${successRate}%`, color: "#16A34A", series: [] as number[] },
        { label: "Total no mês", value: String(stats.totalCount), color: "#64748B", series: [] as number[] },
    ];

    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b" style={{ borderColor: "#E6EDF5" }}>
                <div className="flex items-center gap-2.5">
                    <h3 className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>Atividade dos webhooks</h3>
                    {isLive ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "#ECFDF3", color: "#16A34A", letterSpacing: "0.06em" }}>
                            <span className="w-1 h-1 rounded-full bg-[#16A34A] animate-pulse" />
                            ao vivo
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "#F1F5F9", color: "#94A3B8", letterSpacing: "0.06em" }}>
                            ocioso
                        </span>
                    )}
                </div>
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                    {lastEventAgoSec === null
                        ? "Sem eventos recentes"
                        : lastEventAgoSec < 60
                            ? `Último há ${lastEventAgoSec}s`
                            : `Último há ${Math.floor(lastEventAgoSec / 60)}min`}
                </span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: "#E6EDF5" }}>
                {kpis.map((k) => (
                    <div key={k.label} className="px-4 py-3.5" style={{ borderColor: "#E6EDF5" }}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: k.color }} />
                            <p className="text-[10px] font-semibold uppercase truncate" style={{ color: "#64748B", letterSpacing: "0.04em" }}>{k.label}</p>
                        </div>
                        <p className="text-[20px] font-bold tabular-nums leading-none" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>{k.value}</p>
                        {k.series.length > 0 && (
                            <div className="mt-2 h-6">
                                <Sparkline data={k.series} color={k.color} width={120} height={24} className="w-full" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Feed recente */}
            <div className="max-h-[240px] overflow-y-auto" style={{ borderTop: "1px solid #E6EDF5" }}>
                {logs.length === 0 ? (
                    <div className="py-10 text-center text-xs" style={{ color: "#94A3B8" }}>
                        Aguardando o primeiro evento...
                    </div>
                ) : (
                    logs.slice(0, 8).map((log) => {
                        const color = statusColor(log.status);
                        return (
                            <div key={log.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[#F8FAFC]" style={{ borderTop: "1px solid #EEF2F7" }}>
                                {log.status === "error" ? (
                                    <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                )}
                                <span className="text-xs font-medium w-28 shrink-0 truncate" style={{ color: "#0B1220" }}>
                                    {platformNames[log.platform] || log.platform}
                                </span>
                                <span className="text-xs flex-1 truncate" style={{ color: "#64748B" }}>
                                    {eventLabels[log.event_type || ""] || log.event_type || "—"}
                                </span>
                                <span className="text-[10px] tabular-nums shrink-0" style={{ color: "#94A3B8" }}>
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
