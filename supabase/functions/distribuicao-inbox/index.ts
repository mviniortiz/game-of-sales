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
// O Markus é DISTRIBUICAO_USER_ID (o número dele sai da conexão de WhatsApp
// desse usuário). DISTRIBUICAO_ATIVA=false recusa novos rascunhos.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { avisarPendentes } from "../_shared/distribuicaoAprovacao.ts";
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

        if (action === "painel") {
            const { data: profile } = await admin
                .from("profiles")
                .select("company_id")
                .eq("id", DISTRIBUICAO_USER_ID)
                .maybeSingle();
            if (!profile?.company_id) return json(503, { error: "usuario da distribuicao sem empresa" });
            const { data, error } = await admin.rpc("distribuicao_painel", {
                p_company_id: profile.company_id,
                p_dias: Number(body.dias) || 7,
            });
            if (error) throw new Error(error.message);
            return json(200, { ok: true, painel: data });
        }

        return json(400, { error: `action desconhecida: ${action}` });
    } catch (err) {
        const msg = (err as Error)?.message || "erro desconhecido";
        console.error("[distribuicao-inbox]", msg);
        return json(500, { error: msg });
    }
});
