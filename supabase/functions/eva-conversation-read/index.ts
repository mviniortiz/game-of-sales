// EVA.READ.1: a EVA lê a conversa depois de 3 minutos de silêncio, não cada
// mensagem. O webhook marca channel_conversations.eva_read_due_at; o cron
// trigger_eva_conversation_read chama esta função a cada minuto, que pega as
// vencidas (claim_eva_reads) e manda a conversa inteira para a whatsapp-copilot
// em modo serviço. Só lê conversa que vale o custo: com card, com orçamento
// aberto ou de lead novo (até 24h). Assistido: a leitura fica no painel da EVA,
// nada sai para o lead.
//
// Invocação: POST com x-cron-secret (cron) ou Bearer service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CLAIM_LIMIT = 20;
const PARALLEL = 4;
const MAX_MESSAGES = 30;
const NEW_LEAD_HOURS = 24;

type Claimed = { conversation_id: string; company_id: string; contact_id: string; deal_id: string | null; created_at: string };

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Dono que ativou o Qualificador; sem ele a empresa não tem leitura automática. */
async function qualifierOwner(companyId: string, cache: Map<string, string | null>): Promise<string | null> {
    if (cache.has(companyId)) return cache.get(companyId)!;
    const { data } = await supabase
        .from("eva_blueprints")
        .select("approved_by, created_by")
        .eq("company_id", companyId)
        .eq("agent_key", "qualifier")
        .eq("status", "approved_assisted")
        .limit(1)
        .maybeSingle();
    const owner = data ? (data.approved_by || data.created_by || null) : null;
    cache.set(companyId, owner);
    return owner;
}

async function hasOpenQuote(conversationId: string): Promise<boolean> {
    const { count } = await supabase
        .from("quote_tracking")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .is("outcome", null)
        .neq("status", "closed");
    return (count ?? 0) > 0;
}

async function readOne(c: Claimed, owners: Map<string, string | null>): Promise<string> {
    const ownerUserId = await qualifierOwner(c.company_id, owners);
    if (!ownerUserId) return "sem-qualificador";

    const isNewLead = Date.now() - new Date(c.created_at).getTime() < NEW_LEAD_HOURS * 3_600_000;
    if (!c.deal_id && !isNewLead && !(await hasOpenQuote(c.conversation_id))) return "fora-do-escopo";

    const { data: contact } = await supabase
        .from("channel_contacts")
        .select("name, phone_e164, is_group")
        .eq("id", c.contact_id)
        .maybeSingle();
    if (!contact || contact.is_group || !contact.phone_e164) return "sem-telefone";

    const { data: rows } = await supabase
        .from("channel_messages")
        .select("body, direction")
        .eq("conversation_id", c.conversation_id)
        .not("body", "is", null)
        .order("message_timestamp", { ascending: false })
        .limit(MAX_MESSAGES);
    const messages = (rows ?? [])
        .filter((m) => String(m.body).trim())
        .reverse()
        .map((m) => ({ text: String(m.body), sender: m.direction === "outbound" ? "me" : "them" }));
    if (!messages.some((m) => m.sender === "them")) return "sem-mensagem-do-cliente";

    const phone = String(contact.phone_e164);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-copilot`, {
        method: "POST",
        headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            autoQualify: true,
            company_id: c.company_id,
            ownerUserId,
            contactPhone: phone.startsWith("+") ? phone : `+${phone}`,
            contactName: contact.name || null,
            messages,
        }),
    });
    if (!res.ok) {
        console.warn(`[eva-read] copilot ${res.status} conv=${c.conversation_id}: ${(await res.text()).slice(0, 200)}`);
        return `erro-${res.status}`;
    }
    return "lida";
}

serve(async (req) => {
    const bearer = (req.headers.get("authorization") || "").replace(/^bearer\s+/i, "").trim();
    const cronOk = EVA_CRON_SECRET && req.headers.get("x-cron-secret") === EVA_CRON_SECRET;
    if (!cronOk && bearer !== SERVICE_ROLE_KEY) return json(401, { error: "unauthorized" });

    const { data: claimed, error } = await supabase.rpc("claim_eva_reads", { p_limit: CLAIM_LIMIT });
    if (error) return json(500, { error: error.message });

    const owners = new Map<string, string | null>();
    const queue = [...((claimed ?? []) as Claimed[])];
    const tally: Record<string, number> = {};
    await Promise.all(
        Array.from({ length: PARALLEL }, async () => {
            for (let c = queue.shift(); c; c = queue.shift()) {
                const r = await readOne(c, owners).catch((e) => `erro-${(e as Error).message}`);
                tally[r] = (tally[r] ?? 0) + 1;
            }
        }),
    );
    console.log(`[eva-read] ${claimed?.length ?? 0} conversas:`, JSON.stringify(tally));
    return json(200, { claimed: claimed?.length ?? 0, tally });
});
