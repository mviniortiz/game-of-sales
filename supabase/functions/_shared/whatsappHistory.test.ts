// deno test supabase/functions/_shared/whatsappHistory.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { importHistoryMessages, isIndividualJid } from "./whatsappHistory.ts";

// Banco falso: nenhuma linha existe antes; insert devolve id novo e upsert
// devolve as linhas gravadas, para o teste contar o que foi pedido.
function fakeAdmin() {
  const upserts: any[][] = [];
  let seq = 0;
  const query = (table: string) => {
    const q: any = {
      select: () => q,
      eq: () => q,
      update: () => q,
      maybeSingle: async () => ({ data: null }),
      single: async () => ({ data: { id: `${table}-${++seq}` }, error: null }),
      insert: () => q,
      upsert: (rows: any[]) => {
        upserts.push(rows);
        return { select: async () => ({ data: rows.map((_, i) => ({ id: `m${i}` })), error: null }) };
      },
    };
    return q;
  };
  return { admin: { from: query }, upserts };
}

const nowSec = Math.floor(Date.now() / 1000);
const msg = (jid: string, id: string, ageDays: number, fromMe = false, text = "oi") => ({
  key: { remoteJid: jid, id, fromMe },
  pushName: fromMe ? "Dono" : "Cliente",
  message: { conversation: text },
  messageTimestamp: nowSec - ageDays * 86400,
});

Deno.test("isIndividualJid aceita só conversa individual", () => {
  assertEquals(isIndividualJid("5511999990000@s.whatsapp.net"), true);
  assertEquals(isIndividualJid("123456@lid"), true);
  assertEquals(isIndividualJid("1203630@g.us"), false);
  assertEquals(isIndividualJid("status@broadcast"), false);
  assertEquals(isIndividualJid("123@newsletter"), false);
});

Deno.test("importHistoryMessages agrupa por conversa e corta grupo e mensagem velha", async () => {
  const { admin, upserts } = fakeAdmin();
  const r = await importHistoryMessages(admin, {
    instanceName: "wa_x",
    companyId: "c1",
    userId: "u1",
    connectionId: "conn1",
    messages: [
      msg("5511999990000@s.whatsapp.net", "a1", 1),
      msg("5511999990000@s.whatsapp.net", "a2", 2, true),
      msg("5511888880000@s.whatsapp.net", "b1", 3),
      msg("5511888880000@s.whatsapp.net", "b-velha", 200),
      msg("1203630@g.us", "g1", 1),
    ],
  });
  assertEquals(r.importedChats, 2);
  assertEquals(r.importedMessages, 3);
  assertEquals(r.skippedOld, 1);
  assertEquals(r.skippedGroups, 1);
  assertEquals(upserts.length, 2);
  const first = upserts[0];
  assertEquals(first.map((row) => row.direction), ["inbound", "outbound"]);
  assertEquals(first.every((row) => row.metadata.imported === true), true);
});
