import { assert, assertEquals } from "jsr:@std/assert@1";
import { diasNaEtapa, prazoDa, precisaAvisar, textoDoAviso, type ObraAviso } from "./posVenda.ts";

const agora = new Date("2026-11-20T12:00:00Z");
const obra = (o: Partial<ObraAviso> = {}): ObraAviso => ({
  id: "1", etapa: "parecer", etapa_desde: "2026-11-01T12:00:00Z", avisado_em: null, cliente: "João", com_quem: "concessionaria", ...o,
});

Deno.test("prazo da empresa vence o padrão; ligada não tem prazo", () => {
  assertEquals(prazoDa("parecer", null), 15);
  assertEquals(prazoDa("parecer", { parecer: 30 }), 30);
  assertEquals(prazoDa("parecer", { parecer: "x" }), 15);
  assertEquals(prazoDa("ligada", null), null);
});

Deno.test("avisa uma vez por etapa, de novo só depois de 7 dias", () => {
  assertEquals(diasNaEtapa("2026-11-01T12:00:00Z", agora), 19);
  assert(precisaAvisar(obra(), null, agora));
  assert(!precisaAvisar(obra(), { parecer: 20 }, agora));
  assert(!precisaAvisar(obra({ avisado_em: "2026-11-18T12:00:00Z" }), null, agora));
  assert(precisaAvisar(obra({ avisado_em: "2026-11-12T12:00:00Z" }), null, agora));
  assert(precisaAvisar(obra({ etapa_desde: "2026-11-02T12:00:00Z", avisado_em: "2026-11-01T13:00:00Z" }), null, agora));
  assert(!precisaAvisar(obra({ etapa: "ligada" }), null, agora));
});

Deno.test("texto do aviso: prazo do dono, com quem está, sem travessão", () => {
  const t = textoDoAviso([obra(), obra({ id: "2", cliente: "Maria", etapa: "vistoria", etapa_desde: "2026-11-10T12:00:00Z", com_quem: null })], null, agora);
  assert(t.startsWith("Obras: 2 passaram do prazo que você definiu"));
  assert(t.includes("1. João · parecer há 19 dias, com a concessionária (você espera 15)"));
  assert(t.includes("2. Maria · vistoria há 10 dias (você espera 7)"));
  assert(!t.includes("—"));
});
