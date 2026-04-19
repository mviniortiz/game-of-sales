import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, XCircle, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

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

const WINDOW_MS = 60_000; // últimos 60s
const STATUS_COLOR = {
    success: "#10b981",
    error: "#f43f5e",
    processing: "#f59e0b",
    default: "#64748b",
};

function statusColor(status: string | null) {
    if (status === "success") return STATUS_COLOR.success;
    if (status === "error") return STATUS_COLOR.error;
    if (status === "processing") return STATUS_COLOR.processing;
    return STATUS_COLOR.default;
}

export function WebhookHeartbeat({ logs, stats, platformNames, eventLabels }: Props) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const dots = useMemo(() => {
        return logs
            .filter((l) => now - new Date(l.created_at).getTime() < WINDOW_MS)
            .map((l) => ({
                id: l.id,
                x: Math.max(
                    0,
                    Math.min(100, 100 - ((now - new Date(l.created_at).getTime()) / WINDOW_MS) * 100),
                ),
                status: l.status,
                platform: l.platform,
                event: l.event_type,
            }));
    }, [logs, now]);

    const lastEventAgoSec = useMemo(() => {
        if (!logs[0]) return null;
        return Math.floor((now - new Date(logs[0].created_at).getTime()) / 1000);
    }, [logs, now]);

    // BPM = eventos por hora (últimos 60min)
    const bpm = useMemo(() => {
        const hourAgo = now - 60 * 60 * 1000;
        return logs.filter((l) => new Date(l.created_at).getTime() > hourAgo).length;
    }, [logs, now]);

    const successRate = useMemo(() => {
        const tot = stats.successCount + stats.errorCount;
        if (tot === 0) return 100;
        return Math.round((stats.successCount / tot) * 100);
    }, [stats]);

    const isLive = dots.length > 0;

    return (
        <>
            <style>{`
        @keyframes ekg-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-200px); }
        }
        @keyframes ekg-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .ekg-path {
          animation: ekg-scroll 3s linear infinite;
        }
        .ekg-glow {
          filter: drop-shadow(0 0 3px rgba(16,185,129,0.6));
        }
      `}</style>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-emerald-950/5 shadow-sm">
                {/* ── Monitor panel ──────────────────────────────── */}
                <div className="relative p-5 border-b border-border/60">
                    {/* Top row: signal + KPIs */}
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                                <Radio
                                    className={`w-4 h-4 text-emerald-400 ${isLive ? "" : "opacity-50"}`}
                                    style={{ animation: isLive ? "ekg-pulse 1.5s ease-in-out infinite" : undefined }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-foreground tracking-tight">
                                        Monitor de webhooks
                                    </h3>
                                    {isLive ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-[9px] px-1.5 py-0 font-bold tracking-wider">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                                            LIVE
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                                            IDLE
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {lastEventAgoSec === null
                                        ? "Sem eventos recentes"
                                        : lastEventAgoSec < 60
                                            ? `Último sinal há ${lastEventAgoSec}s`
                                            : `Último sinal há ${Math.floor(lastEventAgoSec / 60)}min`}
                                </p>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="flex items-center gap-5">
                            <Kpi label="BPM" value={bpm} unit="/h" accent />
                            <div className="h-8 w-px bg-border/60" />
                            <Kpi label="Taxa" value={successRate} unit="%" color="emerald" />
                            <div className="h-8 w-px bg-border/60" />
                            <Kpi label="Total" value={stats.totalCount} unit="mês" />
                        </div>
                    </div>

                    {/* ── EKG canvas ──────────────────────────────── */}
                    <div
                        className="relative h-24 overflow-hidden rounded-xl border border-emerald-500/10"
                        style={{
                            background:
                                "radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0.4) 70%)",
                        }}
                    >
                        {/* Grid lines */}
                        <svg
                            className="absolute inset-0 w-full h-full opacity-30"
                            preserveAspectRatio="none"
                            viewBox="0 0 800 100"
                        >
                            <defs>
                                <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 20" fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="800" height="100" fill="url(#grid)" />
                        </svg>

                        {/* EKG scrolling line */}
                        <svg
                            className="absolute inset-0 w-full h-full"
                            preserveAspectRatio="none"
                            viewBox="0 0 800 100"
                        >
                            <defs>
                                <linearGradient id="ekgGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                                    <stop offset="90%" stopColor="#10b981" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            <g className="ekg-path ekg-glow">
                                {/* pattern de 200px repetido */}
                                {[0, 200, 400, 600, 800].map((offset) => (
                                    <path
                                        key={offset}
                                        d={`M ${offset} 50 L ${offset + 30} 50 L ${offset + 40} 45 L ${offset + 50} 55 L ${offset + 60} 20 L ${offset + 70} 80 L ${offset + 80} 40 L ${offset + 90} 60 L ${offset + 100} 50 L ${offset + 200} 50`}
                                        fill="none"
                                        stroke="url(#ekgGrad)"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                ))}
                            </g>
                        </svg>

                        {/* Real event dots */}
                        <AnimatePresence>
                            {dots.map((dot) => {
                                const color = statusColor(dot.status);
                                return (
                                    <motion.div
                                        key={dot.id}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-default"
                                        style={{ left: `${dot.x}%` }}
                                    >
                                        <div
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{
                                                background: color,
                                                boxShadow: `0 0 10px ${color}, 0 0 3px ${color}`,
                                            }}
                                        />
                                        <div
                                            className="absolute inset-0 rounded-full animate-ping"
                                            style={{ background: color, opacity: 0.4 }}
                                        />
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                            <div className="px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium shadow-lg">
                                                {platformNames[dot.platform] || dot.platform} · {eventLabels[dot.event || ""] || dot.event}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Axis labels */}
                        <div className="absolute bottom-1.5 left-2.5 text-[9px] text-emerald-400/50 font-mono tracking-wider">
                            −60s
                        </div>
                        <div className="absolute bottom-1.5 right-2.5 text-[9px] text-emerald-400/80 font-mono tracking-wider flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            AGORA
                        </div>
                    </div>

                    {/* Status summary */}
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold tabular-nums">{stats.successCount}</span>
                                <span className="text-muted-foreground">sucesso</span>
                            </span>
                            {stats.errorCount > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                    <span className="text-rose-400 font-semibold tabular-nums">{stats.errorCount}</span>
                                    <span className="text-muted-foreground">erros</span>
                                </span>
                            )}
                            {dots.length > 0 && (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Activity className="w-3 h-3" />
                                    <span className="tabular-nums">{dots.length}</span>
                                    <span>nos últimos 60s</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Recent feed (condensed) ───────────────────── */}
                <div className="max-h-[260px] overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="py-10 text-center text-xs text-muted-foreground">
                            Aguardando primeiro evento...
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {logs.slice(0, 8).map((log) => {
                                const color = statusColor(log.status);
                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-3 px-5 py-2 hover:bg-muted/20 transition-colors group"
                                    >
                                        <div
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                                        />
                                        <span className="text-xs font-medium text-foreground/90 w-24 shrink-0 truncate">
                                            {platformNames[log.platform] || log.platform}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex-1 truncate font-mono">
                                            {eventLabels[log.event_type || ""] || log.event_type || "—"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function Kpi({
    label,
    value,
    unit,
    color,
    accent,
}: {
    label: string;
    value: number;
    unit?: string;
    color?: "emerald";
    accent?: boolean;
}) {
    return (
        <div className="flex flex-col items-end">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
            </span>
            <div className="flex items-baseline gap-0.5">
                <span
                    className={`text-lg font-bold tabular-nums ${color === "emerald" ? "text-emerald-400" : accent ? "text-foreground" : "text-foreground"}`}
                    style={{ fontFamily: "var(--font-heading, inherit)" }}
                >
                    {value}
                </span>
                {unit && (
                    <span className="text-[10px] text-muted-foreground/70">{unit}</span>
                )}
            </div>
        </div>
    );
}
