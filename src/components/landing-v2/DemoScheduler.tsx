import { Calendar, Check, Clock } from "lucide-react";
import { EvaOrb } from "./EvaOrb";

// LP.8 (v2) — agendamento conduzido pela EVA DENTRO da demo. A EVA não envia
// links (não tem como ainda): se a pessoa quer marcar, a EVA ABRE esta seção,
// fala os horários, "clica" no que a pessoa escolher, avança pra etapa de
// detalhes e finaliza. Visual-only (nada é persistido) — é demonstração.
export type SchedStep = "horarios" | "detalhes" | "confirmado";

export interface DemoSlot { id: string; dia: string; hora: string }

// Conjunto enxuto pra EVA falar de forma resumida e "clicar" por voz.
export const DEMO_SLOTS: DemoSlot[] = [
    { id: "ter-14", dia: "Terça", hora: "14h" },
    { id: "qua-10", dia: "Quarta", hora: "10h" },
    { id: "qui-16", dia: "Quinta", hora: "16h" },
    { id: "sex-11", dia: "Sexta", hora: "11h" },
];

interface DemoSchedulerProps {
    step: SchedStep;
    selectedId: string | null;
    site: string;
    onClose: () => void;
    onConclude: () => void;
}

export const DemoScheduler = ({ step, selectedId, site, onClose, onConclude }: DemoSchedulerProps) => {
    const selected = DEMO_SLOTS.find((s) => s.id === selectedId) || null;
    const siteLabel = site.trim() || "sua agência";

    return (
        <div className="vz-demochat-in absolute inset-0 z-30 flex flex-col" style={{ background: "var(--lp-paper)" }}>
            {/* topo */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--lp-line)" }}>
                <div className="flex items-center gap-2.5">
                    <EvaOrb state="speaking" size={30} />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>EVA · agendar demo</span>
                </div>
                {step !== "confirmado" && (
                    <button type="button" onClick={onClose} className="rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)", fontWeight: 500 }}>
                        Voltar ao tour
                    </button>
                )}
            </div>

            <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-10">
                <div className="w-full max-w-xl">
                    {/* passos */}
                    <div className="mb-7 flex items-center justify-center gap-2">
                        {["horarios", "detalhes", "confirmado"].map((s, i) => {
                            const order = ["horarios", "detalhes", "confirmado"];
                            const done = order.indexOf(step) >= i;
                            return <span key={s} className="h-1.5 rounded-full transition-all" style={{ width: done ? 26 : 10, background: done ? "var(--lp-blue)" : "var(--lp-line)" }} />;
                        })}
                    </div>

                    {step === "horarios" && (
                        <div>
                            <h3 className="lp-display text-center" style={{ fontSize: "clamp(1.5rem,3vw,2rem)", letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                                Vamos marcar sua demo
                            </h3>
                            <p className="mx-auto mt-2 max-w-sm text-center text-[14px]" style={{ color: "rgba(5,5,5,0.6)" }}>
                                30 minutos, online. Diga o melhor dia pra EVA, ela marca pra você.
                            </p>
                            <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                {DEMO_SLOTS.map((s) => {
                                    const sel = s.id === selectedId;
                                    return (
                                        <div
                                            key={s.id}
                                            className="flex flex-col items-center rounded-2xl px-3 py-4 transition-all"
                                            style={sel
                                                ? { background: "var(--lp-blue)", color: "#fff", boxShadow: "0 10px 28px -12px rgba(21,86,192,0.6)" }
                                                : { background: "#fff", border: "1px solid var(--lp-line)", color: "var(--lp-ink-90)" }}
                                        >
                                            <span className="text-[12px] uppercase tracking-wide" style={{ opacity: 0.7, fontWeight: 600 }}>{s.dia}</span>
                                            <span className="mt-1 text-[20px] tabular-nums" style={{ fontWeight: 700 }}>{s.hora}</span>
                                            {sel && <Check size={15} strokeWidth={3} className="mt-1.5" />}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 flex items-center justify-center gap-2 text-[13px]" style={{ color: "var(--lp-ink-40)" }}>
                                <Calendar size={14} /> Horário de Brasília
                            </div>
                        </div>
                    )}

                    {step === "detalhes" && (
                        <div className="text-center">
                            {selected && (
                                <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "rgba(21,86,192,0.08)", color: "var(--lp-blue)" }}>
                                    <Clock size={15} />
                                    <span className="text-[13.5px]" style={{ fontWeight: 600 }}>{selected.dia}, {selected.hora}</span>
                                </div>
                            )}
                            <h3 className="lp-display" style={{ fontSize: "clamp(1.4rem,2.8vw,1.85rem)", letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                                O que você quer ver nessa demo?
                            </h3>
                            <p className="mx-auto mt-3 max-w-md text-[14px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                Conta pra EVA, por voz, o que mais importa pra <strong style={{ color: "var(--lp-ink-90)" }}>{siteLabel}</strong>. Ela já vai preparar a demo no seu contexto.
                            </p>
                            <div className="mx-auto mt-7 flex max-w-md flex-col gap-2 text-left">
                                {["Qualificar leads do WhatsApp", "Follow-up que não esquece ninguém", "Pipeline que reflete a conversa"].map((t) => (
                                    <div key={t} className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: "#fff", border: "1px solid var(--lp-line)" }}>
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--lp-blue)" }} />
                                        <span className="text-[14px]" style={{ color: "var(--lp-ink-90)" }}>{t}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === "confirmado" && (
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(21,86,192,0.12)" }}>
                                <Check size={30} strokeWidth={2.6} style={{ color: "var(--lp-blue)" }} />
                            </div>
                            <h3 className="lp-display mt-5" style={{ fontSize: "clamp(1.5rem,3vw,2rem)", letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                                Demo confirmada
                            </h3>
                            {selected && (
                                <p className="mt-2 text-[15px]" style={{ color: "rgba(5,5,5,0.65)" }}>
                                    {selected.dia}, {selected.hora} · horário de Brasília
                                </p>
                            )}
                            <p className="mx-auto mt-3 max-w-sm text-[14px]" style={{ color: "rgba(5,5,5,0.55)", lineHeight: 1.55 }}>
                                Nosso time te encontra no horário, já com a demo preparada pro contexto de {siteLabel}.
                            </p>
                            <button
                                type="button"
                                onClick={onConclude}
                                className="mt-7 rounded-full px-6 py-3 text-[14px] text-white transition-transform hover:scale-[1.02] active:scale-95"
                                style={{ background: "var(--lp-ink)", fontWeight: 600 }}
                            >
                                Concluir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
