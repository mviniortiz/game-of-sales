// Funil do pipeline, "cada bloco é uma oportunidade". Nada de silhueta nem barra
// agregada: com o volume real de uma PME (unidades, não centenas), proporção
// contínua é abstração genérica. Cada deal vira um bloco cuja largura é o VALOR
// dele numa régua compartilhada entre as etapas: dá pra ver em que etapa o
// dinheiro está sentado e quantas oportunidades compõem cada total. Bloco sem
// valor cadastrado fica vazado. Acima de muitos deals a etapa vira barra sólida.
// Rampa azul por profundidade, fechado em verde depois de uma linha.
import { Check } from "@phosphor-icons/react";
import { brlCompact } from "./format";

const RAMP = ["#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8"];
const BLOCK_LIMIT = 16;

export interface FunnelStage { key: string; name: string; count: number; totalValue: number; values: number[] }

function Blocks({ stage, color, maxTotal }: { stage: FunnelStage; color: string; maxTotal: number }) {
    if (stage.count === 0) {
        return <span className="block h-px w-full self-center border-t-[1.5px] border-dashed border-[var(--vyz-border)]" />;
    }
    // Piso pra etapa sem valores não sumir: blocos de valor 0 precisam de corpo pra contar unidades.
    const stripPct = Math.min(100, Math.max((stage.totalValue / maxTotal) * 100, stage.count * 6, 8));
    const solid = stage.count > BLOCK_LIMIT;
    return (
        <span className="flex h-[14px] items-stretch gap-[3px]" style={{ width: `${stripPct}%` }}>
            {solid ? (
                <span className="min-w-0 flex-1 rounded-[3px]" style={{ background: color }} />
            ) : (
                stage.values.map((v, i) => (
                    <span
                        key={i}
                        title={v > 0 ? brlCompact(v) : "sem valor cadastrado"}
                        className="min-w-[7px] rounded-[3px]"
                        style={{
                            flexGrow: Math.max(v, stage.totalValue * 0.04, 1),
                            flexBasis: 0,
                            ...(v > 0 ? { background: color } : { background: "transparent", boxShadow: `inset 0 0 0 1.5px ${color}` }),
                        }}
                    />
                ))
            )}
        </span>
    );
}

function Row({ label, ariaName, stage, color, maxTotal, onClick }: {
    label: React.ReactNode;
    ariaName: string;
    stage: FunnelStage;
    color: string;
    maxTotal: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${ariaName}: ${stage.count} ${stage.count === 1 ? "oportunidade" : "oportunidades"}, ${brlCompact(stage.totalValue)}`}
            className="grid w-full grid-cols-[112px_minmax(0,1fr)_78px] items-center gap-2.5 rounded-md py-[7px] text-left text-[12.5px] outline-none transition-colors duration-150 hover:bg-[var(--vyz-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
        >
            <span className="truncate text-[var(--vyz-text)]">{label}</span>
            <span className="flex min-w-0 items-center">
                <Blocks stage={stage} color={color} maxTotal={maxTotal} />
            </span>
            <span className={`truncate text-right tabular-nums ${stage.count === 0 ? "text-[var(--vyz-text-soft)]" : "text-[var(--vyz-text-muted)]"}`}>
                <strong className="font-semibold text-[var(--vyz-text-primary)]">{stage.count}</strong> · {brlCompact(stage.totalValue)}
            </span>
        </button>
    );
}

export function PipelineFunnel({ stages, loading, onNavigate }: { stages: FunnelStage[]; loading: boolean; onNavigate: (href: string) => void }) {
    const open = stages.filter((s) => s.key !== "closed_won");
    const won = stages.find((s) => s.key === "closed_won");
    const maxTotal = Math.max(1, ...open.map((s) => s.totalValue), won?.totalValue ?? 0);
    const goPipeline = () => onNavigate("/pipeline");

    return (
        <section aria-labelledby="funil-titulo" className="rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 id="funil-titulo" className="text-[13px] font-semibold text-[var(--vyz-text)]">Funil</h2>
                <span className="text-[11.5px] text-[var(--vyz-text-soft)]">cada bloco é uma oportunidade</span>
            </div>
            {loading ? (
                <div aria-busy="true" aria-label="Carregando o funil" className="flex flex-col gap-2 py-1">
                    {[92, 74, 56, 40].map((w, i) => (
                        <div key={i} className="h-[18px] rounded-full bg-[var(--vyz-surface-3)] motion-safe:animate-pulse" style={{ width: `${w}%` }} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col">
                    {open.map((st, i) => (
                        <Row key={st.key} label={st.name} ariaName={st.name} stage={st} color={RAMP[Math.min(i, RAMP.length - 1)]} maxTotal={maxTotal} onClick={goPipeline} />
                    ))}
                    {won && (
                        <>
                            <div className="my-1 h-px bg-[var(--vyz-border)]" />
                            <Row
                                label={
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                        <Check size={12} weight="bold" aria-hidden /> Fechado
                                    </span>
                                }
                                ariaName="Fechado"
                                stage={won}
                                color="#10B981"
                                maxTotal={maxTotal}
                                onClick={goPipeline}
                            />
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
