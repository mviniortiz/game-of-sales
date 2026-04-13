import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { logger } from "@/utils/logger";

export interface ReportMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "insight" | "ranking" | "comparison" | "alert" | "general";
  highlights?: string[];
  timestamp: Date;
}

export const useReportAgent = () => {
  const { activeCompanyId } = useTenant();
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const idCounter = useRef(0);

  const genId = () => {
    idCounter.current += 1;
    return `msg-${Date.now()}-${idCounter.current}`;
  };

  const addAssistantMessage = (content: string, type: ReportMessage["type"] = "alert", highlights: string[] = []) => {
    setMessages((prev) => [
      ...prev,
      { id: genId(), role: "assistant", content, type, highlights, timestamp: new Date() },
    ]);
  };

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isThinking || rateLimited) return;

    const userMsg: ReportMessage = {
      id: genId(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Get current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        addAssistantMessage("Sessão expirada. Recarregue a página e faça login novamente.", "alert");
        return;
      }

      // Call edge function directly via fetch to get full response body on non-2xx
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const functionUrl = `${supabaseUrl}/functions/v1/report-agent`;

      logger.log("[ReportAgent] Calling:", functionUrl);

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": anonKey || "",
        },
        body: JSON.stringify({
          question: question.trim(),
          companyId: activeCompanyId,
        }),
      });

      let body: any;
      try {
        body = await response.json();
      } catch {
        body = { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      logger.log("[ReportAgent] Status:", response.status, "Body:", body);

      // Handle non-2xx
      if (!response.ok) {
        if (response.status === 401) {
          addAssistantMessage("Sessão expirada. Recarregue a página e tente novamente.", "alert");
        } else if (response.status === 403 && body.code === "PLAN_REQUIRED") {
          addAssistantMessage("A Eva está disponível nos planos **Plus** e **Pro**. Faça upgrade para desbloquear.", "alert");
        } else if (response.status === 403) {
          addAssistantMessage(body.error || "Acesso restrito a administradores.", "alert");
        } else if (response.status === 429) {
          setRateLimited(true);
          setRemaining(0);
          addAssistantMessage("Limite diário de consultas atingido. Tente novamente amanhã.", "alert");
        } else if (body.code === "OPENAI_NOT_CONFIGURED") {
          addAssistantMessage(
            "A **OPENAI_API_KEY** nao esta configurada nos secrets do Supabase.",
            "alert"
          );
        } else {
          addAssistantMessage(
            `**Erro ${response.status}:** ${body.error || "Erro desconhecido"}\n\nVerifique os logs no dashboard do Supabase.`,
            "alert"
          );
        }
        return;
      }

      // Handle success but missing analysis
      if (!body.analysis) {
        logger.error("[ReportAgent] No analysis in response:", body);
        addAssistantMessage("Resposta inesperada. Tente reformular sua pergunta.", "alert");
        return;
      }

      // Success
      const { analysis } = body;
      addAssistantMessage(
        analysis.answer || "Sem resposta.",
        analysis.type || "general",
        analysis.highlights || []
      );

      if (body.remaining !== undefined) {
        setRemaining(body.remaining);
      }
    } catch (err) {
      logger.error("[ReportAgent] Unexpected error:", err);
      addAssistantMessage(
        "Erro de conexão. Verifique sua internet e tente novamente.",
        "alert"
      );
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, rateLimited, activeCompanyId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setRateLimited(false);
  }, []);

  return {
    messages,
    isThinking,
    remaining,
    rateLimited,
    sendQuestion,
    clearMessages,
  };
};
