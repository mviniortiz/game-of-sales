import { useEffect, useMemo, useState } from "react";
import { Loader2, Calendar, Clock, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Slot {
    startIso: string;
    endIso: string;
}

interface NativeSchedulerProps {
    demoRequestId: string;
    leadName: string;
    leadEmail: string;
    onScheduled: (info: { startIso: string; meetLink: string | null }) => void;
}

type Phase = "loading" | "ready" | "booking" | "booked" | "error";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatBRTDate(iso: string): { dayKey: string; date: Date } {
    const d = new Date(iso);
    // Converte pra BRT (UTC-3) extraindo componentes em UTC ajustado
    const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    const y = brt.getUTCFullYear();
    const m = String(brt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(brt.getUTCDate()).padStart(2, "0");
    return { dayKey: `${y}-${m}-${day}`, date: d };
}

function formatBRTTime(iso: string): string {
    const d = new Date(iso);
    const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    const h = String(brt.getUTCHours()).padStart(2, "0");
    const m = String(brt.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

function formatDayHeader(dayKey: string): string {
    const [y, m, d] = dayKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    const weekday = WEEKDAY_LABELS[date.getUTCDay()];
    const dd = String(d).padStart(2, "0");
    const monthLabel = MONTH_LABELS[m - 1];
    return `${weekday}, ${dd} de ${monthLabel}`;
}

function formatDayChip(dayKey: string): { weekday: string; dayNum: string; month: string } {
    const [y, m, d] = dayKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    return {
        weekday: WEEKDAY_LABELS[date.getUTCDay()],
        dayNum: String(d).padStart(2, "0"),
        month: MONTH_LABELS[m - 1].slice(0, 3),
    };
}

export default function NativeScheduler({
    demoRequestId,
    leadName,
    leadEmail,
    onScheduled,
}: NativeSchedulerProps) {
    const [phase, setPhase] = useState<Phase>("loading");
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [bookedInfo, setBookedInfo] = useState<{ startIso: string; meetLink: string | null } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setPhase("loading");
                const { data, error } = await supabase.functions.invoke("calendar-slots");
                if (cancelled) return;
                if (error) throw error;
                const list: Slot[] = (data?.slots || []) as Slot[];
                setSlots(list);
                if (list.length > 0) {
                    const firstDay = formatBRTDate(list[0].startIso).dayKey;
                    setSelectedDay(firstDay);
                }
                setPhase("ready");
            } catch (err) {
                console.error("[scheduler] load slots error", err);
                if (!cancelled) {
                    setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar horários");
                    setPhase("error");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Agrupa slots por dia BRT
    const slotsByDay = useMemo(() => {
        const map = new Map<string, Slot[]>();
        for (const s of slots) {
            const { dayKey } = formatBRTDate(s.startIso);
            if (!map.has(dayKey)) map.set(dayKey, []);
            map.get(dayKey)!.push(s);
        }
        return map;
    }, [slots]);

    const dayKeys = useMemo(() => Array.from(slotsByDay.keys()), [slotsByDay]);
    const currentSlots = selectedDay ? slotsByDay.get(selectedDay) || [] : [];

    async function handleBook() {
        if (!selectedSlot) return;
        setPhase("booking");
        setErrorMsg("");
        try {
            const { data, error } = await supabase.functions.invoke("calendar-book", {
                body: {
                    demo_request_id: demoRequestId,
                    start_iso: selectedSlot.startIso,
                    end_iso: selectedSlot.endIso,
                },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            const info = { startIso: selectedSlot.startIso, meetLink: data?.meet_link || null };
            setBookedInfo(info);
            setPhase("booked");
            onScheduled(info);
        } catch (err) {
            console.error("[scheduler] book error", err);
            setErrorMsg(err instanceof Error ? err.message : "Erro ao confirmar agendamento");
            setPhase("error");
        }
    }

    if (phase === "loading") {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Buscando horários disponíveis...</span>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 rounded-2xl text-center" style={{ background: "rgba(244,63,94,0.05)", boxShadow: "0 0 0 1px rgba(244,63,94,0.2)" }}>
                <AlertCircle className="h-6 w-6 text-rose-400" />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Não foi possível carregar a agenda</span>
                <span className="text-xs max-w-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{errorMsg || "Tente novamente em alguns instantes."}</span>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-xs px-4 py-2 rounded-full"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", fontWeight: 600 }}
                >
                    Recarregar
                </button>
            </div>
        );
    }

    if (phase === "booked" && bookedInfo) {
        const d = new Date(bookedInfo.startIso);
        const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
        const readable = `${formatDayHeader(formatBRTDate(bookedInfo.startIso).dayKey)} às ${formatBRTTime(bookedInfo.startIso)}`;
        void brt;
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 rounded-2xl text-center" style={{ background: "rgba(0,227,122,0.05)", boxShadow: "0 0 0 1px rgba(0,227,122,0.2)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,227,122,0.15)" }}>
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                    <h3 className="font-heading mb-1" style={{ fontSize: "1.25rem", fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Demo confirmada!</h3>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{readable}</p>
                </div>
                {bookedInfo.meetLink && (
                    <a
                        href={bookedInfo.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full mt-1"
                        style={{ background: "#00E37A", color: "#06080a", fontWeight: 700 }}
                    >
                        Abrir Google Meet
                    </a>
                )}
                <p className="text-xs max-w-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Você recebeu um convite por email em <strong style={{ color: "rgba(255,255,255,0.6)" }}>{leadEmail}</strong>.
                </p>
            </div>
        );
    }

    if (dayKeys.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
                <Calendar className="h-6 w-6" style={{ color: "rgba(255,255,255,0.4)" }} />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>Sem horários disponíveis</span>
                <span className="text-xs max-w-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Todos os horários dos próximos dias estão ocupados. Entre em contato pelo WhatsApp.
                </span>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden w-full max-w-full" style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}>
            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 sm:py-4 flex items-center gap-2 border-b min-w-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <Calendar className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Escolha o horário</p>
                    <p className="text-xs sm:text-sm truncate" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                        <span className="hidden sm:inline">{leadName ? `Olá, ${leadName.split(" ")[0]} — ` : ""}horário de Brasília</span>
                        <span className="sm:hidden">Horário de Brasília</span>
                    </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0" style={{ background: "rgba(0,227,122,0.1)", color: "#00E37A", fontWeight: 700 }}>30 MIN</span>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)] min-w-0">
                {/* Day picker */}
                <div className="border-b md:border-b-0 md:border-r min-w-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {/* Mobile: chips compactos horizontais */}
                    <div className="flex md:hidden gap-2 px-3 py-3 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
                        {dayKeys.map((dk) => {
                            const isActive = dk === selectedDay;
                            const chip = formatDayChip(dk);
                            const slotsCount = slotsByDay.get(dk)?.length || 0;
                            return (
                                <button
                                    key={dk}
                                    onClick={() => {
                                        setSelectedDay(dk);
                                        setSelectedSlot(null);
                                    }}
                                    className="flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all"
                                    style={{
                                        background: isActive ? "rgba(0,227,122,0.12)" : "rgba(255,255,255,0.03)",
                                        boxShadow: isActive ? "0 0 0 1.5px rgba(0,227,122,0.45)" : "0 0 0 1px rgba(255,255,255,0.06)",
                                        color: isActive ? "#33FF9E" : "rgba(255,255,255,0.7)",
                                        minWidth: 58,
                                    }}
                                >
                                    <span className="text-[10px] uppercase" style={{ fontWeight: 600, letterSpacing: "0.05em", color: isActive ? "rgba(52,211,153,0.8)" : "rgba(255,255,255,0.4)" }}>{chip.weekday}</span>
                                    <span className="text-base tabular-nums" style={{ fontWeight: 700, lineHeight: 1.1 }}>{chip.dayNum}</span>
                                    <span className="text-[9px] mt-0.5" style={{ color: isActive ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.3)" }}>{slotsCount} livres</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Desktop: lista vertical */}
                    <div className="hidden md:flex md:flex-col gap-1 p-3 md:max-h-[420px] md:overflow-y-auto">
                        {dayKeys.map((dk) => {
                            const isActive = dk === selectedDay;
                            const slotsCount = slotsByDay.get(dk)?.length || 0;
                            return (
                                <button
                                    key={dk}
                                    onClick={() => {
                                        setSelectedDay(dk);
                                        setSelectedSlot(null);
                                    }}
                                    className="text-left px-3 py-2.5 rounded-lg transition-colors"
                                    style={{
                                        background: isActive ? "rgba(0,227,122,0.12)" : "transparent",
                                        boxShadow: isActive ? "0 0 0 1px rgba(0,227,122,0.3)" : "none",
                                        color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                                    }}
                                >
                                    <div className="text-xs" style={{ fontWeight: 600 }}>{formatDayHeader(dk)}</div>
                                    <div className="text-[10px] mt-0.5" style={{ color: isActive ? "rgba(0,227,122,0.9)" : "rgba(255,255,255,0.35)" }}>{slotsCount} horário{slotsCount !== 1 ? "s" : ""}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Slots grid */}
                <div className="p-3 sm:p-4 min-h-[200px] min-w-0">
                    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] sm:grid-cols-[repeat(4,minmax(0,1fr))] gap-1.5 sm:gap-2 max-h-[220px] sm:max-h-[360px] overflow-y-auto pr-1">
                        {currentSlots.map((s) => {
                            const isActive = selectedSlot?.startIso === s.startIso;
                            return (
                                <button
                                    key={s.startIso}
                                    onClick={() => setSelectedSlot(s)}
                                    className="px-2 sm:px-3 py-2.5 rounded-lg text-sm transition-colors tabular-nums"
                                    style={{
                                        background: isActive ? "linear-gradient(135deg, #00E37A, #00B289)" : "rgba(255,255,255,0.04)",
                                        boxShadow: isActive ? "0 4px 16px rgba(0,227,122,0.3)" : "0 0 0 1px rgba(255,255,255,0.06)",
                                        color: isActive ? "#ffffff" : "rgba(255,255,255,0.85)",
                                        fontWeight: isActive ? 700 : 500,
                                    }}
                                >
                                    {formatBRTTime(s.startIso)}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        {selectedSlot ? (
                            <div className="flex items-center gap-2 min-w-0 sm:flex-1">
                                <Clock className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>Selecionado</p>
                                    <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}>
                                        {formatDayHeader(formatBRTDate(selectedSlot.startIso).dayKey)} · {formatBRTTime(selectedSlot.startIso)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Selecione um horário acima</p>
                        )}
                        <button
                            onClick={handleBook}
                            disabled={!selectedSlot || phase === "booking"}
                            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-sm sm:flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: "linear-gradient(135deg, #00E37A, #00B289)",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                boxShadow: "0 0 0 1px rgba(0,227,122,0.4), 0 4px 16px rgba(0,227,122,0.25)",
                            }}
                        >
                            {phase === "booking" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Confirmando…
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" strokeWidth={3} />
                                    Confirmar agendamento
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
