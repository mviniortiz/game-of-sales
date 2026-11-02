// Por que o orçamento parou, pelas palavras do próprio cliente. Regra simples de
// propósito: motivo errado na tela é pior que nenhum, então sem frase clara fica null.
export type MotivoParada = "parcela" | "decisor" | "comparando" | "credito";

const REGRAS: Array<[MotivoParada, RegExp]> = [
    ["credito", /\b(banco|financiamento|credito|financeira)\b.{0,40}\b(negou|negado|recusou|recusado|reprovou|reprovado|nao aprov\w*)\b|\bnao aprov\w*\b.{0,40}\b(banco|financiamento|credito)\b/],
    ["decisor", /\b(falar|conversar|ver|mostrar|consultar|decidir)\b.{0,30}\b(esposa|esposo|marido|mulher|socio|socia|filho|filha|familia)\b/],
    ["comparando", /\b(outro|outra|outros|outras)\b.{0,20}\b(orcamento|orcamentos|proposta|propostas|empresa|empresas)\b|\bcomparar\b|\bcomparando\b|\bcotando\b/],
    ["parcela", /\bparcelas?\b.{0,30}\b(alta|altas|cara|caras|pesad[ao]s?)\b|\b(caro|cara|salgado)\b|\bfora do orcamento\b/],
];

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Olha da mensagem mais nova para a mais antiga: vale o que o cliente disse por último. */
export function motivoParada(mensagensDoCliente: string[]): MotivoParada | null {
    for (const texto of [...mensagensDoCliente].reverse()) {
        const limpo = normalizar(texto);
        for (const [motivo, regra] of REGRAS) {
            if (regra.test(limpo)) return motivo;
        }
    }
    return null;
}
