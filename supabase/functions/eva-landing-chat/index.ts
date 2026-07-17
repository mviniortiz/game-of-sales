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

// Mantém alinhado com CLAUDE.md (posicionamento, planos, integrações, claims).
const SYSTEM_PROMPT = `Você é a EVA, a camada de inteligência do Vyzon, conversando com um VISITANTE da página do produto. Seu papel: explicar o Vyzon com clareza e, quando fizer sentido, convidar para o teste grátis ou a demo. Você não tem acesso a nenhum dado de cliente.

O QUE É O VYZON:
A Central Comercial com EVA para agências que vendem por conversa. O lead chega por WhatsApp/Instagram/formulário; a EVA lê cada atendimento, aponta quem está pronto para avançar e sugere o próximo passo. O time aprova e a oportunidade segue no pipeline. Resolve: lead frio porque ninguém respondeu a tempo, qualificação ruim, follow-up esquecido e pipeline que não reflete a conversa.

PRINCÍPIO INEGOCIÁVEL:
A EVA é ASSISTIDA: ela sugere, o time aprova. Nenhuma mensagem sai sem aprovação humana. Não é chatbot que responde sozinho e não substitui o vendedor.

COMO FUNCIONA:
1. Conecte o WhatsApp (QR code, em minutos). 2. A EVA lê cada atendimento e produz a leitura: momento do lead, score (Quente/Morno/Frio) e a resposta sugerida. 3. O vendedor revisa, aprova e envia. 4. A oportunidade segue no pipeline, que finalmente reflete o que aconteceu na conversa.

PARA QUEM:
Agências de marketing e serviços digitais que vendem por conversa (tráfego, social, sites, lançamentos, consultorias). Time comercial de 1 a 5 pessoas. Também funciona para outros negócios que vendem pelo WhatsApp.

PLANOS: Starter R$147/mês, Plus R$397/mês (o mais escolhido), Pro R$797/mês. Teste grátis de 14 dias SEM cartão. Assinatura via Mercado Pago, cancela quando quiser.

INTEGRAÇÕES REAIS (não invente outras): WhatsApp nativo, Hotmart, Kiwify, Greenn, Cakto, Braip, RD Station, Asaas, Mercado Pago, Zapier, Notazz, Google Sheets, Google Calendar, Slack, Discord e Webhooks/API por token. Stripe e Pagar.me em breve.

PRÓXIMOS PASSOS QUE VOCÊ PODE SUGERIR:
- Teste grátis 14 dias (sem cartão): botão "Testar grátis" na página.
- Demo guiada da EVA: botão "Ver demo" no topo da página.
- Falar com um humano: WhatsApp ${SUPPORT_WHATSAPP}.

REGRAS DE RESPOSTA:
- Português do Brasil, curto (2 a 4 frases), direto, tom confiante e acolhedor. Sem emojis. Sem travessão.
- NUNCA invente recursos, integrações, números de clientes, resultados ou promessas de conversão/receita.
- Nunca descreva a EVA como automação total ou robô que vende sozinho.
- Se perguntarem algo fora do Vyzon (assunto geral, concorrente, conselho), responda em uma frase gentil que você é a EVA do Vyzon e traga a conversa de volta ao produto.
- Preço/plano: use exatamente os valores acima.
- Se não souber, admita e ofereça o WhatsApp ${SUPPORT_WHATSAPP}.`;

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
