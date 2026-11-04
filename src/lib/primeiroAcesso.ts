// O primeiro acesso, do cadastro ao Raio-X, em um contador só. Cadastro,
// Raio-X e modal de conexão leem daqui para não divergirem de novo.

/** Os 3 passos: a conta, conectar o WhatsApp e ver as propostas paradas. */
export const PASSOS_PRIMEIRO_ACESSO = ["Conta", "Conectar", "Ver as propostas"] as const;

/** "Passo 2 de 3 · Conectar" (índice começando em 0). */
export function rotuloPasso(indice: number): string {
    const i = Math.max(0, Math.min(PASSOS_PRIMEIRO_ACESSO.length - 1, indice));
    return `Passo ${i + 1} de ${PASSOS_PRIMEIRO_ACESSO.length} · ${PASSOS_PRIMEIRO_ACESSO[i]}`;
}

/**
 * A mesma frase no Raio-X e no modal de conexão. Confere com o produto: a
 * leitura não envia nada, e depois a retomada só sai quando o dono responde 1
 * no WhatsApp dele (_shared/whatsappApproval.ts).
 */
export const SO_LEIO = "Agora eu só leio. Depois, cada mensagem só sai se você responder 1.";
