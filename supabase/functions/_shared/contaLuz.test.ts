import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { conferirLeitura, numerosDoTexto, resumoConta } from "./contaLuz.ts";

const boa = {
    e_conta_de_luz: true, consumo_kwh: 450, valor_reais: 412.37, distribuidora: " Celesc ",
    cidade: "Florianópolis", uf: "sc", classe: "Residencial", mes_referencia: "2026-10", confianca: 0.92,
};

Deno.test("foto boa: normaliza uf, classe e espaços", () => {
    const l = conferirLeitura(boa)!;
    assertEquals(l.uf, "SC");
    assertEquals(l.classe, "residencial");
    assertEquals(l.distribuidora, "Celesc");
    assertEquals(l.consumo_kwh, 450);
});

Deno.test("não é conta, ou confiança baixa: não grava", () => {
    assertEquals(conferirLeitura({ ...boa, e_conta_de_luz: false }), null);
    assertEquals(conferirLeitura({ ...boa, confianca: 0.5 }), null);
    assertEquals(conferirLeitura({ ...boa, confianca: undefined }), null);
    assertEquals(conferirLeitura("lixo"), null);
});

Deno.test("sem consumo nem valor: não grava", () => {
    assertEquals(conferirLeitura({ ...boa, consumo_kwh: null, valor_reais: null }), null);
});

Deno.test("campo fora do formato vira null", () => {
    const l = conferirLeitura({ ...boa, uf: "XX", classe: "poder público", mes_referencia: "10/2026", consumo_kwh: -3 })!;
    assertEquals([l.uf, l.classe, l.mes_referencia, l.consumo_kwh], [null, null, null, null]);
    assertEquals(l.valor_reais, 412.37);
});

Deno.test("PDF: número que não está no texto é descartado", () => {
    const texto = "CONSUMO 452 kWh  TOTAL A PAGAR R$ 1.234,56 Vencimento 10/11/2026";
    assertEquals(numerosDoTexto(texto).includes(1234.56), true);
    const l = conferirLeitura({ ...boa, consumo_kwh: 452, valor_reais: 999 }, texto)!;
    assertEquals(l.consumo_kwh, 452);
    assertEquals(l.valor_reais, null);
    assertEquals(conferirLeitura({ ...boa, consumo_kwh: 800, valor_reais: 999 }, texto), null);
});

Deno.test("resumo pro dono e pro contexto da Lume", () => {
    assertEquals(resumoConta(conferirLeitura(boa)!), "450 kWh/mês, R$ 412, Celesc, Florianópolis/SC, residencial");
    assertEquals(resumoConta({ consumo_kwh: 1200, valor_reais: null, distribuidora: null, cidade: null, uf: "SP", classe: null }), "1.200 kWh/mês, SP");
});
