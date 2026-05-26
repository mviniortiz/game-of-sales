// ─────────────────────────────────────────────────────────────────────────────
// F4I (2026-05-19) — Hooks de dados reais da Central da Operação
//
// 3 queries pequenas, todas scoped por company_id, somente leitura:
//   - usePipelineStages: GROUP BY stage de public.deals (count + sum value)
//   - useLeadsHoje:      count deals criados hoje em stage lead/qualification
//   - useAgendaHoje:     agendamentos de hoje (lista) + count da semana atual
//
// Cards ainda mockados (Inbox conversations, Performance ranking, KPIs
// "Tempo médio de resposta" e "Qualificados pela EVA") seguem com placeholder
// marcado MOCK_F4I no Inicio.tsx — documentado nas pendências F4I v2.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

// ───── Pipeline ──────────────────────────────────────────────────────────────

// Stages que aparecem na Central. Ordem importa (esquerda → direita).
export const PIPELINE_STAGE_KEYS = [
  "lead",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGE_KEYS)[number];

export interface PipelineStageData {
  key: PipelineStageKey;
  name: string;
  color: string;
  count: number;
  totalValue: number;
}

const STAGE_META: Record<PipelineStageKey, { name: string; color: string }> = {
  lead: { name: "Novo lead", color: "#94A3B8" },
  qualification: { name: "Qualificação", color: "#2563EB" },
  proposal: { name: "Proposta", color: "#1D4ED8" },
  negotiation: { name: "Negociação", color: "#7C3AED" },
  closed_won: { name: "Ganho", color: "#10B981" },
};

export function usePipelineStages() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;

  const query = useQuery({
    queryKey: ["inicio", "pipeline-stages", effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    staleTime: 30_000,
    queryFn: async (): Promise<PipelineStageData[]> => {
      const { data, error } = await supabase
        .from("deals")
        .select("stage, value")
        .eq("company_id", effectiveCompanyId!);
      if (error) throw error;

      const init = Object.fromEntries(
        PIPELINE_STAGE_KEYS.map((k) => [k, { count: 0, total: 0 }]),
      ) as Record<PipelineStageKey, { count: number; total: number }>;

      for (const row of data || []) {
        const stage = (row as { stage: string }).stage as PipelineStageKey;
        if (!(stage in init)) continue;
        init[stage].count += 1;
        const v = (row as { value: number | null }).value;
        if (typeof v === "number") init[stage].total += v;
      }

      return PIPELINE_STAGE_KEYS.map((key) => ({
        key,
        name: STAGE_META[key].name,
        color: STAGE_META[key].color,
        count: init[key].count,
        totalValue: init[key].total,
      }));
    },
  });

  return query;
}

// ───── Leads hoje ────────────────────────────────────────────────────────────

export function useLeadsHoje() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;

  return useQuery({
    queryKey: ["inicio", "leads-hoje", effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    staleTime: 30_000,
    queryFn: async (): Promise<number> => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", effectiveCompanyId!)
        .gte("created_at", start.toISOString())
        .in("stage", ["lead", "qualification"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// ───── Agenda + Demos da semana ──────────────────────────────────────────────

export interface AgendaItem {
  id: string;
  time: string; // HH:mm
  title: string;
  subtitle: string;
  dataIso: string; // ISO completo, p/ ordenar/comparar
}

export interface AgendaResult {
  items: AgendaItem[];
  countHoje: number;
  countSemana: number;
}

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // Domingo = 0, Segunda = 1, ... — alinha pra segunda
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

export function useAgendaHoje() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;

  return useQuery({
    queryKey: ["inicio", "agenda-hoje", effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    staleTime: 30_000,
    queryFn: async (): Promise<AgendaResult> => {
      const now = new Date();
      const startSemana = startOfWeekMonday(now);
      const endSemana = new Date(startSemana);
      endSemana.setDate(endSemana.getDate() + 7);

      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, cliente_nome, data_agendamento, observacoes")
        .eq("company_id", effectiveCompanyId!)
        .gte("data_agendamento", startSemana.toISOString())
        .lt("data_agendamento", endSemana.toISOString())
        .order("data_agendamento", { ascending: true });
      if (error) throw error;

      const rows = (data || []) as Array<{
        id: string;
        cliente_nome: string | null;
        data_agendamento: string;
        observacoes: string | null;
      }>;

      const startHoje = new Date(now);
      startHoje.setHours(0, 0, 0, 0);
      const endHoje = new Date(startHoje);
      endHoje.setDate(endHoje.getDate() + 1);

      let countHoje = 0;
      const items: AgendaItem[] = [];
      for (const r of rows) {
        const dt = new Date(r.data_agendamento);
        const isHoje = dt >= startHoje && dt < endHoje;
        if (isHoje) {
          countHoje += 1;
          if (items.length < 6) {
            items.push({
              id: r.id,
              time: dt.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              title: r.cliente_nome?.trim() || "Reunião",
              subtitle: r.observacoes?.trim() || "",
              dataIso: r.data_agendamento,
            });
          }
        }
      }

      return {
        items,
        countHoje,
        countSemana: rows.length,
      };
    },
  });
}

// ───── Helper combinado: estado de loading geral ────────────────────────────

export function useInicioData() {
  const pipeline = usePipelineStages();
  const leadsHoje = useLeadsHoje();
  const agenda = useAgendaHoje();

  const totalPipeline = useMemo(
    () =>
      (pipeline.data || []).reduce((acc, s) => acc + s.count, 0),
    [pipeline.data],
  );

  return {
    pipeline,
    leadsHoje,
    agenda,
    totalPipeline,
    isAnyLoading: pipeline.isLoading || leadsHoje.isLoading || agenda.isLoading,
  };
}
