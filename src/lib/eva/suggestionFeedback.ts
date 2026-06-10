// ─────────────────────────────────────────────────────────────────────────────
// EVA.INBOX.2 (2026-06-06) — Loop de aprendizado da resposta sugerida.
//
// FUNDAÇÃO DO FUTURO, não cosmético: cada envio a partir da sugestão da EVA
// vira um sinal gravado em `eva_suggestion_feedback`:
//   - enviou DIRETO        → outcome "accepted" (similarity 1.0)
//   - EDITOU antes de enviar → outcome "edited" + delta (sugestão vs. enviado)
//
// A taxa de aceitação por company é derivável por query desta tabela. É o dado
// que, no futuro, destrava a escada de autonomia ("conceder autonomia por tipo
// de mensagem"). Por enquanto: só captura, nenhuma UI expõe isso.
//
// Gravação é FAIL-SILENT por design: o loop de aprendizado nunca pode quebrar
// ou atrasar o fluxo de envio do vendedor.
//
// Migration: supabase/migrations/20260606_eva_suggestion_feedback.sql
// (aplicar via `db query --linked -f`, NUNCA db push).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";

export interface SuggestionOutcome {
    outcome: "accepted" | "edited";
    /** 0..1 — quão próximo o texto enviado ficou da sugestão original. */
    similarity: number;
    suggestionText: string;
    sentText: string;
}

/** Levenshtein iterativo (duas linhas). Textos da EVA têm ≤1200 chars, ok no clique. */
function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let prev = new Array<number>(b.length + 1);
    let curr = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[b.length];
}

/** Compara sugestão original vs. texto enviado e classifica o desfecho. */
export function buildSuggestionOutcome(
    suggestionText: string,
    sentText: string,
): SuggestionOutcome {
    const a = suggestionText.trim();
    const b = sentText.trim();
    if (a === b) {
        return { outcome: "accepted", similarity: 1, suggestionText: a, sentText: b };
    }
    const maxLen = Math.max(a.length, b.length) || 1;
    const similarity = Math.max(0, 1 - levenshtein(a, b) / maxLen);
    return { outcome: "edited", similarity, suggestionText: a, sentText: b };
}

export interface RecordSuggestionFeedbackArgs {
    companyId: string;
    chatPhone?: string | null;
    conversationId?: string | null;
    /** `confianca` da qualificação no momento da sugestão (0..1). */
    confidence?: number | null;
    outcome: SuggestionOutcome;
}

/**
 * Grava o sinal de aprendizado. Nunca lança: erro vira console.debug e o
 * envio do vendedor segue normal.
 */
export async function recordSuggestionFeedback({
    companyId,
    chatPhone,
    conversationId,
    confidence,
    outcome,
}: RecordSuggestionFeedbackArgs): Promise<void> {
    try {
        // "as any" — padrão do projeto pra tabelas ainda fora dos types gerados
        // (mesmo esquema de useEvaBlueprint/useEvaSimulationResults).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("eva_suggestion_feedback" as any).insert({
            company_id: companyId,
            chat_phone: chatPhone ?? null,
            conversation_id: conversationId ?? null,
            suggestion_text: outcome.suggestionText,
            sent_text: outcome.sentText,
            outcome: outcome.outcome,
            similarity: Number(outcome.similarity.toFixed(4)),
            confidence: confidence ?? null,
        });
        if (error) console.debug("[eva] suggestion feedback não gravado:", error.message);
    } catch (e) {
        console.debug("[eva] suggestion feedback não gravado:", e);
    }
}
