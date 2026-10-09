import { assertEquals } from "jsr:@std/assert@1";
import { detectAdOrigin, parseLeadCommand } from "./adLeadsText.ts";

const PREFILL = "Quero ver quanto está parado nos meus orçamentos";

Deno.test("anúncio de conversa marcado pelo WhatsApp", () => {
  const msg = { message: { extendedTextMessage: { text: "oi", contextInfo: {
    conversionSource: "FB_Ads",
    externalAdReply: { sourceType: "ad", sourceId: "120254", title: "Dois dias", ctwaClid: "abc" },
  } } } };
  assertEquals(detectAdOrigin(msg, "oi", PREFILL), { adId: "120254", headline: "Dois dias", ctwaClid: "abc" });
});

Deno.test("preview de link comum não é anúncio", () => {
  const msg = { message: { extendedTextMessage: { contextInfo: {
    externalAdReply: { sourceType: "Facebook", sourceUrl: "https://spam.example" },
  } } } };
  assertEquals(detectAdOrigin(msg, "promoção imperdível", PREFILL), null);
});

Deno.test("frase do anúncio sem marca ainda conta", () => {
  assertEquals(detectAdOrigin({ message: { conversation: "x" } }, "Olá! Quero ver quanto esta parado nos meus orcamentos", PREFILL)?.adId, null);
});

Deno.test("comandos do dono", () => {
  assertEquals(parseLeadCommand("LK4 1"), { code: "LK4", intent: "send" });
  assertEquals(parseLeadCommand("lk4 2"), { code: "LK4", intent: "reject" });
  assertEquals(parseLeadCommand("LK4 Oi, pode ser amanhã?"), { code: "LK4", intent: "replace", text: "Oi, pode ser amanhã?" });
  assertEquals(parseLeadCommand("PK4 1"), null);
  assertEquals(parseLeadCommand("Legal demais"), null);
});
