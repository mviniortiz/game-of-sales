import { assert, assertEquals } from "jsr:@std/assert@1";
import { dividirMensagens, firstMessage, followupMessage, nextVariant, primeiroNome, VARIANTS } from "./prospectingText.ts";

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
  assertEquals(nextVariant({}), "curta");
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

Deno.test("rascunho com linha em branco vira duas mensagens", () => {
  assertEquals(dividirMensagens("Que bom.\n\nComo vocês controlam isso?"), ["Que bom.", "Como vocês controlam isso?"]);
  assertEquals(dividirMensagens("Uma linha só.\nContinua a mesma mensagem."), ["Uma linha só.\nContinua a mesma mensagem."]);
  assertEquals(dividirMensagens("  \n\nTexto\n \n"), ["Texto"]);
});

Deno.test("primeiro nome ignora sócio inválido", () => {
  assertEquals(primeiroNome("ALISON NILDO DE JESUS"), "Alison");
  assertEquals(primeiroNome("12.345.678 JOAO"), null);
  assertEquals(primeiroNome(""), null);
  assertEquals(primeiroNome(null), null);
});
