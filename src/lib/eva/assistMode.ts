// ─────────────────────────────────────────────────────────────────────────────
// EVA.INBOX.1 (2026-06-06) — Modo de assistência da lateral da EVA.
//
// A tese: a EVA é uma máquina de resposta. Ela só mostra resposta pronta quando
// CONFIA na sugestão; sem contexto suficiente ela SE CALA e pede descoberta
// (genérico atrapalha mais do que ajuda).
//
// O gate usa `confianca` (0..1), campo que JÁ existe no qualificationSchema e
// vem do whatsapp-copilot. Threshold fixo por enquanto; quando o loop de
// aprendizado (suggestionFeedback) acumular taxa de aceitação real, ele vira
// o candidato natural a calibrar este número por company.
// ─────────────────────────────────────────────────────────────────────────────
import type { Qualification } from "@/lib/eva/qualificationSchema";

export type AssistMode = "suggest" | "discover";

/** Abaixo disso a EVA se cala e pede descoberta em vez de sugerir genérico. */
export const EVA_SUGGESTION_CONFIDENCE_THRESHOLD = 0.6;

export function deriveAssistMode(q: Qualification): AssistMode {
    const hasSuggestion = !!q.resposta_sugerida?.trim();
    return hasSuggestion && q.confianca >= EVA_SUGGESTION_CONFIDENCE_THRESHOLD
        ? "suggest"
        : "discover";
}

/**
 * Perguntas que destravam a sugestão (modo discover), no máximo 2.
 *
 * Hoje `info_faltante` traz TÓPICOS ("orçamento disponível"), não perguntas
 * prontas. Este fallback formata o tópico como pergunta direta; a versão boa
 * é o copilot passar a devolver `perguntas_qualificacao` já redigidas no tom
 * da agência (próxima iteração do edge function, junto da integração real).
 */
export function deriveDiscoveryQuestions(q: Qualification): string[] {
    return q.info_faltante.slice(0, 2).map((topic) => {
        const t = topic.trim().replace(/[.?!]+$/, "");
        if (!t) return topic;
        // Já veio como pergunta? Usa como está.
        if (/^(qual|quais|quem|quando|onde|como|por que|porque|voc[eê])/i.test(t)) {
            return `${t}?`;
        }
        return `Sobre ${t.charAt(0).toLowerCase()}${t.slice(1)}: o que você já sabe?`;
    });
}
