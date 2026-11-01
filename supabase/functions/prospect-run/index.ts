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
// atual. Número que já passou por aqui fica em numeros_conhecidos: o aquecido (o
// pessoal do Markus) volta no ritmo dele, o resto recomeça a rampa. O teto só sobe
// com resposta de pessoa nas últimas frias (tetoComSinal). Falha com cara de
// restrição do WhatsApp pausa 24h e recomeça a rampa; três falhas comuns no mesmo
// dia pausam até o dia seguinte.
// Nada sai para uma integradora sem aprovação: só status "aprovado" é enviado,
// e o seguimento só existe para quem foi aprovado e não respondeu. Exceção decidida
// pelo Markus em 15/10/2026: a resposta padrão a quem só disse "pode falar"
// (RESPOSTA_PORTA) sai sozinha uns 2 minutos depois, das 8h às 21h.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { connectedNumber, connectionState, instanceNameFor, resolveOwnerNumber } from "../_shared/whatsappApproval.ts";
import {
  brKey, enviarRespostasPorta, firstMessage, lembretesDeConversa, followupMessage, notifyDecision, notifyOwner, prospectNumber, randomCode,
  sendHumanText, sendVoiceNote, whatsappKeys,
} from "../_shared/prospecting.ts";
import { chipAquecendo, DISTRIBUIDORA_PAUSADA_ATE, ehDistribuidora, NICHO_DISTRIBUIDORA, nextVariant, TESTE_DORES_DESDE, tetoComSinal, tetoDoChip, VARIANTS, type ProspectVariant } from "../_shared/prospectingText.ts";
import { groupJid } from "../_shared/ownerGroups.ts";
import { CORTE_ENCAIXE } from "../_shared/prospectFit.ts";
import { perfilDoNicho } from "../_shared/prospectNichos.ts";

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
      // O número que sai fica lembrado: se voltar, as conversas dele seguem valendo.
      const conhecidos = { ...(inst.numeros_conhecidos || {}) };
      if (inst.numero_chip) conhecidos[inst.numero_chip] = { ...(conhecidos[inst.numero_chip] || {}), chip_desde: inst.chip_desde };
      const volta = conhecidos[numero];
      inst.chip_desde = volta?.chip_desde ?? agora.toISOString();
      // Número com histórico volta no ritmo dele; chip que já passou por aqui
      // recomeça a rampa no dia da volta. A pausa vigente continua valendo.
      inst.rampa_desde = volta ? (volta.aquecido ? volta.rampa_desde ?? null : agora.toISOString()) : null;
      inst.falhas_envio = {};
      await admin.from("prospecting_instances").update({
        numero_chip: numero, chip_desde: inst.chip_desde, rampa_desde: inst.rampa_desde, falhas_envio: {}, numeros_conhecidos: conhecidos,
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
        const rampaNova = inst.rampa_desde ?? inst.chip_desde;
        const amanha = tetoDoChip(rampaNova, new Date(agora.getTime() + 86400000), inst.daily_cap);
        await notifyOwner(instanceName, grupo, volta?.aquecido
          ? `Voltei para o número ${numero}. Ele já tem histórico, então segue sem aquecimento: amanhã saem até ${amanha}, se o lote for aprovado.`
          : [
            volta ? `O número ${numero} voltou. Recomecei o aquecimento dele.` : `Número novo conectado (${numero}). Comecei o aquecimento do chip.`,
            `Hoje não sai nenhuma mensagem fria. Amanhã saem até ${amanha}, e o teto sobe um pouco por dia até ${inst.daily_cap}.`,
            "Conversa que começou no outro número não recebe seguimento nem lembrete por aqui. Essas você continua por lá.",
          ].join("\n\n"));
      }
      r.chip_novo = numero;
    }
    r.numero = numero;
    // A rampa pode começar antes da troca quando o dono adianta o aquecimento;
    // chip_desde continua separando as conversas do número antigo.
    const rampa = inst.rampa_desde ?? inst.chip_desde;
    const { data: ultimasFrias } = await admin.from("prospecting_allowlist").select("sent_at, replied_at, reply_kind")
      .eq("user_id", inst.user_id).gte("sent_at", inst.chip_desde ?? "1970-01-01").order("sent_at", { ascending: false }).limit(10);
    const tetoHoje = tetoComSinal(tetoDoChip(rampa, agora, inst.daily_cap), (ultimasFrias || []).map((u: any) => ({
      dia: brasilia(new Date(u.sent_at)).dia,
      pessoa: Boolean(u.replied_at) && u.reply_kind !== "automatico",
    })), dia);
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
    // Modo automático: lote pequeno, aprovado na hora, sempre que a fila aprovada esvazia.
    // Pequeno para quase nada aprovado sobrar quando o modo acaba.
    const auto = Boolean(inst.auto_ate && new Date(inst.auto_ate) > agora);
    const { count: aprovadosNaFila } = auto
      ? await admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).eq("status", "aprovado")
      : { count: 1 };
    if (!lotesHoje || (auto && !aprovadosNaFila)) {
      const tamanho = auto ? Math.min(tetoHoje, 2) : tetoHoje;
      // Só entra quem passou na qualificação (prospect-qualify), da maior nota para a menor.
      // A distribuidora é teste à parte e fica com 1 de cada 5 vagas; vaga dela que
      // sobrar vai para integradora.
      const filaDo = (distribuidora: boolean, n: number) => {
        let q = admin.from("prospecting_allowlist")
          .select("id, agency_name, city, rating_count, first_message, phone_e164, phone_tail, score, fit_score, variant, metadata, signal, niche")
          .eq("user_id", inst.user_id).eq("is_active", true).eq("status", "mapeado").gte("fit_score", CORTE_ENCAIXE)
          // Reservado para o Markus ligar (lista de ligações): não recebe WhatsApp frio.
          .is("metadata->>ligacao_em", null);
        q = distribuidora ? q.eq("niche", NICHO_DISTRIBUIDORA) : q.or(`niche.is.null,niche.neq."${NICHO_DISTRIBUIDORA}"`);
        return q.order("fit_score", { ascending: false }).limit(n);
      };
      const vagasDist = tetoHoje >= 3 && agora >= new Date(DISTRIBUIDORA_PAUSADA_ATE) ? Math.max(1, Math.round(tamanho / 5)) : 0;
      const [{ data: filaInt }, { data: filaDist }] = await Promise.all([filaDo(false, tamanho * 2), filaDo(true, vagasDist * 2)]);
      // Número sem WhatsApp falha no envio e gasta uma vaga do lote aprovado: sai antes.
      const comNumero = [...(filaDist || []), ...(filaInt || [])].filter((c: any) => prospectNumber(c));
      const temZap = await whatsappKeys(instanceName, comNumero.map((c: any) => prospectNumber(c)!));
      const semZap = temZap ? comNumero.filter((c: any) => !temZap.has(brKey(prospectNumber(c)))) : [];
      if (semZap.length) {
        await admin.from("prospecting_allowlist").update({ status: "descartado", notes: "sem WhatsApp na checagem do lote" })
          .in("id", semZap.map((c: any) => c.id));
      }
      const ok = comNumero.filter((c: any) => !semZap.includes(c));
      const dist = ok.filter((c: any) => ehDistribuidora(c.niche)).slice(0, vagasDist);
      const validos = [...dist, ...ok.filter((c: any) => !ehDistribuidora(c.niche)).slice(0, tamanho - dist.length)];
      if (validos.length) {
        // Teste de abordagens: cada nova integradora recebe a variante menos usada.
        // Só conta o que entrou no teste de dores: a encaminha tem 59 envios de antes.
        const { data: usadas } = await admin.from("prospecting_allowlist").select("variant, sent_at, status")
          .eq("user_id", inst.user_id).in("variant", VARIANTS);
        const contagem: Partial<Record<ProspectVariant, number>> = {};
        for (const u of usadas || []) {
          const noTeste = u.sent_at ? u.sent_at >= TESTE_DORES_DESDE : ["aguardando_aprovacao", "aprovado"].includes(u.status);
          if (noTeste) contagem[u.variant as ProspectVariant] = (contagem[u.variant as ProspectVariant] || 0) + 1;
        }
        for (const c of validos) {
          // Contato que voltou de lote expirado mantém versão e texto juntos: a
          // versão decide a resposta da IA (raiox oferece link) e o placar do teste.
          // Nicho novo (prospectNichos.ts) tem um texto só e fica fora do teste de dores.
          const novoNicho = Boolean(perfilDoNicho(c.niche));
          const jaTinha = Boolean((c.variant || novoNicho) && c.first_message);
          const variant: ProspectVariant | null = novoNicho ? null : jaTinha ? c.variant : ehDistribuidora(c.niche) ? "encaminha" : nextVariant(contagem);
          if (!jaTinha && variant) contagem[variant] = (contagem[variant] || 0) + 1;
          c.variant = variant;
          await admin.from("prospecting_allowlist").update({
            status: auto ? "aprovado" : "aguardando_aprovacao",
            ...(auto ? { approved_at: agora.toISOString() } : {}),
            variant,
            first_message: jaTinha ? c.first_message : firstMessage(c, variant ?? undefined),
            followup_message: followupMessage(c),
          }).eq("id", c.id);
        }
        const code = randomCode();
        await admin.from("prospecting_batches").insert({
          company_id: inst.company_id, user_id: inst.user_id, code, contact_ids: validos.map((c: any) => c.id),
          ...(auto ? { status: "aprovado", decided_at: agora.toISOString() } : {}),
        });
        const lista = validos.map((c: any, i: number) => {
          const motivos = ((c.metadata?.qualif?.motivos ?? []) as string[]).slice(0, 2).join(", ");
          const rotulo = perfilDoNicho(c.niche)?.singular ?? (ehDistribuidora(c.niche) ? "distribuidora (teste)" : null);
          return `${i + 1}. ${c.agency_name}${c.city ? ` (${c.city})` : ""}${rotulo ? ` · ${rotulo}` : ""} · nota ${c.fit_score}${motivos ? ` · ${motivos}` : ""}`;
        }).join("\n");
        const destino = (await groupJid(admin, instanceName, "prospeccao")) || ownerNumber;
        if (auto) {
          const ate = new Date(inst.auto_ate).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
          await notifyOwner(instanceName, destino, `Modo automático até ${ate}: estas saem sem 👍, uma de cada vez.\n\n${lista}`);
          r.lote = { code, contatos: validos.length, auto: true };
        } else await notifyDecision(admin, { instanceName, destino, userId: inst.user_id, code }, [
          `Bom dia. Tenho ${validos.length} abordagens prontas para hoje:`,
          lista,
          `Saem entre ${inst.window_start}h e ${inst.window_end}h, uma de cada vez, com ${chipAquecendo(rampa, agora) ? "5 a 10" : "2 a 5"} minutos entre elas.${tetoHoje < inst.daily_cap ? ` O chip ainda está aquecendo: hoje o teto é ${tetoHoje}, contando os seguimentos.` : ""}`,
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
    // Sessão caída faz todo envio falhar: sem esta checagem, três integradoras
    // ganhavam falha (e iam para o descarte) por culpa da conexão, não do número.
    const estado = await connectionState(instanceName);
    if (estado && !["open", "connected", "online"].includes(estado)) { r.desconectado = estado; continue; }
    // No dia da troca, o que saiu pelo número antigo não gasta o teto do chip novo.
    const contarDesde = inst.chip_desde && new Date(inst.chip_desde) > new Date(inicioDia) ? inst.chip_desde : inicioDia;
    const [{ count: enviadosHoje }, { count: seguimentosHoje }] = await Promise.all([
      admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).gte("sent_at", contarDesde),
      admin.from("prospecting_allowlist").select("id", { count: "exact", head: true }).eq("user_id", inst.user_id).gte("followup_sent_at", contarDesde),
    ]);
    if ((enviadosHoje || 0) + (seguimentosHoje || 0) >= tetoHoje) { r.teto_do_dia = tetoHoje; continue; }

    let consultaSeguimento = admin.from("prospecting_allowlist").select("*")
      .eq("user_id", inst.user_id).eq("status", "enviado").is("followup_sent_at", null)
      .lte("followup_due_at", agora.toISOString());
    // "Passando só pra não deixar minha mensagem solta" vindo de outro número não faz sentido.
    if (inst.chip_desde) consultaSeguimento = consultaSeguimento.gte("sent_at", inst.chip_desde);
    const { data: pendente } = await consultaSeguimento.order("followup_due_at").limit(1).maybeSingle();
    const { data: novo } = await admin.from("prospecting_allowlist").select("*")
      .eq("user_id", inst.user_id).eq("status", "aprovado")
      .order("approved_at").order("score", { ascending: false }).limit(1).maybeSingle();
    // Seguimento e primeira mensagem dividem o teto meio a meio: com fila de seguimento,
    // a primeira mensagem (e o teste de dores) ficava dias sem sair (19/10/2026, 21 na fila).
    const seguimento = pendente && (!novo || (seguimentosHoje || 0) < (enviadosHoje || 0)) ? pendente : null;
    const alvo = seguimento || novo;
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
      // "failed to send" com a sessão aberta é a restrição do WhatsApp para contato
      // novo em aparelho conectado (chip novo, 16/10/2026: "your account is restricted
      // right now", 4 horas). A culpa é do chip, não do número: pausa 24h sem marcar
      // a integradora. Insistir durante a restrição tende a alongar a próxima.
      if (/failed to send/i.test((e as Error).message) || (await connectionState(instanceName)) !== "open") {
        await admin.from("prospecting_instances").update({
          pausa_ate: new Date(agora.getTime() + 24 * 3600 * 1000).toISOString(),
          rampa_desde: agora.toISOString(), // depois da restrição, a rampa recomeça
          falhas_envio: { dia, total: 0, restricao: agora.toISOString() },
        }).eq("id", inst.id);
        r.restricao_do_chip = true;
        continue;
      }
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
    const pausaMin = chipAquecendo(rampa, agora) ? 5 + Math.random() * 5 : 2 + Math.random() * 3;
    await admin.from("prospecting_instances").update({
      next_send_at: new Date(agora.getTime() + pausaMin * 60000).toISOString(),
    }).eq("id", inst.id);
  }

  return new Response(JSON.stringify({ ok: true, dia, hora, relatorio }), { headers: { "Content-Type": "application/json" } });
});
