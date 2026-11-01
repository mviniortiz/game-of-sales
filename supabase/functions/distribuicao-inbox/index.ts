// ─────────────────────────────────────────────────────────────────────────────
// DIST.0 (2026-10-22) — Porta única do time interno de distribuição (OpenBot)
// com o Vyzon. Ferramenta para gerir e crescer o Vyzon, não feature de
// cliente. Desenho em docs/distribuicao/time-de-bots.md.
//
// Os agentes rodam no Mac do Markus e nunca recebem chave do banco: falam só
// com esta edge, com o segredo DISTRIBUICAO_SECRET no header x-distribuicao-secret.
//
// action=entregar   valida o rascunho (campos, https, travessão, emoji, frases
//                   proibidas), grava em distribuicao_rascunhos e avisa o
//                   Markus no WhatsApp com código D. Nada é publicado.
// action=notificar  expira o que passou de 48h e avisa o que ficou na fila
//                   (teto diário, número caído). As rotinas do OpenBot chamam.
// action=estado     últimos rascunhos de um agente, com o desfecho.
// action=executado  o executor (fase 2/3) marca que publicou o que foi aprovado.
// action=painel     números agregados da distribuicao_painel(), sem dado pessoal.
//
// Bot de vendas (VENDAS.0, 2026-10-24): o pipeline do próprio Vyzon é o CRM das
// vendas do Vyzon. Só quem respondeu de verdade vira card (ver _shared/vendas.ts).
// action=vendas_pipeline   cards abertos da empresa Vyzon, com dias parado e se
//                          a Lume já tem retomada esperando aprovação.
// action=vendas_criar      card novo (não duplica telefone já no pipeline).
// action=vendas_atualizar  move etapa e/ou anota; nunca marca venda ganha.
//
// Prospecção de nicho novo (PROSPECT.3, 2026-10-24): o Vendedor traz empresas do
// Google Maps e elas entram na prospecção do Vyzon (prospecting_allowlist). Quem
// envia é o prospect-run, depois que o Markus aprova o lote no WhatsApp.
// action=prospeccao_adicionar  até 20 empresas por chamada; telefone repetido é ignorado.
// action=prospeccao_status     andamento das empresas de nicho novo na prospecção.
//
// O Markus é DISTRIBUICAO_USER_ID (o número dele sai da conexão de WhatsApp
// desse usuário). DISTRIBUICAO_ATIVA=false recusa novos rascunhos.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { avisarPendentes } from "../_shared/distribuicaoAprovacao.ts";
import { anexarNota, validarAtualizacao, validarEmpresaParaProspectar, validarNovoCard } from "../_shared/vendas.ts";
import { NICHOS_NOVOS, notaDoVendedor } from "../_shared/prospectNichos.ts";
import {
    AGENTES,
    MAX_PENDENTES,
    TETO_AVISOS_DIA_PADRAO,
    TETO_POR_AGENTE_DIA,
    validarRascunho,
} from "../_shared/distribuicao.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISTRIBUICAO_SECRET = Deno.env.get("DISTRIBUICAO_SECRET");
const DISTRIBUICAO_USER_ID = Deno.env.get("DISTRIBUICAO_USER_ID");
const TETO_DIA = Number(Deno.env.get("DISTRIBUICAO_TETO_DIA")) || TETO_AVISOS_DIA_PADRAO;

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function mesmoSegredo(a: string, b: string): boolean {
    const ea = new TextEncoder().encode(a);
    const eb = new TextEncoder().encode(b);
    let diff = ea.length ^ eb.length;
    for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
    return diff === 0;
}

serve(async (req) => {
    if (req.method !== "POST") return json(405, { error: "method not allowed" });
    if (!DISTRIBUICAO_SECRET || !DISTRIBUICAO_USER_ID) {
        return json(503, { error: "distribuicao nao configurada" });
    }
    if (!mesmoSegredo(req.headers.get("x-distribuicao-secret") || "", DISTRIBUICAO_SECRET)) {
        return json(401, { error: "unauthorized" });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "json invalido" });
    }
    const action = String(body.action || "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        if (action === "entregar") {
            if ((Deno.env.get("DISTRIBUICAO_ATIVA") || "true").toLowerCase() === "false") {
                return json(423, { error: "distribuicao pausada" });
            }
            const v = validarRascunho(body.rascunho);
            if (!v.ok) return json(422, { error: "rascunho recusado", erros: v.erros });
            const r = v.rascunho;

            const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
            const [{ count: doAgente }, { count: pendentes }] = await Promise.all([
                admin.from("distribuicao_rascunhos").select("id", { count: "exact", head: true })
                    .eq("agente", r.agente).gte("created_at", desde),
                admin.from("distribuicao_rascunhos").select("id", { count: "exact", head: true })
                    .eq("status", "pendente"),
            ]);
            if ((doAgente ?? 0) >= TETO_POR_AGENTE_DIA) {
                return json(429, { error: `teto de ${TETO_POR_AGENTE_DIA} rascunhos por agente a cada 24h` });
            }
            if ((pendentes ?? 0) >= MAX_PENDENTES) {
                return json(429, { error: `ja ha ${MAX_PENDENTES} rascunhos esperando o Markus` });
            }

            const { data: criado, error } = await admin
                .from("distribuicao_rascunhos")
                .insert(r)
                .select("id")
                .single();
            if (error || !criado) throw new Error(`gravar rascunho falhou: ${error?.message || "sem retorno"}`);

            // Avisa agora; se não der (teto, número caído), fica na fila para o
            // próximo notificar.
            let aviso: unknown = null;
            try {
                aviso = await avisarPendentes(admin, { donoUserId: DISTRIBUICAO_USER_ID, tetoDia: TETO_DIA, rascunhoId: criado.id });
            } catch (err) {
                aviso = { erro: (err as Error)?.message || "falha no aviso" };
            }
            return json(201, { ok: true, id: criado.id, aviso });
        }

        if (action === "notificar") {
            const aviso = await avisarPendentes(admin, { donoUserId: DISTRIBUICAO_USER_ID, tetoDia: TETO_DIA });
            return json(200, { ok: true, ...aviso });
        }

        if (action === "estado") {
            const agente = String(body.agente || "").trim();
            if (!(AGENTES as readonly string[]).includes(agente)) return json(400, { error: "agente invalido" });
            const { data, error } = await admin
                .from("distribuicao_rascunhos")
                .select("id, canal, titulo, acao_apos_aprovar, status, codigo, created_at, notificado_em, resolvido_em, texto_final, executado_em, resultado, aviso_erro")
                .eq("agente", agente)
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw new Error(error.message);
            return json(200, { ok: true, rascunhos: data || [] });
        }

        if (action === "executado") {
            const id = String(body.id || "");
            const resultado = String(body.resultado || "").trim().slice(0, 500);
            if (!id || !resultado) return json(400, { error: "id e resultado obrigatorios" });
            // Só o que o Markus aprovou, e uma vez só.
            const { data: marcou, error } = await admin
                .from("distribuicao_rascunhos")
                .update({ executado_em: new Date().toISOString(), resultado })
                .eq("id", id)
                .in("status", ["aprovado", "corrigido"])
                .is("executado_em", null)
                .select("id")
                .maybeSingle();
            if (error) throw new Error(error.message);
            if (!marcou) return json(409, { error: "rascunho nao aprovado ou ja executado" });
            return json(200, { ok: true });
        }

        // Empresa do Markus: a do usuário da distribuição, nunca do payload.
        const empresaDoMarkus = async (): Promise<string | null> => {
            const { data: profile } = await admin
                .from("profiles")
                .select("company_id")
                .eq("id", DISTRIBUICAO_USER_ID)
                .maybeSingle();
            return profile?.company_id ?? null;
        };

        if (action === "painel") {
            const companyId = await empresaDoMarkus();
            if (!companyId) return json(503, { error: "usuario da distribuicao sem empresa" });
            const { data, error } = await admin.rpc("distribuicao_painel", {
                p_company_id: companyId,
                p_dias: Number(body.dias) || 7,
            });
            if (error) throw new Error(error.message);
            return json(200, { ok: true, painel: data });
        }

        if (action === "vendas_pipeline") {
            const companyId = await empresaDoMarkus();
            if (!companyId) return json(503, { error: "usuario da distribuicao sem empresa" });
            const { data: deals, error } = await admin
                .from("deals")
                .select("id, title, account_name, customer_name, customer_phone, stage, value, source, notes, created_at, updated_at")
                .eq("company_id", companyId)
                .eq("is_active", true)
                .not("stage", "in", "(closed_won,closed_lost)")
                .order("updated_at", { ascending: true })
                .limit(100);
            if (error) throw new Error(error.message);
            const ids = (deals || []).map((d: any) => d.id);
            const pendentes = new Set<string>();
            if (ids.length) {
                const { data: sug } = await admin
                    .from("agent_suggestions")
                    .select("deal_id")
                    .in("deal_id", ids)
                    .in("status", ["pending", "agendado"]);
                for (const s of sug || []) if (s.deal_id) pendentes.add(s.deal_id);
            }
            const agora = Date.now();
            const cards = (deals || []).map((d: any) => ({
                deal_id: d.id,
                titulo: d.title,
                empresa: d.account_name,
                contato: d.customer_name,
                telefone: d.customer_phone,
                etapa: d.stage,
                valor: d.value,
                origem: d.source,
                dias_parado: Math.floor((agora - new Date(d.updated_at || d.created_at).getTime()) / 86400000),
                eva_retomada_pendente: pendentes.has(d.id),
                notas: String(d.notes || "").slice(0, 600),
            }));
            return json(200, { ok: true, cards });
        }

        if (action === "vendas_criar") {
            const v = validarNovoCard(body.card);
            if (!v.ok) return json(422, { error: "card recusado", erros: v.erros });
            const c = v.valor;
            const companyId = await empresaDoMarkus();
            if (!companyId) return json(503, { error: "usuario da distribuicao sem empresa" });
            // Mesmo número já no pipeline (aberto ou não): não duplica, devolve o existente.
            const final8 = c.telefone.slice(-8);
            const { data: existente } = await admin
                .from("deals")
                .select("id, title, stage")
                .eq("company_id", companyId)
                .like("customer_phone", `%${final8}`)
                .limit(1)
                .maybeSingle();
            if (existente) return json(409, { error: "ja existe card para este telefone", card: existente });
            const { data: criado, error } = await admin
                .from("deals")
                .insert({
                    title: `${c.empresa} · ${c.nicho}`,
                    customer_name: c.contato || c.empresa,
                    customer_phone: c.telefone,
                    account_name: c.empresa,
                    stage: c.etapa,
                    user_id: DISTRIBUICAO_USER_ID,
                    company_id: companyId,
                    additional_contacts: [{ phone: c.telefone }],
                    lead_source: "bot_vendas",
                    source: "prospeccao",
                    notes: anexarNota(c.cidade ? `Cidade: ${c.cidade}.` : null, c.nota),
                })
                .select("id, title, stage")
                .single();
            if (error || !criado) throw new Error(`criar card falhou: ${error?.message || "sem retorno"}`);
            return json(201, { ok: true, card: criado });
        }

        if (action === "prospeccao_adicionar") {
            const lista = Array.isArray(body.empresas) ? body.empresas.slice(0, 20) : [];
            if (!lista.length) return json(400, { error: "mande empresas: [...] (até 20)" });
            const companyId = await empresaDoMarkus();
            if (!companyId) return json(503, { error: "usuario da distribuicao sem empresa" });
            const agora = new Date().toISOString();
            const recusadas: Array<{ empresa: unknown; erros: string[] }> = [];
            const linhas: Record<string, unknown>[] = [];
            for (const item of lista) {
                const v = validarEmpresaParaProspectar(item, NICHOS_NOVOS);
                if (!v.ok) { recusadas.push({ empresa: (item as any)?.empresa ?? null, erros: v.erros }); continue; }
                const e = v.valor;
                const nota = notaDoVendedor(e.avaliacoes, e.estrelas);
                linhas.push({
                    company_id: companyId,
                    user_id: DISTRIBUICAO_USER_ID,
                    created_by: DISTRIBUICAO_USER_ID,
                    phone_e164: e.telefone,
                    phone_tail: e.telefone.slice(-10),
                    agency_name: e.empresa,
                    city: e.cidade,
                    niche: e.nicho,
                    rating: e.estrelas,
                    rating_count: e.avaliacoes,
                    source_url: e.maps_url,
                    score: 2,
                    fit_score: nota.nota,
                    // google_buscado true: o prospect-qualify (feito para solar) não requalifica.
                    metadata: { fonte: "vendedor", qualif: { versao: "vendedor", nota: nota.nota, motivos: nota.motivos, google_buscado: true, em: agora } },
                    ...(e.ja_contatada
                        // Já recebeu a primeira à mão: só passa a ouvir a resposta. Sem
                        // seguimento automático (o lote dela nunca foi aprovado).
                        ? {
                            status: "enviado",
                            // Data real do contato (meio-dia de Brasília); sem data, ontem.
                            sent_at: e.contatada_em ? `${e.contatada_em}T15:00:00.000Z` : new Date(Date.now() - 86400000).toISOString(),
                            followup_sent_at: agora,
                            first_message: "(primeira mensagem enviada à mão pelo Markus)",
                        }
                        : { status: "mapeado" }),
                });
            }
            let entraram: any[] = [];
            if (linhas.length) {
                const { data, error } = await admin
                    .from("prospecting_allowlist")
                    .upsert(linhas, { onConflict: "user_id,phone_tail", ignoreDuplicates: true })
                    .select("agency_name, status, fit_score");
                if (error) throw new Error(`adicionar falhou: ${error.message}`);
                entraram = data || [];
            }
            const novos = new Set(entraram.map((r: any) => r.agency_name));
            const repetidas = linhas.filter((l) => !novos.has(l.agency_name)).map((l) => l.agency_name);
            return json(200, { ok: true, entraram, repetidas, recusadas });
        }

        if (action === "prospeccao_status") {
            const { data, error } = await admin
                .from("prospecting_allowlist")
                .select("agency_name, city, niche, phone_e164, status, fit_score, sent_at, replied_at, reply_kind, last_reply, metadata")
                .eq("user_id", DISTRIBUICAO_USER_ID)
                .in("niche", NICHOS_NOVOS)
                .order("updated_at", { ascending: false })
                .limit(100);
            if (error) throw new Error(error.message);
            const empresas = (data || []).map((r: any) => ({
                empresa: r.agency_name,
                cidade: r.city,
                nicho: r.niche,
                telefone: r.phone_e164,
                status: r.status,
                nota: r.fit_score,
                enviada_em: r.sent_at,
                respondeu_em: r.replied_at,
                tipo_resposta: r.reply_kind,
                ultimas_falas: String(r.last_reply || "").slice(-400),
                deal_id: r.metadata?.deal_id ?? null,
            }));
            return json(200, { ok: true, empresas });
        }

        if (action === "vendas_atualizar") {
            const v = validarAtualizacao(body.atualizacao);
            if (!v.ok) return json(422, { error: "atualizacao recusada", erros: v.erros });
            const a = v.valor;
            const companyId = await empresaDoMarkus();
            if (!companyId) return json(503, { error: "usuario da distribuicao sem empresa" });
            const { data: deal } = await admin
                .from("deals")
                .select("id, stage, notes, pipeline_id")
                .eq("id", a.deal_id)
                .eq("company_id", companyId)
                .maybeSingle();
            if (!deal) return json(404, { error: "card nao encontrado no pipeline do Vyzon" });
            if (deal.stage === "closed_won") return json(409, { error: "venda ganha so o Markus altera" });
            const patch: Record<string, unknown> = {};
            if (a.etapa) {
                // O trigger do banco só casa stage_id no insert; no update a coluna
                // do quadro tem de andar junto, senão o card fica na coluna antiga.
                const { data: coluna } = await admin
                    .from("pipeline_stages")
                    .select("id")
                    .eq("pipeline_id", deal.pipeline_id)
                    .eq("legacy_key", a.etapa)
                    .maybeSingle();
                if (!coluna) return json(409, { error: `o funil deste card nao tem a etapa ${a.etapa}` });
                patch.stage = a.etapa;
                patch.stage_id = coluna.id;
            }
            if (a.motivo_perda) patch.loss_reason = a.motivo_perda;
            const notaFinal = a.nota || (a.etapa ? `Etapa: ${deal.stage} -> ${a.etapa}.` : null);
            if (notaFinal) patch.notes = anexarNota(deal.notes, notaFinal);
            const { data: atualizado, error } = await admin
                .from("deals")
                .update(patch)
                .eq("id", deal.id)
                .select("id, title, stage")
                .single();
            if (error) throw new Error(error.message);
            return json(200, { ok: true, card: atualizado });
        }

        return json(400, { error: `action desconhecida: ${action}` });
    } catch (err) {
        const msg = (err as Error)?.message || "erro desconhecido";
        console.error("[distribuicao-inbox]", msg);
        return json(500, { error: msg });
    }
});
