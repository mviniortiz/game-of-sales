// PROSPECT.2 — Roda a cada 3 minutos em dia útil (cron prospect-run-weekdays).
// Para cada instância com prospecção ativa:
//  1. expira lote não respondido em 20h (contatos voltam para "mapeado");
//  2. na primeira rodada dentro da janela, monta o lote do dia e pede aprovação
//     ao dono pelo WhatsApp ("PK4 1");
//  3. envia UMA mensagem por vez (seguimento do dia 4 primeiro, depois as
//     aprovadas), respeitando o teto diário e 2 a 5 minutos entre contatos.
// Nada sai para uma integradora sem aprovação: só status "aprovado" é enviado,
// e o seguimento só existe para quem foi aprovado e não respondeu.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { instanceNameFor, resolveOwnerNumber } from "../_shared/whatsappApproval.ts";
import {
  firstMessage, followupMessage, notifyOwner, prospectNumber, randomCode, sendHumanText, sendVoiceNote,
} from "../_shared/prospecting.ts";
import { nextVariant, type ProspectVariant } from "../_shared/prospectingText.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");
const FERIADOS = new Set(["2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25", "2027-01-01"]);
const FOLLOWUP_DIAS = 4;

function brasilia(now: Date) {
  const b = new Date(now.getTime() - 3 * 3600 * 1000);
  return { dia: b.toISOString().slice(0, 10), hora: b.getUTCHours(), semana: b.getUTCDay() };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!EVA_CRON_SECRET || req.headers.get("x-cron-secret") !== EVA_CRON_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }
  const payload = await req.json().catch(() => ({}));
  const agora = new Date();
  const { dia, hora, semana } = brasilia(agora);
  const diaUtil = semana >= 1 && semana <= 5 && !FERIADOS.has(dia);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const relatorio: any[] = [];

  const { data: instancias } = await admin.from("prospecting_instances").select("*").eq("is_active", true);
  for (const inst of instancias || []) {
    const r: any = { user: inst.user_id };
    relatorio.push(r);
    const dentro = payload?.force === true || (diaUtil && hora >= inst.window_start && hora < inst.window_end);
    if (!dentro) { r.fora_da_janela = true; continue; }
    const instanceName = instanceNameFor(inst.user_id);
    const ownerNumber = await resolveOwnerNumber(admin, instanceName);
    if (!ownerNumber) { r.erro = "número do dono não encontrado"; continue; }
    const inicioDia = new Date(`${dia}T03:00:00.000Z`).toISOString(); // 00h de Brasília

    // 1. Lote pendente há mais de 20h expira; os contatos voltam para a fila.
    const limite = new Date(agora.getTime() - 20 * 3600 * 1000).toISOString();
    const { data: velhos } = await admin.from("prospecting_batches").select("id, contact_ids")
      .eq("user_id", inst.user_id).eq("status", "pendente").lt("created_at", limite);
    for (const b of velhos || []) {
      await admin.from("prospecting_allowlist").update({ status: "mapeado" }).in("id", b.contact_ids).eq("status", "aguardando_aprovacao");
      await admin.from("prospecting_batches").update({ status: "expirado", decided_at: agora.toISOString() }).eq("id", b.id);
    }

    // 2. Lote do dia: um por dia, montado na primeira rodada da janela.
    const { count: lotesHoje } = await admin.from("prospecting_batches").select("id", { count: "exact", head: true })
      .eq("user_id", inst.user_id).gte("created_at", inicioDia);
    if (!lotesHoje) {
      const { data: fila } = await admin.from("prospecting_allowlist")
        .select("id, agency_name, city, rating_count, first_message, phone_e164, phone_tail, score, variant")
        .eq("user_id", inst.user_id).eq("is_active", true).eq("status", "mapeado").gte("score", 2)
        .order("score", { ascending: false }).order("rating_count", { ascending: false, nullsFirst: false })
        .limit(inst.daily_cap);
      const validos = (fila || []).filter((c: any) => prospectNumber(c));
      if (validos.length) {
        // Teste de abordagens: cada nova integradora recebe a variante menos usada.
        const { data: usadas } = await admin.from("prospecting_allowlist").select("variant")
          .eq("user_id", inst.user_id).not("variant", "is", null);
        const contagem: Partial<Record<ProspectVariant, number>> = {};
        for (const u of usadas || []) contagem[u.variant as ProspectVariant] = (contagem[u.variant as ProspectVariant] || 0) + 1;
        for (const c of validos) {
          const variant = nextVariant(contagem);
          contagem[variant] = (contagem[variant] || 0) + 1;
          c.variant = variant;
          await admin.from("prospecting_allowlist").update({
            status: "aguardando_aprovacao",
            variant,
            first_message: c.first_message || firstMessage(c, variant),
            followup_message: followupMessage(),
          }).eq("id", c.id);
        }
        const code = randomCode();
        await admin.from("prospecting_batches").insert({
          company_id: inst.company_id, user_id: inst.user_id, code, contact_ids: validos.map((c: any) => c.id),
        });
        const lista = validos.map((c: any, i: number) => `${i + 1}. ${c.agency_name}${c.city ? ` (${c.city})` : ""}${c.rating_count ? `, ${c.rating_count} avaliações` : ""} · versão ${c.variant}`).join("\n");
        await notifyOwner(instanceName, ownerNumber, [
          `Bom dia. Tenho ${validos.length} abordagens prontas para hoje:`,
          lista,
          `As mensagens alternam entre três versões (pergunta, número e curta) para a gente ver qual tem mais resposta. Saem entre ${inst.window_start}h e ${inst.window_end}h, com 2 a 5 minutos entre elas.`,
          `Responda ${code} 1 para enviar ou ${code} 2 para não enviar hoje.`,
        ].join("\n\n"));
        r.lote = { code, contatos: validos.length };
      }
    }

    // 3. Um envio por rodada, no ritmo.
    if (inst.next_send_at && new Date(inst.next_send_at) > agora && payload?.force !== true) { r.aguardando_ritmo = inst.next_send_at; continue; }
    const [{ count: enviadosHoje }, { count: seguimentosHoje }] = await Promise.all([
      admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).gte("sent_at", inicioDia),
      admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).gte("followup_sent_at", inicioDia),
    ]);
    if ((enviadosHoje || 0) + (seguimentosHoje || 0) >= inst.daily_cap) { r.teto_do_dia = true; continue; }

    const { data: seguimento } = await admin.from("prospecting_allowlist").select("*")
      .eq("user_id", inst.user_id).eq("status", "enviado").is("followup_sent_at", null)
      .lte("followup_due_at", agora.toISOString()).order("followup_due_at").limit(1).maybeSingle();
    const alvo = seguimento || (await admin.from("prospecting_allowlist").select("*")
      .eq("user_id", inst.user_id).eq("status", "aprovado")
      .order("approved_at").order("score", { ascending: false }).limit(1).maybeSingle()).data;
    if (!alvo) { r.nada_para_enviar = true; continue; }
    const numero = prospectNumber(alvo);
    if (!numero) {
      await admin.from("prospecting_allowlist").update({ status: "descartado", notes: "número inválido" }).eq("id", alvo.id);
      continue;
    }
    try {
      if (seguimento) {
        if (inst.followup_audio_url) await sendVoiceNote(instanceName, numero, inst.followup_audio_url);
        else await sendHumanText(instanceName, numero, alvo.followup_message || followupMessage());
        await admin.from("prospecting_allowlist").update({ followup_sent_at: agora.toISOString() }).eq("id", alvo.id);
        r.seguimento = alvo.agency_name;
      } else {
        await sendHumanText(instanceName, numero, alvo.first_message || firstMessage(alvo));
        await admin.from("prospecting_allowlist").update({
          status: "enviado",
          sent_at: agora.toISOString(),
          followup_due_at: new Date(agora.getTime() + FOLLOWUP_DIAS * 86400000).toISOString(),
        }).eq("id", alvo.id);
        r.enviado = alvo.agency_name;
      }
    } catch (e) {
      r.erro_envio = `${alvo.agency_name}: ${(e as Error).message}`;
    }
    const pausaMin = 2 + Math.random() * 3;
    await admin.from("prospecting_instances").update({
      next_send_at: new Date(agora.getTime() + pausaMin * 60000).toISOString(),
    }).eq("id", inst.id);
  }

  return new Response(JSON.stringify({ ok: true, dia, hora, relatorio }), { headers: { "Content-Type": "application/json" } });
});
