// EVA.STUDIO.8A — Aba Insights: o que melhorar na EVA. Recomendações derivadas
// (local/demo) de regras, lacunas e simulações. Não executa nada.
import { AlertTriangle, Check, FlaskConical, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import type { ApprovalResult } from "@/lib/eva/approval";
import type { EvaMemory } from "@/hooks/useEvaMemory";
import { INK, SUB, MUTE, HAIR, PURPLE, GREEN, AMBER, cardSoft, cardFlat } from "./tokens";

type Tone = "ok" | "warn" | "bad" | "info";
const TONE: Record<Tone, { color: string; bg: string; Icon: React.ElementType }> = {
    ok: { color: GREEN, bg: "#ECFDF3", Icon: Check },
    warn: { color: AMBER, bg: "#FFFBEB", Icon: AlertTriangle },
    bad: { color: "#DC2626", bg: "#FEF2F2", Icon: ShieldAlert },
    info: { color: PURPLE, bg: "#F5F3FF", Icon: ShieldCheck },
};

function fmtSim(iso: string | null | undefined): string {
    if (!iso) return "ainda não houve simulação";
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
}

export function EvaInsightsTab({ approval, memory, lastSimAt, hideHeader }: { approval: ApprovalResult; memory: EvaMemory | null; lastSimAt?: string | null; hideHeader?: boolean }) {
    const gaps = memory?.gapsOpenCount ?? 0;
    const cards: { tone: Tone; title: string; text: string }[] = [
        gaps > 0
            ? { tone: "warn", title: "Lacunas críticas", text: `Há ${gaps} lacuna(s) aberta(s). Complete-as antes de ativar a EVA: cada lacuna é uma pergunta que ela não sabe responder.` }
            : { tone: "ok", title: "Lacunas críticas", text: "Sem lacunas abertas. Bom para aprovação." },
        approval.testedCount < 5
            ? { tone: "warn", title: "Casos pendentes", text: `Ainda há casos sem julgamento. Julgue pelo menos 5 no passo Provar (${approval.testedCount}/5).` }
            : { tone: "ok", title: "Casos pendentes", text: "Você julgou casos suficientes." },
        approval.hasHandoff
            ? { tone: "ok", title: "Handoff humano", text: "As regras de handoff humano estão configuradas." }
            : { tone: "warn", title: "Handoff humano", text: "Defina o handoff humano nas regras antes de aprovar o agente." },
        approval.rejected > 0
            ? { tone: "bad", title: "Risco de resposta incorreta", text: "Há cenário crítico reprovado. Ajuste as regras/respostas antes de prosseguir." }
            : { tone: "ok", title: "Risco de resposta incorreta", text: "Nenhum cenário crítico reprovado até agora." },
    ];

    const nextStep = !approval.hasHandoff
        ? "Configure o handoff humano nas regras."
        : gaps > 0
            ? "Complete as lacunas abertas antes de ativar a EVA."
            : approval.testedCount < 5
                ? "Julgue pelo menos 5 casos no passo Provar."
                : approval.readiness === "ready"
                    ? "A EVA está pronta para uso assistido, mas não para automação."
                    : "Revise os critérios pendentes para elevar o score de validação.";

    const topRules = memory?.rules.slice(0, 3) ?? [];

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div>
                    <h2 className="text-[16px] font-bold" style={{ color: INK }}>Insights da EVA</h2>
                    <p className="text-[13px] mt-0.5" style={{ color: SUB }}>O que melhorar antes de liberar a EVA para uso assistido.</p>
                </div>
            )}

            {/* Próximo ajuste recomendado */}
            <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "#F5F3FF", border: "1px solid rgba(124,58,237,0.2)" }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.12)" }}>
                    <ArrowRight className="w-4 h-4" style={{ color: PURPLE }} />
                </span>
                <div>
                    <p className="text-[12px] font-semibold uppercase" style={{ color: "#6D28D9", letterSpacing: "0.04em" }}>Próximo ajuste recomendado</p>
                    <p className="text-[13.5px] mt-0.5" style={{ color: INK }}>{nextStep}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((c) => {
                    const t = TONE[c.tone];
                    return (
                        <div key={c.title} className="rounded-2xl p-4" style={cardFlat}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: t.bg }}>
                                    <t.Icon className="w-3.5 h-3.5" style={{ color: t.color }} />
                                </span>
                                <p className="text-[13px] font-semibold" style={{ color: INK }}>{c.title}</p>
                            </div>
                            <p className="text-[12px] leading-snug" style={{ color: SUB }}>{c.text}</p>
                        </div>
                    );
                })}
            </div>

            {/* Regras mais importantes */}
            <div className="rounded-2xl p-6" style={cardSoft}>
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4" style={{ color: PURPLE }} />
                    <h3 className="text-[14px] font-semibold" style={{ color: INK }}>Regras mais importantes</h3>
                </div>
                {topRules.length ? (
                    <ul className="space-y-2">
                        {topRules.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: INK }}>
                                <span className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PURPLE }} />
                                <span>{r.text}<span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={r.origin === "EVA Studio" ? { background: "#F5F3FF", color: "#6D28D9" } : { background: "#F1F5F9", color: MUTE }}>{r.origin}</span></span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-[12px]" style={{ color: SUB }}>Nenhuma regra ativa ainda. Aplique regras pelo EVA Studio para orientar a EVA.</p>
                )}
            </div>

            <p className="text-[11px]" style={{ color: MUTE }}>Última simulação: {fmtSim(lastSimAt)}.</p>
            <p className="text-[11px] flex items-center gap-1.5" style={{ color: MUTE }}>
                <FlaskConical className="w-3.5 h-3.5" /> Score e recomendações são uma validação para uso assistido. A EVA não age sozinha.
            </p>
        </div>
    );
}

export default EvaInsightsTab;
