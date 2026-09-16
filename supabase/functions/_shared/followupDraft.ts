// Rascunho de follow-up por LLM, compartilhado por eva-stale-deal-followup
// (deal parado) e eva-quote-followup (orçamento sem resposta, QUOTE.1).
// Só gera texto: quem chama grava em agent_suggestions e a saída segue pela
// aprovação no WhatsApp do dono.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

export type FollowupPrompt = { system: string; user: string };
export type FollowupDraft = { suggestion_text: string; message_draft: string };

export type FollowupDeal = {
    id: string;
    company_id: string;
    title: string;
    value: number | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    account_name: string | null;
    additional_contacts: Array<{ name?: string; email?: string; phone?: string; role?: string }>;
    stage: string;
    sdr_id: string | null;
    closer_id: string | null;
    handoff_at: string | null;
    sla_breach_at: string | null;
    updated_at: string;
    notes: string | null;
    lead_source: string | null;
    last_note_content?: string | null;
    last_activity_description?: string | null;
};

export function daysBetween(from: string, to: Date = new Date()): number {
    return Math.floor((to.getTime() - new Date(from).getTime()) / 86400000);
}

function formatBRL(value: number | null | undefined): string | null {
    if (!value) return null;
    return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function buildSlaContext(deal: Pick<FollowupDeal, "sla_breach_at">): string | null {
    if (!deal.sla_breach_at) return null;
    const now = Date.now();
    const breach = new Date(deal.sla_breach_at).getTime();
    const hoursRemaining = (breach - now) / 3600000;
    if (hoursRemaining < 0) {
        return `SLA VENCIDO há ${Math.abs(Math.round(hoursRemaining))}h`;
    }
    if (hoursRemaining < 12) {
        return `SLA vencendo em ${Math.round(hoursRemaining)}h (urgente)`;
    }
    if (hoursRemaining < 48) {
        return `SLA vencendo em ${Math.round(hoursRemaining)}h`;
    }
    return null;
}

export function buildPrompt(deal: FollowupDeal): FollowupPrompt {
    const daysStale = daysBetween(deal.updated_at);
    const sla = buildSlaContext(deal);
    const valueBRL = formatBRL(deal.value) ?? "valor não definido";

    const stakeholders = (deal.additional_contacts || [])
        .filter((c) => c?.name || c?.email)
        .map((c) => `${c.name ?? "?"}${c.role ? ` (${c.role})` : ""}`)
        .join(", ");

    const contactName = deal.customer_name || deal.account_name || "cliente";
    const firstName = contactName.split(" ")[0];

    const system = `Você é Eva, SDR/assistente comercial brasileira do CRM Vyzon. Sua missão: gerar uma sugestão de follow-up no WhatsApp para um deal parado. Tom brasileiro de vender: direto, curto, humano, zero corporativês. Máximo 3 parágrafos curtos. Sempre em pt-BR.

REGRAS:
- Nunca inventar informação que não está no contexto
- Chamar pelo primeiro nome do contato
- Começar com contexto leve ("passando pra retomar", "fiquei pensando no nosso papo")
- Fechar com UMA pergunta ou CTA claro
- Se SLA vencido, tom de urgência discreta (não apavorar)
- Sem emojis
- Sem "tudo bem?" ou "espero que esteja bem" (clichê)`;

    const user = `DEAL PARADO PRECISANDO FOLLOW-UP:

Título: ${deal.title}
Conta/Empresa: ${deal.account_name || "—"}
Contato principal: ${contactName}
Valor: ${valueBRL}
Estágio atual: ${deal.stage}
Origem: ${deal.lead_source || "—"}
${stakeholders ? `Stakeholders: ${stakeholders}` : ""}
${sla ? `⚠️ ${sla}` : ""}

Dias sem atualização: ${daysStale}
Último update: ${deal.updated_at}
${deal.notes ? `Notas do deal: ${deal.notes.slice(0, 400)}` : ""}
${deal.last_note_content ? `Última nota: ${deal.last_note_content.slice(0, 300)}` : ""}
${deal.last_activity_description ? `Última atividade: ${deal.last_activity_description.slice(0, 200)}` : ""}

Gere JSON com esta estrutura exata:
{
  "suggestion_text": "Uma linha resumindo por que esse follow-up agora (20-30 palavras)",
  "message_draft": "Mensagem de WhatsApp pronta pro ${firstName}, tom brasileiro de vender, 2-3 parágrafos curtos, termina com CTA claro"
}

Retorne APENAS o JSON, nada fora dele.`;

    return { system, user };
}

export type QuotePromptInput = {
    contactName: string | null;
    daysSinceQuote: number;
    amount: number | null;
    detectedBy: "pdf" | "text";
    dealTitle?: string | null;
    stage?: string | null;
};

// Orçamento enviado e o lead sumiu. O rascunho não repete valor de propósito:
// mensagem aprovada volta pelo webhook como outbound, e valor + "orçamento" no
// texto abriria um novo rastreio em cima do follow-up.
export function buildQuotePrompt(q: QuotePromptInput): FollowupPrompt {
    const contactName = q.contactName || "cliente";
    const firstName = contactName.split(" ")[0];
    const quando = q.daysSinceQuote === 1 ? "ontem" : `há ${q.daysSinceQuote} dias`;
    const formato = q.detectedBy === "pdf" ? "em PDF" : "por mensagem";

    const system = `Você é Eva, assistente comercial brasileira do Vyzon. Sua missão: escrever uma retomada curta no WhatsApp para um lead que recebeu um orçamento e não respondeu. Sempre em pt-BR.

REGRAS:
- Tom leve, de quem lembra sem cobrar. Nada de pressão, urgência ou escassez
- Chamar pelo primeiro nome do contato
- Citar que o orçamento foi enviado ${quando}, sem soar como cobrança
- No máximo 2 parágrafos curtos
- Terminar com UMA pergunta simples, fácil de responder
- Não repetir valores, preços nem condições do orçamento
- Nunca inventar informação que não está no contexto
- Sem emojis
- Sem "tudo bem?" ou "espero que esteja bem" (clichê)`;

    const user = `ORÇAMENTO SEM RESPOSTA:

Contato: ${contactName}
Orçamento enviado ${formato} ${quando}
${formatBRL(q.amount) ? `Valor do orçamento (só contexto, não citar): ${formatBRL(q.amount)}` : ""}
${q.dealTitle ? `Oportunidade: ${q.dealTitle}` : ""}
${q.stage ? `Estágio: ${q.stage}` : ""}

Gere JSON com esta estrutura exata:
{
  "suggestion_text": "Uma linha dizendo por que retomar agora (15-25 palavras)",
  "message_draft": "Mensagem de WhatsApp pronta pro ${firstName}, leve, até 2 parágrafos curtos, termina com uma pergunta"
}

Retorne APENAS o JSON, nada fora dele.`;

    return { system, user };
}

// Provider dispatch: Claude Haiku se tiver ANTHROPIC_API_KEY, senão OpenAI gpt-4o-mini
export async function callLLM(prompt: FollowupPrompt): Promise<FollowupDraft | null> {
    if (ANTHROPIC_API_KEY) {
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-haiku-4-5-20251001",
                    max_tokens: 800,
                    system: prompt.system,
                    messages: [{ role: "user", content: prompt.user }],
                }),
            });
            if (!res.ok) {
                console.error("[followup-draft] anthropic error", res.status, await res.text());
                return null;
            }
            const data = await res.json();
            const text = data?.content?.[0]?.text ?? "";
            return extractJson(text);
        } catch (e) {
            console.error("[followup-draft] anthropic threw", e);
            return null;
        }
    }
    if (OPENAI_API_KEY) {
        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: prompt.system },
                        { role: "user", content: prompt.user },
                    ],
                    response_format: { type: "json_object" },
                    max_completion_tokens: 800,
                }),
            });
            if (!res.ok) {
                console.error("[followup-draft] openai error", res.status, await res.text());
                return null;
            }
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content ?? "";
            return extractJson(text);
        } catch (e) {
            console.error("[followup-draft] openai threw", e);
            return null;
        }
    }
    console.error("[followup-draft] no LLM key configured");
    return null;
}

function extractJson(text: string): FollowupDraft | null {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        const raw = match ? match[0] : text;
        const parsed = JSON.parse(raw);
        if (typeof parsed.suggestion_text === "string" && typeof parsed.message_draft === "string") {
            return {
                suggestion_text: parsed.suggestion_text.trim(),
                message_draft: parsed.message_draft.trim(),
            };
        }
    } catch {}
    return null;
}
