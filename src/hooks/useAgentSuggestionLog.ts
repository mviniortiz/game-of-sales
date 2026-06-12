// VYZON.AGENTS.2 — Log de sugestões dos agentes (auditoria + aprendizado).
//
// Registra em public.agent_suggestions toda sugestão e seu desfecho. É a base
// de auditoria do "a EVA sugere, seu time aprova": quem recebeu, o que a EVA
// propôs, o que o humano fez (aceitou/ajustou/rejeitou/enviou) e o que de fato
// foi aplicado. RLS por empresa (qualquer membro registra o desfecho que revisou).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AgentSuggestionKind =
  | "qualification"
  | "outbound_message"
  | "followup"
  | "objection"
  | "proposal";

export type AgentSuggestionStatus =
  | "pending"
  | "accepted"
  | "adjusted"
  | "rejected"
  | "expired"
  | "sent";

export interface RecordSuggestionInput {
  agentKey?: string;
  kind: AgentSuggestionKind;
  conversationId?: string | null;
  dealId?: string | null;
  inputSummary?: Record<string, unknown>;
  suggestion: Record<string, unknown>;
  status?: AgentSuggestionStatus;
  appliedPayload?: Record<string, unknown> | null;
  feedback?: string | null;
}

export interface ResolveSuggestionInput {
  id: string;
  status: AgentSuggestionStatus;
  appliedPayload?: Record<string, unknown> | null;
  feedback?: string | null;
}

export function useAgentSuggestionLog() {
  const { companyId, user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["agent-suggestions", companyId] });

  // Registra uma sugestão (e opcionalmente já o desfecho). Retorna o id criado.
  const record = useMutation({
    mutationFn: async (input: RecordSuggestionInput): Promise<string> => {
      if (!companyId) throw new Error("Empresa não identificada");
      const now = new Date().toISOString();
      const resolved = input.status && input.status !== "pending";
      const row = {
        company_id: companyId,
        agent_key: input.agentKey ?? "qualifier",
        kind: input.kind,
        conversation_id: input.conversationId ?? null,
        deal_id: input.dealId ?? null,
        input_summary: input.inputSummary ?? {},
        suggestion: input.suggestion ?? {},
        status: input.status ?? "pending",
        applied_payload: input.appliedPayload ?? null,
        feedback: input.feedback ?? null,
        created_by: user?.id ?? null,
        resolved_by: resolved ? user?.id ?? null : null,
        resolved_at: resolved ? now : null,
      };
      const { data, error } = await supabase
        .from("agent_suggestions" as never)
        .insert(row as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: invalidate,
  });

  // Atualiza o desfecho de uma sugestão já existente (pending → accepted, etc.).
  const resolve = useMutation({
    mutationFn: async (input: ResolveSuggestionInput): Promise<void> => {
      const patch: Record<string, unknown> = {
        status: input.status,
        resolved_by: user?.id ?? null,
        resolved_at: new Date().toISOString(),
      };
      if (input.appliedPayload !== undefined) patch.applied_payload = input.appliedPayload;
      if (input.feedback !== undefined) patch.feedback = input.feedback;
      const { error } = await supabase
        .from("agent_suggestions" as never)
        .update(patch as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    record: (input: RecordSuggestionInput) => record.mutateAsync(input),
    resolve: (input: ResolveSuggestionInput) => resolve.mutateAsync(input),
    recording: record.isPending,
    resolving: resolve.isPending,
  };
}
