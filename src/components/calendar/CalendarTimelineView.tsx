import "./calendar-styles.css";
import { useRef, useEffect, useState } from "react";

import {
    format, startOfWeek, endOfWeek, eachDayOfInterval,
    isSameDay, isToday as dateFnsIsToday, parseISO, addHours,
    startOfDay, differenceInMinutes
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { STATUS_COLORS, Agendamento } from "@/pages/Calendario";

// Re-export helper
const mapStatus = (status?: string) => {
    if (status === "realizado") return "show" as const;
    if (status === "nao_compareceu") return "no_show" as const;
    return "pending" as const;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;   // px per hour
const START_HOUR = 7;    // 07:00
const END_HOUR = 22;   // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

interface Props {
    date: Date;
    view: "day" | "week";
    agendamentos: Agendamento[];
    onEventClick: (ag: Agendamento) => void;
    onAgendamentoUpdate: (id: string, newDate: Date) => void;
    showSellerName: boolean;
}

// ── Position helpers ──────────────────────────────────────────────────────────
const getTopOffset = (date: Date): number => {
    const hours = date.getHours() + date.getMinutes() / 60;
    const offset = hours - START_HOUR;
    if (offset < 0) return 0;
    if (offset > TOTAL_HOURS) return TOTAL_HOURS * HOUR_HEIGHT;
    return offset * HOUR_HEIGHT;
};

const clampHour = (date: Date): boolean => {
    const h = date.getHours();
    return h >= START_HOUR && h < END_HOUR;
};

// ── Event Block ───────────────────────────────────────────────────────────────
const EventBlock = ({
    agendamento,
    containerWidth,
    colIndex,
    colTotal,
    onClick,
    showSellerName,
}: {
    agendamento: Agendamento;
    containerWidth: number;
    colIndex: number;
    colTotal: number;
    onClick: () => void;
    showSellerName: boolean;
}) => {
    const agDate = parseISO(agendamento.data_agendamento);
    const top = getTopOffset(agDate);
    const durationMins = 45; // default display duration (45 min)
    const height = Math.max(20, (durationMins / 60) * HOUR_HEIGHT);

    const st = mapStatus(agendamento.status);
    const colors = STATUS_COLORS[st];

    const isGoogleEvent = !!agendamento.google_event_id;

    const getInitials = (name: string) => {
        if (!name) return "?";
        const p = name.trim().split(" ");
        return p.length === 1 ? p[0].substring(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, zIndex: 30 }}
            transition={{ duration: 0.1 }}
            onClick={onClick}
            style={{
                position: "absolute",
                top: top + 1,
                height: height - 2,
                left: colTotal > 1 ? `${(colIndex / colTotal) * 100}%` : "2px",
                right: colTotal > 1 ? `${((colTotal - colIndex - 1) / colTotal) * 100}%` : "2px",
                marginLeft: colIndex > 0 ? "2px" : undefined,
                marginRight: colIndex < colTotal - 1 ? "2px" : undefined,
                zIndex: 10,
            }}
            className={`
        cursor-pointer rounded-lg overflow-hidden
        border-l-[3px] ${colors.border}
        ${colors.bg}
        backdrop-blur-sm
        hover:brightness-125
        transition-all duration-150
        shadow-sm
        group
      `}
        >
            <div className="px-2 py-1 h-full flex flex-col justify-start overflow-hidden">
                <div className="flex items-center gap-1 min-w-0">
                    {isGoogleEvent && (
                        <svg className="h-2.5 w-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.46 12c0-1.28-.11-2.53-.32-3.75H12v7.1h5.84c-.25 1.35-1.03 2.49-2.18 3.26v2.72h3.53c2.07-1.9 3.27-4.7 3.27-8.33z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.53-2.72c-.98.66-2.24 1.05-3.75 1.05-2.88 0-5.32-1.95-6.19-4.57H2.19v2.81C4.01 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.81 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.09H2.19C1.46 8.55 1 10.22 1 12s.46 3.45 1.19 4.91l3.62-2.81z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.08.56 4.23 1.64l3.17-3.17C17.45 2.09 14.97 1 12 1 7.7 1 4.01 3.47 2.19 7.09l3.62 2.81C6.68 7.33 9.12 5.38 12 5.38z" fill="#EA4335" />
                        </svg>
                    )}
                    <span className={`text-[10px] font-bold tabular-nums flex-shrink-0 ${colors.text}`}>
                        {format(agDate, "HH:mm")}
                    </span>
                    {showSellerName && agendamento.seller_name && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded flex-shrink-0">
                            {getInitials(agendamento.seller_name)}
                        </span>
                    )}
                </div>
                <span className={`text-[11px] font-semibold leading-tight truncate ${colors.text} opacity-90`}>
                    {agendamento.cliente_nome}
                </span>
                {agendamento.observacoes && height > 44 && (
                    <span className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                        {agendamento.observacoes}
                    </span>
                )}
            </div>
        </motion.div>
    );
};

// ── One day column ────────────────────────────────────────────────────────────
const DayColumn = ({
    day,
    agendamentos,
    onEventClick,
    showSellerName,
    isOnly,
}: {
    day: Date;
    agendamentos: Agendamento[];
    onEventClick: (ag: Agendamento) => void;
    showSellerName: boolean;
    isOnly: boolean;
}) => {
    const dayAgs = agendamentos.filter(ag => isSameDay(parseISO(ag.data_agendamento), day));
    const isNow = dateFnsIsToday(day);

    // Simple collision detection: sort by time, assign columns
    const sorted = [...dayAgs].sort(
        (a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime()
    );

    // Assign column indices for overlapping events
    type Col = { ag: Agendamento; colIdx: number; colTotal: number };
    const columns: { ag: Agendamento; endTime: number }[][] = [];
    const placed: Col[] = sorted.map(ag => {
        const start = new Date(ag.data_agendamento).getTime();
        const end = start + 45 * 60 * 1000;
        let placed = false;
        for (let ci = 0; ci < columns.length; ci++) {
            const col = columns[ci];
            const last = col[col.length - 1];
            if (last.endTime <= start) {
                col.push({ ag, endTime: end });
                placed = true;
                break;
            }
        }
        if (!placed) columns.push([{ ag, endTime: end }]);
        return { ag, colIdx: 0, colTotal: 1 };
    });

    // Second pass: figure out colIdx and colTotal
    const result: Col[] = sorted.map(ag => {
        for (let ci = 0; ci < columns.length; ci++) {
            if (columns[ci].some(c => c.ag.id === ag.id)) {
                return {
                    ag,
                    colIdx: ci,
                    colTotal: columns.length,
                };
            }
        }
        return { ag, colIdx: 0, colTotal: 1 };
    });

    return (
        <div
            className={`
        relative flex-1 min-w-0
        ${isNow ? "bg-emerald-500/[0.02]" : ""}
      `}
            style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
            {/* Hour dividers */}
            {HOURS.map((h, i) => (
                <div
                    key={h}
                    className="absolute w-full border-t border-slate-800/60 pointer-events-none"
                    style={{ top: i * HOUR_HEIGHT }}
                />
            ))}

            {/* Half-hour dashes */}
            {HOURS.slice(0, -1).map((_, i) => (
                <div
                    key={`h${i}`}
                    className="absolute w-full border-t border-slate-800/30 pointer-events-none"
                    style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
            ))}

            {/* Events */}
            {result.map(({ ag, colIdx, colTotal }) => (
                <EventBlock
                    key={ag.id}
                    agendamento={ag}
                    containerWidth={1}
                    colIndex={colIdx}
                    colTotal={colTotal}
                    onClick={() => onEventClick(ag)}
                    showSellerName={showSellerName}
                />
            ))}
        </div>
    );
};

// ── Current time indicator ────────────────────────────────────────────────────
const CurrentTimeIndicator = () => {
    const [top, setTop] = useState(0);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const hours = now.getHours() + now.getMinutes() / 60;
            const offset = (hours - START_HOUR) * HOUR_HEIGHT;
            setTop(Math.max(0, offset));
        };
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, []);

    const now = new Date();
    const h = now.getHours();
    if (h < START_HOUR || h >= END_HOUR) return null;

    return (
        <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top }}
        >
            <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 flex-shrink-0" />
                <div className="flex-1 h-px bg-rose-500 opacity-80" />
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export function CalendarTimelineView({
    date,
    view,
    agendamentos,
    onEventClick,
    showSellerName,
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isWeek = view === "week";

    const days = isWeek
        ? eachDayOfInterval({ start: startOfWeek(date, { locale: ptBR }), end: endOfWeek(date, { locale: ptBR }) })
        : [date];

    const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    // Scroll to ~8am on mount
    useEffect(() => {
        if (scrollRef.current) {
            const targetScroll = (8 - START_HOUR) * HOUR_HEIGHT - 20;
            scrollRef.current.scrollTop = Math.max(0, targetScroll);
        }
    }, [view]);

    // Today's column
    const todayIndex = days.findIndex(d => dateFnsIsToday(d));

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* ── DAY HEADERS ─────────────────────────────────────── */}
            <div className="flex flex-shrink-0 border-b border-slate-800 bg-slate-900/60">
                {/* Gutter spacer */}
                <div className="w-14 flex-shrink-0" />
                {days.map((day, i) => {
                    const isNow = dateFnsIsToday(day);
                    return (
                        <div
                            key={i}
                            className={`
                flex-1 py-2.5 text-center border-l border-slate-800/60
                ${isNow ? "bg-emerald-500/5" : ""}
              `}
                        >
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isNow ? "text-emerald-400" : "text-slate-600"}`}>
                                {weekDayLabels[day.getDay()]}
                            </p>
                            <div className={`
                w-8 h-8 mx-auto flex items-center justify-center rounded-full text-[15px] font-bold
                ${isNow ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40" : "text-slate-400"}
              `}>
                                {format(day, "d")}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── SCROLLABLE TIMELINE BODY ─────────────────────────── */}
            <div ref={scrollRef} className="flex overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
                {/* ── HOUR GUTTER ─────────────────────────────────────── */}
                <div
                    className="w-14 flex-shrink-0 relative bg-slate-900/30"
                    style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                >
                    {HOURS.map((h, i) => (
                        <div
                            key={h}
                            className="absolute w-full flex items-start justify-end pr-2"
                            style={{ top: i * HOUR_HEIGHT - 8 }}
                        >
                            {i > 0 && (
                                <span className="text-[10px] text-slate-600 tabular-nums">
                                    {h.toString().padStart(2, "0")}h
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── DAY COLUMNS ──────────────────────────────────────── */}
                <div className="flex flex-1 relative">
                    {/* Current time indicator (spans all columns) */}
                    {days.some(d => dateFnsIsToday(d)) && <CurrentTimeIndicator />}

                    {days.map((day, i) => (
                        <div
                            key={i}
                            className="flex-1 min-w-0 border-l border-slate-800/60 relative"
                            style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                        >
                            <DayColumn
                                day={day}
                                agendamentos={agendamentos}
                                onEventClick={onEventClick}
                                showSellerName={showSellerName}
                                isOnly={days.length === 1}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
