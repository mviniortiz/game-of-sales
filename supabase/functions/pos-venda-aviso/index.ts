// Obras: aviso de etapa atrasada (cron pos-venda-aviso, dia útil 9h BRT).
// Junta por dono do card as obras que passaram do prazo que a empresa definiu e
// manda UM aviso no WhatsApp dele (grupo "eva", ou o chat com ele mesmo). Aviso
// interno: nada sai para o cliente. avisado_em evita repetir todo dia (volta a
// avisar depois de 7 dias ou quando a etapa muda).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isServiceCall } from "../_shared/serviceAuth.ts";
import { EVA_PREFIX, evolutionRequest, instanceNameFor, resolveOwnerNumber } from "../_shared/whatsappApproval.ts";
import { groupJid } from "../_shared/ownerGroups.ts";
import { precisaAvisar, textoDoAviso, type Etapa, type ObraAviso } from "../_shared/posVenda.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FERIADOS = new Set(["2026-11-15", "2026-11-20", "2026-12-25", "2027-01-01"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!isServiceCall(req)) return new Response("unauthorized", { status: 401 });
  const payload = await req.json().catch(() => ({}));
  const agora = new Date();
  const dia = new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  if (FERIADOS.has(dia) && payload?.force !== true) return json({ ok: true, feriado: dia });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: obras, error } = await admin.from("obras")
    .select("id, company_id, cliente, etapa, com_quem, etapa_desde, avisado_em, deals(user_id, closer_id, is_active)")
    .neq("etapa", "ligada").limit(1000);
  if (error) return json({ ok: false, erro: error.message }, 500);

  const prazosPor = new Map<string, Record<string, unknown> | null>();
  const pagoPor = new Map<string, boolean>();
  const porDono = new Map<string, { company: string; obras: ObraAviso[] }>();

  for (const o of (obras || []) as any[]) {
    // Card escondido pela troca de número não gera aviso; obra sem card, sim.
    if (o.deals && o.deals.is_active === false) continue;
    const dono = o.deals?.closer_id || o.deals?.user_id;
    if (!dono) continue;
    if (!pagoPor.has(o.company_id)) {
      const { data: pago } = await admin.rpc("company_is_paid", { p_company_id: o.company_id });
      pagoPor.set(o.company_id, pago === true);
    }
    if (!pagoPor.get(o.company_id)) continue;
    if (!prazosPor.has(o.company_id)) {
      const { data } = await admin.from("obra_prazos").select("prazos").eq("company_id", o.company_id).maybeSingle();
      prazosPor.set(o.company_id, (data?.prazos as Record<string, unknown>) ?? null);
    }
    const aviso: ObraAviso = {
      id: o.id, etapa: o.etapa as Etapa, etapa_desde: o.etapa_desde, avisado_em: o.avisado_em,
      cliente: o.cliente || "Cliente", com_quem: o.com_quem,
    };
    if (!precisaAvisar(aviso, prazosPor.get(o.company_id) ?? null, agora)) continue;
    const g = porDono.get(dono) ?? { company: o.company_id as string, obras: [] as ObraAviso[] };
    g.obras.push(aviso);
    porDono.set(dono, g);
  }

  const relatorio: any[] = [];
  for (const [dono, g] of porDono) {
    const instanceName = instanceNameFor(dono);
    const grupo = await groupJid(admin, instanceName, "eva");
    const destino = grupo || (await resolveOwnerNumber(admin, instanceName));
    if (!destino) { relatorio.push({ dono, erro: "sem número do dono" }); continue; }
    const texto = textoDoAviso(g.obras.slice(0, 15), prazosPor.get(g.company) ?? null, agora);
    try {
      await evolutionRequest(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({ number: destino, text: grupo ? texto : `${EVA_PREFIX} ${texto}`, delay: 600 }),
      }, 20000);
      await admin.from("obras").update({ avisado_em: agora.toISOString() }).in("id", g.obras.map((o) => o.id));
      relatorio.push({ dono, avisadas: g.obras.length });
    } catch (e) {
      relatorio.push({ dono, erro: (e as Error).message.slice(0, 160) });
    }
  }
  return json({ ok: true, dia, relatorio });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
