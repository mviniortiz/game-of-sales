// PROSPECT.3 (2026-10-24) — Perfil por nicho da prospecção. A prospecção nasceu
// para integradora solar (e distribuidora solar como teste à parte); os textos,
// a leitura de respostas e a qualificação de lá continuam iguais. Um nicho novo
// entra aqui com o próprio vocabulário, e o resto do fluxo (lote aprovado pelo
// WhatsApp, rampa do chip, teto com sinal, pausa por falha, intervalo entre
// contatos, seguimento do dia 4) vale do mesmo jeito.
//
// Diferenças de propósito para nicho novo:
// - sem o print da EVA (a imagem atual mostra um caso de solar);
// - a resposta a quem só disse "pode falar" NÃO sai sozinha: espera o 👍 do dono,
//   como qualquer outra (a exceção de 15/10/2026 foi decidida para solar);
// - sem a qualificação por CNPJ: quem traz a empresa é o Vendedor (OpenBot),
//   pelo Google Maps, e a nota sai das avaliações (notaDoVendedor).
//
// Sem nada de Deno: roda nos testes do front (Node) e nas edges.

export type PerfilNicho = {
  /** Valor gravado em prospecting_allowlist.niche. */
  chave: string;
  /** "vidraçaria", "vidraçarias". */
  singular: string;
  plural: string;
  /** O que a empresa manda ao cliente e espera resposta. */
  documento: string;
  /** Uma frase do que o Markus está montando, no vocabulário do nicho. */
  ferramenta: string;
  /** Pergunta curta depois de mostrar a ferramenta. */
  perguntaFazem: string;
  /** Pergunta da dor, usada no seguimento do dia 4. */
  perguntaDor: string;
  /** Quem não é cliente, para a leitura de respostas. */
  foraDoPerfil: string;
  /** Contexto extra para a IA que lê as respostas. */
  contexto: string;
};

export const VIDRACARIA: PerfilNicho = {
  chave: "vidraçaria",
  singular: "vidraçaria",
  plural: "vidraçarias",
  documento: "orçamento",
  ferramenta:
    "Tô montando uma ferramenta pra vidraçaria: quando um orçamento fica 2 dias sem resposta do cliente, ela avisa o dono no WhatsApp já com a mensagem de retomada pronta. Ele aprova e sai do número dele.",
  perguntaFazem: "Vocês fazem algo assim hoje ou fica no braço?",
  perguntaDor:
    "Quando vocês mandam o orçamento e o cliente some, vocês chamam de novo ou deixam pra lá?",
  foraDoPerfil:
    "não trabalha mais com vidro, só faz manutenção pontual sem orçamento, é fornecedor de outra vidraçaria, número errado ou não é a empresa",
  contexto:
    "Vidraçaria vende box, espelho, vidro temperado, sacada, janela e esquadria. O orçamento costuma depender de ir medir no local; depois da medição, o orçamento vai pelo WhatsApp e o cliente decide em dias. Use essas palavras (medir, box, espelho, temperado, orçamento) e nunca fale de energia solar, proposta de kit ou integradora.",
};

const PERFIS: Record<string, PerfilNicho> = {
  [VIDRACARIA.chave]: VIDRACARIA,
};

/** Perfil do nicho novo, ou null para integradora e distribuidora solar (fluxo antigo). */
export function perfilDoNicho(niche?: string | null): PerfilNicho | null {
  if (!niche) return null;
  return PERFIS[niche.trim().toLowerCase()] ?? null;
}

export const NICHOS_NOVOS = Object.keys(PERFIS);

/** Primeira mensagem do nicho novo: o formato da "encaminha" (o que fez pessoa
 *  responder em solar), em três redações para não parecer disparo em massa. */
export function primeiraMensagemDoNicho(
  p: PerfilNicho,
  alvo: { nome: string; dono: string | null; redacao: number },
  sender = "Markus",
): string {
  const { nome, dono, redacao } = alvo;
  if (dono) return [
    `Oi, ${dono}, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra ${p.singular} e queria te fazer uma pergunta rápida sobre os ${p.documento}s que vocês mandam e o cliente visualiza e não responde. É você que cuida disso na ${nome}?`,
    `Oi, ${dono}, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para ${p.plural} e tenho uma pergunta rápida sobre os ${p.documento}s que vocês enviam e o cliente visualiza mas não responde. Quem cuida disso na ${nome} é você?`,
    `Oi, ${dono}! Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra ${p.singular} e queria te fazer uma pergunta rápida sobre ${p.documento} que o cliente visualiza e deixa sem resposta. Você que cuida disso na ${nome}?`,
  ][redacao];
  return [
    `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra ${p.singular} e queria fazer uma pergunta rápida sobre os ${p.documento}s que vocês mandam e o cliente visualiza e não responde. Consegue me passar pra quem cuida disso na ${nome}?`,
    `Oi, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para ${p.plural} e tenho uma pergunta rápida sobre os ${p.documento}s que vocês enviam e o cliente visualiza mas não responde. Pode me passar para quem cuida disso na ${nome}?`,
    `Olá, tudo certo? Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra ${p.singular} e queria fazer uma pergunta rápida sobre ${p.documento} que o cliente visualiza e deixa sem resposta. Quem cuida disso aí na ${nome}?`,
  ][redacao];
}

/** Resposta a quem abriu a porta: a ferramenta numa frase e a pergunta. Sem print. */
export function respostaPortaDoNicho(p: PerfilNicho): string {
  return [p.ferramenta, p.perguntaFazem].join("\n\n");
}

/** Instruções extras para a IA que lê a resposta de uma empresa do nicho novo. */
export function contextoDaLeitura(p: PerfilNicho): string {
  return [
    `ESTA EMPRESA É UMA ${p.singular.toUpperCase()}, não uma integradora de energia solar. Em todas as regras abaixo, leia 'integradora' como ${p.singular}, 'proposta' como ${p.documento} e 'cliente' como o cliente final que pediu o ${p.documento}.`,
    p.contexto,
    `Nos modelos de frase, troque o que o Markus está montando por exatamente isto: '${p.ferramenta}' e a pergunta por '${p.perguntaFazem}'.`,
    "Não use a linha [imagem] em nenhum caso: nesta conversa não vai print.",
    "No preço, diga 'as 10 primeiras empresas' em vez de 'as 10 primeiras integradoras'.",
    `fora_do_perfil, neste nicho: ${p.foraDoPerfil}.`,
  ].join(" ");
}

/** Nota de encaixe de uma empresa que o Vendedor trouxe do Google Maps. O critério
 *  de entrada já filtrou (20 a 100 avaliações, celular comercial no Maps), então a
 *  nota começa no corte (50) e sobe com as avaliações: as maiores saem primeiro. */
export function notaDoVendedor(avaliacoes: number | null | undefined, estrelas: number | null | undefined): { nota: number; motivos: string[] } {
  const av = Math.max(0, Math.min(100, Number(avaliacoes) || 0));
  const motivos = ["trazida pelo Vendedor (Google Maps)", `${av} ${av === 1 ? "avaliação" : "avaliações"} no Google`];
  let nota = 50 + Math.round(av / 5);
  const e = Number(estrelas);
  if (Number.isFinite(e) && e > 0) {
    motivos.push(`nota ${e.toFixed(1)} no Google`);
    if (e < 4) nota -= 5;
  }
  return { nota: Math.max(0, Math.min(100, nota)), motivos };
}
