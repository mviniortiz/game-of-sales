import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Calendar, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { trackBehavior, DEMO_EVENTS } from "@/lib/analytics";
import { DEMO_SLOTS } from "./DemoScheduler";
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

// dia (label do DEMO_SLOTS) → índice de dia da semana (Date.getDay, dom=0).
const WEEKDAY: Record<string, number> = {
    Domingo: 0, Segunda: 1, "Terça": 2, Quarta: 3, Quinta: 4, Sexta: 5, "Sábado": 6,
};

// Próxima ocorrência do dia/hora escolhidos (horário local ≈ Brasília), ISO.
function nextOccurrenceISO(dia: string, hora: string): string {
    const target = WEEKDAY[dia] ?? 2;
    const hour = parseInt(hora, 10) || 12;
    const now = new Date();
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0 && d.getTime() <= now.getTime()) diff = 7; // já passou hoje → semana que vem
    d.setDate(now.getDate() + diff);
    return d.toISOString();
}

export const DemoBooking = ({ email, site, onDone }: DemoBookingProps) => {
    const reduce = useReducedMotion();
    const siteLabel = site.trim() || "sua agência";

    const [view, setView] = useState<View>("q_team");
    const [teamSize, setTeamSize] = useState<string>("");
    const [pain, setPain] = useState<string>("");
    const [slotId, setSlotId] = useState<string | null>(null);
    const [emailValue, setEmailValue] = useState(email);
    const [submitting, setSubmitting] = useState(false);

    const slot = useMemo(() => DEMO_SLOTS.find((s) => s.id === slotId) || null, [slotId]);

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
        const scheduledAt = nextOccurrenceISO(slot.dia, slot.hora);
        const cleanEmail = emailValue.trim().toLowerCase() || email.trim().toLowerCase();
        try {
            trackBehavior(DEMO_EVENTS.DEMO_CTA, {
                cta: "demo_live_booking_confirm",
                slot: slot.id,
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
                                <Heading sub="30 minutos, online. Escolha o melhor horário pra você.">
                                    Quando fica bom?
                                </Heading>
                                <motion.div variants={listV} initial="hidden" animate="show" className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-2.5 sm:grid-cols-4">
                                    {DEMO_SLOTS.map((s) => {
                                        const sel = s.id === slotId;
                                        return (
                                            <motion.button
                                                key={s.id}
                                                type="button"
                                                variants={itemV}
                                                onClick={() => setSlotId(s.id)}
                                                aria-pressed={sel}
                                                aria-label={`${s.dia} às ${s.hora}, horário de Brasília`}
                                                whileHover={reduce ? undefined : { scale: 1.03 }}
                                                whileTap={reduce ? undefined : { scale: 0.95 }}
                                                animate={reduce ? undefined : { scale: sel ? 1.05 : 1 }}
                                                transition={POP}
                                                className="flex flex-col items-center rounded-2xl px-3 py-4 transition-colors focus:outline-none focus-visible:ring-2"
                                                style={
                                                    sel
                                                        ? { background: "var(--lp-blue)", color: "#fff", border: "1px solid var(--lp-blue)", boxShadow: "0 12px 30px -14px rgba(21,86,192,0.65)" }
                                                        : { background: "#fff", border: "1px solid var(--lp-line)", color: "var(--lp-ink-90)" }
                                                }
                                            >
                                                <span className="text-[12px] uppercase tracking-wide" style={{ opacity: 0.72, fontWeight: 600 }}>{s.dia}</span>
                                                <span className="mt-1 text-[20px] tabular-nums" style={{ fontWeight: 700 }}>{s.hora}</span>
                                                <AnimatePresence>
                                                    {sel && (
                                                        <motion.span key="c" initial={reduce ? { opacity: 1 } : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={POP} className="mt-1.5">
                                                            <Check size={15} strokeWidth={3} />
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>
                                <div className="mt-5 flex items-center justify-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-40)" }}>
                                    <Calendar size={14} /> Horário de Brasília
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
                            </motion.div>
                        )}

                        {/* ---------- CONFIRMAR ---------- */}
                        {view === "confirm" && (
                            <motion.div key="confirm" initial={viewInitial} animate={{ opacity: 1, x: 0 }} exit={viewExit} transition={{ duration: 0.35, ease: EASE }} className="text-center">
                                {slot && (
                                    <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "rgba(21,86,192,0.08)", color: "var(--lp-blue)" }}>
                                        <Clock size={15} />
                                        <span className="text-[13.5px]" style={{ fontWeight: 600 }}>{slot.dia}, {slot.hora} · Brasília</span>
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
                                        {slot.dia}, {slot.hora} · horário de Brasília
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
