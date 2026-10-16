// PROSPECT.2 — Roda a cada 3 minutos em dia útil (cron prospect-run-weekdays).
// Para cada instância com prospecção ativa:
//  1. expira lote não respondido em 20h (contatos voltam para "mapeado");
//  2. na primeira rodada dentro da janela, monta o lote do dia e pede aprovação
//     ao dono pelo WhatsApp ("PK4 1");
//  3. envia UMA mensagem por vez (seguimento do dia 4 primeiro, depois as
//     aprovadas), respeitando o teto diário e 2 a 5 minutos entre contatos.
//  4. conversa parada do lado deles há mais de um dia ganha UM lembrete escrito
//     pela IA, que vai para o grupo pedir o 👍 do dono (lembretesDeConversa).
// Chip novo: quando o número conectado muda, começa o aquecimento (tetoDoChip):
// zero mensagens frias no dia da troca, teto que sobe por dia e pausa dobrada nas
// duas primeiras semanas. Seguimento e lembrete só para quem conversou com o número
// atual. Três falhas de envio no mesmo dia pausam a prospecção até o dia seguinte.
// Nada sai para uma integradora sem aprovação: só status "aprovado" é enviado,
// e o seguimento só existe para quem foi aprovado e não respondeu. Exceção decidida
// pelo Markus em 15/10/2026: a resposta padrão a quem só disse "pode falar"
// (RESPOSTA_PORTA) sai sozinha uns 2 minutos depois, das 8h às 21h.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { connectedNumber, instanceNameFor, resolveOwnerNumber } from "../_shared/whatsappApproval.ts";
import {
  brKey, enviarRespostasPorta, firstMessage, lembretesDeConversa, followupMessage, notifyDecision, notifyOwner, prospectNumber, randomCode,
  sendHumanText, sendVoiceNote, whatsappKeys,
} from "../_shared/prospecting.ts";
import { chipAquecendo, nextVariant, primeiroNome, tetoDoChip, type ProspectVariant } from "../_shared/prospectingText.ts";
import { groupJid } from "../_shared/ownerGroups.ts";

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
    const instanceName = instanceNameFor(inst.user_id);
    const numero = await connectedNumber(instanceName);
    if (numero && numero !== inst.numero_chip) {
      inst.chip_desde = agora.toISOString();
      inst.pausa_ate = null;
      inst.falhas_envio = {};
      await admin.from("prospecting_instances").update({
        numero_chip: numero, chip_desde: inst.chip_desde, pausa_ate: null, falhas_envio: {},
      }).eq("id", inst.id);
      // O dono continua no pessoal; o número salvo como dono era o chip antigo.
      // numero_desde faz o Inbox mostrar só as conversas do número novo.
      const { data: conn } = await admin.from("channel_connections").select("id, metadata")
        .eq("provider", "evolution").eq("external_id", instanceName).maybeSingle();
      if (conn?.id) {
        await admin.from("channel_connections")
          .update({ metadata: { ...(conn.metadata || {}), owner_jid: numero, numero_desde: inst.chip_desde } })
          .eq("id", conn.id);
      }
      const grupo = await groupJid(admin, instanceName, "prospeccao");
      if (grupo) {
        const amanha = tetoDoChip(inst.chip_desde, new Date(agora.getTime() + 86400000), inst.daily_cap);
        await notifyOwner(instanceName, grupo, [
          `Número novo conectado (${numero}). Comecei o aquecimento do chip.`,
          `Hoje não sai nenhuma mensagem fria. Amanhã saem até ${amanha}, e o teto sobe um pouco por dia até ${inst.daily_cap}.`,
          "Conversa que começou no número antigo não recebe seguimento nem lembrete por aqui. Essas você continua pelo antigo.",
        ].join("\n\n"));
      }
      r.chip_novo = numero;
    }
    r.numero = numero;
    const tetoHoje = tetoDoChip(inst.chip_desde, agora, inst.daily_cap);
    // Resposta padrão a quem disse "pode falar" sai até as 21h: quem respondeu está
    // no celular agora, e a janela de primeiro contato não vale para ela.
    if (hora >= 8 && hora < 21) {
      const destino = (await groupJid(admin, instanceName, "prospeccao")) || (await resolveOwnerNumber(admin, instanceName));
      if (destino) {
        try {
          const portas = await enviarRespostasPorta(admin, inst.user_id, instanceName, destino);
          if (portas.length) r.respostas_padrao = portas;
        } catch (e) {
          r.erro_resposta_padrao = (e as Error).message;
        }
      }
    }
    const dentro = payload?.force === true || (diaUtil && hora >= inst.window_start && hora < inst.window_end);
    if (!dentro) { r.fora_da_janela = true; continue; }
    const ownerNumber = await resolveOwnerNumber(admin, instanceName);
    if (!ownerNumber) { r.erro = "número do dono não encontrado"; continue; }
    try {
      const destinoLembrete = (await groupJid(admin, instanceName, "prospeccao")) || ownerNumber;
      const lembretes = await lembretesDeConversa(admin, inst.user_id, instanceName, destinoLembrete, inst.chip_desde);
      if (lembretes.length) r.lembretes = lembretes;
    } catch (e) {
      r.erro_lembrete = (e as Error).message;
    }
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
    if (!tetoHoje) { r.chip_aquecendo = "dia sem mensagem fria"; continue; }
    if (!lotesHoje) {
      const { data: fila } = await admin.from("prospecting_allowlist")
        .select("id, agency_name, city, rating_count, first_message, phone_e164, phone_tail, score, variant, metadata, signal")
        .eq("user_id", inst.user_id).eq("is_active", true).eq("status", "mapeado").gte("score", 2)
        .order("score", { ascending: false }).order("rating_count", { ascending: false, nullsFirst: false })
        .limit(tetoHoje * 2);
      // Número sem WhatsApp falha no envio e gasta uma vaga do lote aprovado: sai antes.
      const comNumero = (fila || []).filter((c: any) => prospectNumber(c));
      const temZap = await whatsappKeys(instanceName, comNumero.map((c: any) => prospectNumber(c)!));
      const semZap = temZap ? comNumero.filter((c: any) => !temZap.has(brKey(prospectNumber(c)))) : [];
      if (semZap.length) {
        await admin.from("prospecting_allowlist").update({ status: "descartado", notes: "sem WhatsApp na checagem do lote" })
          .in("id", semZap.map((c: any) => c.id));
      }
      const validos = comNumero.filter((c: any) => !semZap.includes(c)).slice(0, tetoHoje);
      if (validos.length) {
        // Teste de abordagens: cada nova integradora recebe a variante menos usada.
        const { data: usadas } = await admin.from("prospecting_allowlist").select("variant")
          .eq("user_id", inst.user_id).not("variant", "is", null);
        const contagem: Partial<Record<ProspectVariant, number>> = {};
        for (const u of usadas || []) contagem[u.variant as ProspectVariant] = (contagem[u.variant as ProspectVariant] || 0) + 1;
        for (const c of validos) {
          // Contato que voltou de lote expirado mantém versão e texto juntos: a
          // versão decide a resposta da IA (raiox oferece link) e o placar do teste.
          const jaTinha = Boolean(c.variant && c.first_message);
          const variant: ProspectVariant = jaTinha ? c.variant : nextVariant(contagem);
          if (!jaTinha) contagem[variant] = (contagem[variant] || 0) + 1;
          c.variant = variant;
          await admin.from("prospecting_allowlist").update({
            status: "aguardando_aprovacao",
            variant,
            first_message: jaTinha ? c.first_message : firstMessage(c, variant),
            followup_message: followupMessage(c),
          }).eq("id", c.id);
        }
        const code = randomCode();
        await admin.from("prospecting_batches").insert({
          company_id: inst.company_id, user_id: inst.user_id, code, contact_ids: validos.map((c: any) => c.id),
        });
        const lista = validos.map((c: any, i: number) => {
          const dono = primeiroNome(c.metadata?.socio);
          const sinal = c.signal ? ` · ${String(c.signal).slice(0, 80)}` : "";
          return `${i + 1}. ${c.agency_name}${c.city ? ` (${c.city})` : ""}${c.rating_count ? `, ${c.rating_count} avaliações` : ""}${dono ? ` · fala com ${dono}` : ""}${sinal} · versão ${c.variant}`;
        }).join("\n");
        const destino = (await groupJid(admin, instanceName, "prospeccao")) || ownerNumber;
        await notifyDecision(admin, { instanceName, destino, userId: inst.user_id, code }, [
          `Bom dia. Tenho ${validos.length} abordagens prontas para hoje:`,
          lista,
          `Saem entre ${inst.window_start}h e ${inst.window_end}h, uma de cada vez, com ${chipAquecendo(inst.chip_desde, agora) ? "5 a 10" : "2 a 5"} minutos entre elas.${tetoHoje < inst.daily_cap ? ` O chip ainda está aquecendo: hoje o teto é ${tetoHoje}, contando os seguimentos.` : ""}`,
        ].join("\n\n"), {
          grupo: "👍 envia hoje · 👎 não envia hoje",
          chat: `Responda ${code} 1 para enviar ou ${code} 2 para não enviar hoje.`,
        });
        r.lote = { code, contatos: validos.length };
      }
    }

    // 3. Um envio por rodada, no ritmo.
    if (inst.pausa_ate && new Date(inst.pausa_ate) > agora) { r.pausado_ate = inst.pausa_ate; continue; }
    if (inst.next_send_at && new Date(inst.next_send_at) > agora && payload?.force !== true) { r.aguardando_ritmo = inst.next_send_at; continue; }
    const [{ count: enviadosHoje }, { count: seguimentosHoje }] = await Promise.all([
      admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).gte("sent_at", inicioDia),
      admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).gte("followup_sent_at", inicioDia),
    ]);
    if ((enviadosHoje || 0) + (seguimentosHoje || 0) >= tetoHoje) { r.teto_do_dia = tetoHoje; continue; }

    let consultaSeguimento = admin.from("prospecting_allowlist").select("*")
      .eq("user_id", inst.user_id).eq("status", "enviado").is("followup_sent_at", null)
      .lte("followup_due_at", agora.toISOString());
    // "Passando só pra não deixar minha mensagem solta" vindo de outro número não faz sentido.
    if (inst.chip_desde) consultaSeguimento = consultaSeguimento.gte("sent_at", inst.chip_desde);
    const { data: seguimento } = await consultaSeguimento.order("followup_due_at").limit(1).maybeSingle();
    const alvo = seguimento || (await admin.from("prospecting_allowlist").select("*")
      .eq("user_id", inst.user_id).eq("status", "aprovado")
      .order("approved_at").order("score", { ascending: false }).limit(1).maybeSingle()).data;
    if (!alvo) { r.nada_para_enviar = true; continue; }
    const destinoAlvo = prospectNumber(alvo);
    if (!destinoAlvo) {
      await admin.from("prospecting_allowlist").update({ status: "descartado", notes: "número inválido" }).eq("id", alvo.id);
      continue;
    }
    try {
      if (seguimento) {
        if (inst.followup_audio_url) await sendVoiceNote(instanceName, destinoAlvo, inst.followup_audio_url);
        else await sendHumanText(instanceName, destinoAlvo, alvo.followup_message || followupMessage(alvo));
        await admin.from("prospecting_allowlist").update({ followup_sent_at: agora.toISOString() }).eq("id", alvo.id);
        r.seguimento = alvo.agency_name;
      } else {
        await sendHumanText(instanceName, destinoAlvo, alvo.first_message || firstMessage(alvo));
        await admin.from("prospecting_allowlist").update({
          status: "enviado",
          sent_at: agora.toISOString(),
          followup_due_at: new Date(agora.getTime() + FOLLOWUP_DIAS * 86400000).toISOString(),
        }).eq("id", alvo.id);
        r.enviado = alvo.agency_name;
      }
    } catch (e) {
      r.erro_envio = `${alvo.agency_name}: ${(e as Error).message}`;
      // Número sem WhatsApp voltaria no topo a cada rodada e travaria o lote: na
      // primeira falha vai para o fim da fila (approved_at ordena), na segunda sai.
      const falhas = (alvo.metadata?.falhas_envio || 0) + 1;
      await admin.from("prospecting_allowlist").update({
        metadata: { ...(alvo.metadata || {}), falhas_envio: falhas },
        ...(falhas >= 2
          ? { status: "descartado", notes: `envio falhou ${falhas} vezes: ${(e as Error).message}` }
          : seguimento ? {} : { approved_at: agora.toISOString() }),
      }).eq("id", alvo.id);
      // Falha em série costuma ser o WhatsApp segurando o número: insistir piora.
      const falhasHoje = (inst.falhas_envio?.dia === dia ? inst.falhas_envio.total || 0 : 0) + 1;
      const pausa = falhasHoje >= 3 ? new Date(`${dia}T03:00:00.000Z`).getTime() + 86400000 : null;
      await admin.from("prospecting_instances").update({
        falhas_envio: { dia, total: falhasHoje },
        ...(pausa ? { pausa_ate: new Date(pausa).toISOString() } : {}),
      }).eq("id", inst.id);
      const grupo = pausa ? await groupJid(admin, instanceName, "prospeccao") : null;
      if (grupo) {
        await notifyOwner(instanceName, grupo,
          `Parei a prospecção até amanhã: ${falhasHoje} envios falharam hoje. O último erro foi: ${(e as Error).message.slice(0, 160)}. Confira se o número ainda está conectado no Vyzon.`);
      }
    }
    const pausaMin = chipAquecendo(inst.chip_desde, agora) ? 5 + Math.random() * 5 : 2 + Math.random() * 3;
    await admin.from("prospecting_instances").update({
      next_send_at: new Date(agora.getTime() + pausaMin * 60000).toISOString(),
    }).eq("id", inst.id);
  }

  return new Response(JSON.stringify({ ok: true, dia, hora, relatorio }), { headers: { "Content-Type": "application/json" } });
});
