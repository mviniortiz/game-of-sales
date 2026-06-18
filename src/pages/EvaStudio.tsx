// ─────────────────────────────────────────────────────────────────────────────
// EVA Studio (EVA.STUDIO.JOURNEY integrado, 2026-06-09) — a página agora É a
// jornada: Criar → Ensinar → Provar → Ativar (EvaStudioJourney), com Memória e
// Insights como vistas secundárias. Substituiu as 4 abas paralelas e o caminho
// velho de blueprint (modais de revisão/aplicação, teatro de geração, cenários
// sintéticos de imobiliária) — limpeza da dívida mapeada no acoplamento F1+F2.
//
// Dados reais:
//   Ensinar  → useEvaContextSuggestions (ponte pro eva_business_context)
//   Provar   → SimulationLab persiste em eva_simulation_results (lab:*) e
//              GuidedSimulationReplay usa useEvaReplayMoments (momentos reais)
//   Ativar   → approveAssisted (eva_blueprints.status → approved_assisted,
//              que gateia a EVA no Inbox)
//   Memória  → useEvaMemory · Insights → computeApproval + simResults
//
// O chat conversacional agora é REAL (edge eva-studio-chat conduz a entrevista
// e extrai os campos do agente escolhido); é o caminho DEFAULT do Ensinar, e o
// que a conversa monta é gravado no contexto via ctxBuilder.submitText
// (ConversationalStudio.onComplete → Journey → onSubmitText).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEvaBlueprint } from "@/hooks/useEvaBlueprint";
import { useEvaMemory } from "@/hooks/useEvaMemory";
import { useEvaSimulationResults } from "@/hooks/useEvaSimulationResults";
import { useEvaReplayMoments } from "@/hooks/useEvaReplayMoments";
import { useEvaContextSuggestions } from "@/hooks/useEvaContextSuggestions";
import { useHybridAutoCreate } from "@/hooks/useHybridAutoCreate";
import { computeApproval, type Verdict } from "@/lib/eva/approval";
import { EvaStudioJourney } from "@/components/eva-studio/EvaStudioJourney";
import { EvaMemoryView } from "@/components/eva-studio/EvaMemoryTab";
import { EvaInsightsTab } from "@/components/eva-studio/EvaInsightsTab";
import type { LabJudgment, LabScenario } from "@/components/eva-studio/SimulationLab";

export default function EvaStudio() {
    const { isAdmin } = useAuth();
    const canEdit = !!isAdmin;
    const { ready, initial, origin, existing, save, approveAssisted } = useEvaBlueprint();
    const { memory, loading: memoryLoading } = useEvaMemory();
    const { results: simResults, save: saveSim } = useEvaSimulationResults();
    const replay = useEvaReplayMoments();
    const ctxBuilder = useEvaContextSuggestions();
    const hybrid = useHybridAutoCreate();

    // Aprovação feita nesta sessão (o hook só reflete depois do reload)
    const [approvedNow, setApprovedNow] = useState(false);
    const isApproved = approvedNow || initial.status === "approved_assisted";
    const isSaved = origin === "saved";

    const requireEdit = (msg: string) => {
        if (!canEdit) { toast.error(msg); return false; }
        return true;
    };

    // ── Insights: avaliações persistidas → Verdict + travas + última simulação ──
    const evaluations: Record<string, Verdict> = {};
    let criticalRejected = 0;
    let lastSimAt: string | null = null;
    for (const [k, r] of Object.entries(simResults)) {
        evaluations[k] = r.result === "needs_adjustment" ? "adjust" : r.result === "rejected" ? "rejected" : "approved";
        if (r.result === "rejected" && r.isCritical) criticalRejected++;
        if (r.evaluatedAt && (!lastSimAt || r.evaluatedAt > lastSimAt)) lastSimAt = r.evaluatedAt;
    }
    const approval = computeApproval({
        bp: initial,
        rulesText: existing.rules,
        openGapsCount: existing.gaps.length,
        evaluations,
        scenarioCount: 5,
        criticalRejected,
    });

    // ── Julgamento do Campo de Provas → eva_simulation_results (lab:*) ──
    const handleLabJudge = async (s: LabScenario, j: LabJudgment) => {
        if (!requireEdit("Apenas administradores avaliam a EVA.")) return;
        try {
            await saveSim({
                scenarioId: `lab:${s.id}`,
                scenarioTitle: `${s.persona} · ${s.tension}`,
                isCritical: false,
                result: j.action === "approve" ? "approved" : "needs_adjustment",
                feedback: j.action === "adjust" ? j.correctedText : null,
            });
        } catch (e) {
            toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`);
        }
    };

    if (!ready) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563EB" }} />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1400px]">
            {!canEdit && (
                <p className="text-[11.5px] px-6 pt-4" style={{ color: "#94A3B8" }}>
                    Modo leitura — apenas administradores editam a EVA.
                </p>
            )}
            <EvaStudioJourney
                initialStep={isApproved ? "ativar" : isSaved ? "ensinar" : "criar"}
                initialActivated={isApproved}
                initialTeachMode="conversa"
                // ── Criar ──
                purposes={[
                    { purpose: "vender", available: true },
                    { purpose: "suporte", available: false },
                    { purpose: "pos_venda", available: false },
                ]}
                sources={[
                    { key: "whatsapp", name: "Conversas do WhatsApp", detail: "O histórico real dos seus leads: o que pedem, como falam, onde travam.", available: true, stateLabel: "conectado" },
                    { key: "pipeline", name: "Pipeline e oportunidades", detail: "Etapas, valores e o que o seu time já registrou no CRM.", available: true, stateLabel: "disponível" },
                    { key: "docs", name: "Textos seus", detail: "Proposta, site, pitch: qualquer texto que você colar vira contexto.", available: false, stateLabel: "você cola depois" },
                ]}
                onCreate={async () => {
                    if (!requireEdit("Apenas administradores criam a EVA.")) return;
                    try { await save({ ...initial, status: "draft" }); toast.success("Agente criado. Agora me ensine o seu negócio."); }
                    catch (e) { toast.error(`Não consegui criar: ${String((e as Error)?.message ?? e)}`); }
                }}
                // ── Ensinar ──
                hasSourceMaterial={ctxBuilder.suggestions.length > 0}
                suggestions={ctxBuilder.suggestions}
                gaps={ctxBuilder.gaps}
                onResolve={async (s, r) => {
                    if (!requireEdit("Apenas administradores revisam o contexto.")) return;
                    try { await ctxBuilder.resolve(s, r); }
                    catch (e) { toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`); }
                }}
                onConfirmBatch={async (batch) => {
                    if (!requireEdit("Apenas administradores revisam o contexto.")) return;
                    try { await ctxBuilder.confirmBatch(batch); }
                    catch (e) { toast.error(`Não consegui confirmar: ${String((e as Error)?.message ?? e)}`); }
                }}
                onDefineGap={async (gap, answer) => {
                    if (!requireEdit("Apenas administradores revisam o contexto.")) return;
                    try { await ctxBuilder.defineGap(gap, answer); }
                    catch (e) { toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`); }
                }}
                onSubmitText={async (text) => {
                    if (!requireEdit("Apenas administradores revisam o contexto.")) return;
                    try { await ctxBuilder.submitText(text); toast.success("Texto enviado. Em segundos viram sugestões pra você revisar."); }
                    catch (e) { toast.error(`Não consegui processar: ${String((e as Error)?.message ?? e)}`); }
                }}
                // ── Provar ──
                hasReplays={replay.moments.length > 0}
                moments={replay.moments}
                replayInitialJudgments={replay.savedJudgments}
                onJudge={async (moment, judgment) => {
                    if (!requireEdit("Apenas administradores avaliam a EVA.")) return;
                    try { await replay.judge(moment, judgment); }
                    catch (e) { toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`); }
                }}
                onLabJudge={handleLabJudge}
                onRegenerateReplays={canEdit ? async () => {
                    try {
                        const { generated } = await replay.regenerate();
                        toast.success(generated > 0 ? `${generated} ${generated === 1 ? "momento encontrado" : "momentos encontrados"} nas suas conversas.` : "Nenhuma conversa nova com desfecho pra analisar ainda.");
                    } catch (e) { toast.error(`Não consegui gerar: ${String((e as Error)?.message ?? e)}`); }
                } : undefined}
                regeneratingReplays={replay.regenerating}
                // ── Ativar ──
                onActivate={async () => {
                    if (!requireEdit("Apenas administradores aprovam a EVA.")) return;
                    try { await approveAssisted(initial); setApprovedNow(true); toast.success("EVA aprovada para uso assistido. Ela já sugere no Inbox."); }
                    catch (e) { toast.error(`Não consegui aprovar: ${String((e as Error)?.message ?? e)}`); }
                }}
                // ── Vistas secundárias ──
                memoryContent={<EvaMemoryView memory={memory} loading={memoryLoading} />}
                insightsContent={<EvaInsightsTab hideHeader approval={approval} memory={memory} lastSimAt={lastSimAt} />}
            />

            {/* VYZON.AGENTS.2 (híbrido) — auto-criação de oportunidade. Só após
                a EVA estar aprovada; admin liga/desliga. Saída de mensagem segue
                sempre humana (aprovar-e-enviar), independente deste flag. */}
            {isApproved && (
                <HybridAutoCreateToggle
                    value={hybrid.autoCreate}
                    saving={hybrid.saving}
                    canEdit={canEdit}
                    onChange={async (v) => {
                        if (!requireEdit("Apenas administradores mudam o modo de criação.")) return;
                        try {
                            await hybrid.setAutoCreate(v);
                            toast.success(v
                                ? "Modo híbrido ligado: a EVA cria a oportunidade ao qualificar."
                                : "Modo híbrido desligado: criação volta a ser manual.");
                        } catch (e) {
                            toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`);
                        }
                    }}
                />
            )}
        </div>
    );
}

// ── Toggle do modo híbrido (auto-criação de oportunidade no pipeline) ─────────
function HybridAutoCreateToggle({
    value,
    saving,
    canEdit,
    onChange,
}: {
    value: boolean;
    saving: boolean;
    canEdit: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="px-6 pb-10">
            <div
                className="rounded-xl px-5 py-4 flex items-start gap-4"
                style={{ background: "#FFFFFF", border: "1px solid #E5EAF1" }}
            >
                <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold" style={{ color: "#0B1220" }}>
                        Criar oportunidade automaticamente (modo híbrido)
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: "#64748B", lineHeight: 1.55 }}>
                        Quando a EVA qualificar um lead que chegou e recomendar avançar, o card
                        entra no pipeline sozinho, com os campos preenchidos. Mensagens de saída
                        continuam sempre com a sua aprovação (aprovar-e-enviar).
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={value}
                    disabled={!canEdit || saving}
                    onClick={() => onChange(!value)}
                    className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
                    style={{ background: value ? "#2563EB" : "#CBD5E1" }}
                >
                    <span
                        className="inline-block h-5 w-5 rounded-full bg-white transition-transform"
                        style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
                    />
                </button>
            </div>
        </div>
    );
}
