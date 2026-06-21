// ─────────────────────────────────────────────────────────────────────────────
// EvaAnalyticsPanel (EVA.STUDIO.ANALYTICS) — vista secundária transversal do EVA
// Studio: "a EVA está valendo a pena?". Editorial premium, poucos números, cada
// um com significado.
//
// Lê a edge `eva-analytics-summary` (useQuery, staleTime 5min) e tolera campos
// faltando defensivamente — o contrato é consumido com acesso opcional e
// fallbacks, então um shape parcial nunca quebra o painel.
//
// Três blocos + rodapé:
//   A) CONFIANÇA  → Taxa de aprovação (rate + breakdown) · 1ª resposta (SLA)
//   B) RESULTADO  → Funil (qualified→won) · Temperatura · Score médio
//   C) ENSINAR    → Objeções mais comuns · Lacunas de contexto (insumo)
//   Rodapé        → Linhas vermelhas respeitadas
//
// Motion (EVA.STUDIO.MOTION): seções entram em stagger (fade+rise); números com
// count-up curto. Tudo respeita prefers-reduced-motion (estado final estático).
//
// Regras de cor: azul = ação/link · roxo = accent pequeno da EVA · sem
// Sparkles/Zap. Botões pretos pill via <Button>.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    AlertTriangle,
    ChartColumn,
    LineChart,
    Lock,
    MessageSquareWarning,
    ShieldCheck,
    Timer,
    TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { INK, SUB, MUTE, HAIR, BLUE, PURPLE, GREEN, AMBER, cardSoft, cardFlat } from "./tokens";

// ─── Contrato da edge (campos opcionais → tolerância defensiva) ───────────────

interface ApprovalShape {
    total?: number;
    pending?: number;
    accepted?: number;
    adjusted?: number;
    rejected?: number;
    sent?: number;
    rate?: number;
    empty?: boolean;
}
interface FunnelShape {
    lead?: number;
    qualification?: number;
    proposal?: number;
    negotiation?: number;
    closed_won?: number;
    closed_lost?: number;
}
/** Funil SÓ dos deals atribuídos à EVA. `empty` quando ainda não há nenhum. */
interface EvaFunnelShape extends FunnelShape {
    total?: number;
    empty?: boolean;
}
/** Ponto da série diária da curva de confiança. approvalRate em 0..1 ou null. */
interface TrendPoint {
    date?: string;
    approvalRate?: number | null;
    qualified?: number;
}
interface TemperatureShape {
    quente?: number;
    morno?: number;
    frio?: number;
}
interface AnalyticsSummary {
    rangeDays?: number;
    approval?: ApprovalShape;
    sla?: { firstReplyMedianMin?: number | null; conversations?: number };
    funnel?: FunnelShape;
    funnelEva?: EvaFunnelShape;
    trend?: TrendPoint[];
    temperature?: TemperatureShape;
    scoreAvg?: number | null;
    qualified?: number;
    topObjections?: { label?: string; count?: number }[];
    topGaps?: { description?: string; count?: number; status?: string }[];
    topMemory?: { content?: string; usageCount?: number; type?: string }[];
    redLines?: { respected?: number; total?: number; empty?: boolean };
}

type RangeDays = 7 | 30 | 90;
const RANGES: { value: RangeDays; label: string }[] = [
    { value: 7, label: "7 dias" },
    { value: 30, label: "30 dias" },
    { value: 90, label: "90 dias" },
];

// ─── Motion helpers ───────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handler = () => setReduced(mq.matches);
        mq.addEventListener?.("change", handler);
        return () => mq.removeEventListener?.("change", handler);
    }, []);
    return reduced;
}

/** Count-up curto (≈600ms). Em reduced-motion entrega o valor final direto. */
function useCountUp(target: number, active: boolean, decimals = 0): number {
    const reduced = usePrefersReducedMotion();
    const [value, setValue] = useState(active && !reduced ? 0 : target);
    const rafRef = useRef<number>();
    useEffect(() => {
        if (!active || reduced) {
            setValue(target);
            return;
        }
        const from = 0;
        const start = performance.now();
        const dur = 600;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / dur);
            // easeOutCubic ~ cubic-bezier(0.22,1,0.36,1)
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(from + (target - from) * eased);
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [target, active, reduced]);
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

// ─── Bloco com entrada em stagger (fade+rise, transform-only) ─────────────────

function Section({ index, title, eyebrow, children }: { index: number; title: string; eyebrow?: string; children: React.ReactNode }) {
    const reduced = usePrefersReducedMotion();
    const [shown, setShown] = useState(reduced);
    useEffect(() => {
        if (reduced) return;
        const id = window.setTimeout(() => setShown(true), 70 + index * 90);
        return () => window.clearTimeout(id);
    }, [index, reduced]);
    return (
        <section
            style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : "translateY(10px)",
                transition: reduced ? "none" : "opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)",
            }}
        >
            <div className="flex items-baseline gap-2.5 mb-3">
                {eyebrow && (
                    <span className="text-[10.5px] font-semibold uppercase tabular-nums" style={{ color: MUTE, letterSpacing: "0.08em" }}>
                        {eyebrow}
                    </span>
                )}
                <h3 className="text-[14px] font-semibold" style={{ color: INK, letterSpacing: "-0.01em" }}>{title}</h3>
            </div>
            {children}
        </section>
    );
}

// ─── Util ─────────────────────────────────────────────────────────────────────

const num = (v: number | null | undefined): number => (typeof v === "number" && isFinite(v) ? v : 0);

// ─── Estados base ─────────────────────────────────────────────────────────────

function PanelFrame({ rangeDays, onRange, children }: { rangeDays: RangeDays; onRange: (r: RangeDays) => void; children: React.ReactNode }) {
    return (
        <div className="space-y-7">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-[12.5px] max-w-[460px]" style={{ color: SUB, lineHeight: 1.55 }}>
                    O retrato do que a EVA fez no período: o quanto o time confia nela, o que isso virou no pipeline e o que ainda dá pra ensinar.
                </p>
                <div className="inline-flex p-0.5 rounded-full shrink-0" style={{ background: "#F1F5F9", border: `1px solid ${HAIR}` }}>
                    {RANGES.map((r) => {
                        const on = r.value === rangeDays;
                        return (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => onRange(r.value)}
                                aria-pressed={on}
                                className="text-[12px] font-semibold rounded-full px-3.5 py-1.5 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                                style={
                                    on
                                        ? { background: "#FFFFFF", color: INK, boxShadow: "0 1px 2px rgba(11,18,32,0.06), 0 4px 12px -8px rgba(11,18,32,0.22)" }
                                        : { background: "transparent", color: SUB }
                                }
                            >
                                {r.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            {children}
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="space-y-7" aria-hidden="true">
            {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-3">
                    <div className="h-3.5 w-40 rounded-full vz-anlt-skel" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1].map((c) => (
                            <div key={c} className="rounded-2xl p-5" style={cardFlat}>
                                <div className="h-8 w-24 rounded-lg vz-anlt-skel mb-3" />
                                <div className="h-3 w-32 rounded-full vz-anlt-skel" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Cards do bloco A: Confiança ──────────────────────────────────────────────

function ApprovalCard({ approval, active }: { approval: ApprovalShape | undefined; active: boolean }) {
    const empty = !approval || approval.empty || num(approval.total) === 0;
    const rate = Math.round(num(approval?.rate) * 100);
    const ratePct = useCountUp(rate, active && !empty);

    if (empty) {
        return (
            <div className="rounded-2xl p-5 h-full flex flex-col" style={cardFlat}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
                        <ShieldCheck className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                    </span>
                    <p className="text-[12.5px] font-semibold" style={{ color: INK }}>Taxa de aprovação</p>
                </div>
                <p className="text-[12.5px] mt-1" style={{ color: SUB, lineHeight: 1.6 }}>
                    Quando o time começar a aprovar as sugestões da EVA no Inbox, a confiança aparece aqui.
                </p>
            </div>
        );
    }

    const accepted = num(approval?.accepted);
    const adjusted = num(approval?.adjusted);
    const rejected = num(approval?.rejected);
    const denom = accepted + adjusted + rejected || 1;
    const seg = [
        { k: "Aceitas", v: accepted, color: GREEN },
        { k: "Ajustadas", v: adjusted, color: BLUE },
        { k: "Recusadas", v: rejected, color: "#DC2626" },
    ];

    return (
        <div className="rounded-2xl p-5 h-full flex flex-col" style={cardFlat}>
            <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                </span>
                <p className="text-[12.5px] font-semibold" style={{ color: INK }}>Taxa de aprovação</p>
            </div>
            <div className="flex items-end gap-1.5">
                <span className="text-[38px] font-bold leading-none tabular-nums" style={{ color: INK, letterSpacing: "-0.03em" }}>{ratePct}</span>
                <span className="text-[16px] font-semibold leading-none pb-1" style={{ color: MUTE }}>%</span>
            </div>
            <p className="text-[11.5px] mt-1.5" style={{ color: SUB }}>
                das sugestões foram aproveitadas pelo time.
            </p>

            {/* Barra de breakdown em segmentos */}
            <div className="mt-4 h-2 rounded-full overflow-hidden flex" style={{ background: "#F1F5F9" }}>
                {seg.map((s) => (
                    <span key={s.k} style={{ width: `${(s.v / denom) * 100}%`, background: s.color }} />
                ))}
            </div>
            <div className="mt-2.5 flex items-center gap-3.5 flex-wrap">
                {seg.map((s) => (
                    <span key={s.k} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: SUB }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        {s.k} <span className="tabular-nums font-semibold" style={{ color: INK }}>{s.v}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

function SlaCard({ sla, active }: { sla: AnalyticsSummary["sla"]; active: boolean }) {
    const min = sla?.firstReplyMedianMin;
    const has = typeof min === "number" && isFinite(min);
    const shown = useCountUp(has ? Math.round(num(min)) : 0, active && has);
    const convos = num(sla?.conversations);
    return (
        <div className="rounded-2xl p-5 h-full flex flex-col" style={cardFlat}>
            <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,99,235,0.08)" }}>
                    <Timer className="w-3.5 h-3.5" style={{ color: BLUE }} />
                </span>
                <p className="text-[12.5px] font-semibold" style={{ color: INK }}>1ª resposta</p>
            </div>
            {has ? (
                <>
                    <div className="flex items-end gap-1.5">
                        <span className="text-[38px] font-bold leading-none tabular-nums" style={{ color: INK, letterSpacing: "-0.03em" }}>{shown}</span>
                        <span className="text-[15px] font-semibold leading-none pb-1" style={{ color: MUTE }}>min</span>
                    </div>
                    <p className="text-[11.5px] mt-1.5" style={{ color: SUB }}>
                        tempo mediano até a primeira resposta{convos > 0 ? `, em ${convos} conversa${convos === 1 ? "" : "s"}.` : "."}
                    </p>
                </>
            ) : (
                <p className="text-[12.5px] mt-1" style={{ color: SUB, lineHeight: 1.6 }}>
                    Ainda sem conversas com primeira resposta no período. O tempo mediano aparece quando o time responder.
                </p>
            )}
        </div>
    );
}

// ─── Curva de confiança (tendência) ──────────────────────────────────────────
// Mini gráfico de área/linha da taxa de aprovação ao longo do tempo, com o
// volume de qualificados como barras de fundo discretas. SVG leve, sem lib.

function fmtDateShort(iso: string | undefined): string {
    if (!iso) return "";
    // YYYY-MM-DD → DD/MM, defensivo a formatos inesperados
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) return `${m[3]}/${m[2]}`;
    const d = new Date(iso);
    return isFinite(d.getTime()) ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : "";
}

function TrendCard({ trend, active }: { trend: TrendPoint[] | undefined; active: boolean }) {
    const reduced = usePrefersReducedMotion();
    const pathRef = useRef<SVGPathElement>(null);

    // Sanitiza a série defensivamente: ordena por data, mantém shape tolerante.
    const points = (trend ?? [])
        .filter((p): p is TrendPoint => !!p && typeof p === "object")
        .map((p) => ({
            date: typeof p.date === "string" ? p.date : "",
            rate: typeof p.approvalRate === "number" && isFinite(p.approvalRate) ? Math.max(0, Math.min(1, p.approvalRate)) : null,
            qualified: num(p.qualified),
        }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const withRate = points.filter((p) => p.rate !== null);
    const empty = points.length === 0 || withRate.length === 0;

    // Geometria do SVG (viewBox fixo, responsivo por width 100%)
    const W = 320;
    const H = 96;
    const PADX = 4;
    const PADTOP = 10;
    const PADBOT = 8;

    // Anima o desenho do path (stroke-dashoffset) na entrada, respeitando reduced-motion.
    useEffect(() => {
        if (empty || reduced || !active) return;
        const el = pathRef.current;
        if (!el) return;
        const len = el.getTotalLength?.() ?? 0;
        if (!len) return;
        el.style.transition = "none";
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
        // força reflow antes de animar
        void el.getBoundingClientRect();
        el.style.transition = "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)";
        el.style.strokeDashoffset = "0";
    }, [empty, reduced, active, withRate.length]);

    if (empty) {
        return (
            <div className="rounded-2xl p-5" style={cardSoft}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
                        <LineChart className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                    </span>
                    <p className="text-[13px] font-semibold" style={{ color: INK }}>Curva de confiança</p>
                </div>
                <div className="rounded-xl px-4 py-8 text-center" style={{ background: "#F8FAFC", border: `1px dashed ${HAIR}` }}>
                    <p className="text-[12.5px]" style={{ color: SUB, lineHeight: 1.6 }}>
                        A curva aparece conforme o time usa a EVA. Cada dia de aprovações desenha um ponto a mais aqui.
                    </p>
                </div>
            </div>
        );
    }

    const n = points.length;
    const innerW = W - PADX * 2;
    const innerH = H - PADTOP - PADBOT;
    const x = (i: number) => (n === 1 ? W / 2 : PADX + (i / (n - 1)) * innerW);
    const y = (rate: number) => PADTOP + (1 - rate) * innerH;

    // Barras de fundo: volume de qualificados (discreto)
    const maxQ = Math.max(1, ...points.map((p) => p.qualified));
    const barW = n === 1 ? innerW * 0.25 : Math.min((innerW / n) * 0.55, 14);

    // Linha + área da approvalRate. Interpola sobre dias com rate (ignora null).
    const rated = points.map((p, i) => ({ i, rate: p.rate })).filter((p): p is { i: number; rate: number } => p.rate !== null);
    const linePts = rated.map((p) => ({ px: x(p.i), py: y(p.rate) }));
    const linePath = linePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
    const areaPath =
        linePts.length > 1
            ? `${linePath} L${linePts[linePts.length - 1].px.toFixed(1)},${(H - PADBOT).toFixed(1)} L${linePts[0].px.toFixed(1)},${(H - PADBOT).toFixed(1)} Z`
            : "";

    const last = withRate[withRate.length - 1];
    const lastPct = Math.round((last.rate ?? 0) * 100);

    return (
        <div className="rounded-2xl p-5" style={cardSoft}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
                        <LineChart className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                    </span>
                    <p className="text-[13px] font-semibold" style={{ color: INK }}>Curva de confiança</p>
                </div>
                <span className="text-[11.5px] tabular-nums font-semibold px-2 py-0.5 rounded-full" style={{ color: PURPLE, background: "rgba(124,58,237,0.08)" }}>
                    {lastPct}% hoje
                </span>
            </div>
            <p className="text-[11.5px] mb-2.5" style={{ color: SUB }}>
                taxa de aprovação dia a dia, com o volume de qualificados ao fundo.
            </p>

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Curva de confiança: aprovação atual ${lastPct}%`} style={{ display: "block", overflow: "visible" }}>
                {/* grade horizontal sutil (0/50/100%) */}
                {[0, 0.5, 1].map((g) => (
                    <line key={g} x1={PADX} x2={W - PADX} y1={y(g)} y2={y(g)} stroke={HAIR} strokeWidth={1} strokeDasharray={g === 0.5 ? "2 3" : undefined} opacity={g === 0.5 ? 0.7 : 1} />
                ))}
                {/* barras de fundo: volume de qualificados */}
                {points.map((p, i) =>
                    p.qualified > 0 ? (
                        <rect
                            key={`b${i}`}
                            x={x(i) - barW / 2}
                            y={H - PADBOT - (p.qualified / maxQ) * innerH * 0.6}
                            width={barW}
                            height={(p.qualified / maxQ) * innerH * 0.6}
                            rx={2}
                            fill={BLUE}
                            opacity={0.1}
                        />
                    ) : null,
                )}
                {/* área sob a linha */}
                {areaPath && <path d={areaPath} fill={PURPLE} opacity={0.08} />}
                {/* linha da taxa de aprovação */}
                <path ref={pathRef} d={linePath} fill="none" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {/* ponto final em destaque */}
                {linePts.length > 0 && (
                    <circle cx={linePts[linePts.length - 1].px} cy={linePts[linePts.length - 1].py} r={3} fill="#FFFFFF" stroke={PURPLE} strokeWidth={2} />
                )}
            </svg>

            {/* extremos do eixo de tempo */}
            <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] tabular-nums" style={{ color: MUTE }}>{fmtDateShort(points[0]?.date)}</span>
                <span className="text-[10px] tabular-nums" style={{ color: MUTE }}>{fmtDateShort(points[n - 1]?.date)}</span>
            </div>
        </div>
    );
}

// ─── Cards do bloco B: Resultado ──────────────────────────────────────────────

const FUNNEL_STAGES: { key: keyof FunnelShape; label: string; color: string }[] = [
    { key: "qualification", label: "Qualificados", color: PURPLE },
    { key: "proposal", label: "Proposta", color: BLUE },
    { key: "negotiation", label: "Negociação", color: "#0EA5E9" },
    { key: "closed_won", label: "Ganhos", color: GREEN },
];

/** Linhas do funil a partir de um shape, com piso em qualificação (qualified). */
function funnelRows(shape: FunnelShape | undefined, qualifiedFloor = 0) {
    return FUNNEL_STAGES.map((s) => ({
        ...s,
        v: s.key === "qualification" ? Math.max(num(shape?.qualification), qualifiedFloor) : num(shape?.[s.key]),
    }));
}

/** Barras do funil — variante destaque (grande) ou contexto (compacta). */
function FunnelBars({ rows, compact }: { rows: ReturnType<typeof funnelRows>; compact?: boolean }) {
    const max = Math.max(1, ...rows.map((r) => r.v));
    return (
        <div className={compact ? "space-y-2" : "space-y-3"}>
            {rows.map((r) => (
                <div key={r.key} className="flex items-center gap-3">
                    <span className={`${compact ? "text-[11px]" : "text-[11.5px]"} w-[88px] shrink-0`} style={{ color: SUB }}>{r.label}</span>
                    <div className={`flex-1 ${compact ? "h-4" : "h-6"} rounded-md overflow-hidden`} style={{ background: "#F4F6FA" }}>
                        <span
                            className="block h-full rounded-md"
                            style={{
                                width: `${Math.max((r.v / max) * 100, r.v > 0 ? 6 : 0)}%`,
                                background: r.color,
                                opacity: compact ? 0.5 : 1,
                                transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                            }}
                        />
                    </div>
                    <span className={`${compact ? "text-[11.5px]" : "text-[13px]"} font-bold tabular-nums w-7 text-right shrink-0`} style={{ color: INK }}>{r.v}</span>
                </div>
            ))}
        </div>
    );
}

function FunnelCard({ funnel, funnelEva, qualified }: { funnel: FunnelShape | undefined; funnelEva: EvaFunnelShape | undefined; qualified: number }) {
    // Funil da EVA: só vale como destaque quando não-empty E tem algum movimento.
    const evaAvailable = !!funnelEva && !funnelEva.empty;
    const evaRows = evaAvailable ? funnelRows(funnelEva) : [];
    const evaHasData = evaRows.some((r) => r.v > 0);

    const generalRows = funnelRows(funnel, qualified);
    const generalHasData = generalRows.some((r) => r.v > 0);

    return (
        <div className="rounded-2xl p-5" style={cardSoft}>
            <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: evaAvailable ? "rgba(124,58,237,0.08)" : "rgba(37,99,235,0.08)" }}>
                    <ChartColumn className="w-3.5 h-3.5" style={{ color: evaAvailable ? PURPLE : BLUE }} />
                </span>
                <p className="text-[13px] font-semibold" style={{ color: INK }}>
                    {evaAvailable ? "Do qualificado ao fechado, pela EVA" : "Do qualificado ao fechado"}
                </p>
            </div>

            {evaAvailable ? (
                <>
                    {evaHasData ? (
                        <FunnelBars rows={evaRows} />
                    ) : (
                        <p className="text-[12px]" style={{ color: SUB, lineHeight: 1.6 }}>
                            A EVA já tem deals atribuídos, mas nenhum se moveu no período ainda.
                        </p>
                    )}
                    {/* Funil geral como contexto secundário, menor e atenuado */}
                    {generalHasData && (
                        <div className="mt-4 pt-3.5" style={{ borderTop: `1px solid ${HAIR}` }}>
                            <p className="text-[10.5px] font-semibold uppercase mb-2.5" style={{ color: MUTE, letterSpacing: "0.07em" }}>
                                Pipeline geral
                            </p>
                            <FunnelBars rows={generalRows} compact />
                        </div>
                    )}
                </>
            ) : generalHasData ? (
                <>
                    <FunnelBars rows={generalRows} />
                    <p className="text-[11px] mt-3" style={{ color: MUTE, lineHeight: 1.5 }}>
                        Ainda sem deals atribuídos à EVA neste período. Quando ela qualificar e o card avançar, o funil dela aparece aqui em destaque.
                    </p>
                </>
            ) : (
                <p className="text-[12px]" style={{ color: SUB, lineHeight: 1.6 }}>
                    Sem oportunidades movimentadas no período. O funil se preenche conforme os leads avançam.
                </p>
            )}
        </div>
    );
}

function TemperatureCard({ temperature, scoreAvg, active }: { temperature: TemperatureShape | undefined; scoreAvg: number | null | undefined; active: boolean }) {
    const t = [
        { k: "Quente", v: num(temperature?.quente), color: "#DC2626" },
        { k: "Morno", v: num(temperature?.morno), color: AMBER },
        { k: "Frio", v: num(temperature?.frio), color: "#0EA5E9" },
    ];
    const total = t.reduce((a, b) => a + b.v, 0);
    const hasScore = typeof scoreAvg === "number" && isFinite(scoreAvg);
    const score = useCountUp(hasScore ? num(scoreAvg) : 0, active && hasScore, 1);
    return (
        <div className="rounded-2xl p-5" style={cardSoft}>
            <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                </span>
                <p className="text-[13px] font-semibold" style={{ color: INK }}>Termômetro dos leads</p>
            </div>

            {total > 0 ? (
                <>
                    <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "#F1F5F9" }}>
                        {t.map((s) => (
                            <span key={s.k} style={{ width: `${(s.v / total) * 100}%`, background: s.color, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
                        ))}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        {t.map((s) => (
                            <div key={s.k}>
                                <p className="text-[18px] font-bold tabular-nums leading-none" style={{ color: INK }}>{s.v}</p>
                                <p className="text-[11px] mt-1 inline-flex items-center gap-1.5" style={{ color: SUB }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />{s.k}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className="text-[12px]" style={{ color: SUB, lineHeight: 1.6 }}>
                    A EVA ainda não classificou leads por temperatura no período.
                </p>
            )}

            {hasScore && (
                <div className="mt-4 pt-3.5 flex items-center justify-between" style={{ borderTop: `1px solid ${HAIR}` }}>
                    <span className="text-[12px]" style={{ color: SUB }}>Score médio de qualificação</span>
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: INK }}>{score}</span>
                </div>
            )}
        </div>
    );
}

// ─── Cards do bloco C: Ensinar ────────────────────────────────────────────────

function ListCard({
    icon: Icon,
    accent,
    accentBg,
    title,
    rows,
    emptyText,
}: {
    icon: React.ElementType;
    accent: string;
    accentBg: string;
    title: string;
    rows: { label: string; count: number; meta?: string }[];
    emptyText: string;
}) {
    return (
        <div className="rounded-2xl p-5 h-full" style={cardFlat}>
            <div className="flex items-center gap-2 mb-3.5">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accentBg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                </span>
                <p className="text-[13px] font-semibold" style={{ color: INK }}>{title}</p>
            </div>
            {rows.length > 0 ? (
                <ul className="space-y-2.5">
                    {rows.map((r, i) => (
                        <li key={i} className="flex items-start justify-between gap-3">
                            <span className="text-[12.5px] flex-1 min-w-0" style={{ color: INK, lineHeight: 1.45 }}>{r.label}</span>
                            <span
                                className="text-[10.5px] font-semibold tabular-nums px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: accentBg, color: accent }}
                            >
                                {r.count}{r.meta ? ` · ${r.meta}` : "×"}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-[12px]" style={{ color: SUB, lineHeight: 1.6 }}>{emptyText}</p>
            )}
        </div>
    );
}

// ─── Painel ───────────────────────────────────────────────────────────────────

export function EvaAnalyticsPanel({ onTeach }: { onTeach?: () => void }) {
    const { companyId } = useAuth();
    const [rangeDays, setRangeDays] = useState<RangeDays>(7);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["eva-analytics-summary", companyId, rangeDays],
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
        queryFn: async (): Promise<AnalyticsSummary> => {
            const { data, error } = await supabase.functions.invoke("eva-analytics-summary", {
                body: { rangeDays },
            });
            if (error) throw error;
            return (data ?? {}) as AnalyticsSummary;
        },
    });

    // ── Erro ──
    if (isError) {
        return (
            <PanelFrame rangeDays={rangeDays} onRange={setRangeDays}>
                <div className="rounded-2xl p-8 text-center" style={cardSoft}>
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2.5" style={{ color: AMBER }} />
                    <p className="text-[13px] font-semibold" style={{ color: INK }}>Não consegui carregar os números agora.</p>
                    <p className="text-[12px] mt-1 mb-4" style={{ color: SUB }}>Pode ser uma instabilidade momentânea. Tente de novo.</p>
                    <Button size="sm" onClick={() => refetch()}>Tentar de novo</Button>
                </div>
            </PanelFrame>
        );
    }

    // ── Loading ──
    if (isLoading || !data) {
        return (
            <PanelFrame rangeDays={rangeDays} onRange={setRangeDays}>
                <SkeletonGrid />
            </PanelFrame>
        );
    }

    const approval = data.approval;
    const sla = data.sla;
    const funnel = data.funnel;
    const temperature = data.temperature;
    const objections = (data.topObjections ?? [])
        .filter((o) => o && (o.label ?? "").trim())
        .slice(0, 5)
        .map((o) => ({ label: String(o.label), count: num(o.count) }));
    const gaps = (data.topGaps ?? [])
        .filter((g) => g && (g.description ?? "").trim())
        .slice(0, 5)
        .map((g) => ({ label: String(g.description), count: num(g.count), meta: g.status === "open" ? "aberta" : g.status === "resolved" ? "resolvida" : undefined }));

    // "Sem dados no período" honesto: nenhum dos blocos tem o que mostrar.
    const approvalEmpty = !approval || approval.empty || num(approval.total) === 0;
    const slaEmpty = !(typeof sla?.firstReplyMedianMin === "number");
    const funnelEmpty = !funnel || Object.values(funnel).every((v) => !num(v));
    const tempEmpty = !temperature || Object.values(temperature).every((v) => !num(v));
    const trendEmpty = !(data.trend ?? []).some((p) => p && typeof p.approvalRate === "number" && isFinite(p.approvalRate));
    const funnelEvaEmpty = !data.funnelEva || data.funnelEva.empty;
    const wholeEmpty = approvalEmpty && slaEmpty && funnelEmpty && tempEmpty && trendEmpty && funnelEvaEmpty && objections.length === 0 && gaps.length === 0;

    if (wholeEmpty) {
        return (
            <PanelFrame rangeDays={rangeDays} onRange={setRangeDays}>
                <div className="rounded-2xl px-8 py-12 text-center" style={cardSoft}>
                    <span className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.08)" }}>
                        <ChartColumn className="w-5 h-5" style={{ color: PURPLE }} />
                    </span>
                    <p className="text-[14px] font-semibold" style={{ color: INK }}>Ainda não há movimento neste período.</p>
                    <p className="text-[12.5px] mt-1.5 max-w-[400px] mx-auto" style={{ color: SUB, lineHeight: 1.6 }}>
                        Conforme a EVA for sugerindo no Inbox e o time for aprovando, este painel mostra a confiança, o que virou pipeline e o que ainda dá pra ensinar.
                    </p>
                    {rangeDays !== 90 && (
                        <div className="mt-5">
                            <Button size="sm" variant="outline" onClick={() => setRangeDays(90)}>Ver os últimos 90 dias</Button>
                        </div>
                    )}
                </div>
            </PanelFrame>
        );
    }

    const rl = data.redLines;
    const rlEmpty = !rl || rl.empty || typeof rl.total !== "number";

    return (
        <PanelFrame rangeDays={rangeDays} onRange={setRangeDays}>
            {/* ── A) CONFIANÇA ── */}
            <Section index={0} eyebrow="01" title="Confiança">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ApprovalCard approval={approval} active={!isLoading} />
                    <SlaCard sla={sla} active={!isLoading} />
                </div>
                <div className="mt-3">
                    <TrendCard trend={data.trend} active={!isLoading} />
                </div>
            </Section>

            {/* ── B) RESULTADO ── */}
            <Section index={1} eyebrow="02" title="Resultado">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <FunnelCard funnel={funnel} funnelEva={data.funnelEva} qualified={num(data.qualified)} />
                    <TemperatureCard temperature={temperature} scoreAvg={data.scoreAvg} active={!isLoading} />
                </div>
            </Section>

            {/* ── C) O QUE ENSINAR PRA EVA ── */}
            <Section index={2} eyebrow="03" title="O que ensinar pra EVA">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ListCard
                        icon={MessageSquareWarning}
                        accent={BLUE}
                        accentBg="rgba(37,99,235,0.08)"
                        title="Objeções mais comuns"
                        rows={objections}
                        emptyText="Nenhuma objeção recorrente detectada nas conversas do período."
                    />
                    <ListCard
                        icon={AlertTriangle}
                        accent={AMBER}
                        accentBg="rgba(180,83,9,0.10)"
                        title="Lacunas de contexto"
                        rows={gaps}
                        emptyText="A EVA não encontrou perguntas que não soube responder. Bom sinal."
                    />
                </div>
                {(objections.length > 0 || gaps.length > 0) && (
                    <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap rounded-xl px-4 py-3" style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.16)" }}>
                        <p className="text-[12px] flex-1 min-w-0" style={{ color: INK, lineHeight: 1.5 }}>
                            Cada item acima é uma resposta a mais que a EVA pode aprender. Leve pro passo <strong style={{ fontWeight: 600 }}>Ensinar</strong> e ela melhora.
                        </p>
                        {onTeach && (
                            <button
                                type="button"
                                onClick={onTeach}
                                className="text-[12px] font-semibold shrink-0 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 rounded"
                                style={{ color: BLUE }}
                            >
                                Ir para Ensinar →
                            </button>
                        )}
                    </div>
                )}
            </Section>

            {/* ── Rodapé: linhas vermelhas ── */}
            <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#F8FAFC", border: `1px solid ${HAIR}` }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(22,163,74,0.10)" }}>
                    <Lock className="w-4 h-4" style={{ color: GREEN }} />
                </span>
                <div className="min-w-0">
                    {rlEmpty ? (
                        <>
                            <p className="text-[12.5px] font-semibold" style={{ color: INK }}>Linhas vermelhas respeitadas</p>
                            <p className="text-[12px] mt-0.5" style={{ color: SUB, lineHeight: 1.55 }}>
                                A EVA nunca envia sozinha — toda saída passa pelo seu time.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-[12.5px] font-semibold" style={{ color: INK }}>
                                Linhas vermelhas respeitadas{" "}
                                <span className="tabular-nums" style={{ color: GREEN }}>
                                    {num(rl?.respected)} de {num(rl?.total)}
                                </span>
                            </p>
                            <p className="text-[12px] mt-0.5" style={{ color: SUB, lineHeight: 1.55 }}>
                                Nenhuma saída foi enviada sem aprovação humana. A EVA sugere, seu time aprova.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </PanelFrame>
    );
}

export default EvaAnalyticsPanel;
