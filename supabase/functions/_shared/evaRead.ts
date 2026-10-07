// Decide se uma mensagem recebida justifica a EVA reler a conversa (EVA.READ.1).
// Mensagem sem conteúdo ("ok", "kkk", figurinha) não muda a leitura e só
// gastaria uma chamada de IA.

export const READ_DELAY_MS = 3 * 60_000;

const FILLER = new Set([
    "ok", "okk", "okay", "blz", "beleza", "obg", "obgd", "obrigado", "obrigada", "valeu", "vlw",
    "sim", "s", "nao", "não", "n", "show", "top", "certo", "ta", "tá", "ta bom", "tá bom", "tudo bem",
    "bom dia", "boa tarde", "boa noite", "oi", "ola", "olá", "rs", "rsrs", "haha", "hahaha", "perfeito",
    "combinado", "pode ser", "entendi", "joia", "jóia", "massa", "fechou",
]);

export function worthReading(body: string | null | undefined): boolean {
    if (!body) return false;
    const text = body
        .toLowerCase()
        .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]/gu, "")
        .replace(/[!?.,;:]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (text.length < 2) return false;
    if (/^(k|rs|ha)+$/.test(text.replace(/\s/g, ""))) return false;
    return !FILLER.has(text);
}
