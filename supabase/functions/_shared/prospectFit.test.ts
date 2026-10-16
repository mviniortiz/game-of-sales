import { assert, assertEquals } from "jsr:@std/assert";
import { CORTE_ENCAIXE, escolherLugar, notaDeEncaixe, type Evidencia } from "./prospectFit.ts";

const hoje = new Date("2026-10-16T15:00:00Z");
const base: Evidencia = { nome: "JLG Solar", cidade: "Campos Novos", cnae: "4321500", porte: "ME", inicio: "20200301", socio: "Jeferson Luiz Goncalves", celular: "5549999282101" };

Deno.test("integradora ativa no Google, celular do sócio e IA a favor passa do corte", () => {
  const n = notaDeEncaixe({
    ...base,
    google: { achou: true, avaliacoes: 34, estrelas: 4.9, ultimaAvaliacao: "2026-09-20T00:00:00Z", categoria: "Empresa de energia solar", site: null, telefone: null, fechado: false },
    juiz: { veredito: "sim", motivo: "vende e instala sistema residencial" },
  }, hoje);
  assert(n.nota >= 85, `nota ${n.nota}`);
  assertEquals(n.veto, null);
  assert(n.motivos.includes("celular do CNPJ, fala com Jeferson"));
});

Deno.test("sem Google e sem IA não passa do corte só pelo cadastro", () => {
  const n = notaDeEncaixe(base, hoje);
  assert(n.nota < CORTE_ENCAIXE, `nota ${n.nota}`);
});

Deno.test("veto da IA e empresa fechada zeram a nota", () => {
  assertEquals(notaDeEncaixe({ ...base, juiz: { veredito: "nao", motivo: "faz só instalação elétrica predial" } }, hoje).nota, 0);
  const fechada = notaDeEncaixe({ ...base, google: { achou: true, avaliacoes: 80, estrelas: 5, ultimaAvaliacao: null, categoria: null, site: null, telefone: null, fechado: true } }, hoje);
  assertEquals(fechada.nota, 0);
  assertEquals(fechada.veto, "fechada no Google");
});

Deno.test("e-mail de contabilidade derruba a nota e aparece primeiro nos motivos", () => {
  const n = notaDeEncaixe({ ...base, emailDominio: "contabilidadeideal.com.br" }, hoje);
  assertEquals(n.motivos[0], "e-mail do CNPJ é de contabilidade");
  assert(n.nota < notaDeEncaixe(base, hoje).nota);
});

Deno.test("avaliação velha pesa menos que recente", () => {
  const g = (ultima: string) => notaDeEncaixe({ ...base, google: { achou: true, avaliacoes: 20, estrelas: 5, ultimaAvaliacao: ultima, categoria: null, site: null, telefone: null, fechado: false } }, hoje).nota;
  assert(g("2026-10-01T00:00:00Z") > g("2025-06-01T00:00:00Z"));
});

Deno.test("casa o lugar pelo telefone, ou pelo nome forte na mesma cidade", () => {
  const cands = [
    { nome: "Solar Energia Campos", endereco: "Rua A, Lages - SC", telefone: "(49) 3333-1111" },
    { nome: "JLG Energia Solar", endereco: "Rua B, Campos Novos - SC", telefone: null },
  ];
  assertEquals(escolherLugar(cands, { nome: "JLG Solar", cidade: "Campos Novos" }), 1);
  assertEquals(escolherLugar([{ nome: "Outra", endereco: "X, Lages", telefone: "(49) 99928-2101" }], { nome: "JLG Solar", cidade: "Campos Novos", celular: "5549999282101" }), 0);
  // "Solar" sozinho não casa: palavra fraca, e a cidade é outra.
  assertEquals(escolherLugar([cands[0]], { nome: "JLG Solar", cidade: "Campos Novos" }), -1);
});

Deno.test("sem a busca do Google, perfil completo chega no corte e perfil fraco não", () => {
  const completo = notaDeEncaixe({ ...base, googleBuscado: false }, hoje);
  assertEquals(completo.nota, CORTE_ENCAIXE);
  assert(completo.motivos.includes("sem dados do Google ainda"));
  const fraco = notaDeEncaixe({ nome: "Fulano Eletrica", cidade: "Lages", porte: "demais", celular: "5549999990000", googleBuscado: false }, hoje);
  assert(fraco.nota < CORTE_ENCAIXE, `nota ${fraco.nota}`);
  assertEquals(notaDeEncaixe({ ...base, googleBuscado: false, juiz: { veredito: "nao", motivo: "imobiliária" } }, hoje).nota, 0);
});

Deno.test("distribuidora pontua pelo atacado e pelo porte maior, não pela instalação elétrica", () => {
  const dist: Evidencia = { ...base, nome: "Sul Solar Distribuidora", distribuidora: true, cnae: "4669999", porte: "EPP", googleBuscado: false, juiz: { veredito: "sim", motivo: "atacado de kits solares" } };
  const n = notaDeEncaixe(dist, hoje);
  assert(n.motivos.includes("atividade principal: atacado de máquinas e equipamentos"), n.motivos.join(" | "));
  assert(n.motivos.includes("porte EPP"));
  assert(n.nota >= CORTE_ENCAIXE, `nota ${n.nota}`);
  const comoIntegradora = notaDeEncaixe({ ...dist, cnae: "4321500" }, hoje);
  assert(!comoIntegradora.motivos.some((m) => m.startsWith("atividade principal")), "instalação elétrica não conta para distribuidora");
  const micro = notaDeEncaixe({ ...dist, porte: "ME" }, hoje);
  assert(!micro.motivos.includes("porte ME"));
});
