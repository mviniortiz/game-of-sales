import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Calendar, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { trackBehavior, DEMO_EVENTS } from "@/lib/analytics";
import { EvaOrb } from "./EvaOrb";

// LP.9 (v2) — booking PÓS-tour. Quando a demo guiada termina, a pessoa marca a
// SUA demo personalizada: 2 perguntas de 1 toque (sem digitar) + horário
// clicável + confirmação. Persiste em demo_requests via RPC submit_demo_request.
// Frictionless e premium (framer-motion, respeitando prefers-reduced-motion).
interface DemoBookingProps {
    email: string; // já coletado no intake — pré-preenchido
    site: string; // site/empresa do lead (contexto)
    onDone: () => void; // fecha a demo
}

// Curva premium (ease-out com peso) + spring de seleção.
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const POP = { type: "spring" as const, stiffness: 300, damping: 24 };

type View = "q_team" | "q_pain" | "schedule" | "confirm" | "success";

const TEAM_OPTIONS = ["1-3", "4-10", "11-30", "30+"] as const;
const PAIN_OPTIONS = [
    "Demora pra responder",
    "Follow-up esquecido",
    "Pipeline desatualizado",
    "Qualificar leads",
] as const;

// Disponibilidade REAL do Google Calendar da equipe (edge calendar-slots):
// horário comercial 9h-18h BRT, dias úteis, em blocos de 30min, já filtrando
// os compromissos da agenda (freeBusy). Se a função falhar (sem rede etc.),
// cai no buildDaysFallback gerado pra nunca travar o booking.
const SP_TZ = "America/Sao_Paulo";
const TIMES = ["09h", "10h", "11h", "14h", "15h", "16h", "17h"];
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface TimeOpt { id: string; hora: string; iso: string }
interface DayOpt { key: string; label: string; date: string; times: TimeOpt[] }
interface ApiSlot { startIso: string; endIso?: string }

// Chave de dia (YYYY-MM-DD) no fuso de Brasília, pra agrupar slots em UTC.
const spDateKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: SP_TZ }).format(d);

// Monta os dias a partir dos slots reais da edge (já ordenados, em UTC).
function buildDaysFromSlots(slots: ApiSlot[]): DayOpt[] {
    const now = new Date();
    const todayKey = spDateKey(now);
    const tomorrowKey = spDateKey(new Date(now.getTime() + 86400000));
    const wdFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: SP_TZ, weekday: "short" });
    const dmFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: SP_TZ, day: "numeric", month: "numeric" });
    const tFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: SP_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

    const byDay = new Map<string, DayOpt>();
    for (const s of slots) {
        if (!s?.startIso) continue;
        const dt = new Date(s.startIso);
        const key = spDateKey(dt);
        let day = byDay.get(key);
        if (!day) {
            const wd = wdFmt.format(dt).replace(".", "");
            const label = key === todayKey ? "Hoje" : key === tomorrowKey ? "Amanhã" : wd.charAt(0).toUpperCase() + wd.slice(1);
            day = { key, label, date: dmFmt.format(dt), times: [] };
            byDay.set(key, day);
        }
        day.times.push({ id: s.startIso, hora: tFmt.format(dt), iso: s.startIso });
    }
    return Array.from(byDay.values()).filter((d) => d.times.length).slice(0, 5);
}

// Fallback gerado (sem agenda): próximos dias úteis × horários comerciais.
// "Hoje" filtra os horários já passados (folga de 1h).
function buildDaysFallback(): DayOpt[] {
    const out: DayOpt[] = [];
    const now = new Date();
    const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
    const tomorrow0 = new Date(today0); tomorrow0.setDate(today0.getDate() + 1);
    for (let i = 0; i < 18 && out.length < 5; i++) {
        const d = new Date(today0); d.setDate(today0.getDate() + i);
        const wd = d.getDay();
        if (wd === 0 || wd === 6) continue; // pula fim de semana
        const isToday = d.getTime() === today0.getTime();
        const times: TimeOpt[] = TIMES
            .filter((h) => !isToday || parseInt(h, 10) > now.getHours() + 1)
            .map((h) => {
                const dt = new Date(d); dt.setHours(parseInt(h, 10), 0, 0, 0);
                return { id: `${d.getTime()}_${h}`, hora: h, iso: dt.toISOString() };
            });
        if (!times.length) continue;
        const label = isToday ? "Hoje" : d.getTime() === tomorrow0.getTime() ? "Amanhã" : WD[wd];
        out.push({ key: String(d.getTime()), label, date: `${d.getDate()}/${d.getMonth() + 1}`, times });
    }
    return out;
}

export const DemoBooking = ({ email, site, onDone }: DemoBookingProps) => {
    const reduce = useReducedMotion();
    const siteLabel = site.trim() || "sua agência";

    const [view, setView] = useState<View>("q_team");
    const [teamSize, setTeamSize] = useState<string>("");
    const [pain, setPain] = useState<string>("");
    const [emailValue, setEmailValue] = useState(email);
    const [submitting, setSubmitting] = useState(false);

    const [days, setDays] = useState<DayOpt[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(true);
    const [synced, setSynced] = useState(false); // veio da agenda real (não do fallback)
    const [dayKey, setDayKey] = useState<string>("");
    const [slotId, setSlotId] = useState<string | null>(null);

    // Puxa a disponibilidade real da agenda (roda em background durante as 2
    // perguntas, então chega pronto quando a pessoa abre o passo do horário).
    useEffect(() => {
        let alive = true;
        (async () => {
            let built: DayOpt[] = [];
            let fromGcal = false;
            try {
                const { data, error } = await supabase.functions.invoke("calendar-slots");
                const slots = (data as { slots?: ApiSlot[]; gcal_connected?: boolean } | null)?.slots;
                if (!error && Array.isArray(slots) && slots.length) {
                    built = buildDaysFromSlots(slots);
                    fromGcal = !!(data as { gcal_connected?: boolean }).gcal_connected && built.length > 0;
                }
            } catch (e) {
                console.error("[DemoBooking] calendar-slots falhou:", e);
            }
            if (!built.length) built = buildDaysFallback();
            if (!alive) return;
            setDays(built);
            setDayKey(built[0]?.key ?? "");
            setSynced(fromGcal);
            setLoadingSlots(false);
        })();
        return () => { alive = false; };
    }, []);
    const selectedDay = useMemo(() => days.find((d) => d.key === dayKey) ?? days[0] ?? null, [days, dayKey]);
    const slot = useMemo(() => {
        for (const d of days) {
            const t = d.times.find((x) => x.id === slotId);
            if (t) return { dia: d.label, date: d.date, hora: t.hora, iso: t.iso };
        }
        return null;
    }, [days, slotId]);
    const slotText = slot ? `${slot.dia}${slot.dia === "Hoje" || slot.dia === "Amanhã" ? "" : " " + slot.date}, ${slot.hora}` : "";

    // 3 etapas no progress (qualificação / horário / confirmar); success é terminal.
    const stepIndex = view === "schedule" ? 1 : view === "confirm" ? 2 : view === "success" ? 3 : 0;

    // ---- helpers de motion (gate por prefers-reduced-motion) ----
    const viewInitial = reduce ? { opacity: 0 } : { opacity: 0, x: 24 };
    const viewExit = reduce ? { opacity: 0 } : { opacity: 0, x: -24 };
    const listV = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.05 } } };
    const itemV = reduce
        ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
        : { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } };

    // ---- ações ----
    const pickTeam = (v: string) => {
        setTeamSize(v);
        trackBehavior(DEMO_EVENTS.EVA_STEP_VIEW, { step: "booking_team", value: v });
        window.setTimeout(() => setView("q_pain"), reduce ? 0 : 240);
    };
    const pickPain = (v: string) => {
        setPain(v);
        window.setTimeout(() => setView("schedule"), reduce ? 0 : 240);
    };

    const confirm = async () => {
        if (!slot || submitting) return;
        setSubmitting(true);
        const scheduledAt = slot.iso;
        const cleanEmail = emailValue.trim().toLowerCase() || email.trim().toLowerCase();
        try {
            trackBehavior(DEMO_EVENTS.DEMO_CTA, {
                cta: "demo_live_booking_confirm",
                slot: slotId ?? "",
                team_size: teamSize || "",
                biggest_pain: pain || "",
            });
            const { error } = await supabase.rpc("submit_demo_request", {
                payload: {
                    email: cleanEmail,
                    company: site,
                    source: "demo_live_booking",
                    team_size: teamSize,
                    biggest_pain: pain,
                    scheduled_at: scheduledAt,
                    ...(getAttribution() ?? {}),
                },
            });
            if (error) console.error("[DemoBooking] submit_demo_request falhou:", error.message);
        } catch (err) {
            // Não trava o usuário: mostra sucesso visual mesmo se a persistência falhar.
            console.error("[DemoBooking] erro inesperado ao confirmar demo:", err);
        } finally {
            setSubmitting(false);
            setView("success");
        }
    };

    // ---- subcomponentes visuais ----
    const Heading = ({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) => (
        <div className="text-center">
            <h3
                className="lp-display"
                style={{ fontSize: "clamp(1.4rem,2.9vw,1.95rem)", letterSpacing: "-0.02em", color: "var(--lp-ink)", lineHeight: 1.1 }}
            >
                {children}
            </h3>
            {sub && (
                <p className="mx-auto mt-2.5 max-w-md text-[14px]" style={{ color: "rgba(13,20,33,0.6)", lineHeight: 1.55 }}>
                    {sub}
                </p>
            )}
        </div>
    );

    const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
        <motion.button
            type="button"
            variants={itemV}
            onClick={onClick}
            aria-pressed={selected}
            whileHover={reduce ? undefined : { scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            animate={reduce ? undefined : { scale: selected ? 1.04 : 1 }}
            transition={POP}
            className="flex items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-left text-[14.5px] transition-colors focus:outline-none focus-visible:ring-2"
            style={
                selected
                    ? { background: "var(--lp-blue)", color: "#fff", border: "1px solid var(--lp-blue)", fontWeight: 600, boxShadow: "0 12px 30px -14px rgba(21,86,192,0.65)" }
                    : { background: "#fff", color: "var(--lp-ink-90)", border: "1px solid var(--lp-line)", fontWeight: 500 }
            }
        >
            <span>{label}</span>
            <AnimatePresence>
                {selected && (
                    <motion.span
                        key="ck"
                        initial={reduce ? { opacity: 1 } : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                        transition={POP}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(255,255,255,0.22)" }}
                    >
                        <Check size={13} strokeWidth={3} />
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );

    return (
        <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--lp-paper)" }}>
            {/* topo */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--lp-line)" }}>
                <div className="flex items-center gap-2.5">
                    <EvaOrb state="speaking" size={30} />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>EVA · agendar sua demo</span>
                </div>
                {(view === "q_pain" || view === "schedule" || view === "confirm") && (
                    <button
                        type="button"
                        onClick={() => setView(view === "confirm" ? "schedule" : view === "schedule" ? "q_pain" : "q_team")}
                        className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-transform hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2"
                        style={{ background: "rgba(13,20,33,0.05)", color: "var(--lp-ink-90)", fontWeight: 500 }}
                        aria-label="Voltar à etapa anterior"
                    >
                        <ArrowLeft size={14} /> Voltar
                    </button>
                )}
            </div>

            <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-10">
                <div className="w-full max-w-xl">
                    {/* progress dots */}
                    {view !== "success" && (
                        <div className="mb-8 flex items-center justify-center gap-2" aria-hidden="true">
                            {[0, 1, 2].map((i) => {
                                const done = stepIndex >= i;
                                return (
                                    <motion.span
                                        key={i}
                                        className="h-1.5 rounded-full"
                                        animate={{ width: done ? 26 : 10, backgroundColor: done ? "#1556c0" : "rgba(13,20,33,0.14)" }}
                                        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <AnimatePresence mode="wait" initial={false}>
                        {/* ---------- QUALIFICAÇÃO: tamanho do time ---------- */}
                        {view === "q_team" && (
                            <motion.div key="q_team" initial={viewInitial} animate={{ opacity: 1, x: 0 }} exit={viewExit} transition={{ duration: 0.35, ease: EASE }}>
                                <Heading sub="Um toque pra EVA preparar a demo no seu contexto. Sem digitar.">
                                    Quantas pessoas no comercial?
                                </Heading>
                                <motion.div variants={listV} initial="hidden" animate="show" className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-2.5 sm:grid-cols-4">
                                    {TEAM_OPTIONS.map((o) => (
                                        <Chip key={o} label={o} selected={teamSize === o} onClick={() => pickTeam(o)} />
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ---------- QUALIFICAÇÃO: maior dor ---------- */}
                        {view === "q_pain" && (
                            <motion.div key="q_pain" initial={viewInitial} animate={{ opacity: 1, x: 0 }} exit={viewExit} transition={{ duration: 0.35, ease: EASE }}>
                                <Heading sub="Pra EVA já entrar pelo que mais dói. Pode pular se preferir.">
                                    Qual a maior dor hoje?
                                </Heading>
                                <motion.div variants={listV} initial="hidden" animate="show" className="mx-auto mt-7 grid max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {PAIN_OPTIONS.map((o) => (
                                        <Chip key={o} label={o} selected={pain === o} onClick={() => pickPain(o)} />
                                    ))}
                                </motion.div>
                                <div className="mt-6 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setView("schedule")}
                                        className="rounded-full px-4 py-2 text-[13.5px] transition-colors hover:underline focus:outline-none focus-visible:ring-2"
                                        style={{ color: "var(--lp-ink-55)", fontWeight: 500 }}
                                    >
                                        Pular essa
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ---------- HORÁRIO ---------- */}
                        {view === "schedule" && (
                            <motion.div key="schedule" initial={viewInitial} animate={{ opacity: 1, x: 0 }} exit={viewExit} transition={{ duration: 0.35, ease: EASE }}>
                                <Heading sub="30 minutos, online. Estes são os horários livres na nossa agenda.">
                                    Quando fica bom?
                                </Heading>
                                {loadingSlots ? (
                                    <div className="mt-10 flex flex-col items-center gap-3" aria-live="polite">
                                        <motion.div
                                            className="h-7 w-7 rounded-full border-2"
                                            style={{ borderColor: "rgba(21,86,192,0.2)", borderTopColor: "var(--lp-blue)" }}
                                            animate={reduce ? undefined : { rotate: 360 }}
                                            transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
                                        />
                                        <span className="lp-mono text-[12.5px]" style={{ color: "var(--lp-ink-40)" }}>
                                            sincronizando a agenda…
                                        </span>
                                    </div>
                                ) : (
                                  <>
                                {/* dias úteis (rolável) */}
                                <div className="mx-auto mt-6 flex max-w-md gap-2 overflow-x-auto pb-1">
                                    {days.map((d) => {
                                        const sel = d.key === dayKey;
                                        return (
                                            <button
                                                key={d.key}
                                                type="button"
                                                onClick={() => { setDayKey(d.key); setSlotId(null); }}
                                                aria-pressed={sel}
                                                className="flex shrink-0 flex-col items-center rounded-2xl px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2"
                                                style={
                                                    sel
                                                        ? { background: "var(--lp-blue)", color: "#fff", border: "1px solid var(--lp-blue)", boxShadow: "0 10px 24px -14px rgba(21,86,192,0.6)" }
                                                        : { background: "#fff", border: "1px solid var(--lp-line)", color: "var(--lp-ink-90)" }
                                                }
                                            >
                                                <span className="text-[13.5px]" style={{ fontWeight: 600 }}>{d.label}</span>
                                                <span className="text-[11.5px] tabular-nums" style={{ opacity: 0.7 }}>{d.date}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* horários do dia selecionado */}
                                <motion.div key={dayKey} variants={listV} initial="hidden" animate="show" className="mx-auto mt-3 grid max-w-md grid-cols-3 gap-2.5 sm:grid-cols-4">
                                    {(selectedDay?.times ?? []).map((t) => {
                                        const sel = t.id === slotId;
                                        return (
                                            <motion.button
                                                key={t.id}
                                                type="button"
                                                variants={itemV}
                                                onClick={() => setSlotId(t.id)}
                                                aria-pressed={sel}
                                                aria-label={`${selectedDay?.label} às ${t.hora}, horário de Brasília`}
                                                whileHover={reduce ? undefined : { scale: 1.03 }}
                                                whileTap={reduce ? undefined : { scale: 0.95 }}
                                                animate={reduce ? undefined : { scale: sel ? 1.05 : 1 }}
                                                transition={POP}
                                                className="flex items-center justify-center rounded-2xl px-3 py-3.5 text-[17px] tabular-nums transition-colors focus:outline-none focus-visible:ring-2"
                                                style={
                                                    sel
                                                        ? { background: "var(--lp-blue)", color: "#fff", border: "1px solid var(--lp-blue)", fontWeight: 700, boxShadow: "0 12px 30px -14px rgba(21,86,192,0.65)" }
                                                        : { background: "#fff", border: "1px solid var(--lp-line)", color: "var(--lp-ink-90)", fontWeight: 600 }
                                                }
                                            >
                                                {t.hora}
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>
                                <div className="mt-5 flex items-center justify-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-40)" }}>
                                    <Calendar size={14} />
                                    {synced ? "Horários livres na agenda · Brasília" : "Horário de Brasília"}
                                </div>
                                <div className="mt-7 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setView("confirm")}
                                        disabled={!slotId}
                                        className="rounded-full px-6 py-3 text-[14px] text-white transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2"
                                        style={{ background: "var(--lp-ink)", fontWeight: 600 }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                                  </>
                                )}
                            </motion.div>
                        )}

                        {/* ---------- CONFIRMAR ---------- */}
                        {view === "confirm" && (
                            <motion.div key="confirm" initial={viewInitial} animate={{ opacity: 1, x: 0 }} exit={viewExit} transition={{ duration: 0.35, ease: EASE }} className="text-center">
                                {slot && (
                                    <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "rgba(21,86,192,0.08)", color: "var(--lp-blue)" }}>
                                        <Clock size={15} />
                                        <span className="text-[13.5px]" style={{ fontWeight: 600 }}>{slotText} · Brasília</span>
                                    </div>
                                )}
                                <Heading sub="Confirme o e-mail pra onde mandamos o convite.">Tudo certo pra marcar?</Heading>
                                <div className="mx-auto mt-6 max-w-sm text-left">
                                    <label htmlFor="db-email" className="mb-2 block text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                                        Seu e-mail
                                    </label>
                                    <input
                                        id="db-email"
                                        type="email"
                                        className="vz-input-light w-full"
                                        value={emailValue}
                                        onChange={(e) => setEmailValue(e.target.value)}
                                        aria-label="E-mail para o convite"
                                    />
                                </div>
                                <div className="mt-7 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={confirm}
                                        disabled={submitting || !slot}
                                        className="rounded-full px-7 py-3.5 text-[14.5px] text-white transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2"
                                        style={{ background: "var(--lp-ink)", fontWeight: 600 }}
                                    >
                                        {submitting ? "Confirmando…" : "Confirmar demo"}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ---------- SUCESSO ---------- */}
                        {view === "success" && (
                            <motion.div key="success" initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE }} className="flex flex-col items-center text-center">
                                <motion.div
                                    initial={reduce ? { scale: 1 } : { scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={POP}
                                    className="flex h-16 w-16 items-center justify-center rounded-full"
                                    style={{ background: "rgba(21,86,192,0.12)" }}
                                >
                                    <motion.svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1556c0" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <motion.path
                                            d="M20 6 9 17l-5-5"
                                            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.15 }}
                                        />
                                    </motion.svg>
                                </motion.div>
                                <h3 className="lp-display mt-5" style={{ fontSize: "clamp(1.5rem,3vw,2rem)", letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                                    Demo marcada!
                                </h3>
                                {slot && (
                                    <p className="mt-2 text-[15px]" style={{ color: "rgba(13,20,33,0.65)" }}>
                                        {slotText} · horário de Brasília
                                    </p>
                                )}
                                <p className="mx-auto mt-3 max-w-sm text-[14px]" style={{ color: "rgba(13,20,33,0.55)", lineHeight: 1.55 }}>
                                    Nosso time te encontra já com a demo preparada pro contexto de <strong style={{ color: "var(--lp-ink-90)" }}>{siteLabel}</strong>.
                                </p>
                                <button
                                    type="button"
                                    onClick={onDone}
                                    className="mt-7 rounded-full px-7 py-3.5 text-[14.5px] text-white transition-transform hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2"
                                    style={{ background: "var(--lp-ink)", fontWeight: 600 }}
                                >
                                    Concluir
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
