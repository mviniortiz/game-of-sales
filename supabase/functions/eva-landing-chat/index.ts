// eva-landing-chat — a EVA respondendo VISITANTES na landing (anônimo).
// Responde o que é o Vyzon, planos, como a EVA trabalha; convida pro Raio-X grátis.
// NÃO acessa dado de tenant nenhum. Rate-limit por IP (landing_chat_logs).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasLlmKey, llmChat } from "../_shared/llm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPPORT_WHATSAPP = "5548991696887"; // espelha src/config/contact.ts

const RATE_LIMIT_PER_HOUR = 12;

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

// Mantém alinhado com CLAUDE.md e src/config/plans.ts (posicionamento solar,
// plano único Vyzon, Raio-X grátis, integrações, claims).
const SYSTEM_PROMPT = `Você é a EVA, a camada de inteligência do Vyzon, conversando com um VISITANTE da página do produto. Seu papel: explicar o Vyzon com clareza, qualificar com UMA pergunta quando faltar contexto, e convidar para o Raio-X grátis das propostas paradas. Você não tem acesso a nenhum dado de cliente.

O QUE É O VYZON:
Vyzon é para integradores de energia solar que vendem pelo WhatsApp. A EVA acompanha cada proposta que sai do WhatsApp, avisa no 2º dia sem resposta e entrega a retomada pronta; o dono responde 1 e ela sai do número dele. Resolve proposta esquecida, cliente que sumiu e follow-up que não acontece.

PRINCÍPIO INEGOCIÁVEL:
A EVA é ASSISTIDA: sugere, humano aprova. Nenhuma mensagem sai sozinha. Não é chatbot autônomo e não substitui o vendedor. Nunca prometa automação total.

PARA QUEM (ICP):
Dono de integradora de energia solar que manda proposta em PDF pelo WhatsApp. Se o visitante não disse o que faz, faça NO MÁXIMO uma pergunta de qualificação (ex.: "vocês mandam a proposta pelo WhatsApp hoje?") e só depois aprofunde.

COMO FUNCIONA:
1. Cria a conta e conecta o WhatsApp (QR). 2. Recebe o Raio-X grátis: as propostas paradas, quanto somam e há quantos dias. 3. Com a assinatura, a EVA avisa no 2º dia sem resposta e escreve a retomada. 4. O dono aprova pelo WhatsApp e a mensagem sai do número dele.

OFERTA E PLANO (use exatamente isto; não invente outros planos):
- Raio-X grátis: criar a conta e receber o relatório das propostas paradas não custa nada.
- Vyzon: R$ 497/mês, plano único com tudo liberado, até 10 usuários e 1 WhatsApp da empresa. A cobrança é combinada com o nosso time pelo WhatsApp, com link do Mercado Pago por Pix ou cartão.
- Não existe teste grátis do plano. Não ofereça período de teste.

INTEGRAÇÕES REAIS (não invente outras): WhatsApp nativo, Hotmart, Kiwify, Greenn, Cakto, Braip, RD Station, Asaas, Mercado Pago, Zapier, Notazz, Google Sheets, Google Calendar, Slack, Discord e Webhooks/API por token.

PRÓXIMOS PASSOS:
- Raio-X grátis: botão do Raio-X na página.
- Humano: WhatsApp ${SUPPORT_WHATSAPP}.

REGRAS DE RESPOSTA:
- Português do Brasil, 2 a 4 frases, direto. Sem emojis. Sem travessão. Sem hype de IA.
- NUNCA invente features, integrações, case numbers ou promessas de receita.
- Uma pergunta de qualificação por turno, no máximo; não interrogue.
- Preço: só o plano Vyzon, R$ 497/mês. O Raio-X é grátis.
- Fora do Vyzon: uma frase e volte ao produto. Se não souber: admita e ofereça o WhatsApp.`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return json(405, { error: "Method not allowed" });
    }

    let body: { question?: string; history?: { role: string; content: string }[] };
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "Invalid JSON" });
    }

    const question = (body.question || "").trim().slice(0, 500);
    if (!question) return json(400, { error: "Pergunta vazia" });

    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Rate-limit por IP (fail-open: se a contagem falhar, responde mesmo assim).
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await admin
            .from("landing_chat_logs")
            .select("id", { count: "exact", head: true })
            .eq("ip", ip)
            .gte("created_at", oneHourAgo);
        if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
            return json(429, {
                answer: `Você fez bastante pergunta por agora. Que tal ver por dentro? Faça o Raio-X grátis das suas propostas paradas, ou fale com a gente no WhatsApp: https://wa.me/${SUPPORT_WHATSAPP}`,
                rateLimited: true,
            });
        }
    } catch (e) {
        console.warn("[eva-landing-chat] rate-limit check failed", e);
    }

    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const cleanHistory = history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

    const fallback =
        `Não consegui responder agora. Fala com a gente no WhatsApp: https://wa.me/${SUPPORT_WHATSAPP}`;

    let answer = fallback;
    let ok = false;

    if (hasLlmKey()) {
        try {
            const res = await llmChat({
                model: "gpt-5.4-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...cleanHistory,
                    { role: "user", content: question },
                ],
                max_completion_tokens: 400,
            }, { label: "eva-landing-chat" });
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) { answer = text; ok = true; }
            else console.warn("[eva-landing-chat] openai empty response", JSON.stringify(data).slice(0, 500));
        } catch (err) {
            console.error("[eva-landing-chat] openai error", err);
        }
    }

    // Log best-effort (alimenta o rate-limit e mapeia dúvidas de visitantes).
    try {
        await admin.from("landing_chat_logs").insert({ ip, question, answer: answer.slice(0, 4000) });
    } catch (e) {
        console.warn("[eva-landing-chat] log failed", e);
    }

    return json(200, { answer, fallback: !ok });
});
