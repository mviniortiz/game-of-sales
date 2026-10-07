import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { worthReading } from "./evaRead.ts";

Deno.test("mensagem sem conteúdo não dispara leitura", () => {
    for (const m of ["ok", "Ok!", "👍", "kkkkk", "rsrs", "Obrigado!!", "tá bom", "Bom dia", "", null, "  "]) {
        assertEquals(worthReading(m), false, String(m));
    }
});

Deno.test("mensagem com conteúdo dispara leitura", () => {
    for (const m of ["Qual o prazo de instalação?", "achei caro", "ok, pode mandar o contrato", "Vou falar com minha esposa 👍", "15 mil à vista?"]) {
        assertEquals(worthReading(m), true, m);
    }
});
