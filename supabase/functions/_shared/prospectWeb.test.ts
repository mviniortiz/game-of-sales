import { assert, assertEquals } from "jsr:@std/assert@1";
import { lerBusca, perguntaDaBusca } from "./prospectWeb.ts";

Deno.test("lê o JSON da busca mesmo com markdown em volta", () => {
  const b = lerBusca('Achei:\n```json\n{"achou": true, "instagram": "https://instagram.com/solgarcia/", "site": "https://solgarcia.com.br", "vende_cliente_final": "sim", "ativa": true, "resumo": "Integradora de Tubarão — vende e instala para casas"}\n```', ["instagram.com"]);
  assertEquals(b.achou, true);
  assertEquals(b.instagram, "@solgarcia");
  assertEquals(b.site, "https://solgarcia.com.br");
  assertEquals(b.vendeClienteFinal, "sim");
  assertEquals(b.ativa, true);
  assert(!/[—–]/.test(b.resumo));
  assertEquals(b.fontes, ["instagram.com"]);
});

Deno.test("não achou ou resposta quebrada vira busca vazia", () => {
  assertEquals(lerBusca('{"achou": false}').achou, false);
  assertEquals(lerBusca("não sei").achou, false);
  assertEquals(lerBusca('{"achou": true, "vende_cliente_final": "talvez", "site": "instagram.com/x"}').vendeClienteFinal, "duvida");
  assertEquals(lerBusca('{"achou": true, "site": "https://instagram.com/x"}').site, null);
});

Deno.test("a pergunta leva nome, razão e cidade", () => {
  const q = perguntaDaBusca({ nome: "JM Instalação Solar", razao: "JM LTDA", cidade: "Tubarão" });
  assert(q.includes("JM Instalação Solar") && q.includes("JM LTDA") && q.includes("Tubarão"));
});

Deno.test("página de diretório ou consulta de CNPJ não vira site da empresa", () => {
  for (const s of ["https://www.solartask.com.br/empresas/x", "https://cnpj.biz/123", "https://www.econodata.com.br/x"]) {
    assertEquals(lerBusca(`{"achou": true, "site": "${s}"}`).site, null, s);
  }
  assertEquals(lerBusca('{"achou": true, "site": "https://rvsolucoestecnologicas.com.br/"}').site, "https://rvsolucoestecnologicas.com.br/");
});

Deno.test("site confere pelo nome próprio ou pela cidade, nunca só por 'solar energia'", async () => {
  const { siteConfere } = await import("./prospectWeb.ts");
  const rv = { nome: "R V Instalação de Energia Solar", razao: "RV Soluções Fotovoltaicas", cidade: "Xaxim" };
  assert(siteConfere("RV Soluções Fotovoltaicas, energia solar em Xaxim e região", rv));
  assert(!siteConfere("A maior empresa de energia solar do Brasil", { nome: "Solar Oeste Soluções em Energia", cidade: "Chapecó" }));
  assert(siteConfere("Atendemos Xanxerê e região com energia solar", { nome: "Solar Oeste Soluções em Energia", cidade: "Xanxerê" }));
  assert(!siteConfere("", rv));
});
