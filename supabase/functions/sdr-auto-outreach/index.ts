import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <noreply@vyzon.com.br>";
const SDR_REPLY_TO = Deno.env.get("SDR_REPLY_TO") || "mviniciusortiz48@gmail.com";
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const SDR_EVOLUTION_INSTANCE = Deno.env.get("SDR_EVOLUTION_INSTANCE"); // WhatsApp instance to send from
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SDR_NAME = Deno.env.get("SDR_NAME") || "Markus";
const CALENDLY_URL = Deno.env.get("CALENDLY_URL") || "https://calendly.com/mviniciusortiz48/demo-vyzon-com-br";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Strip non-digits and ensure country code 55 (Brazil) prefix
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // If starts with DDD (10-11 digits), prepend 55
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0];
}

async function generateSDRMessage(lead: {
  name: string | null;
  email: string;
  company: string | null;
  phone: string;
}, channel: "whatsapp" | "email", modelOverride?: string): Promise<{ subject?: string; body: string }> {
  const model = modelOverride || "gpt-5.4-mini";
  const greeting = lead.name ? `Oi ${firstName(lead.name)}` : "Oi";
  const companyContext = lead.company
    ? ` Vi que você é da ${lead.company}.`
    : "";

  // If no OpenAI API key, use fallback template
  if (!OPENAI_API_KEY) {
    if (channel === "whatsapp") {
      return {
        body: `${greeting}! Aqui é o ${SDR_NAME} do Vyzon.

Vi que você acabou de agendar uma demonstração.${companyContext}

Pra eu preparar a demo focada no que faz mais sentido pra você, me conta rapidinho:

- Quantos vendedores tem no time hoje?
- Qual o maior desafio de vendas que você tá enfrentando?

Qualquer dúvida antes da nossa call, é só me chamar por aqui.`,
      };
    }
    return {
      subject: `${greeting}, sua demo do Vyzon está agendada`,
      body: `${greeting}!

Aqui é o ${SDR_NAME} do Vyzon. Quero te confirmar que sua demonstração está agendada.${companyContext}

Pra eu preparar a demo focada no que faz mais sentido pra você, me responde rapidinho:

- Quantos vendedores tem no time hoje?
- Qual o maior desafio de vendas que você tá enfrentando?

Na call eu vou te mostrar como o Vyzon resolve esses pontos especificamente.

Qualquer dúvida antes da call, é só responder esse email.`,
    };
  }

  // Use OpenAI for personalized message (gpt-5.4-mini, same model as Eva/report-agent)
  try {
    const systemPrompt = channel === "whatsapp"
      ? `Você é ${SDR_NAME} do Vyzon, um CRM gamificado para times de vendas. Seu tom é amigável, direto, brasileiro, usando linguagem casual de WhatsApp. Mensagem curta (máx 600 caracteres). NUNCA use emojis. NUNCA use markdown. NUNCA se apresente como "SDR" ou "Sales Development Representative" — só diga o nome e que é do Vyzon. NUNCA repita a construção "Vi que..." em frases consecutivas — varie a estrutura. Se mencionar a empresa, incorpore naturalmente (ex: "tô vendo que você é da ACME") em vez de começar com "Vi que você é da...". Quebras de linha naturais.

Retorne APENAS JSON no formato: {"body": "texto da mensagem"}`
      : `Você é ${SDR_NAME} do Vyzon, um CRM gamificado para times de vendas. Seu tom é profissional mas caloroso, brasileiro. Email deve ser direto, conciso, e terminar com assinatura. Use texto plano (sem markdown/HTML). NUNCA use emojis. NUNCA se apresente como "SDR" ou "Sales Development Representative" — só diga o nome e que é do Vyzon. NUNCA repita a construção "Vi que..." em frases consecutivas — varie a estrutura. Se mencionar a empresa, incorpore naturalmente no texto em vez de repetir o padrão "Vi que você é da...".

Retorne JSON no formato: {"subject": "...", "body": "..."}`;

    const userPrompt = channel === "whatsapp"
      ? `Escreva uma mensagem de WhatsApp para um lead que acabou de agendar uma demonstração do Vyzon.

Dados do lead:
- Nome: ${lead.name || "não informado"}
- Empresa: ${lead.company || "não informada"}

A mensagem deve:
1. Cumprimentar pelo nome (se tiver)
2. Se apresentar brevemente (só nome e "do Vyzon", sem mencionar cargo)
3. Reconhecer o agendamento
4. Fazer 2 perguntas de qualificação: (a) tamanho do time de vendas, (b) maior desafio atual
5. Convidar a tirar dúvidas

Lembre: sem emojis, sem mencionar "SDR".`
      : `Escreva um email para um lead que acabou de agendar uma demonstração do Vyzon.

Dados do lead:
- Nome: ${lead.name || "não informado"}
- Empresa: ${lead.company || "não informada"}
- Email: ${lead.email}

O email deve:
1. Ter assunto curto e direto (sem emojis)
2. Cumprimentar pelo nome (se tiver)
3. Se apresentar brevemente (só nome e "do Vyzon", sem mencionar cargo)
4. Confirmar o agendamento
5. Fazer 2 perguntas de qualificação: tamanho do time e maior desafio
6. Fechar com algo como "qualquer dúvida antes da call, é só responder"

IMPORTANTE:
- NÃO inclua assinatura no final (já há no template)
- NÃO inclua link do Calendly no texto (já há botão de reagendar no template)
- NÃO mencione "SDR" nem use emojis
- Tom profissional mas caloroso, brasileiro, direto`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[sdr] OpenAI API error:", response.status, await response.text());
      throw new Error("OpenAI API failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    const parsed = JSON.parse(content);

    if (channel === "whatsapp") {
      return { body: parsed.body || "" };
    }
    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    console.error("[sdr] OpenAI generation failed, using hardcoded fallback:", err);
    if (channel === "whatsapp") {
      return {
        body: `${greeting}! Aqui é o ${SDR_NAME} do Vyzon.

Vi que você acabou de agendar uma demonstração.${companyContext}

Pra eu preparar a demo focada no que faz mais sentido pra você, me conta rapidinho:

- Quantos vendedores tem no time hoje?
- Qual o maior desafio de vendas que você tá enfrentando?

Qualquer dúvida antes da nossa call, é só me chamar por aqui.`,
      };
    }
    return {
      subject: `${greeting}, sua demo do Vyzon está agendada`,
      body: `${greeting}!

Aqui é o ${SDR_NAME} do Vyzon. Quero te confirmar que sua demonstração está agendada.${companyContext}

Pra eu preparar a demo focada no que faz mais sentido pra você, me responde rapidinho:

- Quantos vendedores tem no time hoje?
- Qual o maior desafio de vendas que você tá enfrentando?

Na call eu vou te mostrar como o Vyzon resolve esses pontos especificamente.

Qualquer dúvida antes da call, é só responder esse email.`,
    };
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<{ sent: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !SDR_EVOLUTION_INSTANCE) {
    const err = `Evolution API not configured: url=${!!EVOLUTION_API_URL}, key=${!!EVOLUTION_API_KEY}, instance=${!!SDR_EVOLUTION_INSTANCE}`;
    console.warn("[sdr] " + err);
    return { sent: false, error: err };
  }

  const normalizedPhone = normalizePhone(phone);
  const url = `${EVOLUTION_API_URL}/message/sendText/${SDR_EVOLUTION_INSTANCE}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: message,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[sdr] WhatsApp send failed:", res.status, errorText);
      return { sent: false, error: `${res.status}: ${errorText.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[sdr] WhatsApp send error:", err);
    return { sent: false, error: String(err?.message || err) };
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    const err = "Resend API not configured";
    console.warn("[sdr] " + err);
    return { sent: false, error: err };
  }

  // Convert plain text body to HTML paragraphs (preserve line breaks + bullet lists)
  const bodyHtml = body.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    // Render "- item" as a bullet
    if (/^-\s+/.test(trimmed)) {
      return `<p style="margin:0 0 8px 0;padding-left:16px;color:#CCFFFF;font-size:16px;line-height:1.6;">• ${trimmed.replace(/^-\s+/, "")}</p>`;
    }
    return `<p style="margin:0 0 16px 0;color:#CCFFFF;font-size:16px;line-height:1.6;">${trimmed}</p>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0E1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0E1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#11152A;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(16,183,127,0.15);">
          <!-- Header com logo -->
          <tr>
            <td style="padding:40px 40px 24px 40px;text-align:center;">
              <img src="https://vyzon.com.br/logo.png" alt="Vyzon" width="140" style="display:block;margin:0 auto;max-width:140px;height:auto;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 40px 16px 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA: reagendar -->
          <tr>
            <td style="padding:16px 40px 32px 40px;text-align:center;">
              <a href="${CALENDLY_URL}" style="display:inline-block;background-color:#10B77F;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;box-shadow:0 4px 16px rgba(16,183,127,0.3);">
                Ver ou reagendar minha demo
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #1F2540;"></div>
            </td>
          </tr>

          <!-- Assinatura -->
          <tr>
            <td style="padding:24px 40px 16px 40px;">
              <p style="margin:0 0 4px 0;color:#FFFFFF;font-size:15px;font-weight:600;line-height:1.4;">
                ${SDR_NAME}
              </p>
              <p style="margin:0;color:#8B9CB4;font-size:13px;line-height:1.5;">
                Vyzon — CRM gamificado para times de vendas
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <p style="margin:0;color:#8B9CB4;font-size:12px;line-height:1.5;">
                <a href="https://vyzon.com.br" style="color:#10B77F;text-decoration:none;">vyzon.com.br</a> · Se não foi você que agendou, pode ignorar este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        reply_to: SDR_REPLY_TO,
        to,
        subject,
        html,
        text: body,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[sdr] Email send failed:", res.status, errorText);
      return { sent: false, error: `${res.status}: ${errorText.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[sdr] Email send error:", err);
    return { sent: false, error: String(err?.message || err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both direct invocation and Supabase database webhook payloads
    // DB webhook sends: { type, table, record, schema, old_record }
    const record = body.record || body;

    const lead = {
      id: record.id,
      name: record.name || null,
      email: record.email,
      company: record.company || null,
      phone: record.phone,
    };

    if (!lead.email || !lead.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[sdr] Processing lead:", { email: lead.email, phone: lead.phone, hasName: !!lead.name });

    // Generate and send WhatsApp + Email in parallel
    const [whatsappMsg, emailMsg] = await Promise.all([
      generateSDRMessage(lead, "whatsapp"),
      generateSDRMessage(lead, "email"),
    ]);

    const [whatsappResult, emailResult] = await Promise.all([
      sendWhatsApp(lead.phone, whatsappMsg.body),
      sendEmail(lead.email, emailMsg.subject || "Sua demo do Vyzon está agendada", emailMsg.body),
    ]);

    // Update demo_request with outreach status (include errors for debugging)
    if (lead.id) {
      const noteParts = [
        `WhatsApp=${whatsappResult.sent ? "✓" : "✗"}${whatsappResult.error ? ` (${whatsappResult.error})` : ""}`,
        `Email=${emailResult.sent ? "✓" : "✗"}${emailResult.error ? ` (${emailResult.error})` : ""}`,
      ];
      await supabaseAdmin
        .from("demo_requests")
        .update({
          notes: `SDR outreach @ ${new Date().toISOString()}: ${noteParts.join(" | ")}`,
        })
        .eq("id", lead.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        whatsapp: whatsappResult,
        email: emailResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sdr] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
