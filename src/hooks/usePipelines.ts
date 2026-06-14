// Camada de dados dos funis (pipelines) — substitui o antigo localStorage de
// estágios. Pipelines e estágios são por company (compartilhados pelo time).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import type { StageConfig, StageKind, LegacyStageKey } from "@/lib/pipelineStyles";

export interface Pipeline {
  id: string;
  company_id: string;
  name: string;
  position: number;
  is_default: boolean;
  is_archived: boolean;
}

// Linha crua de pipeline_stages no banco.
interface StageRow {
  id: string;
  pipeline_id: string;
  company_id: string;
  title: string;
  kind: StageKind;
  icon_id: string;
  color_id: string;
  position: number;
  default_probability: number | null;
  legacy_key: LegacyStageKey | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isPersisted = (id: string) => UUID_RE.test(id);

const rowToConfig = (r: StageRow): StageConfig => ({
  id: r.id,
  title: r.title,
  iconId: r.icon_id,
  colorId: r.color_id,
  kind: r.kind,
  defaultProbability: r.default_probability ?? undefined,
  legacyKey: r.legacy_key,
});

// Estágios padrão para um funil novo (espelham os 6 do enum legado).
export const DEFAULT_STAGE_CONFIGS: StageConfig[] = [
  { id: "seed_lead", title: "Lead", iconId: "target", colorId: "gray", kind: "open", defaultProbability: 10, legacyKey: "lead" },
  { id: "seed_qualification", title: "Qualificação", iconId: "users", colorId: "blue", kind: "open", defaultProbability: 25, legacyKey: "qualification" },
  { id: "seed_proposal", title: "Proposta", iconId: "dollar", colorId: "indigo", kind: "open", defaultProbability: 55, legacyKey: "proposal" },
  { id: "seed_negotiation", title: "Negociação", iconId: "trending", colorId: "amber", kind: "open", defaultProbability: 80, legacyKey: "negotiation" },
  { id: "seed_won", title: "Ganho", iconId: "check", colorId: "emerald", kind: "won", defaultProbability: 100, legacyKey: "closed_won" },
  { id: "seed_lost", title: "Perdido", iconId: "target", colorId: "gray", kind: "lost", defaultProbability: 0, legacyKey: "closed_lost" },
];

// ── Queries ──────────────────────────────────────────────────────────────────

export function usePipelines(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["pipelines", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Pipeline[]> => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("id, company_id, name, position, is_default, is_archived")
        .eq("company_id", companyId)
        .eq("is_archived", false)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pipeline[];
    },
  });
}

export function usePipelineStages(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ["pipeline-stages", pipelineId],
    enabled: !!pipelineId,
    queryFn: async (): Promise<StageConfig[]> => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, pipeline_id, company_id, title, kind, icon_id, color_id, position, default_probability, legacy_key")
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as StageRow[]).map(rowToConfig);
    },
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

// Reconcilia a lista de estágios de um funil: deleta os removidos e faz upsert
// dos demais com position = índice. Estágios novos (id não-UUID) são inseridos.
async function persistStages(pipelineId: string, companyId: string, stages: StageConfig[]) {
  const { data: existing, error: exErr } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipelineId);
  if (exErr) throw exErr;

  const incomingIds = new Set(stages.filter((s) => isPersisted(s.id)).map((s) => s.id));
  const toDelete = (existing ?? [])
    .map((r) => r.id as string)
    .filter((id) => !incomingIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase.from("pipeline_stages").delete().in("id", toDelete);
    if (error) throw error;
  }

  const rows = stages.map((s, i) => ({
    ...(isPersisted(s.id) ? { id: s.id } : {}),
    pipeline_id: pipelineId,
    company_id: companyId,
    title: s.title.trim(),
    kind: s.kind,
    icon_id: s.iconId,
    color_id: s.colorId,
    position: i,
    default_probability: s.defaultProbability ?? 50,
    legacy_key: s.legacyKey ?? null,
  }));

  const { error } = await supabase.from("pipeline_stages").upsert(rows);
  if (error) throw error;
}

// Cria um funil novo com seus estágios.
export function useCreatePipeline(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; stages: StageConfig[]; makeDefault?: boolean }) => {
      if (!companyId) throw new Error("Sem company para criar o funil");

      const { count } = await supabase
        .from("pipelines")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      const { data: created, error } = await supabase
        .from("pipelines")
        .insert({ company_id: companyId, name: input.name.trim(), position: count ?? 0, is_default: false })
        .select("id")
        .single();
      if (error) throw error;

      const pipelineId = created.id as string;
      await persistStages(pipelineId, companyId, input.stages);

      if (input.makeDefault) {
        await supabase.from("pipelines").update({ is_default: false }).eq("company_id", companyId);
        await supabase.from("pipelines").update({ is_default: true }).eq("id", pipelineId);
      }
      return pipelineId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines", companyId] });
    },
    onError: (e) => logger.error("useCreatePipeline", e),
  });
}

// Atualiza nome do funil e/ou seus estágios.
export function useUpdatePipeline(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pipelineId: string; name?: string; stages?: StageConfig[] }) => {
      if (!companyId) throw new Error("Sem company");
      if (typeof input.name === "string") {
        const { error } = await supabase
          .from("pipelines")
          .update({ name: input.name.trim() })
          .eq("id", input.pipelineId);
        if (error) throw error;
      }
      if (input.stages) {
        await persistStages(input.pipelineId, companyId, input.stages);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pipelines", companyId] });
      qc.invalidateQueries({ queryKey: ["pipeline-stages", vars.pipelineId] });
    },
    onError: (e) => logger.error("useUpdatePipeline", e),
  });
}

// Define qual funil é o default (zera o antigo antes para não violar o índice único).
export function useSetDefaultPipeline(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pipelineId: string) => {
      if (!companyId) throw new Error("Sem company");
      await supabase.from("pipelines").update({ is_default: false }).eq("company_id", companyId);
      const { error } = await supabase.from("pipelines").update({ is_default: true }).eq("id", pipelineId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipelines", companyId] }),
    onError: (e) => logger.error("useSetDefaultPipeline", e),
  });
}

// Arquiva (soft-delete) um funil. Não permite arquivar o default.
export function useArchivePipeline(companyId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pipelineId: string) => {
      const { error } = await supabase
        .from("pipelines")
        .update({ is_archived: true })
        .eq("id", pipelineId)
        .eq("is_default", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipelines", companyId] }),
    onError: (e) => logger.error("useArchivePipeline", e),
  });
}

// Quantos deals existem por estágio de um funil — para bloquear exclusão de
// estágios com negócios (evita órfãos via ON DELETE SET NULL).
export function useStageDealCounts(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ["pipeline-stage-deal-counts", pipelineId],
    enabled: !!pipelineId,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("deals")
        .select("stage_id")
        .eq("pipeline_id", pipelineId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { stage_id: string | null }[]) {
        if (row.stage_id) counts[row.stage_id] = (counts[row.stage_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}
