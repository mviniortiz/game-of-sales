import { assert, assertEquals } from "jsr:@std/assert@1";
import { firstMessage, nextVariant, VARIANTS } from "./prospectingText.ts";

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
