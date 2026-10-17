import { assertEquals } from "jsr:@std/assert@1";
import { parseOwnerCommand } from "./whatsappApproval.ts";

Deno.test("desfazer é comando próprio, com ou sem código", () => {
  assertEquals(parseOwnerCommand("desfazer"), { code: null, intent: "undo" });
  assertEquals(parseOwnerCommand("Desfaz!"), { code: null, intent: "undo" });
  assertEquals(parseOwnerCommand("0"), { code: null, intent: "undo" });
  assertEquals(parseOwnerCommand("A2 desfazer"), { code: "A2", intent: "undo" });
});

Deno.test("1, 2 e texto corrigido continuam como antes", () => {
  assertEquals(parseOwnerCommand("1"), { code: null, intent: "send" });
  assertEquals(parseOwnerCommand("A2 1"), { code: "A2", intent: "send" });
  assertEquals(parseOwnerCommand("cancela"), { code: null, intent: "reject" });
  assertEquals(parseOwnerCommand("Oi Ana, conseguiu ver a proposta?").intent, "replace");
});
