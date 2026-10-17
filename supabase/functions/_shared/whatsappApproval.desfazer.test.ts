// Fluxo do desfazer com banco em memória e o servidor de WhatsApp interceptado.
// Demora ~40s: cada aprovação espera os 20s reais do DESFAZER_MS.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleOwnerCommand } from "./whatsappApproval.ts";

Deno.env.set("EVOLUTION_API_URL", "https://wa.teste/v1");
Deno.env.set("EVOLUTION_API_KEY", "teste");
const enviados: string[] = [];
globalThis.fetch = (async (_url: string, init?: RequestInit) => {
  const corpo = JSON.parse(String(init?.body || "{}"));
  if (corpo.text) enviados.push(corpo.text);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}) as typeof fetch;

type Linha = Record<string, any>;
function bancoFalso(tabelas: Record<string, Linha[]>) {
  const tabela = (nome: string) => {
    const filtros: Array<(r: Linha) => boolean> = [];
    let patch: Linha | null = null;
    let ordem: { col: string; asc: boolean } | null = null;
    let limite = Infinity;
    const linhas = () => {
      let rs = (tabelas[nome] ||= []).filter((r) => filtros.every((f) => f(r)));
      if (ordem) rs = [...rs].sort((a, b) => (a[ordem!.col] > b[ordem!.col] ? 1 : -1) * (ordem!.asc ? 1 : -1));
      return rs.slice(0, limite);
    };
    const fim = () => {
      const rs = linhas();
      if (patch) rs.forEach((r) => Object.assign(r, patch));
      return rs;
    };
    const q: any = {
      select: () => q, update: (p: Linha) => ((patch = p), q),
      eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), q),
      not: (c: string, _op: string, v: unknown) => (filtros.push((r) => r[c] !== v), q),
      gte: (c: string, v: string) => (filtros.push((r) => r[c] >= v), q),
      lt: (c: string, v: string) => (filtros.push((r) => r[c] < v), q),
      order: (col: string, o?: { ascending?: boolean }) => ((ordem = { col, asc: o?.ascending !== false }), q),
      limit: (n: number) => ((limite = n), q),
      maybeSingle: async () => ({ data: fim()[0] ?? null }),
      then: (ok: (v: unknown) => void) => ok({ data: fim() }),
    };
    return q;
  };
  return { from: tabela, rpc: async () => ({ data: true }) };
}

function cenario() {
  const sugestao = {
    id: "s1", company_id: "c1", deal_id: "d1", status: "pending", approval_code: "A2",
    notified_at: new Date().toISOString(), suggestion: { message_text: "Oi Ana, conseguiu ver a proposta?" },
  };
  const admin = bancoFalso({
    agent_suggestions: [sugestao],
    deals: [{ id: "d1", customer_name: "Ana", customer_phone: "5548999990000" }],
  });
  const respostas: string[] = [];
  const base = { instanceName: "wa_teste", companyId: "c1", ownerNumber: "5548000000000", replyVia: async (t: string) => { respostas.push(t); } };
  return { sugestao, admin, respostas, base };
}

Deno.test("desfazer nos 20 segundos: nada sai e o rascunho volta aberto", async () => {
  enviados.length = 0;
  const { sugestao, admin, respostas, base } = cenario();
  const aprovacao = handleOwnerCommand(admin, { ...base, text: "1" });
  await new Promise((r) => setTimeout(r, 300));
  assertEquals(sugestao.status, "agendado");
  const desfez = await handleOwnerCommand(admin, { ...base, text: "desfazer" });
  assertEquals(desfez.action, "desfeito");
  await aprovacao;
  assertEquals(enviados, []);
  assertEquals(sugestao.status, "pending");
  assertEquals(sugestao.approval_code, "A2");
  assert(respostas[0].startsWith("Sai em 20 segundos para Ana"), respostas[0]);
  assert(respostas.some((t) => t.startsWith("Desfeito, não enviei. O rascunho A2")), respostas.join(" | "));
});

Deno.test("sem desfazer, sai depois dos 20 segundos e confirma", async () => {
  enviados.length = 0;
  const { sugestao, admin, respostas, base } = cenario();
  const inicio = Date.now();
  const r = await handleOwnerCommand(admin, { ...base, text: "1" });
  assertEquals(r.action, "agendado");
  assert(Date.now() - inicio >= 19_500, "saiu antes da janela de desfazer");
  assertEquals(enviados, ["Oi Ana, conseguiu ver a proposta?"]);
  assertEquals(sugestao.status, "sent");
  assertEquals(sugestao.approval_code, null);
  assertEquals(respostas.at(-1), "Enviado para Ana.");
  const depois = await handleOwnerCommand(admin, { ...base, text: "desfazer" });
  assertEquals(depois.action, "help");
});
