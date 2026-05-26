// ─────────────────────────────────────────────────────────────────────────────
// F4E.4.5 (2026-05-21) — useEvaInsight (cost-guarded)
//
// MUDANÇA DE COMPORTAMENTO:
//   - ANTES: ao abrir conversa, useQuery chamava whatsapp-copilot automaticamente.
//   - AGORA: ao abrir conversa, lê conversation_summaries direto (sem IA).
//            Análise IA só roda quando o usuário clica "Analisar"/"Reanalisar".
//
// Camadas:
//   - savedQuery: SELECT conversation_summaries + eva_business_context.version
//     (rápido, sem custo de OpenAI). Hidrata a UI com a última análise salva.
//   - analyzeMutation: chama supabase.functions.invoke("whatsapp-copilot")
//     com `force: boolean`. Único caminho de cost gasto.
//
// Stale detection:
//   - isStaleByMessages: lastMessageTs > analyzed_at
//   - isStaleByContext:  saved.context_version_used < currentContextVersion
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import type { MessageLine } from "@/hooks/useEvolutionAPI";
import {
  parseQualification,
  emptyQualification,
  type Qualification,
} from "@/lib/eva/qualificationSchema";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface EvaInsightAnalysis {
  sentiment?: string | null;
  temperature?: "quente" | "morno" | "frio" | null;
  stage?: string | null;
  strategy?: string[];
  draft?: string | null;
  objections?: string[];
  nextAction?: string | null;
  qualification?: unknown;
  context_version_used?: number;
  context_present?: boolean;
}

export interface EvaInsightResult {
  analysis: EvaInsightAnalysis;
  qualification: Qualification;
  cached: boolean;
  cachedAt: string | null;
  model: string;
  remaining: number | null;
  dailyLimit: number | null;
  legacy: boolean;
}

interface SavedAnalysisRow {
  cached_analysis: Record<string, unknown> | null;
  qualification: Record<string, unknown> | null;
  analyzed_at: string | null;
}

interface UseEvaInsightArgs {
  chatPhone: string | null | undefined;
  contactName?: string | null;
  messages: MessageLine[];
  enabled?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function phoneVariants(chatPhone: string): string[] {
  const noPlus = chatPhone.replace(/^\+/, "");
  // Dedup com Set; ordem não importa pra .in()
  return Array.from(new Set([chatPhone, noPlus, `+${noPlus}`]));
}

function hydrateFromSaved(saved: SavedAnalysisRow | null): EvaInsightResult | null {
  if (!saved) return null;
  const analysis = (saved.cached_analysis as EvaInsightAnalysis | null) || {};
  const hasQualification = !!saved.qualification;
  const qualification: Qualification = hasQualification
    ? parseQualification(saved.qualification)
    : emptyQualification();
  return {
    analysis,
    qualification,
    cached: true,
    cachedAt: saved.analyzed_at,
    model: "cached",
    remaining: null,
    dailyLimit: null,
    legacy: !hasQualification,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useEvaInsight({
  chatPhone,
  contactName,
  messages,
  enabled = true,
}: UseEvaInsightArgs) {
  const qc = useQueryClient();
  const normalizedChatPhone = chatPhone || null;
  const { companyId: authCompanyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || authCompanyId || null;

  // ── A) Leitura da análise salva (sem IA) ────────────────────────────────
  const savedQuery = useQuery({
    queryKey: ["eva-saved-analysis", normalizedChatPhone, effectiveCompanyId],
    enabled: enabled && !!normalizedChatPhone,
    staleTime: 30_000,
    queryFn: async () => {
      if (!normalizedChatPhone) {
        return { saved: null, currentContextVersion: null as number | null };
      }
      const phones = phoneVariants(normalizedChatPhone);
      // F4E.4.5.1 — context_version_used vive DENTRO de cached_analysis (JSONB),
      // não é coluna nativa. Não tentar select como coluna.
      const { data: savedRows, error: e1 } = await supabase
        .from("conversation_summaries")
        .select("cached_analysis, qualification, analyzed_at")
        .in("chat_phone", phones)
        .order("analyzed_at", { ascending: false })
        .limit(1);
      if (e1) throw e1;
      const saved = (savedRows?.[0] as SavedAnalysisRow | undefined) ?? null;

      // V1.0 — Versão do contexto da COMPANY ATIVA (scoped). Antes do fix,
      // super_admin via "stale by context" falso quando trocava de tenant
      // porque o SELECT sem filter pegava o updated_at mais recente de
      // qualquer company.
      let currentContextVersion: number | null = null;
      if (effectiveCompanyId) {
        try {
          const { data: ctx } = await supabase
            .from("eva_business_context")
            .select("version")
            .eq("company_id", effectiveCompanyId)
            .maybeSingle();
          currentContextVersion = (ctx?.version as number | null) ?? null;
        } catch {
          // ignora; isStaleByContext fica false
        }
      }

      return { saved, currentContextVersion };
    },
  });

  // ── B) Análise IA via mutation (manual) ─────────────────────────────────
  const analyzeMutation = useMutation<
    EvaInsightResult,
    Error,
    { force: boolean }
  >({
    mutationFn: async ({ force }) => {
      if (!normalizedChatPhone) throw new Error("missing_chat_phone");
      if (messages.length === 0) throw new Error("missing_messages");

      const payload: Record<string, unknown> = {
        messages: messages.slice(-30).map((m) => ({
          text: m.text,
          sender: m.sender,
        })),
        contactName: contactName ?? undefined,
        contactPhone: normalizedChatPhone,
        force,
      };

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        analysis: EvaInsightAnalysis;
        model: string;
        cached?: boolean;
        cachedAt?: string;
        remaining?: number;
        dailyLimit?: number;
      }>("whatsapp-copilot", { body: payload });

      if (error) throw new Error(error.message || "Falha ao chamar EVA");
      if (!data?.success || !data.analysis) throw new Error("Resposta inválida da EVA");

      const analysis = data.analysis;
      const hasQualification =
        analysis.qualification !== undefined && analysis.qualification !== null;
      const qualification: Qualification = hasQualification
        ? parseQualification(analysis.qualification)
        : emptyQualification();

      return {
        analysis,
        qualification,
        cached: data.cached ?? false,
        cachedAt: data.cachedAt ?? null,
        model: data.model ?? "unknown",
        remaining: data.remaining ?? null,
        dailyLimit: data.dailyLimit ?? null,
        legacy: !hasQualification,
      };
    },
    onSuccess: () => {
      // Após análise nova, recarrega a saved query pra refletir
      // analyzed_at / context_version_used atualizado.
      if (normalizedChatPhone) {
        void qc.invalidateQueries({
          queryKey: ["eva-saved-analysis", normalizedChatPhone],
        });
      }
    },
  });

  // ── Derived state ───────────────────────────────────────────────────────
  const saved = savedQuery.data?.saved ?? null;
  const currentContextVersion = savedQuery.data?.currentContextVersion ?? null;

  const hydratedResult = useMemo(() => hydrateFromSaved(saved), [saved]);

  // Mutation result tem prioridade (acabou de rodar) sobre o hydrated.
  const result: EvaInsightResult | null =
    analyzeMutation.data ?? hydratedResult;

  const hasAnalysis = !!saved && (!!saved.qualification || !!saved.cached_analysis);
  const lastAnalyzedAt: Date | null = saved?.analyzed_at
    ? new Date(saved.analyzed_at)
    : null;

  // Stale by messages: mensagem nova depois de analyzed_at
  const lastMsg = messages[messages.length - 1];
  const lastMsgMs = lastMsg ? lastMsg.timestamp * 1000 : null;
  const isStaleByMessages =
    hasAnalysis && !!lastAnalyzedAt && !!lastMsgMs &&
    lastMsgMs > lastAnalyzedAt.getTime();

  // Stale by context: versão do contexto avançou.
  // F4E.4.5.1 — context_version_used vive dentro de cached_analysis JSONB.
  const usedCtxVersion =
    typeof (saved?.cached_analysis as Record<string, unknown> | null)?.context_version_used === "number"
      ? ((saved?.cached_analysis as Record<string, unknown>).context_version_used as number)
      : null;
  const isStaleByContext =
    hasAnalysis &&
    typeof usedCtxVersion === "number" &&
    typeof currentContextVersion === "number" &&
    usedCtxVersion < currentContextVersion;

  // Conta mensagens recebidas após a análise
  const newMessagesCount = lastAnalyzedAt
    ? messages.filter((m) => m.timestamp * 1000 > lastAnalyzedAt.getTime()).length
    : 0;

  return {
    /** Resultado pronto pra UI: mutation > saved > null */
    data: result,
    /** True enquanto a leitura inicial de conversation_summaries roda */
    loading: savedQuery.isLoading,
    /** True enquanto whatsapp-copilot está rodando (mutation) */
    analyzing: analyzeMutation.isPending,
    /** Erro: prioriza mutation pra UI mostrar o que o user disparou */
    error: (analyzeMutation.error as Error | null) ?? (savedQuery.error as Error | null) ?? null,
    hasAnalysis,
    isStaleByMessages,
    isStaleByContext,
    lastAnalyzedAt,
    newMessagesCount,
    /** Análise inicial: NÃO força (pode pegar cache válido do backend) */
    analyze: () => analyzeMutation.mutate({ force: false }),
    /** Reanálise: força nova IA mesmo se cache existir */
    reanalyze: () => analyzeMutation.mutate({ force: true }),
    /** Recarrega só a leitura salva (sem custo de IA) */
    refetchSavedAnalysis: () => savedQuery.refetch(),
    /** Reset do erro de mutation pra retry limpo */
    clearAnalyzeError: () => analyzeMutation.reset(),
  };
}
