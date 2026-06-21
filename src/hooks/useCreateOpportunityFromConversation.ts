// VYZON.AGENTS.2 (híbrido) — Criação de oportunidade a partir de uma conversa.
//
// Espelha EXATAMENTE o insert comprovado do NovaOportunidadeModal (deals +
// vínculo channel_conversations.deal_id), mas como hook reutilizável e SEM UI,
// para o caminho híbrido: a EVA cria o card no pipeline ao recomendar
// (deve_criar_oportunidade) num lead inbound. O modal manual segue intocado
// (zero regressão). NÃO envia nenhuma mensagem — só cria/atualiza o card.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreateOpportunityInput {
  customerName: string;
  title: string;
  /** 'lead' (triagem) ou 'qualification' (interesse confirmado pela EVA) */
  stage?: "lead" | "qualification";
  phone?: string | null;
  email?: string | null;
  leadSource?: string | null;
  notes?: string | null;
  value?: number | null;
  /** Vincula a conversa da Inbox ao deal criado (não sobrescreve vínculo). */
  conversationId?: string | null;
}

// Analytics da EVA — Fase 2. Dada uma conversa, acha a sugestão mais recente da
// EVA (pending ou accepted) para atribuir o deal a ela. Se a sugestão ainda
// estava pending, marca accepted (o humano materializou a sugestão num card).
// Best-effort: se a coluna/tabela não existir ou falhar, devolve null e o fluxo
// de criação de deal segue intacto (vínculo apenas não é gravado).
export async function resolveAgentSuggestionForConversation(
  conversationId: string,
  userId: string | null,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("agent_suggestions" as never)
      .select("id, status")
      .eq("conversation_id", conversationId)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { id: string; status: string };

    // Resolve a sugestão pendente: criar o card é o "aprovar" desta sugestão.
    if (row.status === "pending") {
      const { error: upErr } = await supabase
        .from("agent_suggestions" as never)
        .update({
          status: "accepted",
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        } as never)
        .eq("id", row.id);
      if (upErr) console.error("[fase2] resolver sugestão pending→accepted falhou (não fatal):", upErr);
    }
    return row.id;
  } catch (e) {
    console.error("[fase2] busca de agent_suggestion da conversa falhou (não fatal):", e);
    return null;
  }
}

export function useCreateOpportunityFromConversation() {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateOpportunityInput): Promise<string> => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (!user?.id) throw new Error("Usuário não identificado");

      const contato: Record<string, string> = {};
      if (input.email) contato.email = input.email;
      if (input.phone) contato.phone = input.phone;
      const additionalContacts = Object.keys(contato).length > 0 ? [contato] : [];

      // Fase 2 — atribuição à EVA: se a conversa tem sugestão (pending/accepted),
      // vincula o deal a ela e resolve a pending. Sem sugestão = null (honesto).
      const agentSuggestionId = input.conversationId
        ? await resolveAgentSuggestionForConversation(input.conversationId, user.id)
        : null;

      const dealInsert: Record<string, unknown> = {
        title: input.title,
        customer_name: input.customerName,
        stage: input.stage ?? "qualification",
        user_id: user.id,
        company_id: companyId,
        additional_contacts: additionalContacts,
      };
      if (input.value != null) dealInsert.value = input.value;
      if (input.leadSource) dealInsert.lead_source = input.leadSource;
      if (input.notes) dealInsert.notes = input.notes;
      if (agentSuggestionId) dealInsert.agent_suggestion_id = agentSuggestionId;

      const { data: deal, error } = await supabase
        .from("deals")
        .insert([dealInsert as never])
        .select("id")
        .single();
      if (error) throw error;
      const dealId = (deal as { id: string }).id;

      // Vínculo conversa→deal (não-fatal; não sobrescreve vínculo existente).
      if (input.conversationId && dealId) {
        const { error: linkErr } = await supabase
          .from("channel_conversations" as never)
          .update({ deal_id: dealId } as never)
          .eq("id", input.conversationId)
          .is("deal_id", null);
        if (linkErr) console.error("[hybrid] vínculo conversa→deal falhou (não fatal):", linkErr);
      }

      return dealId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  return {
    createOpportunity: (input: CreateOpportunityInput) => mutation.mutateAsync(input),
    creating: mutation.isPending,
  };
}
