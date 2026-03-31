import { useState } from "react";
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";

export const useCopilot = () => {
    const [aiThinking, setAiThinking] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [rateLimited, setRateLimited] = useState(false);

    const getAiAnalysis = async (
        chatTextContext: string,
        messages?: Array<{ text: string; sender: "me" | "lead" }>,
        contactName?: string,
        contactPhone?: string,
    ) => {
        if (rateLimited) return;

        setAiThinking(true);
        setAiSuggestion(null);

        try {
            const msgArray = messages || chatTextContext.split("\n").map((line) => {
                const isMe = line.startsWith("[Vendedor]") || line.startsWith("Eu:");
                return {
                    text: line.replace(/^\[(Vendedor|Lead)\]:\s*/, "").replace(/^(Eu|Lead):\s*/, ""),
                    sender: isMe ? "me" as const : "lead" as const,
                };
            }).filter((m) => m.text.trim());

            const { data, error } = await supabase.functions.invoke("whatsapp-copilot", {
                body: {
                    messages: msgArray,
                    contactName: contactName || "Lead",
                    contactPhone: contactPhone || null,
                },
            });

            if (data?.code === "RATE_LIMITED" || data?.remaining === 0) {
                setRateLimited(true);
                setRemaining(0);
                setAiSuggestion({
                    sentiment: "Limite diário atingido",
                    temperature: "morno",
                    strategy: ["Você usou todas as 10 análises de hoje.", "O limite reseta amanhã automaticamente."],
                    draft: "",
                    objections: [],
                    nextAction: "Aguardar reset do limite amanhã",
                });
                return;
            }

            if (error || !data?.analysis) {
                logger.error("[useCopilot] error:", error || data?.error);
                setAiSuggestion({
                    sentiment: "Análise indisponível",
                    temperature: "morno",
                    strategy: ["Tente novamente em alguns segundos."],
                    draft: "",
                    objections: [],
                    nextAction: "Aguardar resposta do lead",
                });
                return;
            }

            setAiSuggestion(data.analysis);
            if (data.remaining !== undefined) {
                setRemaining(data.remaining);
            }
        } catch (err) {
            logger.error("[useCopilot] unexpected error:", err);
            setAiSuggestion({
                sentiment: "Erro ao analisar",
                temperature: "morno",
                strategy: ["Serviço de IA temporariamente indisponível."],
                draft: "",
                objections: [],
                nextAction: "Tentar novamente",
            });
        } finally {
            setAiThinking(false);
        }
    };

    return { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion, remaining, rateLimited };
};
