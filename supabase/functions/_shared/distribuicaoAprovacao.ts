// DIST.0 (2026-10-22) — Aviso e decisão do time interno de distribuição no
// WhatsApp do Markus. Separado da aprovação da EVA (whatsappApproval.ts) de
// propósito: daqui não sai mensagem para ninguém além do próprio Markus, e
// nada aqui mexe em agent_suggestions nem no fluxo dos clientes. Só reaproveita
// o transporte (Evolution) e a descoberta do número do dono.
//
// Quem chama: edge distribuicao-inbox (avisa) e evolution-message-webhook (lê
// a resposta "DK4 1" no chat dele com ele mesmo).

import { evolutionRequest, instanceNameFor, resolveOwnerNumber } from "./whatsappApproval.ts";
import {
    DIST_PREFIX,
    MAX_IDADE_HORAS,
    MAX_TENTATIVAS,
    parseComandoDistribuicao,
    proximoCodigo,
    proximoPasso,
    textoDoAviso,
} from "./distribuicao.ts";

const TABELA = "distribuicao_rascunhos";

async function enviar(instanceName: string, numero: string, texto: string): Promise<string | null> {
    const resp = await evolutionRequest(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({ number: numero, text: texto, delay: 600 }),
    }, 20000);
    return resp?.key?.id || null;
}

export type AvisoResultado = { avisados: number; expirados: number; pulados: Array<{ id: string; motivo: string }> };

/** Expira o que passou de 48h e leva os pendentes ao Markus, até o teto de 24h. */
export async function avisarPendentes(
    admin: any,
    opts: { donoUserId: string; tetoDia: number; rascunhoId?: string | null; agora?: Date },
): Promise<AvisoResultado> {
    const agora = opts.agora ?? new Date();
    const resultado: AvisoResultado = { avisados: 0, expirados: 0, pulados: [] };

    const limiteIdade = new Date(agora.getTime() - MAX_IDADE_HORAS * 3600 * 1000).toISOString();
    const { data: velhos } = await admin
        .from(TABELA)
        .update({ status: "expirado", codigo: null, resolvido_em: agora.toISOString() })
        .eq("status", "pendente")
        .lt("created_at", limiteIdade)
        .select("id");
    resultado.expirados = (velhos || []).length;

    const desde = new Date(agora.getTime() - 24 * 3600 * 1000).toISOString();
    const { count: jaAvisados } = await admin
        .from(TABELA)
        .select("id", { count: "exact", head: true })
        .gte("notificado_em", desde);
    let cota = opts.tetoDia - (jaAvisados ?? 0);

    let consulta = admin
        .from(TABELA)
        .select("id, canal, titulo, texto, por_que_agora, anexo_url, tentativas")
        .eq("status", "pendente")
        .is("notificado_em", null)
        .lt("tentativas", MAX_TENTATIVAS)
        .order("created_at", { ascending: true })
        .limit(10);
    if (opts.rascunhoId) consulta = consulta.eq("id", opts.rascunhoId);
    const { data: fila, error } = await consulta;
    if (error) throw new Error(`leitura da fila falhou: ${error.message}`);
    if (!fila || fila.length === 0) return resultado;

    const instanceName = instanceNameFor(opts.donoUserId);
    const { data: conn } = await admin
        .from("channel_connections")
        .select("status")
        .eq("provider", "evolution")
        .eq("external_id", instanceName)
        .maybeSingle();
    if (!conn || conn.status !== "active") {
        for (const r of fila) resultado.pulados.push({ id: r.id, motivo: "whatsapp do Markus desconectado" });
        return resultado;
    }
    const numero = await resolveOwnerNumber(admin, instanceName);
    if (!numero) {
        for (const r of fila) resultado.pulados.push({ id: r.id, motivo: "numero do Markus desconhecido" });
        return resultado;
    }

    const { data: abertos } = await admin
        .from(TABELA)
        .select("codigo")
        .eq("status", "pendente")
        .not("codigo", "is", null);
    const emUso = new Set<string>((abertos || []).map((r: any) => String(r.codigo)));

    for (const r of fila as any[]) {
        if (cota <= 0) {
            resultado.pulados.push({ id: r.id, motivo: "teto diario de avisos atingido" });
            continue;
        }
        const codigo = proximoCodigo(emUso);
        try {
            const messageId = await enviar(instanceName, numero, textoDoAviso({
                codigo,
                canal: r.canal,
                titulo: r.titulo,
                porQue: r.por_que_agora,
                texto: r.texto,
                anexoUrl: r.anexo_url,
            }));
            await admin
                .from(TABELA)
                .update({ codigo, notificado_em: agora.toISOString(), aviso_message_id: messageId, aviso_erro: null })
                .eq("id", r.id);
            emUso.add(codigo);
            cota -= 1;
            resultado.avisados += 1;
        } catch (err) {
            const msg = (err as Error)?.message || "falha desconhecida";
            await admin
                .from(TABELA)
                .update({ aviso_erro: msg.slice(0, 300), tentativas: (r.tentativas ?? 0) + 1 })
                .eq("id", r.id);
            resultado.pulados.push({ id: r.id, motivo: msg });
            // Socket do número caiu: nenhum outro aviso passa nesta rodada.
            if (/connection closed|socket|not connected|closed/i.test(msg)) break;
        }
    }
    return resultado;
}

/** Lê "DK4 1", "DK4 2" ou "DK4 <texto>" no chat do Markus com ele mesmo.
 *  Devolve false quando não é comando do time, e aí o webhook segue para os
 *  fluxos da EVA e da prospecção como sempre. */
export async function tratarComandoDistribuicao(
    admin: any,
    params: {
        userId: string | null;
        donoUserId: string | null | undefined;
        instanceName: string;
        ownerNumber: string;
        text: string;
        responder?: (texto: string) => Promise<void>;
        agora?: Date;
    },
): Promise<boolean> {
    if (!params.donoUserId || params.userId?.toLowerCase() !== params.donoUserId.toLowerCase()) return false;
    const cmd = parseComandoDistribuicao(params.text);
    if (!cmd) return false;

    const responder = params.responder ?? (async (texto: string) => {
        try {
            await enviar(params.instanceName, params.ownerNumber, `${DIST_PREFIX} ${texto}`);
        } catch (err) {
            console.warn("[distribuicao] resposta ao Markus falhou:", (err as Error)?.message);
        }
    });

    const { data: alvo } = await admin
        .from(TABELA)
        .select("id, texto, acao_apos_aprovar")
        .eq("status", "pendente")
        .eq("codigo", cmd.codigo)
        .maybeSingle();
    if (!alvo) {
        await responder(`Não achei o rascunho ${cmd.codigo}. Ele já foi resolvido ou expirou.`);
        return true;
    }

    if (cmd.intent === "ajuda") {
        await responder(`Rascunho ${cmd.codigo}: responda ${cmd.codigo} 1 para aprovar, ${cmd.codigo} 2 para descartar, ou ${cmd.codigo} seguido do texto corrigido.`);
        return true;
    }

    const agora = (params.agora ?? new Date()).toISOString();
    const patch = cmd.intent === "descartar"
        ? { status: "descartado", codigo: null, resolvido_em: agora }
        : {
            status: cmd.intent === "corrigir" ? "corrigido" : "aprovado",
            texto_final: cmd.intent === "corrigir" ? cmd.texto : alvo.texto,
            codigo: null,
            resolvido_em: agora,
        };
    const { data: mudou } = await admin
        .from(TABELA)
        .update(patch)
        .eq("id", alvo.id)
        .eq("status", "pendente")
        .select("id")
        .maybeSingle();
    if (!mudou) {
        await responder(`O rascunho ${cmd.codigo} já foi resolvido. Nada mudou.`);
        return true;
    }

    if (cmd.intent === "descartar") {
        await responder(`${cmd.codigo} descartado.`);
    } else {
        const como = cmd.intent === "corrigir" ? "aprovado com a sua correção" : "aprovado";
        await responder(`${cmd.codigo} ${como}. Nada foi publicado. ${proximoPasso(alvo.acao_apos_aprovar)}`);
    }
    return true;
}
