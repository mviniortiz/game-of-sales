// QUOTE.1 — "orçamento que some". Mensagem outbound que é orçamento abre um
// rastreio em quote_tracking; a eva-quote-followup volta nele depois de 2 dias
// sem resposta. Se a conversa não tem card, cria um no estágio Proposta (o
// trigger zzz_set_deal_default_pipeline resolve pipeline_id/stage_id) com o
// dono do número como user_id, que é quem recebe a aprovação no WhatsApp.
// O rastreio é gravado ANTES do card: o unique de channel_message_id é a trava
// que impede card duplicado em retry. Fire-and-forget, nunca derruba o webhook.
//
// Usado pelos webhooks de canal (evolution-message-webhook, kapso-webhook). Quem
// chama garante que a mensagem é outbound, fora de grupo e fora do chat do dono,
// e, quando guarda a mídia no Storage, só chama depois de guardar: é de lá que a
// quote-pdf-amount lê o PDF.

import { detectQuote } from "./quoteDetection.ts";

export type OutboundQuoteInput = {
    companyId: string;
    /** Dono do número: vira user_id do card e recebe a aprovação. Sem dono, vale o admin da empresa. */
    userId: string | null;
    conversationId: string;
    contactId: string | null;
    messageId: string;
    type: string;
    body: string | null;
    caption: string | null;
    fileName: string | null;
    mimetype: string | null;
    sentAt: string;
    chatPhone: string | null;
};

// Conexão sem dono (link da Kapso gerado por chamada interna, ou quem gerou foi
// apagado): o card vai pro admin mais antigo da empresa, senão pro primeiro
// perfil. deals.user_id é obrigatório; sem isso o card não nascia.
// deno-lint-ignore no-explicit-any
async function companyOwner(admin: any, companyId: string): Promise<string | null> {
    const { data: perfis } = await admin
        .from("profiles")
        .select("id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
        .limit(50);
    const ids = ((perfis ?? []) as Array<{ id: string }>).map((p) => p.id);
    if (ids.length === 0) return null;
    const { data: admins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .in("user_id", ids)
        .order("created_at", { ascending: true })
        .limit(1);
    return (admins?.[0]?.user_id as string | undefined) ?? ids[0];
}

// deno-lint-ignore no-explicit-any
export async function trackOutboundQuote(admin: any, q: OutboundQuoteInput): Promise<void> {
    try {
        const quote = detectQuote({
            type: q.type,
            body: q.body,
            caption: q.caption,
            fileName: q.fileName,
            mimetype: q.mimetype,
        });
        if (!quote.isQuote || !quote.detectedBy) return;

        const { data: tracked, error: trackErr } = await admin
            .from("quote_tracking")
            .upsert(
                {
                    company_id: q.companyId,
                    conversation_id: q.conversationId,
                    contact_id: q.contactId,
                    channel_message_id: q.messageId,
                    amount: quote.amount,
                    detected_by: quote.detectedBy,
                    sent_at: q.sentAt,
                },
                { onConflict: "channel_message_id", ignoreDuplicates: true },
            )
            .select("id");
        if (trackErr) {
            console.warn("[quote] rastreio falhou:", trackErr.message);
            return;
        }
        const quoteId = (tracked as Array<{ id: string }> | null)?.[0]?.id;
        if (!quoteId) return; // já rastreado

        // Orçamento novo substitui o anterior da mesma conversa, em qualquer fase:
        // senão o painel soma os dois como dinheiro parado.
        await admin
            .from("quote_tracking")
            .update({ status: "closed", closed_reason: "replaced" })
            .eq("conversation_id", q.conversationId)
            .is("outcome", null)
            .neq("status", "closed")
            .neq("id", quoteId);

        const { data: conv } = await admin
            .from("channel_conversations")
            .select("deal_id, contact_id")
            .eq("id", q.conversationId)
            .maybeSingle();

        let dealId: string | null = conv?.deal_id || null;
        if (dealId) {
            if (quote.amount) {
                await admin
                    .from("deals")
                    .update({ value: quote.amount })
                    .eq("id", dealId)
                    .or("value.is.null,value.eq.0");
            }
        } else {
            const contactId = conv?.contact_id || q.contactId;
            const { data: contact } = contactId
                ? await admin.from("channel_contacts").select("name, phone_e164").eq("id", contactId).maybeSingle()
                : { data: null };
            const phone = (contact?.phone_e164 as string | null) || q.chatPhone || null;
            const name = (contact?.name as string | null)?.trim() || (phone ? `+${phone}` : "Contato WhatsApp");

            const ownerId = q.userId || (await companyOwner(admin, q.companyId));
            if (!ownerId) {
                console.warn(`[quote] empresa ${q.companyId} sem usuário: rastreio ${quoteId} fica sem card`);
                return;
            }

            // Mesmo shape do useCreateOpportunityFromConversation, com stage 'proposal'.
            const dealInsert: Record<string, unknown> = {
                title: `${name} · orçamento`,
                customer_name: name,
                customer_phone: phone,
                stage: "proposal",
                user_id: ownerId,
                company_id: q.companyId,
                additional_contacts: phone ? [{ phone }] : [],
                lead_source: "whatsapp",
                source: "quote_tracking",
            };
            if (quote.amount) dealInsert.value = quote.amount;

            const { data: deal, error: dealErr } = await admin
                .from("deals")
                .insert(dealInsert)
                .select("id")
                .single();
            if (dealErr || !deal?.id) {
                console.warn("[quote] criação do card falhou:", dealErr?.message);
                return;
            }
            dealId = deal.id as string;

            // Não sobrescreve vínculo feito em paralelo; se perder a corrida, usa o vencedor.
            const { data: linked } = await admin
                .from("channel_conversations")
                .update({ deal_id: dealId })
                .eq("id", q.conversationId)
                .is("deal_id", null)
                .select("id");
            if (!linked?.length) {
                const { data: again } = await admin
                    .from("channel_conversations")
                    .select("deal_id")
                    .eq("id", q.conversationId)
                    .maybeSingle();
                if (again?.deal_id && again.deal_id !== dealId) {
                    await admin.from("deals").delete().eq("id", dealId);
                    dealId = again.deal_id as string;
                }
            }
        }

        await admin.from("quote_tracking").update({ deal_id: dealId }).eq("id", quoteId);
        console.log(`[quote] rastreio ${quoteId} conversa=${q.conversationId} deal=${dealId} via=${quote.detectedBy} valor=${quote.amount ?? "-"}`);

        // PDF sem valor na legenda: o preço está dentro do arquivo.
        if (quote.detectedBy === "pdf" && quote.amount === null) {
            const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/quote-pdf-amount`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ quote_id: quoteId }),
            });
            console.log(`[quote] valor do PDF ${quoteId}: ${res.status} ${(await res.text()).slice(0, 200)}`);
        }
    } catch (e) {
        console.warn("[quote] ignorado (erro):", (e as { message?: string })?.message || e);
    }
}
