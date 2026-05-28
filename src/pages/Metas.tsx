// ─────────────────────────────────────────────────────────────────────────────
// Metas — redesign light premium (2026-05-28). Hooks e cálculos preservados
// (cockpit, pace diário, projeção, delta MoM); só o JSX foi reescrito pro
// padrão visual do Início/DecisionWorkspace (Phosphor duotone, cards brancos,
// borda #E4E9F2, sombras suaves). Sem mexer em schema/mutations.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import {
    Target,
    TrendUp,
    TrendDown,
    Pulse,
    CalendarBlank,
    Lightning,
    ArrowsClockwise as RefreshIcon,
    Medal,
} from "@phosphor-icons/react";
import { endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { logger } from "@/utils/logger";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatCurrencyCompact = (v: number): string => {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")} M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace(".", ",")} k`;
    return formatCurrency(v);
};

const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface CockpitData {
    atingido: number;
    total: number;
    percentual: number;
    diasTotal: number;
    diasDecorridos: number;
    diasRestantes: number;
    percentualEsperadoHoje: number;
    paceDiarioNecessario: number;
    projecaoFimMes: number;
    deltaVsMesAnterior: number | null;
    canJudgePace: boolean;
}

interface TeamMember {
    id: string;
    user_id: string;
    nome: string;
    avatar_url: string | null;
    valorMeta: number;
    valorRealizado: number;
    percentual: number;
    contribuicaoPercentual: number;
    faltaAtingir: number;
}

// ─── Status do mês (chip do cockpit) ────────────────────────────────────────

function statusFromCockpit(c: CockpitData): { label: string; color: string; bg: string } {
    if (c.total <= 0) return { label: "Sem meta definida", color: "#64748B", bg: "rgba(148,163,184,0.15)" };
    if (c.percentual >= 100) return { label: "Meta batida", color: "#0F8A63", bg: "rgba(16,185,129,0.12)" };
    if (!c.canJudgePace) return { label: "Início do mês", color: "#1D4ED8", bg: "rgba(37,99,235,0.10)" };
    if (c.percentual >= c.percentualEsperadoHoje + 5) return { label: "Acima do ritmo", color: "#0F8A63", bg: "rgba(16,185,129,0.12)" };
    if (c.percentual < c.percentualEsperadoHoje - 15) return { label: "Abaixo do ritmo", color: "#B45309", bg: "rgba(245,158,11,0.14)" };
    return { label: "No ritmo", color: "#1D4ED8", bg: "rgba(37,99,235,0.10)" };
}

// ─── Subcomponentes visuais ─────────────────────────────────────────────────

interface KpiCellProps {
    icon: typeof Target;
    accent: string;
    label: string;
    value: string;
    hint?: React.ReactNode;
}

function KpiCell({ icon: Icon, accent, label, value, hint }: KpiCellProps) {
    return (
        <div className="rounded-xl p-3.5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${accent}14`, border: `1px solid ${accent}29` }}>
                    <Icon size={14} weight="duotone" style={{ color: accent }} />
                </div>
                <span className="text-[10.5px] uppercase tracking-wider font-bold" style={{ color: "#475569", letterSpacing: "0.06em" }}>
                    {label}
                </span>
            </div>
            <p className="text-[20px] sm:text-[22px] font-bold tabular-nums leading-none"
                style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                {value}
            </p>
            {hint && <div className="text-[11px] mt-1.5 leading-snug" style={{ color: "#64748B" }}>{hint}</div>}
        </div>
    );
}

function CockpitHero({ title, mesRef, cockpit }: { title: string; mesRef: string; cockpit: CockpitData }) {
    const circleR = 62;
    const circleCircumference = 2 * Math.PI * circleR;
    const circleOffset = circleCircumference * (1 - Math.min(cockpit.percentual, 100) / 100);
    const st = statusFromCockpit(cockpit);

    const deltaHint = cockpit.deltaVsMesAnterior !== null ? (
        <span className="inline-flex items-center gap-1 flex-wrap">
            {cockpit.deltaVsMesAnterior >= 0
                ? <TrendUp size={11} weight="bold" style={{ color: "#0F8A63" }} />
                : <TrendDown size={11} weight="bold" style={{ color: "#BE123C" }} />}
            <span className="tabular-nums font-semibold" style={{ color: cockpit.deltaVsMesAnterior >= 0 ? "#0F8A63" : "#BE123C" }}>
                {cockpit.deltaVsMesAnterior >= 0 ? "+" : ""}{cockpit.deltaVsMesAnterior.toFixed(1)}%
            </span>
            <span style={{ color: "#94A3B8" }}>vs mês anterior</span>
        </span>
    ) : (
        <span style={{ color: "#94A3B8" }}>de {formatCurrencyCompact(cockpit.total)}</span>
    );

    return (
        <div className="rounded-2xl" style={{
            background: "#FFFFFF",
            border: "1px solid #E4E9F2",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
        }}>
            {/* Header do cockpit */}
            <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b" style={{ borderColor: "#F1F5F9" }}>
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "#2563EB" }}>
                        Meta consolidada
                    </p>
                    <h2 className="text-[18px] sm:text-[20px] font-bold mt-0.5" style={{ color: "#0B1220", letterSpacing: "-0.018em" }}>
                        {title}
                    </h2>
                    <p className="text-[12px] mt-0.5 capitalize" style={{ color: "#64748B" }}>
                        {format(new Date(mesRef + "T12:00:00"), "MMMM 'de' yyyy", { locale: ptBR })}
                        {cockpit.diasRestantes > 0 && (
                            <> · faltam <span className="tabular-nums font-semibold" style={{ color: "#475569" }}>{cockpit.diasRestantes}</span> {cockpit.diasRestantes === 1 ? "dia" : "dias"}</>
                        )}
                    </p>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold uppercase px-2 py-1 rounded-md shrink-0"
                    style={{ background: st.bg, color: st.color, letterSpacing: "0.05em" }}>
                    {st.label}
                </span>
            </div>

            {/* Gauge + KPIs */}
            <div className="p-5 sm:p-6 grid lg:grid-cols-[auto_1fr] gap-6 items-center">
                <div className="relative w-[160px] h-[160px] mx-auto lg:mx-0 flex-shrink-0">
                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r={circleR} fill="none" stroke="#EAF0F6" strokeWidth="8" />
                        <circle cx="80" cy="80" r={circleR} fill="none"
                            stroke="url(#metasGrad)" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circleCircumference}
                            strokeDashoffset={circleOffset}
                            style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.2,0.8,0.2,1)" }} />
                        <defs>
                            <linearGradient id="metasGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#2563EB" />
                                <stop offset="100%" stopColor="#4A8CE8" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[36px] font-bold tabular-nums leading-none" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                            {cockpit.percentual.toFixed(0)}
                            <span className="text-[18px]" style={{ color: "#94A3B8" }}>%</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-wider mt-1.5" style={{ color: "#94A3B8" }}>
                            da meta
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KpiCell icon={Lightning} accent="#2563EB" label="Realizado"
                        value={formatCurrencyCompact(cockpit.atingido)} hint={deltaHint} />
                    <KpiCell icon={Pulse} accent="#7C3AED" label="Pace diário"
                        value={cockpit.diasRestantes > 0 ? formatCurrencyCompact(cockpit.paceDiarioNecessario) : "—"}
                        hint={cockpit.diasRestantes > 0
                            ? `necessário nos próximos ${cockpit.diasRestantes} ${cockpit.diasRestantes === 1 ? "dia" : "dias"}`
                            : "período encerrado"} />
                    <KpiCell icon={CalendarBlank} accent="#10B981" label="Projeção"
                        value={formatCurrencyCompact(cockpit.projecaoFimMes)}
                        hint={cockpit.total <= 0
                            ? "meta não definida"
                            : cockpit.projecaoFimMes >= cockpit.total
                                ? "bate a meta no ritmo atual"
                                : `${((cockpit.projecaoFimMes / cockpit.total) * 100).toFixed(0)}% da meta no ritmo atual`} />
                </div>
            </div>

            {/* Progress bar com marcador de pace */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1">
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#EAF0F6" }}>
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{
                            width: `${Math.min(cockpit.percentual, 100)}%`,
                            background: "linear-gradient(90deg, #2563EB 0%, #4A8CE8 100%)",
                        }} />
                    {cockpit.percentualEsperadoHoje > 0 && cockpit.percentualEsperadoHoje < 100 && (
                        <div className="absolute -top-1 -bottom-1 w-px" aria-label="Pace ideal hoje"
                            style={{ left: `${cockpit.percentualEsperadoHoje}%`, background: "#0B1220", opacity: 0.32 }} />
                    )}
                </div>
                <div className="flex items-center justify-between gap-3 mt-2 text-[11px] flex-wrap" style={{ color: "#64748B" }}>
                    <span className="tabular-nums">
                        <span style={{ color: "#94A3B8" }}>Realizado:</span>{" "}
                        <strong style={{ color: "#0B1220" }}>{formatCurrencyCompact(cockpit.atingido)}</strong>
                    </span>
                    {cockpit.percentualEsperadoHoje > 0 && cockpit.percentualEsperadoHoje < 100 && (
                        <span className="tabular-nums">
                            <span style={{ color: "#94A3B8" }}>Pace ideal hoje:</span>{" "}
                            <strong style={{ color: "#0B1220" }}>{cockpit.percentualEsperadoHoje.toFixed(0)}%</strong>
                        </span>
                    )}
                    <span className="tabular-nums">
                        <span style={{ color: "#94A3B8" }}>Meta:</span>{" "}
                        <strong style={{ color: "#0B1220" }}>{formatCurrencyCompact(cockpit.total)}</strong>
                    </span>
                </div>
            </div>
        </div>
    );
}

function TeamMemberRow({
    v, pos, isWinner, behindPace, percentualEsperadoHoje, gap,
}: {
    v: TeamMember;
    pos: number;
    isWinner: boolean;
    behindPace: boolean;
    percentualEsperadoHoje: number;
    gap: number;
}) {
    const valueColor = isWinner ? "#0F8A63" : behindPace ? "#B45309" : "#0B1220";
    const barBg = isWinner
        ? "linear-gradient(90deg, #10B981 0%, #34D399 100%)"
        : behindPace
            ? "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)"
            : "linear-gradient(90deg, #2563EB 0%, #4A8CE8 100%)";

    return (
        <div className="rounded-xl transition-colors hover:bg-[#F8FAFC]" style={{ background: "#FFFFFF", border: "1px solid #E4E9F2" }}>
            <div className="grid grid-cols-[auto_auto_1fr_auto] gap-3 sm:gap-4 items-center p-3.5 sm:p-4">
                <span className="w-6 text-center text-[12px] font-bold tabular-nums" style={{ color: "#CBD5E1" }}>{pos}</span>
                <Avatar className={`h-10 w-10 ${isWinner ? "ring-2 ring-[#10B981]/40" : ""}`}>
                    {v.avatar_url && <AvatarImage src={v.avatar_url} alt={v.nome} />}
                    <AvatarFallback style={{ background: "#F1F5F9", color: "#0B1220" }} className="text-[12px] font-semibold">
                        {getInitials(v.nome)}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13.5px] truncate" style={{ color: "#0B1220" }}>{v.nome}</span>
                        {isWinner && (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                                style={{ background: "rgba(16,185,129,0.12)", color: "#0F8A63", letterSpacing: "0.04em" }}>
                                Bateu meta
                            </span>
                        )}
                        {behindPace && (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tabular-nums"
                                style={{ background: "rgba(245,158,11,0.12)", color: "#B45309", letterSpacing: "0.04em" }}>
                                {gap.toFixed(0)}pp abaixo
                            </span>
                        )}
                        {v.contribuicaoPercentual > 0 && (
                            <span className="text-[10.5px] tabular-nums" style={{ color: "#94A3B8" }}>
                                {v.contribuicaoPercentual < 0.1 ? "<0,1%" : `${v.contribuicaoPercentual.toFixed(1)}%`} do global
                            </span>
                        )}
                    </div>
                    <div className="relative h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "#EAF0F6" }}>
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(v.percentual, 100)}%`, background: barBg }} />
                        {percentualEsperadoHoje > 0 && percentualEsperadoHoje < 100 && (
                            <div className="absolute -top-1 -bottom-1 w-px" aria-hidden
                                style={{ left: `${percentualEsperadoHoje}%`, background: "#0B1220", opacity: 0.3 }} />
                        )}
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className="text-[18px] font-bold tabular-nums leading-none" style={{ color: valueColor, letterSpacing: "-0.02em" }}>
                        {v.percentual.toFixed(0)}%
                    </div>
                    <div className="text-[11px] tabular-nums mt-1" style={{ color: "#64748B" }}>
                        {formatCurrencyCompact(v.valorRealizado)}{" "}
                        <span style={{ color: "#CBD5E1" }}>/</span>{" "}
                        {formatCurrencyCompact(v.valorMeta)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

const Metas = () => {
    const { user } = useAuth();
    const { needsUpgrade } = usePlan();
    const queryClient = useQueryClient();
    const { activeCompanyId } = useTenant();
    const [selectedMetaId, setSelectedMetaId] = useState<string>("all");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const applyCompanyFilter = (query: any) => {
        // SECURITY: Always require a valid company_id to prevent data leakage
        if (!activeCompanyId) {
            return query.eq("company_id", "00000000-0000-0000-0000-000000000000");
        }
        return query.eq("company_id", activeCompanyId);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
            await queryClient.invalidateQueries({ queryKey: ["metas-individuais-full"] });
            await queryClient.invalidateQueries({ queryKey: ["vendas-mes-atual"] });
            await queryClient.invalidateQueries({ queryKey: ["vendas-mes-anterior"] });
            toast.success("Dados atualizados!");
        } catch {
            toast.error("Erro ao atualizar dados");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Metas consolidadas
    const { data: metasConsolidadas = [], isLoading: loadingConsolidadas } = useQuery({
        queryKey: ["metas-consolidadas", activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return [];
            const { data, error } = await applyCompanyFilter(
                supabase.from("metas_consolidadas").select("*").order("mes_referencia", { ascending: false })
            );
            if (error) throw error;
            return data || [];
        },
        enabled: !!activeCompanyId,
        refetchInterval: 30_000,
    });

    useEffect(() => {
        setSelectedMetaId("all");
    }, [activeCompanyId]);

    const metaConsolidadaSelecionada = selectedMetaId === "all"
        ? metasConsolidadas[0]
        : metasConsolidadas.find((m: any) => m.id === selectedMetaId);

    // Vendas do mês atual
    const { data: vendasMesAtual = [] } = useQuery({
        queryKey: ["vendas-mes-atual", metaConsolidadaSelecionada?.mes_referencia, activeCompanyId],
        queryFn: async () => {
            if (!metaConsolidadaSelecionada) return [];
            const mesRef = metaConsolidadaSelecionada.mes_referencia;
            const [year, month] = mesRef.split("-");
            const inicioMes = `${year}-${month}-01`;
            const yearNum = parseInt(year);
            const monthNum = parseInt(month);
            const ultimoDia = new Date(yearNum, monthNum, 0).getDate();
            const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, "0")}`;
            logger.log(`[Metas] Buscando vendas de ${inicioMes} até ${fimMes}`);
            const { data, error } = await applyCompanyFilter(
                supabase.from("vendas").select("user_id, valor, status, data_venda, company_id")
                    .eq("status", "Aprovado").gte("data_venda", inicioMes).lte("data_venda", fimMes)
            );
            if (error) throw error;
            return data || [];
        },
        enabled: !!metaConsolidadaSelecionada,
        refetchInterval: 30_000,
    });

    // Vendas do mês anterior (delta comparável)
    const { data: vendasMesAnterior = [] } = useQuery({
        queryKey: ["vendas-mes-anterior", metaConsolidadaSelecionada?.mes_referencia, activeCompanyId],
        queryFn: async () => {
            if (!metaConsolidadaSelecionada) return [];
            const mesRef = metaConsolidadaSelecionada.mes_referencia;
            const [year, month] = mesRef.split("-");
            const ref = new Date(parseInt(year), parseInt(month) - 1, 1);
            ref.setMonth(ref.getMonth() - 1);
            const prevYear = ref.getFullYear();
            const prevMonth = String(ref.getMonth() + 1).padStart(2, "0");
            const inicioMes = `${prevYear}-${prevMonth}-01`;
            const ultimoDia = new Date(prevYear, ref.getMonth() + 1, 0).getDate();
            const fimMes = `${prevYear}-${prevMonth}-${String(ultimoDia).padStart(2, "0")}`;
            const { data, error } = await applyCompanyFilter(
                supabase.from("vendas").select("valor, data_venda")
                    .eq("status", "Aprovado").gte("data_venda", inicioMes).lte("data_venda", fimMes)
            );
            if (error) throw error;
            return data || [];
        },
        enabled: !!metaConsolidadaSelecionada && !!activeCompanyId,
        refetchInterval: 60_000,
    });

    // Metas individuais
    const { data: metasIndividuais = [], isLoading: loadingIndividuais } = useQuery({
        queryKey: ["metas-individuais-full", metaConsolidadaSelecionada?.mes_referencia, vendasMesAtual, activeCompanyId],
        queryFn: async () => {
            if (!metaConsolidadaSelecionada || !activeCompanyId) return [];
            const mesRef = metaConsolidadaSelecionada.mes_referencia;
            const metaConsolidadaValor = Number(metaConsolidadaSelecionada.valor_meta) || 0;

            let metasQuery = supabase
                .from("metas")
                .select("*, profiles:user_id(id, nome, avatar_url, is_super_admin, company_id)")
                .eq("mes_referencia", mesRef)
                .gt("valor_meta", 0);
            metasQuery = metasQuery.eq("company_id", activeCompanyId);

            const { data: metas, error: metasError } = await metasQuery;
            if (metasError) {
                logger.error("[Metas] Erro ao buscar metas individuais:", metasError);
                throw metasError;
            }

            const vendasPorUsuario: { [key: string]: number } = {};
            vendasMesAtual.forEach((venda: any) => {
                vendasPorUsuario[venda.user_id] = (vendasPorUsuario[venda.user_id] || 0) + Number(venda.valor);
            });

            const resultado = (metas || [])
                .filter((meta: any) => {
                    if (!(Number(meta?.valor_meta) > 0)) return false;
                    if (meta?.profiles?.company_id && meta.profiles.company_id !== activeCompanyId) return false;
                    if (!meta?.profiles?.nome) return false;
                    if (meta.user_id === user?.id) return true;
                    if (meta.profiles?.is_super_admin) return false;
                    return true;
                })
                .map((meta: any) => {
                    const valorMeta = Number(meta.valor_meta) || 0;
                    const valorRealizado = vendasPorUsuario[meta.user_id] || 0;
                    const percentual = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;
                    const contribuicaoPercentual = metaConsolidadaValor > 0
                        ? (valorRealizado / metaConsolidadaValor) * 100
                        : 0;
                    const faltaAtingir = Math.max(0, valorMeta - valorRealizado);
                    return {
                        id: meta.id,
                        user_id: meta.user_id,
                        nome: meta.profiles.nome,
                        avatar_url: meta.profiles.avatar_url,
                        valorMeta,
                        valorRealizado,
                        percentual,
                        contribuicaoPercentual,
                        faltaAtingir,
                    } as TeamMember;
                }).sort((a, b) => b.valorRealizado - a.valorRealizado);

            return resultado;
        },
        enabled: !!metaConsolidadaSelecionada && !!activeCompanyId,
    });

    // Cockpit consolidado
    const cockpit = useMemo((): CockpitData => {
        const atingido = vendasMesAtual.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
        const total = Number(metaConsolidadaSelecionada?.valor_meta) || 0;
        const percentual = total > 0 ? (atingido / total) * 100 : 0;

        let diasTotal = 30, diasDecorridos = 1, diasRestantes = 0;
        if (metaConsolidadaSelecionada) {
            const mesRef = metaConsolidadaSelecionada.mes_referencia;
            const [year, month] = mesRef.split("-");
            const yearNum = parseInt(year);
            const monthNum = parseInt(month);
            const ultimoDiaMesDate = endOfMonth(new Date(yearNum, monthNum - 1));
            const inicio = new Date(yearNum, monthNum - 1, 1);
            const hoje = new Date();
            diasTotal = ultimoDiaMesDate.getDate();
            if (hoje < inicio) { diasDecorridos = 0; diasRestantes = diasTotal; }
            else if (hoje > ultimoDiaMesDate) { diasDecorridos = diasTotal; diasRestantes = 0; }
            else { diasDecorridos = hoje.getDate(); diasRestantes = diasTotal - diasDecorridos; }
        }

        const percentualEsperadoHoje = diasTotal > 0 ? (diasDecorridos / diasTotal) * 100 : 0;
        const paceDiarioNecessario = diasRestantes > 0 ? Math.max(0, (total - atingido) / diasRestantes) : 0;
        const projecaoFimMes = diasDecorridos > 0 ? (atingido / diasDecorridos) * diasTotal : atingido;

        const valorMesAnteriorMesmoDia = vendasMesAnterior
            .filter((v: any) => {
                if (!v.data_venda) return false;
                const dia = new Date(`${v.data_venda}T12:00:00`).getDate();
                return dia <= (diasDecorridos || 1);
            })
            .reduce((acc: number, v: any) => acc + Number(v.valor), 0);
        const deltaVsMesAnterior = valorMesAnteriorMesmoDia > 0
            ? ((atingido - valorMesAnteriorMesmoDia) / valorMesAnteriorMesmoDia) * 100
            : null;

        const canJudgePace = diasDecorridos > 2 && diasRestantes > 0;

        return {
            atingido, total, percentual,
            diasTotal, diasDecorridos, diasRestantes,
            percentualEsperadoHoje, paceDiarioNecessario, projecaoFimMes,
            deltaVsMesAnterior, canJudgePace,
        };
    }, [vendasMesAtual, vendasMesAnterior, metaConsolidadaSelecionada]);

    const isLoading = loadingConsolidadas || loadingIndividuais;

    if (needsUpgrade("metas")) return <UpgradePrompt feature="metas" />;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-[22px] sm:text-[26px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.022em" }}>
                        Metas
                    </h1>
                    <p className="text-[12.5px] sm:text-[13px] mt-0.5" style={{ color: "#64748B" }}>
                        Onde o time está em relação ao mês.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2 self-start sm:self-auto"
                >
                    <RefreshIcon size={14} weight="bold" className={isRefreshing ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">Atualizar</span>
                </Button>
            </div>

            {/* Pills — seletor de meta */}
            {metasConsolidadas.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pb-1">
                    <button
                        type="button"
                        onClick={() => setSelectedMetaId("all")}
                        className="text-[12px] px-3 py-1.5 rounded-full font-semibold transition-colors"
                        style={selectedMetaId === "all"
                            ? { background: "#2563EB", color: "#FFFFFF", border: "1px solid #2563EB" }
                            : { background: "#FFFFFF", color: "#475569", border: "1px solid #E2E8F0" }}
                    >
                        Atual
                    </button>
                    {metasConsolidadas.map((meta: any) => {
                        const active = selectedMetaId === meta.id;
                        return (
                            <button
                                key={meta.id}
                                type="button"
                                onClick={() => setSelectedMetaId(meta.id)}
                                className="text-[12px] px-3 py-1.5 rounded-full font-semibold transition-colors capitalize"
                                style={active
                                    ? { background: "#2563EB", color: "#FFFFFF", border: "1px solid #2563EB" }
                                    : { background: "#FFFFFF", color: "#475569", border: "1px solid #E2E8F0" }}
                            >
                                {meta.descricao || format(new Date(meta.mes_referencia + "T12:00:00"), "MMM yyyy", { locale: ptBR })}
                            </button>
                        );
                    })}
                </div>
            )}

            {isLoading ? (
                <div className="rounded-2xl p-10 text-center"
                    style={{ background: "#FFFFFF", border: "1px solid #E4E9F2", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                    <div className="inline-block h-7 w-7 animate-spin rounded-full border-[3px] border-solid border-[#2563EB] border-r-transparent" />
                    <p className="mt-3 text-[12.5px]" style={{ color: "#64748B" }}>Carregando metas…</p>
                </div>
            ) : !metaConsolidadaSelecionada ? (
                <div className="rounded-2xl p-10 text-center"
                    style={{ background: "#FFFFFF", border: "1px solid #E4E9F2", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                    <div className="h-12 w-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                        style={{ background: "rgba(37,99,235,0.10)" }}>
                        <Target size={24} weight="duotone" style={{ color: "#2563EB" }} />
                    </div>
                    <p className="text-[14px] font-bold" style={{ color: "#0B1220" }}>Nenhuma meta definida</p>
                    <p className="text-[12px] mt-1 max-w-[320px] mx-auto" style={{ color: "#64748B" }}>
                        Defina a meta consolidada do time em Configurações para o painel ganhar vida.
                    </p>
                </div>
            ) : (
                <>
                    <CockpitHero
                        title={metaConsolidadaSelecionada.descricao || "Meta do time"}
                        mesRef={metaConsolidadaSelecionada.mes_referencia}
                        cockpit={cockpit}
                    />

                    {/* Contribuição individual */}
                    <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3 flex-wrap pt-1">
                            <div>
                                <h2 className="text-[15px] sm:text-[16px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.012em" }}>
                                    Contribuição individual
                                </h2>
                                <p className="text-[12px]" style={{ color: "#64748B" }}>
                                    {metasIndividuais.length} {metasIndividuais.length === 1 ? "vendedor" : "vendedores"} · ordenados por volume
                                </p>
                            </div>
                        </div>

                        {metasIndividuais.length === 0 ? (
                            <div className="rounded-xl p-7 text-center" style={{ background: "#FFFFFF", border: "1px solid #E4E9F2" }}>
                                <div className="h-10 w-10 rounded-lg mx-auto flex items-center justify-center mb-2.5"
                                    style={{ background: "rgba(148,163,184,0.12)" }}>
                                    <Medal size={20} weight="duotone" style={{ color: "#64748B" }} />
                                </div>
                                <p className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>Nenhuma meta individual</p>
                                <p className="text-[11.5px] mt-1 max-w-[300px] mx-auto" style={{ color: "#64748B" }}>
                                    Defina metas para os vendedores em Configurações.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {metasIndividuais.map((v: TeamMember, idx: number) => {
                                    const pos = idx + 1;
                                    const isWinner = v.percentual >= 100;
                                    const behindPace = cockpit.canJudgePace && !isWinner &&
                                        v.percentual < (cockpit.percentualEsperadoHoje - 15);
                                    const gap = cockpit.percentualEsperadoHoje - v.percentual;
                                    return (
                                        <TeamMemberRow
                                            key={v.id}
                                            v={v}
                                            pos={pos}
                                            isWinner={isWinner}
                                            behindPace={behindPace}
                                            percentualEsperadoHoje={cockpit.percentualEsperadoHoje}
                                            gap={gap}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Metas;
