import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// PROSPECT.1 — objetivo passado à EVA quando a conversa é de prospecção fria.
// Orienta a resposta sugerida (consultiva, rumo a marcar demo) sem perder o
// caráter assistido (a EVA sugere, o humano aprova e envia).
export const PROSPECTING_OBJECTIVE =
  "Esta é uma agência de marketing abordada a frio para prospecção do Vyzon. " +
  "O objetivo é marcar uma demo de 15 minutos. Conduza de forma natural e " +
  "consultiva: responda dúvidas, resolva objeções e, quando houver abertura, " +
  "ofereça horários para a demo. Nunca prometa preços ou condições fora do " +
  "contexto da agência.";

/**
 * True quando a instância de WhatsApp do usuário atual está em MODO PROSPECÇÃO
 * (registrada em prospecting_instances ativa). Nesse modo o webhook já filtra
 * pela allowlist, e a UI habilita o "aprovar-e-enviar" + objetivo de demo.
 */
export function useProspectingMode(): boolean {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["prospecting-mode", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_instances")
        .select("id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
  return data ?? false;
}
