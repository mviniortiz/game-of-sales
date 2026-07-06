// Lógica do chat de AJUDA da EVA (edge eva-help), compartilhada entre o
// EvaHelpDock (orb flutuante) e o AskEvaPalette (⌘K). Cada UI tem a própria
// instância do hook; o histórico vive no localStorage (por usuário) e
// reloadFromStorage() ao abrir mantém as duas entradas na mesma conversa.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EvaChatMsg {
    role: "user" | "assistant";
    content: string;
}

export function useEvaHelpChat(pageLabel: string) {
    const { user } = useAuth();
    const storageKey = user ? `vyz-eva-help:${user.id}` : null;

    const [messages, setMessages] = useState<EvaChatMsg[]>([]);
    const [loading, setLoading] = useState(false);
    const [animateIdx, setAnimateIdx] = useState<number | null>(null); // qual msg digita

    const reloadFromStorage = useCallback(() => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setMessages(parsed);
            }
        } catch { /* ignora */ }
    }, [storageKey]);

    useEffect(() => { reloadFromStorage(); }, [reloadFromStorage]);

    // Persiste (últimas 30 mensagens) a cada mudança.
    useEffect(() => {
        if (!storageKey) return;
        try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); } catch { /* ignora */ }
    }, [messages, storageKey]);

    const ask = useCallback(async (question: string) => {
        const q = question.trim();
        if (!q || loading) return;
        const history = messages.slice(-6);
        const assistantIdx = messages.length + 1; // índice da bolha da EVA (após a do user)
        setMessages((m) => [...m, { role: "user", content: q }]);
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("eva-help", {
                body: { question: q, page: pageLabel, history },
            });
            const answer = (!error && data && typeof data.answer === "string")
                ? data.answer
                : `Não consegui responder agora. Fala com o suporte no WhatsApp: https://wa.me/5548991696887`;
            setAnimateIdx(assistantIdx);
            setMessages((m) => [...m, { role: "assistant", content: answer }]);
        } catch {
            setAnimateIdx(assistantIdx);
            setMessages((m) => [...m, { role: "assistant", content: "Tive um problema pra responder. Tenta de novo em instantes." }]);
        } finally {
            setLoading(false);
        }
    }, [messages, loading, pageLabel]);

    const reset = useCallback(() => {
        setMessages([]);
        setAnimateIdx(null);
        if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignora */ } }
    }, [storageKey]);

    return { messages, loading, animateIdx, ask, reset, reloadFromStorage };
}
