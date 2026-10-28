// Modo atendente: o que os webhooks de WhatsApp chamam a cada mensagem nova.
//   - inbound: chama a edge atendente-responder, que espera a rajada acabar,
//     decide se pode falar e responde. O webhook não espera o modelo.
//   - outbound que não é eco do atendente: o dono respondeu à mão, então a
//     conversa passa a ser dele e o atendente fica em silêncio ali.
// Empresa sem atendente_config.enabled sai na primeira consulta, sem efeito.

import { ehEcoDoAtendente } from "./atendente.ts";

function envGet(key: string): string {
    return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env?.get(key) ?? "";
}

export type MensagemNova = {
    companyId: string;
    conversationId: string;
    messageId: string;
    providerMessageId: string;
    direction: "inbound" | "outbound";
    isGroup: boolean;
    /** Kapso: 'business_app' (celular do dono) ou 'cloud_api'. QR (Whatsmiau): null. */
    origin: string | null;
};

// deno-lint-ignore no-explicit-any
export async function atendenteNaMensagem(admin: any, m: MensagemNova): Promise<void> {
    if (m.isGroup) return;
    const { data: cfg } = await admin
        .from("atendente_config")
        .select("enabled")
        .eq("company_id", m.companyId)
        .maybeSingle();
    if (!cfg?.enabled) return;

    if (m.direction === "inbound") {
        const serviceKey = envGet("SUPABASE_SERVICE_ROLE_KEY");
        const res = await fetch(`${envGet("SUPABASE_URL")}/functions/v1/atendente-responder`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
                "x-cron-secret": envGet("EVA_CRON_SECRET"),
            },
            body: JSON.stringify({ action: "responder", messageId: m.messageId }),
        }).catch((e) => {
            console.warn("[atendente] disparo falhou:", (e as Error).message);
            return null;
        });
        if (res && !res.ok) console.warn("[atendente] responder devolveu", res.status, (await res.text()).slice(0, 200));
        return;
    }

    const { data: conversa } = await admin
        .from("atendente_conversas")
        .select("estado, motivo, pausado_em, bot_message_ids, enviando_ate")
        .eq("conversation_id", m.conversationId)
        .maybeSingle();
    const eco = ehEcoDoAtendente({
        providerMessageId: m.providerMessageId,
        botMessageIds: conversa?.bot_message_ids || [],
        enviandoAte: conversa?.enviando_ate || null,
        origin: m.origin,
    });
    if (eco) return;

    const agora = new Date().toISOString();
    const jaComDono = conversa?.estado === "com_dono";
    const { error } = await admin.from("atendente_conversas").upsert(
        {
            conversation_id: m.conversationId,
            company_id: m.companyId,
            estado: "com_dono",
            motivo: jaComDono ? conversa?.motivo : "você respondeu",
            pausado_em: jaComDono ? conversa?.pausado_em || agora : agora,
            dono_respondeu_em: agora,
        },
        { onConflict: "conversation_id" },
    );
    if (error) console.warn("[atendente] pausa não gravada:", error.message);
}
