// eva-landing-chat — a EVA respondendo VISITANTES na landing (anônimo).
// Responde o que é o Vyzon, planos, como a EVA trabalha; convida pra demo/teste.
// NÃO acessa dado de tenant nenhum. Rate-limit por IP (landing_chat_logs).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
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

// Mantém alinhado com CLAUDE.md (posicionamento, planos Free/Pro, integrações, claims).
const SYSTEM_PROMPT = `Você é a EVA, a camada de inteligência do Vyzon, conversando com um VISITANTE da página do produto. Seu papel: explicar o Vyzon com clareza, qualificar com UMA pergunta quando faltar contexto, e convidar para o Free ou a demo do Pro. Você não tem acesso a nenhum dado de cliente.

O QUE É O VYZON:
Central Comercial com EVA para agências brasileiras que vendem por conversa (WhatsApp). O lead chega; a EVA lê o atendimento, aponta quem está pronto e sugere o próximo passo. O time aprova. Resolve lead frio, qualificação ruim, follow-up esquecido e pipeline que não reflete a conversa.

PRINCÍPIO INEGOCIÁVEL:
A EVA é ASSISTIDA: sugere, humano aprova. Nenhuma mensagem sai sozinha. Não é chatbot autônomo e não substitui o vendedor. Nunca prometa automação total.

PARA QUEM (ICP):
Agências de marketing/serviços digitais (tráfego, social, sites, lançamentos) com time comercial pequeno (1 a 5) que vendem por WhatsApp. Se o visitante não disse o que faz, faça NO MÁXIMO uma pergunta de qualificação (ex.: "vocês vendem por WhatsApp hoje?") e só depois aprofunde.

COMO FUNCIONA:
1. Conecta o WhatsApp (QR). 2. A EVA lê e devolve momento do lead, temperatura e resposta sugerida. 3. O vendedor revisa, aprova e envia. 4. A oportunidade segue no pipeline.

PLANOS (use exatamente isto; não invente Starter/Plus antigos):
- Free: grátis pra sempre (1 usuário, 1 WhatsApp, EVA com limite diário de análises).
- Pro: R$397/mês (até 5 usuários, mais análises EVA, o plano popular).
- Escala: sob contato (times maiores).
Todo cadastro ganha 14 dias de Pro sem cartão; depois a conta degrada pro Free. Assinatura via Mercado Pago.

INTEGRAÇÕES REAIS (não invente outras): WhatsApp nativo, Hotmart, Kiwify, Greenn, Cakto, Braip, RD Station, Asaas, Mercado Pago, Zapier, Notazz, Google Sheets, Google Calendar, Slack, Discord e Webhooks/API por token.

PRÓXIMOS PASSOS:
- Começar no Free / testar o Pro 14 dias: CTA na página.
- Demo guiada da EVA: "Ver demo" no topo.
- Humano: WhatsApp ${SUPPORT_WHATSAPP}.

REGRAS DE RESPOSTA:
- Português do Brasil, 2 a 4 frases, direto. Sem emojis. Sem travessão. Sem hype de IA.
- NUNCA invente features, integrações, case numbers ou promessas de receita.
- Uma pergunta de qualificação por turno, no máximo; não interrogue.
- Preço: só Free / Pro R$397 / Escala sob contato.
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
                answer: `Você fez bastante pergunta por agora. Que tal ver por dentro? Teste grátis por 14 dias sem cartão, ou fale com a gente no WhatsApp: https://wa.me/${SUPPORT_WHATSAPP}`,
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

    if (OPENAI_API_KEY) {
        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-5.4-mini",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        ...cleanHistory,
                        { role: "user", content: question },
                    ],
                    max_completion_tokens: 400,
                }),
            });
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
