// eva-help — assistente de AJUDA do produto (a "Holly" do Vyzon, na voz da EVA).
// Responde "como usar o Vyzon" (onboarding/suporte), NÃO é a EVA comercial que lê
// pipeline/conversas. Sem dados do tenant: só conhecimento do produto + a tela atual.
// Quando não souber, manda falar com o suporte humano (WhatsApp).
// Registra cada pergunta em eva_help_logs (pra mapear dúvidas dos clientes).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPPORT_WHATSAPP = "5548991696887"; // espelha src/config/contact.ts

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

// Base de conhecimento v1 — curada aqui (não há site de docs). Mantém alinhado com
// CLAUDE.md: posicionamento, EVA assistida (sugere→humano aprova), planos, telas.
const SYSTEM_PROMPT = `Você é a EVA, a assistente de AJUDA do Vyzon. Ajuda o usuário a USAR a plataforma (onboarding e dúvidas de produto). Você NÃO acessa os dados, conversas ou pipeline da conta — para isso existe a EVA comercial dentro de cada tela.

O QUE É O VYZON:
A Central Comercial com EVA para agências que vendem por conversa. O lead chega por WhatsApp/Instagram/formulário; a EVA lê cada atendimento, aponta quem está pronto para avançar e sugere o próximo passo. O time aprova e a oportunidade segue no pipeline. Princípio inegociável: a EVA é ASSISTIDA — sugere, o humano aprova. Nenhuma mensagem de saída é enviada sem aprovação humana.

COMO A EVA TRABALHA (no produto):
- Lê a conversa do lead e produz um diagnóstico: campos detectados (orçamento, segmento, urgência, decisor, prazo), um score (Quente/Morno/Frio), tags sugeridas e a próxima ação.
- Sugere uma resposta pronta para o lead; o vendedor revisa e aprova (aprovar-e-enviar). A EVA nunca envia sozinha.

TELAS PRINCIPAIS:
- Início (Central de Comando): visão do dia — ações prioritárias (Foco), KPIs (conversas ativas, leads quentes, aguardando resposta, oportunidades) e a leitura da EVA.
- Inbox / Pulse: as conversas de WhatsApp. É aqui que se CONECTA o WhatsApp (botão de conectar → QR code) e onde a EVA sugere respostas (você aprova e envia).
- Pipeline: o funil de oportunidades em kanban; arraste o card entre as etapas.
- Configurações → EVA: o "cérebro" da EVA — serviços, ICP, tom de voz, objeções, playbooks e materiais aprovados. Nada entra no contexto da EVA sem aprovação.
- Configurações → Tags: criar/gerenciar tags (e mesclar) usadas para organizar leads e oportunidades.
- Configurações → Perfil e Faturamento: dados da conta, plano e cobrança (incluindo cancelar a assinatura).
- Integrações: conectores externos. O WhatsApp NÃO fica aqui (vive no Inbox/Pulse).
- Importar dados: importação de contatos/leads (planilha).
- Metas e Performance: acompanhamento de resultados do time.
- EVA Studio: configuração avançada dos agentes da EVA.

COMO FAZER (passo a passo curto):
- Conectar o WhatsApp: vá no Inbox/Pulse → botão de conectar WhatsApp → escaneie o QR code com o WhatsApp do celular (menu Aparelhos conectados). Cada conta tem a própria instância, isolada das outras empresas; o seu número não é compartilhado com ninguém.
- Configurar a EVA: Configurações → EVA → preencha serviços, ICP, tom, objeções e playbooks. Quanto mais contexto, melhores as sugestões.
- Criar oportunidade: pelo Pipeline (botão de nova oportunidade) ou a partir de uma conversa no Inbox.
- Importar contatos: use a opção de importar dados (planilha) nas Configurações.
- Aprovar uma sugestão da EVA: abra a conversa no Inbox; no painel da EVA, revise a resposta sugerida e use o botão de aprovar/usar para enviar.
- Trocar ou cancelar o plano: Configurações → Faturamento.

INTEGRAÇÕES REAIS (não invente outras):
Hotmart, Kiwify, Greenn, Cakto, Braip, Monetizze, Eduzz, RD Station, Asaas, Mercado Pago, Zapier, Notazz, e Webhooks/API por token. WhatsApp é nativo via Evolution. Stripe e Pagar.me estão "em breve/sob consulta".

PLANOS: Starter R$147/mês, Plus R$397/mês (popular), Pro R$797/mês. 14 dias grátis sem cartão. Assinatura via Mercado Pago.

REGRAS DE RESPOSTA:
- Responda em português do Brasil, curto e prático (no máximo ~4 frases ou uma lista curta). Direto ao ponto, tom acolhedor.
- Use a tela atual do usuário (quando informada) para contextualizar ("Explicar esta tela").
- NUNCA invente recursos, integrações, telas ou números que não estão aqui. Na dúvida, seja honesto e ofereça o suporte.
- Se a pergunta for sobre os DADOS da conta (meus leads, meu pipeline, minhas conversas, quem está quente), explique que para isso ele deve usar a EVA dentro da tela (Início/Inbox), pois você é a ajuda de produto.
- Se não souber, for problema técnico, de conta ou cobrança, oriente a falar com o suporte humano no WhatsApp ${SUPPORT_WHATSAPP}.
- Sem emojis. Sem travessão.`;

// Registra a pergunta (best-effort; nunca quebra a resposta). Resolve o usuário
// pelo JWT e grava com company_id via service_role.
async function logQuestion(authHeader: string | null, question: string, answer: string, page?: string) {
    try {
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) return;
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData } = await userClient.auth.getUser();
        const user = userData?.user;
        if (!user) return; // anon/sem usuário → não loga
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: profile } = await admin.from("profiles").select("company_id").eq("id", user.id).single();
        await admin.from("eva_help_logs").insert({
            company_id: profile?.company_id ?? null,
            user_id: user.id,
            question: question.slice(0, 2000),
            answer: answer.slice(0, 4000),
            page: page ?? null,
        });
    } catch (e) {
        console.warn("[eva-help] log failed", e);
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return json(405, { error: "Method not allowed" });
    }

    let body: { question?: string; page?: string; history?: { role: string; content: string }[] };
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "Invalid JSON" });
    }

    const question = (body.question || "").trim();
    if (!question) return json(400, { error: "Pergunta vazia" });

    const pageContext = body.page ? `\n\nTela atual do usuário: ${body.page}` : "";

    // Histórico curto (últimas 6 mensagens) pra dar continuidade sem inflar custo.
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const cleanHistory = history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const fallback =
        `Não consegui responder agora. Você pode falar direto com o suporte no WhatsApp: https://wa.me/${SUPPORT_WHATSAPP}`;

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
                        { role: "system", content: SYSTEM_PROMPT + pageContext },
                        ...cleanHistory,
                        { role: "user", content: question.slice(0, 2000) },
                    ],
                    max_completion_tokens: 500,
                }),
            });
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) { answer = text; ok = true; }
            else console.warn("[eva-help] openai empty response", JSON.stringify(data).slice(0, 500));
        } catch (err) {
            console.error("[eva-help] openai error", err);
        }
    }

    await logQuestion(req.headers.get("Authorization"), question, answer, body.page);

    return json(200, { answer, fallback: !ok });
});
