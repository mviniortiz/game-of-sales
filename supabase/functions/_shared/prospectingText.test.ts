import { assert, assertEquals } from "jsr:@std/assert@1";
import { dividirMensagens, firstMessage, MARCA_IMAGEM, RESPOSTA_PORTA, followupMessage, nextVariant, pausaEntreMensagens, primeiroNome, tempoDigitando, VARIANTS } from "./prospectingText.ts";

const ALVO = { agency_name: "Sol do Vale", city: "Blumenau", rating_count: 42 };

Deno.test("versões em teste usam o nome da integradora, sem travessão e sem link", () => {
  for (const v of VARIANTS) {
    const texto = firstMessage(ALVO, v);
    assert(texto.includes("Sol do Vale"), v);
    assert(!/[—–]/.test(texto), `${v} tem travessão`);
    assert(!texto.includes("http"), `${v} manda link na primeira mensagem`);
  }
});

Deno.test("a próxima versão é a em teste menos usada, ignorando as aposentadas", () => {
  assertEquals(nextVariant({ pergunta: 0, curta: 3, encaminha: 1, raiox: 2 }), "encaminha");
  assertEquals(nextVariant({}), "encaminha");
});

Deno.test("com o sócio do CNPJ, todas as versões abrem pelo primeiro nome", () => {
  const comDono = { ...ALVO, metadata: { socio: "PAULO HENRIQUE KEEN CHAVES" } };
  for (const v of VARIANTS) {
    const texto = firstMessage(comDono, v);
    assert(texto.startsWith("Oi, Paulo, tudo bem?"), v);
    assert(texto.includes("Sol do Vale"), v);
    assert(!/quem cuida do comercial|Consegue me passar/.test(texto), `${v} pede o dono para o próprio dono`);
  }
});

Deno.test("seguimento do dia 4 faz a pergunta da dor e não pede reunião", () => {
  const semDono = followupMessage();
  assert(semDono.startsWith("Oi, tudo bem?"));
  assert(semDono.includes("quando o cliente visualiza a proposta e some"));
  assert(!/20 minutos|reunião|chamada/.test(semDono));
  assert(!/[—–]/.test(semDono));
  assert(followupMessage({ metadata: { socio: "ANNA LUIZA SOUZA" } }).startsWith("Oi, Anna, tudo bem?"));
});

Deno.test("digitando dura como gente no celular, entre 3,4 e 17,25 segundos", () => {
  assertEquals(tempoDigitando("Oi", 0.5), 4000);
  assertEquals(tempoDigitando("x".repeat(100), 0.5), 9000);
  assertEquals(tempoDigitando("x".repeat(500), 0.5), 15000);
  assert(tempoDigitando("Oi", 0) >= 3400 && tempoDigitando("x".repeat(500), 1) <= 17250);
  assert(pausaEntreMensagens(0) === 1500 && pausaEntreMensagens(1) === 4000);
});

Deno.test("rascunho com linha em branco vira duas mensagens", () => {
  assertEquals(dividirMensagens("Que bom.\n\nComo vocês controlam isso?"), ["Que bom.", "Como vocês controlam isso?"]);
  assertEquals(dividirMensagens("Uma linha só.\nContinua a mesma mensagem."), ["Uma linha só.\nContinua a mesma mensagem."]);
  assertEquals(dividirMensagens("  \n\nTexto\n \n"), ["Texto"]);
});

Deno.test("parágrafo [imagem] vira uma parte sozinha", () => {
  assertEquals(dividirMensagens("Estamos montando isso.\n\n[imagem]\n\nVocês fazem algo assim?"), ["Estamos montando isso.", "[imagem]", "Vocês fazem algo assim?"]);
});

Deno.test("resposta padrão sai em três partes, com o print no meio e sem travessão", () => {
  const partes = dividirMensagens(RESPOSTA_PORTA);
  assertEquals(partes.length, 3);
  assertEquals(partes[1], MARCA_IMAGEM);
  assert(!/[—–]/.test(RESPOSTA_PORTA));
});

Deno.test("primeiro nome ignora sócio inválido", () => {
  assertEquals(primeiroNome("ALISON NILDO DE JESUS"), "Alison");
  assertEquals(primeiroNome("12.345.678 JOAO"), null);
  assertEquals(primeiroNome(""), null);
  assertEquals(primeiroNome(null), null);
});
