// ─────────────────────────────────────────────────────────────────────────────
// EVA.STUDIO.F3 (2026-06-09) — useEvaReplayMoments
//
// Liga o GuidedSimulationReplay aos dados reais:
//   - lê eva_replay_moments (momentos pré-computados pela edge)
//   - lê o julgamento já salvo (reusa eva_simulation_results; scenario_id = id
//     do momento) pra semear o termômetro ao reabrir
//   - grava o julgamento: approve→approved, adjust→needs_adjustment (+ delta de
//     aprendizado em eva_suggestion_feedback, mesmo loop do Inbox), redline→rejected
//   - dispara a geração (edge generate-eva-replay-moments)
//
// "as any" nas tabelas fora dos types gerados é o padrão do projeto
// (useEvaSimulationResults, recordSuggestionFeedback).
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { recordSuggestionFeedback } from "@/lib/eva/suggestionFeedback";
import type {
    MomentJudgment,
    ReplayMoment,
} from "@/components/eva-studio/GuidedSimulationReplay";

type JudgeAction = MomentJudgment["action"];

// Julgamento ⇄ result da tabela eva_simulation_results (schema existente)
const ACTION_TO_RESULT: Record<Exclude<JudgeAction, "skip">, string> = {
    approve: "approved",
    adjust: "needs_adjustment",
    redline: "rejected",
};
const RESULT_TO_ACTION: Record<string, JudgeAction> = {
    approved: "approve",
    needs_adjustment: "adjust",
    rejected: "redline",
};

interface ReplayRow {
    id: string;
    conversation_id: string | null;
    lead_name: string;
    tension: string;
    critical: boolean;
    outcome: ReplayMoment["outcome"];
    outcome_detail: string;
    context: string;
    lead_message: string;
    eva_reply: string;
    seller_reply: string | null;
}

function mapRowToMoment(r: ReplayRow): ReplayMoment {
    return {
        id: r.id,
        conversationId: r.conversation_id ?? null,
        leadName: r.lead_name,
        tension: r.tension,
        critical: !!r.critical,
        outcome: r.outcome,
        outcomeDetail: r.outcome_detail,
        context: r.context,
        leadMessage: r.lead_message,
        evaReply: r.eva_reply,
        sellerReply: r.seller_reply ?? undefined,
    };
}

export function useEvaReplayMoments() {
    const { companyId, user } = useAuth();
    const qc = useQueryClient();

    // Momentos gerados — críticos primeiro, depois mais recentes
    const momentsQ = useQuery({
        queryKey: ["eva-replay-moments", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<ReplayMoment[]> => {
            const { data, error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_replay_moments" as any)
                .select("*")
                .eq("company_id", companyId)
                .order("critical", { ascending: false })
                .order("generated_at", { ascending: false });
            if (error || !data) return [];
            return (data as unknown as ReplayRow[]).map(mapRowToMoment);
        },
    });

    // Julgamentos já persistidos (semeiam o termômetro)
    const judgmentsQ = useQuery({
        queryKey: ["eva-replay-judgments", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<Record<string, JudgeAction>> => {
            const { data, error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_simulation_results" as any)
                .select("scenario_id, result")
                .eq("company_id", companyId);
            if (error || !data) return {};
            const map: Record<string, JudgeAction> = {};
            for (const r of data as unknown as { scenario_id: string; result: string }[]) {
                const a = RESULT_TO_ACTION[r.result];
                if (a) map[r.scenario_id] = a;
            }
            return map;
        },
    });

    // Grava o julgamento de um momento
    const judge = useMutation({
        mutationFn: async ({
            moment,
            judgment,
        }: {
            moment: ReplayMoment;
            judgment: MomentJudgment;
        }) => {
            if (!companyId) throw new Error("Empresa não identificada");
            if (judgment.action === "skip") return; // pular não persiste

            const result = ACTION_TO_RESULT[judgment.action];
            const feedback =
                judgment.action === "adjust" ? judgment.correctedText : null;

            const { error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_simulation_results" as any)
                .upsert(
                    {
                        company_id: companyId,
                        scenario_id: moment.id,
                        scenario_title: `${moment.leadName} · ${moment.tension}`,
                        result,
                        feedback,
                        is_critical: !!moment.critical,
                        evaluated_by: user?.id ?? null,
                        evaluated_at: new Date().toISOString(),
                    },
                    { onConflict: "company_id,scenario_id" },
                );
            if (error) throw error;

            // Correção fecha o loop de aprendizado real (mesmo sinal do Inbox).
            if (judgment.action === "adjust") {
                await recordSuggestionFeedback({
                    companyId,
                    conversationId: moment.conversationId ?? null,
                    outcome: judgment.outcome,
                });
            }
        },
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["eva-replay-judgments", companyId] }),
    });

    // Dispara a geração de momentos a partir das conversas reais
    const generate = useMutation({
        mutationFn: async (): Promise<{ generated: number }> => {
            const { data, error } = await supabase.functions.invoke(
                "generate-eva-replay-moments",
                { body: {} },
            );
            if (error) throw error;
            return { generated: (data as { generated?: number } | null)?.generated ?? 0 };
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["eva-replay-moments", companyId] });
            qc.invalidateQueries({ queryKey: ["eva-replay-judgments", companyId] });
        },
    });

    return {
        moments: momentsQ.data ?? [],
        savedJudgments: judgmentsQ.data ?? {},
        loading: momentsQ.isLoading || judgmentsQ.isLoading,
        judge: (moment: ReplayMoment, judgment: MomentJudgment) =>
            judge.mutateAsync({ moment, judgment }),
        regenerate: () => generate.mutateAsync(),
        regenerating: generate.isPending,
    };
}
