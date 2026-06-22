import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// eva-studio-chat — a EVA CONVERSA com o gestor pra montar um agente especialista
// (qualificação, follow-up, propostas ou reativação), sem formulário. A cada
// turno ela: (1) faz UMA pergunta curta, (2) reextrai os campos daquele agente
// do que o gestor já disse, (3) marca done quando estão preenchidos. Stateless;
// mesmo LLM da EVA (gpt-5.4-nano). Fail-open: sem key → {ok:false,reason:"no_key"}
// e o front cai no roteiro guiado. Não persiste nada (fluxo assistido).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// Espelho do catálogo do front (src/lib/eva/evaSpecialists.ts). Mantenha em sincronia.
interface AgentDef {
    label: string;
    focus: string;
    fields: { key: string; label: string }[];
}

const AGENTS: Record<string, AgentDef> = {
    qualificacao: {
        label: "qualificação de leads",
        focus: "montar um agente de QUALIFICAÇÃO: ler um lead novo e decidir se vale a pena seguir.",
        fields: [
            { key: "vende", label: "o que a agência vende (serviços/ofertas)" },
            { key: "icp", label: "o cliente ideal (porte, segmento, quem fecha melhor)" },
            { key: "qualifica", label: "o que descobrir de um lead novo pra saber se vale a pena" },
            { key: "redline", label: "a linha vermelha: o que NUNCA prometer ou dizer pro lead" },
        ],
    },
    followup: {
        label: "follow-up",
        focus: "montar um agente de FOLLOW-UP: retomar quem esfriou, na hora e no tom certos.",
        fields: [
            { key: "cadencia", label: "quando/em quanto tempo retomar um lead que esfriou" },
            { key: "gatilho", label: "o que dispara um follow-up (silêncio, promessa de retorno, etc.)" },
            { key: "tom", label: "o tom da retomada (leve, direto, consultivo...)" },
            { key: "parar", label: "quando parar de insistir" },
        ],
    },
    propostas: {
        label: "propostas e próximos passos",
        focus: "montar um agente de PROPOSTAS: transformar a conversa em um rascunho de proposta.",
        fields: [
            { key: "escopo", label: "o que costuma entrar numa proposta (escopo/entregáveis)" },
            { key: "preco", label: "como precifica (faixas, modelo de cobrança)" },
            { key: "provas", label: "diferenciais e provas que ajudam a fechar" },
            { key: "redline", label: "o que nunca prometer numa proposta" },
        ],
    },
    reativacao: {
        label: "reativação de clientes",
        focus: "montar um agente de REATIVAÇÃO: trazer de volta clientes parados.",
        fields: [
            { key: "alvo", label: "que tipo de cliente parado vale reabordar" },
            { key: "oferta", label: "a oferta/gancho de retorno" },
            { key: "tom", label: "o tom da reabordagem" },
            { key: "redline", label: "a linha vermelha na reativação" },
        ],
    },
};

type Fields = Record<string, string>;

function buildSystemPrompt(agent: AgentDef, priorContext?: string): string {
    const fieldList = agent.fields.map((f) => `- ${f.key}: ${f.label}`).join("\n");
    const emptyJson = JSON.stringify(Object.fromEntries(agent.fields.map((f) => [f.key, ""])));
    const priorBlock = priorContext
        ? `\nA agência JÁ configurou parte do contexto no Vyzon. Use isto e NÃO repita perguntas já respondidas: considere esses campos preenchidos, só CONFIRME rapidamente ("vi que vocês trabalham com X, certo?") e pergunte SÓ o que ainda falta. Nunca peça do zero o que já está aqui:\n${priorContext}\n`
        : "";
    return `Você é a EVA, a camada de inteligência comercial do Vyzon. Você está CONVERSANDO com o dono ou gestor de uma agência para ${agent.focus} — sem formulário, só conversa.

Preencha estes campos, conversando de forma natural e acolhedora:
${fieldList}
${priorBlock}
Conduta:
- Faça UMA pergunta por vez, curta, em português do Brasil. Sem jargão técnico.
- O gestor pode não saber "preencher campos": pergunte com as palavras dele, puxe um exemplo quando ajudar.
- A cada mensagem do gestor, ATUALIZE os campos com o que ele disse (resuma em 1 frase, não invente). Campo que ele ainda não falou fica como string vazia "".
- Nunca invente números, preços, clientes nem promessas. Use só o que ele disse.
- Quando os campos estiverem razoavelmente preenchidos, FECHE: agradeça em 1-2 frases, diga que montou a EVA e que ele revisa/ajusta o que quiser, e marque done=true.
- Seja breve, calorosa e confiante, nunca robótica.

Responda SOMENTE com JSON válido neste formato (sem texto fora do JSON):
{
  "reply": "sua próxima fala (1 a 3 frases)",
  "fields": ${emptyJson},
  "done": false
}`;
}

function sanitizeFields(raw: unknown, agent: AgentDef): Fields {
    const out: Fields = {};
    for (const f of agent.fields) out[f.key] = "";
    if (raw && typeof raw === "object") {
        for (const f of agent.fields) {
            const v = (raw as Record<string, unknown>)[f.key];
            if (typeof v === "string") out[f.key] = v.trim().slice(0, 400);
        }
    }
    return out;
}

interface Turn { from: "eva" | "user"; text: string }

async function runChat(agent: AgentDef, messages: Turn[], fields: Fields, priorContext?: string): Promise<{ reply: string; fields: Fields; done: boolean } | null> {
    if (!OPENAI_API_KEY) return null;

    const transcript = messages
        .map((m) => `${m.from === "eva" ? "EVA" : "Gestor"}: ${(m.text || "").trim()}`)
        .join("\n")
        .slice(0, 8000);

    const userContent = `Conversa até agora:\n${transcript || "(ainda sem conversa)"}\n\nCampos já capturados: ${JSON.stringify(fields)}\n\nGere o próximo passo (apenas o JSON).`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gpt-5.4-nano",
            messages: [
                { role: "system", content: buildSystemPrompt(agent, priorContext) },
                { role: "user", content: userContent },
            ],
            max_completion_tokens: 900,
            response_format: { type: "json_object" },
        }),
    });
    if (!resp.ok) return null;
    const completion = await resp.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
        const parsed = JSON.parse(String(content).replace(/```json\n?/g, "").replace(/```\n?/g, ""));
        const cleanFields = sanitizeFields(parsed.fields, agent);
        const filledCount = agent.fields.filter((f) => cleanFields[f.key].length > 0).length;
        return {
            reply: typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 800) : "",
            fields: cleanFields,
            done: parsed.done === true && filledCount >= agent.fields.length,
        };
    } catch {
        return null;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const body = await req.json().catch(() => ({}));
        const { messages, fields, agentKey, priorContext } = body as { messages?: Turn[]; fields?: unknown; agentKey?: string; priorContext?: unknown };

        const agent = AGENTS[agentKey || "qualificacao"] || AGENTS.qualificacao;
        const prior = typeof priorContext === "string" ? priorContext.trim().slice(0, 1200) : undefined;

        const turns: Turn[] = Array.isArray(messages)
            ? messages
                  .filter((m) => m && (m.from === "eva" || m.from === "user") && typeof m.text === "string")
                  .slice(-24)
            : [];
        const curFields = sanitizeFields(fields, agent);

        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
        try {
            const { data } = await admin.rpc("consume_rate_limit", {
                p_bucket: `eva-studio-chat:${ip}`,
                p_limit: 60,
                p_window_seconds: 3600,
            });
            if (data === false) return json(429, { ok: false, reason: "rate_limit", message: "Muitas mensagens. Aguarde um pouco." });
        } catch {
            /* fail-open */
        }

        const result = await runChat(agent, turns, curFields, prior);
        if (!result) return json(200, { ok: false, reason: "no_key" });

        return json(200, { ok: true, ...result });
    } catch (error) {
        console.error("[eva-studio-chat] error:", error);
        return json(500, { ok: false, reason: "error", message: "Erro ao conversar com a EVA." });
    }
});
