// UX.POLISH.1 — Skeletons reutilizáveis, light-first e discretos.
// Pulse leve (animate-pulse, desativado em prefers-reduced-motion via CSS
// global). Sem contraste exagerado.
import { Skeleton } from "@/components/ui/skeleton";

const Bar = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
    <Skeleton className={`bg-slate-200/70 ${className}`} style={style} />
);

const SkCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 ${className}`}>
        {children}
    </div>
);

export const PageHeaderSkeleton = () => (
    <div className="space-y-2">
        <Bar className="h-6 w-56" />
        <Bar className="h-3 w-72" />
    </div>
);

export const MetricCardSkeleton = () => (
    <SkCard className="p-4">
        <Bar className="h-2.5 w-20" />
        <Bar className="h-6 w-24 mt-2.5" />
        <Bar className="h-2.5 w-28 mt-2.5" />
    </SkCard>
);

export const PerformanceSkeleton = () => (
    <div className="space-y-5">
        {/* resumo executivo */}
        <SkCard>
            <div className="flex items-start gap-3">
                <Bar className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                    <Bar className="h-2.5 w-28" />
                    <Bar className="h-3.5 w-full" />
                    <Bar className="h-3.5 w-4/5" />
                </div>
            </div>
        </SkCard>
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
        {/* funil + EVA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <SkCard className="lg:col-span-2">
                <Bar className="h-3.5 w-40 mb-4" />
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                            <div className="flex justify-between mb-1.5"><Bar className="h-3 w-32" /><Bar className="h-3 w-20" /></div>
                            <Bar className="h-2.5 w-full rounded-full" style={{ width: `${90 - i * 18}%` }} />
                        </div>
                    ))}
                </div>
            </SkCard>
            <SkCard><Bar className="h-3.5 w-28 mb-3" /><div className="space-y-2"><Bar className="h-3 w-full" /><Bar className="h-3 w-5/6" /><Bar className="h-3 w-2/3" /></div></SkCard>
        </div>
        {/* atenção + time */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {Array.from({ length: 2 }).map((_, i) => (
                <SkCard key={i}><Bar className="h-3.5 w-36 mb-3" /><div className="space-y-2"><Bar className="h-8 w-full rounded-xl" /><Bar className="h-8 w-full rounded-xl" /></div></SkCard>
            ))}
        </div>
    </div>
);

export const DealDetailSkeleton = () => (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
        {/* header */}
        <div className="border-b border-[#E5E7EB] bg-white">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 space-y-3">
                <div className="flex items-center gap-3">
                    <Bar className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5"><Bar className="h-4 w-64" /><Bar className="h-3 w-32" /></div>
                </div>
                <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <Bar key={i} className="h-6 w-24 rounded-md" />)}</div>
            </div>
        </div>
        {/* grid */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-12 gap-4 sm:gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-4">
                <SkCard><div className="flex items-center gap-3"><Bar className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><Bar className="h-2.5 w-24" /><Bar className="h-3.5 w-56" /></div><Bar className="h-8 w-24 rounded-lg" /></div></SkCard>
                <SkCard>
                    <Bar className="h-3.5 w-28 mb-4" />
                    <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3"><Bar className="h-7 w-7 rounded-full shrink-0" /><div className="flex-1 space-y-1.5"><Bar className="h-3 w-40" /><Bar className="h-3 w-2/3" /></div></div>
                    ))}</div>
                </SkCard>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <SkCard key={i}><Bar className="h-3.5 w-24 mb-3" /><div className="space-y-2"><Bar className="h-3 w-full" /><Bar className="h-3 w-4/5" /><Bar className="h-3 w-3/5" /></div></SkCard>
                ))}
            </div>
        </div>
    </div>
);

export const InboxListSkeleton = ({ rows = 6 }: { rows?: number }) => (
    <div className="space-y-1 p-2">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                <Bar className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5"><Bar className="h-3 w-32" /><Bar className="h-2.5 w-44" /></div>
                <Bar className="h-2.5 w-8" />
            </div>
        ))}
    </div>
);

export const EvaPanelSkeleton = () => (
    <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED]/60 text-white text-[8px] font-bold leading-none animate-pulse">E</span>
            <span className="text-[12px] font-medium text-[#7C3AED]">EVA está analisando…</span>
        </div>
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-5/6" />
        <Bar className="h-16 w-full rounded-xl" />
        <Bar className="h-3 w-2/3" />
    </div>
);

export const PipelineColumnSkeleton = ({ columns = 4 }: { columns?: number }) => (
    <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="flex-1 min-w-[240px] space-y-3">
                <Bar className="h-5 w-32" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 space-y-2">
                        <Bar className="h-3.5 w-4/5" /><Bar className="h-2.5 w-1/2" /><Bar className="h-5 w-24 mt-1" />
                    </div>
                ))}
            </div>
        ))}
    </div>
);
