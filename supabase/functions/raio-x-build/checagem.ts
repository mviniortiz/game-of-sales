// Checagem da IA em cada proposta candidata do Raio-X. A detecção por regra
// (PDF enviado ou "R$" numa mensagem da empresa) também pega ficha técnica,
// boleto, documento pessoal e conversa com amigo; medido em 08/10/2026 na
// conta do Markus: 1 proposta de verdade em 6 candidatas. A IA lê o arquivo e a
// conversa em volta e diz se é proposta comercial enviada a um cliente.
import { hasLlmKey, llmChat } from "../_shared/llm.ts";
import type { RxItem, RxMessage } from "../_shared/raioX.ts";

export type Veredito = { proposta: boolean; valor: number | null; motivo: string };

const SYSTEM = `Você confere o histórico de WhatsApp de uma empresa que vende para clientes (o caso mais comum é um integrador de energia solar). Uma regra automática marcou uma mensagem enviada pela empresa como possível PROPOSTA COMERCIAL. Decida se é mesmo.

É proposta: orçamento ou proposta de venda que a empresa mandou para um cliente ou possível cliente, em PDF ou texto, com preço, escopo ou condições (ex.: proposta de sistema fotovoltaico, orçamento de instalação).

NÃO é proposta: ficha técnica ou catálogo sem preço para esse cliente, boleto, nota fiscal, comprovante, contrato já fechado, documento pessoal, exame, passagem, conversa com fornecedor em que a empresa é quem compra, pergunta sobre preço de outra coisa, arquivo que o próprio contato mandou antes e a empresa só devolveu revisado ou convertido, favor entre amigos ou família (apelido, gíria, "me ajuda", "valeu"), prévia ou link sem preço.

Na dúvida, com PDF enviado a um cliente que conversava sobre compra, é proposta.

Responda só JSON: {"proposta": true|false, "valor": número em reais do total da proposta se aparecer escrito nas mensagens, senão null, "motivo": "até 12 palavras"}`;

function linha(m: RxMessage, alvo: boolean): string {
    const quem = m.direction === "inbound" ? "Cliente" : "Empresa";
    const arquivo = m.message_type === "document" ? ` [arquivo: ${m.media_ref?.file_name || m.media_ref?.caption || "PDF"}]` : "";
    const texto = (m.body || (m.message_type === "document" ? "" : m.media_ref?.caption) || "").replace(/\s+/g, " ").slice(0, 300);
    return `${alvo ? ">>> " : ""}${quem}:${arquivo} ${texto}`.trim();
}

async function checar(item: RxItem, msgs: RxMessage[], contato: string | null): Promise<Veredito | null> {
    const k = msgs.findIndex((m) => m.id === item.message_id);
    if (k < 0) return null;
    const trecho = msgs.slice(Math.max(0, k - 14), k + 5).map((m) => linha(m, m.id === item.message_id)).join("\n");
    const res = await llmChat({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Contato: ${contato || "sem nome"}\nA mensagem marcada tem ">>>".\n\n${trecho}` },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 150,
    }, { label: "raioXChecagem" });
    if (!res.ok) return null;
    try {
        const data = await res.json();
        const j = JSON.parse(String(data?.choices?.[0]?.message?.content ?? "").match(/\{[\s\S]*\}/)?.[0] ?? "");
        const valor = typeof j.valor === "number" && j.valor >= 500 && j.valor < 10_000_000 ? Math.round(j.valor) : null;
        return { proposta: j.proposta !== false, valor, motivo: String(j.motivo ?? "").slice(0, 120) };
    } catch {
        return null;
    }
}

/**
 * Um veredito por item, na mesma ordem. null = a IA não respondeu; quem chama
 * mantém o item (melhor um falso positivo que o dono tira do que um relatório
 * vazio quando o provedor cai).
 */
export async function checarPropostas(
    items: RxItem[],
    byConv: Map<string, RxMessage[]>,
    contatoDe: (conversationId: string) => string | null,
): Promise<(Veredito | null)[]> {
    if (!hasLlmKey()) return items.map(() => null);
    const out: (Veredito | null)[] = new Array(items.length).fill(null);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const k = next++;
            const it = items[k];
            // uma segunda tentativa: resposta vazia ou JSON quebrado acontece e
            // mantém no relatório um item que a IA tiraria
            for (let tentativa = 0; tentativa < 2 && !out[k]; tentativa++) {
                out[k] = await checar(it, byConv.get(it.conversation_id) ?? [], contatoDe(it.conversation_id)).catch(() => null);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(8, items.length) }, worker));
    return out;
}
