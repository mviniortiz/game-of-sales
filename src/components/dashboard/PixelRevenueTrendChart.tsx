import { useState, useRef } from "react";

type TrendPoint = {
  date: string;
  valor: number;
};

interface PixelRevenueTrendChartProps {
  data: TrendPoint[];
  height?: number;
}

const ROWS = 20;

type ViewMode = "weekly" | "monthly" | "yearly";

const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const viewLabels: Record<ViewMode, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

// 5-level heat scale: empty → light → medium → strong → peak
const HEAT_COLORS = [
  "bg-transparent",                                                          // 0 – empty
  "bg-emerald-900/60 ring-1 ring-emerald-800/40",                           // 1 – very low
  "bg-emerald-700/70 ring-1 ring-emerald-600/30",                           // 2 – low-mid
  "bg-emerald-500/80 ring-1 ring-emerald-400/30",                           // 3 – mid
  "bg-emerald-400 ring-1 ring-emerald-300/30 shadow-[0_0_6px_rgba(52,211,153,0.3)]",    // 4 – high
  "bg-emerald-300 ring-1 ring-emerald-200/40 shadow-[0_0_10px_rgba(110,231,183,0.5)]",  // 5 – peak
];

// Hover variants (slightly brighter)
const HEAT_HOVER = [
  "bg-white/5",
  "bg-emerald-700/80 ring-1 ring-emerald-600/60",
  "bg-emerald-600/90 ring-1 ring-emerald-500/50",
  "bg-emerald-400 ring-1 ring-emerald-300/50",
  "bg-emerald-300 ring-1 ring-emerald-200/50 shadow-[0_0_12px_rgba(52,211,153,0.5)]",
  "bg-white ring-1 ring-white/40 shadow-[0_0_14px_rgba(167,243,208,0.7)]",
];

function getHeatLevel(blocks: number, max: number): number {
  if (blocks === 0 || max === 0) return 0;
  const ratio = blocks / max;
  if (ratio <= 0) return 0;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

export function PixelRevenueTrendChart({ data, height = 260 }: PixelRevenueTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const viewData =
    viewMode === "weekly"
      ? data.slice(-7)
      : viewMode === "yearly"
        ? data.filter((_, index) => index % Math.max(1, Math.floor(data.length / 12)) === 0)
        : data;

  const sourceMaxValue = Math.max(...viewData.map((item) => item.valor), 0);
  const chartData = viewData.map((item) => {
    const blocks =
      sourceMaxValue > 0
        ? Math.max(item.valor > 0 ? 1 : 0, Math.round((item.valor / sourceMaxValue) * ROWS))
        : 0;
    return { ...item, blocks };
  });

  const maxBlocks = Math.max(...chartData.map((i) => i.blocks), 0);
  const maxValue = Math.max(...chartData.map((item) => item.valor), 0);
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => maxValue * ratio);
  const activePoint = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const total = chartData.reduce((acc, item) => acc + item.valor, 0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Sem vendas no período para montar o gráfico.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            <span>Receita em blocos</span>
            <span className="h-1 w-1 rounded-full bg-emerald-400/60" />
            <span className="text-emerald-300/90 normal-case tracking-normal">{viewLabels[viewMode]}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(total)}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                Faturamento
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-emerald-900/80 ring-1 ring-emerald-700/40" />
                Zero
              </span>
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex items-center rounded-xl border border-white/10 bg-slate-950/50 p-1 text-xs shadow-inner">
          {(["weekly", "monthly", "yearly"] as ViewMode[]).map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={[
                  "px-3 py-1.5 rounded-lg transition-all duration-150 font-medium",
                  active
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200",
                ].join(" ")}
              >
                {viewLabels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart area */}
      <div className="grid grid-cols-[44px_1fr] gap-2">
        {/* Y-axis */}
        <div
          className="flex flex-col justify-between pr-1 text-[10px] text-muted-foreground/70"
          style={{ height }}
        >
          {yTicks.map((tick) => (
            <span key={`${tick}`} className="tabular-nums text-right">
              {formatCurrencyCompact(tick)}
            </span>
          ))}
        </div>

        {/* Grid + blocks */}
        <div
          className="relative"
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div className="overflow-x-auto pb-2 scrollbar-none">
            <div
              className="relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-slate-900/80 via-slate-900 to-slate-950 shadow-inner overflow-hidden"
              style={{ height: height + 24, minWidth: Math.max(480, chartData.length * 28) }}
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.07),transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none" />

              {/* Horizontal grid rules */}
              <div className="absolute inset-0 px-2 pt-2 pb-6 pointer-events-none flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-px bg-white/[0.04]" />
                ))}
              </div>

              {/* Column area */}
              <div className="absolute inset-0 px-2 pt-2 pb-6 flex items-stretch gap-[3px]">
                {chartData.map((point, index) => {
                  const heatLevel = getHeatLevel(point.blocks, maxBlocks);
                  const isHovered = hoveredIndex === index;

                  return (
                    <button
                      key={`${point.date}-${index}`}
                      type="button"
                      aria-label={`${point.date}: ${formatCurrency(point.valor)}`}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onFocus={() => setHoveredIndex(index)}
                      className="flex-1 min-w-[14px] outline-none rounded-sm group"
                    >
                      <div className="h-full flex flex-col-reverse gap-[2px]">
                        {Array.from({ length: ROWS }).map((_, row) => {
                          const filled = row < point.blocks;
                          const colorClass = filled
                            ? isHovered
                              ? HEAT_HOVER[heatLevel]
                              : HEAT_COLORS[heatLevel]
                            : isHovered
                              ? "bg-white/[0.04] rounded-[2px]"
                              : "bg-white/[0.025] rounded-[2px]";

                          return (
                            <div
                              key={row}
                              className={`rounded-[2px] flex-1 transition-all duration-100 ${colorClass}`}
                            />
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="absolute left-2 right-2 bottom-0 h-6 flex items-center gap-[3px]">
                {chartData.map((point, index) => {
                  const showLabel =
                    index === 0 ||
                    index === chartData.length - 1 ||
                    index % Math.max(3, Math.floor(chartData.length / 8)) === 0;
                  return (
                    <div key={`label-${index}`} className="flex-1 min-w-[14px] text-center">
                      {showLabel ? (
                        <span className="text-[9px] text-muted-foreground/70 tabular-nums">{point.date}</span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/20">·</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hover column highlight */}
              {hoveredIndex !== null && (
                <div
                  className="absolute top-2 bottom-6 w-px bg-emerald-400/20 pointer-events-none"
                  style={{
                    left: `calc(${(hoveredIndex / chartData.length) * 100}% + ${2 + hoveredIndex * 1}px)`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Floating tooltip */}
          {activePoint && (
            <div
              className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md px-3 py-2.5 shadow-2xl"
              style={{
                left: Math.min(tooltipPos.x + 12, 260),
                top: Math.max(tooltipPos.y - 60, 4),
                transform: tooltipPos.x > 200 ? "translateX(-110%)" : undefined,
              }}
            >
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {activePoint.date}
              </p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-emerald-400 shrink-0" />
                <span className="text-sm font-bold text-white tabular-nums whitespace-nowrap">
                  {formatCurrency(activePoint.valor)}
                </span>
              </div>
              {activePoint.valor > 0 && (
                <p className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">
                  {((activePoint.valor / total) * 100).toFixed(1)}% do período
                </p>
              )}
            </div>
          )}

          {/* Heat scale legend */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60">Menos</span>
            <div className="flex gap-[3px]">
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-2.5 w-2.5 rounded-[3px] ${level === 0
                      ? "bg-white/[0.06] ring-1 ring-white/10"
                      : HEAT_COLORS[level]
                    }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground/60">Mais</span>
          </div>
        </div>
      </div>
    </div>
  );
}
