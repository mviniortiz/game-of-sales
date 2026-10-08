import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizePairingNumber } from "./pairing.ts";

Deno.test("número do pareamento", () => {
    assertEquals(normalizePairingNumber("(48) 99169-6887"), "5548991696887");
    assertEquals(normalizePairingNumber("+55 48 99169-6887"), "5548991696887");
    assertEquals(normalizePairingNumber("4833334444"), "554833334444");
    assertEquals(normalizePairingNumber("12345"), null);
    assertEquals(normalizePairingNumber(""), null);
    assertEquals(normalizePairingNumber(null), null);
});
