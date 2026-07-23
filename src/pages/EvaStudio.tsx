// ─────────────────────────────────────────────────────────────────────────────
// EVA Studio (EVA.CANVAS.2 integrado, 2026-07-06) — a página tem DOIS estados:
//
//   1. Agente ainda não ativado → jornada (EvaStudioJourney): Criar → Ensinar →
//      Provar → Ativar. O first-run guiado continua igual.
//   2. Agente ativado (eva_blueprints.status = approved_assisted) → EvaCanvas:
//      o agente como mapa vivo de anatomia fixa (Escuta → Sabe → Regras →
//      Entrega). Cada bloco abre em modal o editor que já existia; o test-run
//      "Ver a EVA decidir" percorre os blocos com um momento REAL das conversas
//      e o julgamento grava (mesmo caminho do Provar).
//
// Dados reais (iguais nos dois estados):
//   Ensinar/Sabe → useEvaContextSuggestions (ponte pro eva_business_context)
//   Provar/Test-run → useEvaReplayMoments (momentos reais) + eva_simulation_results
//   Regras → useEvaMemory (regras aprendidas) + useHybridAutoCreate
//   Entrega → EvaAnalyticsPanel (edge eva-analytics-summary)
//   Ativar → approveAssisted (gateia a EVA no Inbox)
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
import { EvaCanvas } from "@/components/eva-studio/EvaCanvas";
import { EvaMemoryView } from "@/components/eva-studio/EvaMemoryTab";
import { EvaInsightsTab } from "@/components/eva-studio/EvaInsightsTab";
import { EvaAnalyticsPanel } from "@/components/eva-studio/EvaAnalyticsPanel";
import type { AgentSourceInfo } from "@/components/eva-studio/AgentPurposeCreate";
import type { LabJudgment, LabScenario } from "@/components/eva-studio/SimulationLab";

// Fontes que alimentam a EVA — compartilhadas pela jornada (Criar) e pelo
// canvas (bloco "O que ela escuta").
const SOURCES: AgentSourceInfo[] = [
    { key: "whatsapp", name: "Conversas do WhatsApp", detail: "O que os leads pedem, como falam e onde travam.", available: true, stateLabel: "conectado" },
    { key: "pipeline", name: "Pipeline", detail: "Etapas e o que o time já registrou nas oportunidades.", available: true, stateLabel: "disponível" },
    { key: "docs", name: "Textos seus", detail: "Site, proposta ou pitch que você colar depois.", available: false, stateLabel: "opcional" },
];

export default function EvaStudio() {
    const { isAdmin } = useAuth();
    const canEdit = !!isAdmin;
    const { ready, initial, existing, save, approveAssisted } = useEvaBlueprint();
    const { memory, loading: memoryLoading } = useEvaMemory();
    const { results: simResults, save: saveSim } = useEvaSimulationResults();
    const replay = useEvaReplayMoments();
    const ctxBuilder = useEvaContextSuggestions();
    const hybrid = useHybridAutoCreate();

    // Aprovação feita nesta sessão (o hook só reflete depois do reload)
    const [approvedNow, setApprovedNow] = useState(false);
    const isApproved = approvedNow || initial.status === "approved_assisted";

    const requireEdit = (msg: string) => {
        if (!canEdit) { toast.error(msg); return false; }
        return true;
    };

    // ── Prontidão: avaliações persistidas → Verdict + travas + última simulação ──
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

    // ── Escritas compartilhadas (jornada e canvas gravam nos mesmos lugares) ──
    const handleResolve = async (s: Parameters<typeof ctxBuilder.resolve>[0], r: Parameters<typeof ctxBuilder.resolve>[1]) => {
        if (!requireEdit("Apenas administradores revisam o contexto.")) return;
        try { await ctxBuilder.resolve(s, r); }
        catch (e) { toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`); }
    };
    const handleConfirmBatch = async (batch: Parameters<typeof ctxBuilder.confirmBatch>[0]) => {
        if (!requireEdit("Apenas administradores revisam o contexto.")) return;
        try { await ctxBuilder.confirmBatch(batch); }
        catch (e) { toast.error(`Não consegui confirmar: ${String((e as Error)?.message ?? e)}`); }
    };
    const handleDefineGap = async (gap: Parameters<typeof ctxBuilder.defineGap>[0], answer: string) => {
        if (!requireEdit("Apenas administradores revisam o contexto.")) return;
        try { await ctxBuilder.defineGap(gap, answer); }
        catch (e) { toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`); }
    };
    const handleSubmitText = async (text: string) => {
        if (!requireEdit("Apenas administradores revisam o contexto.")) return;
        try { await ctxBuilder.submitText(text); toast.success("Texto enviado. Em segundos viram sugestões pra você revisar."); }
        catch (e) { toast.error(`Não consegui processar: ${String((e as Error)?.message ?? e)}`); }
    };
    const handleJudge = async (moment: Parameters<typeof replay.judge>[0], judgment: Parameters<typeof replay.judge>[1]) => {
        if (!requireEdit("Apenas administradores avaliam a EVA.")) return;
        try { await replay.judge(moment, judgment); }
        catch (e) { toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`); }
    };
    const handleRegenerateReplays = canEdit ? async () => {
        try {
            const { generated } = await replay.regenerate();
            toast.success(generated > 0 ? `${generated} ${generated === 1 ? "momento encontrado" : "momentos encontrados"} nas suas conversas.` : "Nenhuma conversa nova com desfecho pra analisar ainda.");
        } catch (e) { toast.error(`Não consegui gerar: ${String((e as Error)?.message ?? e)}`); }
    } : undefined;
    const handleHybridChange = async (v: boolean) => {
        if (!requireEdit("Apenas administradores mudam o modo de criação.")) return;
        try {
            await hybrid.setAutoCreate(v);
            toast.success(v
                ? "Modo híbrido ligado: a EVA cria a oportunidade ao qualificar."
                : "Modo híbrido desligado: criação volta a ser manual.");
        } catch (e) {
            toast.error(`Não consegui salvar: ${String((e as Error)?.message ?? e)}`);
        }
    };

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

    // ── Agente ativo → canvas (o mapa vivo) ──
    if (isApproved) {
        return (
            <div className="w-full">
                {!canEdit && (
                    <p className="text-[11.5px] px-6 pt-4" style={{ color: "#94A3B8" }}>
                        Modo leitura — apenas administradores editam a EVA.
                    </p>
                )}
                <EvaCanvas
                    canEdit={canEdit}
                    approval={approval}
                    sources={SOURCES}
                    memory={memory}
                    memoryLoading={memoryLoading}
                    hasSourceMaterial={ctxBuilder.suggestions.length > 0}
                    suggestions={ctxBuilder.suggestions}
                    gaps={ctxBuilder.gaps}
                    onResolve={handleResolve}
                    onConfirmBatch={handleConfirmBatch}
                    onDefineGap={handleDefineGap}
                    onSubmitText={handleSubmitText}
                    hybridOn={hybrid.autoCreate}
                    hybridSaving={hybrid.saving}
                    onHybridChange={handleHybridChange}
                    moments={replay.moments}
                    savedJudgments={replay.savedJudgments}
                    onJudge={handleJudge}
                    onRegenerateReplays={handleRegenerateReplays}
                    regeneratingReplays={replay.regenerating}
                    insightsContent={<EvaInsightsTab hideHeader approval={approval} memory={memory} lastSimAt={lastSimAt} />}
                />
            </div>
        );
    }

    // ── First-run → jornada Criar → Ensinar → Provar → Ativar ──
    return (
        <div className="mx-auto w-full max-w-[1400px]">
            {!canEdit && (
                <p className="text-[11.5px] px-6 pt-4" style={{ color: "#94A3B8" }}>
                    Modo leitura — apenas administradores editam a EVA.
                </p>
            )}
            <EvaStudioJourney
                initialStep="criar"
                initialActivated={false}
                initialTeachMode="conversa"
                purposes={[
                    { purpose: "vender", available: true },
                    { purpose: "suporte", available: false },
                    { purpose: "pos_venda", available: false },
                ]}
                sources={SOURCES}
                onCreate={async () => {
                    if (!requireEdit("Apenas administradores criam a EVA.")) return;
                    try { await save({ ...initial, status: "draft" }); toast.success("Agente criado. Agora me ensine o seu negócio."); }
                    catch (e) { toast.error(`Não consegui criar: ${String((e as Error)?.message ?? e)}`); }
                }}
                hasSourceMaterial={ctxBuilder.suggestions.length > 0}
                suggestions={ctxBuilder.suggestions}
                gaps={ctxBuilder.gaps}
                onResolve={handleResolve}
                onConfirmBatch={handleConfirmBatch}
                onDefineGap={handleDefineGap}
                onSubmitText={handleSubmitText}
                hasReplays={replay.moments.length > 0}
                moments={replay.moments}
                replayInitialJudgments={replay.savedJudgments}
                onJudge={handleJudge}
                onLabJudge={handleLabJudge}
                onRegenerateReplays={handleRegenerateReplays}
                regeneratingReplays={replay.regenerating}
                onActivate={async () => {
                    if (!requireEdit("Apenas administradores aprovam a EVA.")) return;
                    try { await approveAssisted(initial); setApprovedNow(true); toast.success("EVA aprovada para uso assistido. Ela já sugere no Inbox."); }
                    catch (e) { toast.error(`Não consegui aprovar: ${String((e as Error)?.message ?? e)}`); }
                }}
                memoryContent={<EvaMemoryView memory={memory} loading={memoryLoading} />}
                insightsContent={<EvaInsightsTab hideHeader approval={approval} memory={memory} lastSimAt={lastSimAt} />}
                analyticsContent={<EvaAnalyticsPanel />}
            />
        </div>
    );
}
