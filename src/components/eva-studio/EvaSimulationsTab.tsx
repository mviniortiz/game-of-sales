// EVA.STUDIO.8B — Aba Simulações com avaliações PERSISTIDAS + aprovação formal.
// Determinístico, local/demo nos cenários; resultados salvos por empresa.
// NADA automático: não envia, não publica, não altera deal/conversa/pipeline.
import { useEffect, useState } from "react";
import { Check, AlertTriangle, X, Lock, ShieldCheck, FlaskConical, ThumbsUp, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SCENARIOS } from "@/lib/eva/scenarios";
import type { ApprovalResult } from "@/lib/eva/approval";
import type { SimResult, SimResultValue, SaveSimArgs } from "@/hooks/useEvaSimulationResults";
import { INK, SUB, MUTE, HAIR, BLUE, PURPLE, GREEN, AMBER, cardSoft, cardFlat } from "./tokens";
import { MotionSafeReveal } from "./evaMotion";

const RESULT_META: Record<SimResultValue, { label: string; color: string; bg: string }> = {
    approved: { label: "Aprovado", color: GREEN, bg: "#ECFDF3" },
    needs_adjustment: { label: "Precisa ajuste", color: AMBER, bg: "#FFFBEB" },
    rejected: { label: "Reprovado", color: "#DC2626", bg: "#FEF2F2" },
};
const READINESS_STYLE: Record<ApprovalResult["readiness"], React.CSSProperties> = {
    ready: { background: "#ECFDF3", border: "1px solid rgba(22,163,74,0.25)", color: GREEN },
    review: { background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.25)", color: AMBER },
    blocked: { background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.22)", color: "#DC2626" },
};

function fmt(iso: string | null): string {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
}

interface Props {
    rulesText: string[];
    results: Record<string, SimResult>;
    onEvaluate: (args: SaveSimArgs) => void;
    saving: boolean;
    approval: ApprovalResult;
    canEdit: boolean;
    approvedAssisted: boolean;
    onApprove: () => void;
    approving: boolean;
}

export function EvaSimulationsTab({ rulesText, results, onEvaluate, saving, approval, canEdit, approvedAssisted, onApprove, approving }: Props) {
    const [idx, setIdx] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);

    const sc = SCENARIOS[idx];
    const saved = results[sc.key];

    useEffect(() => { setFeedback(results[sc.key]?.feedback ?? ""); }, [idx, sc.key, results]);

    const usedRules = rulesText.slice(0, 2);
    const evaluate = (result: SimResultValue) =>
        onEvaluate({ scenarioId: sc.key, scenarioTitle: sc.label, isCritical: !!sc.critical, result, feedback });

    // Histórico (dados persistidos)
    const all = Object.values(results);
    const counts = {
        tested: all.length,
        approved: all.filter((r) => r.result === "approved").length,
        adjust: all.filter((r) => r.result === "needs_adjustment").length,
        rejected: all.filter((r) => r.result === "rejected").length,
        criticalRejected: all.filter((r) => r.result === "rejected" && r.isCritical).length,
    };
    const lastAt = all.map((r) => r.evaluatedAt).filter(Boolean).sort().slice(-1)[0] ?? null;

    // Razões de bloqueio da aprovação formal
    const reasons: string[] = [];
    if (counts.tested < 5) reasons.push("Teste pelo menos 5 cenários.");
    if (counts.criticalRejected > 0) reasons.push("Resolva o cenário crítico reprovado.");
    if (!approval.hasHandoff) reasons.push("Defina o handoff humano nas regras.");
    if (approval.score < 80) reasons.push("Score mínimo: 80%.");
    if (!canEdit) reasons.push("Apenas administradores podem aprovar.");
    const canApprove = reasons.length === 0 && !approvedAssisted;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-[16px] font-bold" style={{ color: INK }}>Simulações da EVA</h2>
                <p className="text-[13px] mt-0.5" style={{ color: SUB }}>Teste como a EVA responderia antes de usar as regras em operação.</p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase" style={{ background: "#FFFBEB", color: AMBER, letterSpacing: "0.04em" }}>Simulação · prévia</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-5 items-start">
                {/* lista */}
                <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
                    {SCENARIOS.map((s, i) => {
                        const r = results[s.key];
                        const active = i === idx;
                        return (
                            <button key={s.key} onClick={() => setIdx(i)}
                                className="text-left text-[12.5px] px-3 py-2.5 rounded-xl whitespace-nowrap lg:whitespace-normal transition-colors shrink-0 flex items-center gap-2"
                                style={active ? { background: "#F5F3FF", border: "1px solid rgba(124,58,237,0.3)", color: "#6D28D9", fontWeight: 600 } : { background: "#FFFFFF", border: `1px solid ${HAIR}`, color: "#475569" }}>
                                <span className="flex-1">{s.label}</span>
                                {s.critical && <Lock className="w-3 h-3 shrink-0" style={{ color: MUTE }} />}
                                {r && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RESULT_META[r.result].color }} />}
                            </button>
                        );
                    })}
                </div>

                {/* detalhe */}
                <div className="rounded-2xl p-5 sm:p-6 space-y-4" style={cardSoft}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-[14px] font-semibold" style={{ color: INK }}>{sc.label}{sc.critical ? " · crítico" : ""}</h3>
                        {saved && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: RESULT_META[saved.result].bg, color: RESULT_META[saved.result].color }}>{RESULT_META[saved.result].label}</span>}
                    </div>

                    <MotionSafeReveal key={`msg-${idx}`} index={0}>
                        <p className="text-[10px] uppercase font-semibold mb-1.5" style={{ color: MUTE, letterSpacing: "0.05em" }}>Mensagem do lead</p>
                        <div className="rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: "#F1F5F9", color: INK }}>{sc.leadMessage}</div>
                    </MotionSafeReveal>
                    <MotionSafeReveal key={`reply-${idx}`} index={1}>
                        <p className="text-[10px] uppercase font-semibold mb-1.5" style={{ color: MUTE, letterSpacing: "0.05em" }}>Resposta sugerida da EVA</p>
                        <div className="rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed" style={{ background: "#F5F3FF", color: "#4C1D95", border: "1px solid rgba(124,58,237,0.14)" }}>{sc.reply}</div>
                    </MotionSafeReveal>
                    <MotionSafeReveal key={`grid-${idx}`} index={2} className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div><p className="text-[10px] uppercase font-semibold" style={{ color: MUTE, letterSpacing: "0.05em" }}>Intenção</p><p className="text-[12.5px] mt-0.5" style={{ color: INK }}>{sc.intent}</p></div>
                        <div><p className="text-[10px] uppercase font-semibold" style={{ color: MUTE, letterSpacing: "0.05em" }}>Urgência</p><p className="text-[12.5px] mt-0.5" style={{ color: INK }}>{sc.urgency}</p></div>
                        <div>
                            <p className="text-[10px] uppercase font-semibold" style={{ color: MUTE, letterSpacing: "0.05em" }}>Campos detectados</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">{sc.fields.length ? sc.fields.map((f) => <span key={f} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "#F8FAFC", border: `1px solid ${HAIR}`, color: "#475569" }}>{f}</span>) : <span className="text-[11.5px]" style={{ color: MUTE }}>Nenhum</span>}</div>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-semibold" style={{ color: MUTE, letterSpacing: "0.05em" }}>Tags sugeridas</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">{sc.tags.length ? sc.tags.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "#F5F3FF", color: "#6D28D9" }}>{t}</span>) : <span className="text-[11.5px]" style={{ color: MUTE }}>Nenhuma</span>}</div>
                        </div>
                    </MotionSafeReveal>
                    <MotionSafeReveal key={`next-${idx}`} index={3}>
                        <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: MUTE, letterSpacing: "0.05em" }}>Próxima ação sugerida</p>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11.5px] font-medium" style={{ background: "#EFF4FF", border: "1px solid rgba(37,99,235,0.22)", color: BLUE }}>{sc.nextAction}</span>
                    </MotionSafeReveal>
                    <MotionSafeReveal key={`rules-${idx}`} index={4}>
                        <p className="text-[10px] uppercase font-semibold mb-1.5 flex items-center gap-1" style={{ color: MUTE, letterSpacing: "0.05em" }}><ShieldCheck className="w-3 h-3" style={{ color: PURPLE }} /> Regras usadas</p>
                        {usedRules.length ? (
                            <ul className="space-y-1">{usedRules.map((r, i) => <li key={i} className="text-[11.5px] flex items-start gap-1.5" style={{ color: "#4C1D95" }}><span className="mt-[5px] w-1 h-1 rounded-full shrink-0" style={{ background: PURPLE }} />{r}</li>)}</ul>
                        ) : <p className="text-[11.5px]" style={{ color: MUTE }}>Nenhuma regra ativa. Configure no EVA Studio para orientar a resposta.</p>}
                    </MotionSafeReveal>

                    {/* avaliação persistida */}
                    <div className="pt-3" style={{ borderTop: "1px solid #EEF2F7" }}>
                        <p className="text-[10px] uppercase font-semibold mb-2" style={{ color: MUTE, letterSpacing: "0.05em" }}>Avaliação do teste</p>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Observação do avaliador (opcional)"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none transition-colors focus:border-[#7C3AED] resize-none mb-2"
                            style={{ background: "#FFFFFF", border: `1px solid ${HAIR}`, color: INK }}
                        />
                        <div className="flex flex-wrap gap-2">
                            <button disabled={saving || !canEdit} onClick={() => evaluate("approved")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={saved?.result === "approved" ? { background: "#ECFDF3", border: "1px solid rgba(22,163,74,0.3)", color: GREEN } : { background: "#FFFFFF", border: `1px solid ${HAIR}`, color: "#475569" }}>
                                <Check className="w-3.5 h-3.5" /> Aprovar cenário
                            </button>
                            <button disabled={saving || !canEdit} onClick={() => evaluate("needs_adjustment")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={saved?.result === "needs_adjustment" ? { background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.3)", color: AMBER } : { background: "#FFFFFF", border: `1px solid ${HAIR}`, color: "#475569" }}>
                                <AlertTriangle className="w-3.5 h-3.5" /> Precisa ajuste
                            </button>
                            <button disabled={saving || !canEdit} onClick={() => evaluate("rejected")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={saved?.result === "rejected" ? { background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626" } : { background: "#FFFFFF", border: `1px solid ${HAIR}`, color: "#475569" }}>
                                <X className="w-3.5 h-3.5" /> Reprovar cenário
                            </button>
                        </div>
                        {!canEdit && <p className="text-[10.5px] mt-2" style={{ color: MUTE }}>Apenas administradores podem avaliar cenários.</p>}
                        {saved?.evaluatedAt && (
                            <p className="text-[10.5px] mt-2" style={{ color: MUTE }}>
                                Avaliado em {fmt(saved.evaluatedAt)}{saved.evaluatedByName ? ` · por ${saved.evaluatedByName}` : ""}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Histórico de simulações */}
            <div className="rounded-2xl p-6" style={cardSoft}>
                <h3 className="text-[14px] font-semibold mb-4" style={{ color: INK }}>Histórico de simulações</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { k: "Testados", v: counts.tested, c: INK },
                        { k: "Aprovados", v: counts.approved, c: GREEN },
                        { k: "Precisam ajuste", v: counts.adjust, c: AMBER },
                        { k: "Reprovados", v: counts.rejected, c: "#DC2626" },
                        { k: "Críticos reprovados", v: counts.criticalRejected, c: "#DC2626" },
                    ].map((m) => (
                        <div key={m.k} className="rounded-xl p-3" style={{ background: "#F8FAFC", border: "1px solid #EEF2F7" }}>
                            <p className="text-[22px] font-bold tabular-nums leading-none" style={{ color: m.c }}>{m.v}</p>
                            <p className="text-[10.5px] mt-1.5" style={{ color: MUTE }}>{m.k}</p>
                        </div>
                    ))}
                </div>
                {lastAt && <p className="text-[11px] mt-3" style={{ color: MUTE }}>Última avaliação: {fmt(lastAt)}</p>}
            </div>

            {/* Critérios + status + aprovação formal */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
                <div className="rounded-2xl p-6" style={cardSoft}>
                    <h3 className="text-[14px] font-semibold mb-4" style={{ color: INK }}>Critérios de aprovação</h3>
                    <div className="space-y-2">
                        {approval.criteria.map((c) => {
                            const st = c.status;
                            const icon = st === "aprovado" ? <Check className="w-3.5 h-3.5" style={{ color: GREEN }} /> : st === "bloqueado" ? <Lock className="w-3.5 h-3.5" style={{ color: "#DC2626" }} /> : <span className="w-2 h-2 rounded-full" style={{ background: AMBER }} />;
                            return (
                                <div key={c.label} className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: st === "aprovado" ? "#ECFDF3" : st === "bloqueado" ? "#FEF2F2" : "#FFFBEB" }}>{icon}</span>
                                    <span className="text-[12.5px] flex-1" style={{ color: INK }}>{c.label}</span>
                                    <span className="text-[10.5px] font-semibold uppercase" style={{ color: st === "aprovado" ? GREEN : st === "bloqueado" ? "#DC2626" : AMBER }}>{st}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="rounded-2xl p-5" style={cardSoft}>
                        <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: MUTE, letterSpacing: "0.06em" }}>Status do agente</p>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold" style={approvedAssisted ? READINESS_STYLE.ready : READINESS_STYLE[approval.readiness]}>
                            {approvedAssisted ? <ThumbsUp className="w-3.5 h-3.5" /> : approval.readiness === "ready" ? <ThumbsUp className="w-3.5 h-3.5" /> : approval.readiness === "blocked" ? <Lock className="w-3.5 h-3.5" /> : <FlaskConical className="w-3.5 h-3.5" />}
                            {approvedAssisted ? "Aprovado para uso assistido" : approval.agentStatus}
                        </span>
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px]" style={{ color: SUB }}>Score de validação</span>
                                <span className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{approval.score}%</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEF2F7" }}>
                                <div className="h-full rounded-full" style={{ width: `${approval.score}%`, background: approval.readiness === "ready" ? GREEN : approval.readiness === "blocked" ? "#DC2626" : AMBER }} />
                            </div>
                            <p className="text-[10.5px] mt-2" style={{ color: MUTE }}>{counts.tested}/5 simulações · uso assistido (nunca autônomo).</p>
                        </div>
                    </div>

                    {/* aprovação formal */}
                    <div className="rounded-2xl p-5" style={cardSoft}>
                        {approvedAssisted ? (
                            <div className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: GREEN }}>
                                <ThumbsUp className="w-4 h-4" /> Agente aprovado para uso assistido.
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={!canApprove}
                                    className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: canApprove ? GREEN : "#94A3B8" }}
                                >
                                    <ThumbsUp className="w-4 h-4" /> Marcar como pronto para uso assistido
                                </button>
                                {reasons.length > 0 && (
                                    <ul className="mt-3 space-y-1">
                                        {reasons.map((r) => <li key={r} className="text-[11.5px] flex items-start gap-1.5" style={{ color: AMBER }}><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {r}</li>)}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>
                </aside>
            </div>

            {/* Confirmação da aprovação formal */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-[460px]" style={{ background: "#FFFFFF", border: `1px solid ${HAIR}` }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: INK }} className="flex items-center gap-2"><ThumbsUp className="w-4 h-4" style={{ color: GREEN }} /> Aprovar para uso assistido</DialogTitle>
                        <DialogDescription style={{ color: SUB }}>
                            Esta aprovação libera a EVA para uso assistido. Ela continuará sugerindo ações e respostas, mas não enviará mensagens nem alterará oportunidades sem aprovação humana.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-3">
                        <button onClick={() => setConfirmOpen(false)} className="inline-flex items-center h-9 px-4 rounded-lg text-[13px] font-medium transition-colors hover:bg-[#F1F5F9]" style={{ border: `1px solid ${HAIR}`, color: "#475569" }}>Cancelar</button>
                        <button onClick={() => { setConfirmOpen(false); onApprove(); }} disabled={approving} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-50" style={{ background: GREEN }}>
                            {approving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirmar aprovação
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default EvaSimulationsTab;
