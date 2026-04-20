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
const SDR_EVOLUTION_INSTANCE = Deno.env.get("SDR_EVOLUTION_INSTANCE");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SDR_NAME = Deno.env.get("SDR_NAME") || "Markus";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface Lead {
  id?: string;
  name: string | null;
  email: string;
  company: string | null;
  phone: string;
  scheduled_at?: string | null;
  google_meet_link?: string | null;
  team_size?: string | null;
  uses_spreadsheets?: boolean | null;
  biggest_pain?: string | null;
  improvement_goal?: string | null;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0];
}

const WEEKDAYS_FULL = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];
const MONTHS_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatMeetingBRT(iso: string): string {
  const d = new Date(iso);
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const wd = WEEKDAYS_FULL[brt.getUTCDay()];
  const dd = brt.getUTCDate();
  const mo = MONTHS_FULL[brt.getUTCMonth()];
  const hh = String(brt.getUTCHours()).padStart(2, "0");
  const mm = String(brt.getUTCMinutes()).padStart(2, "0");
  return `${wd}, ${dd} de ${mo} às ${hh}:${mm}`;
}

// ──────────────────── Mensagens ────────────────────

async function generateGreeting(lead: Lead, channel: "whatsapp" | "email"): Promise<{ subject?: string; body: string }> {
  const greeting = lead.name ? `Oi ${firstName(lead.name)}` : "Oi";
  const companyContext = lead.company ? ` Tô vendo que você é da ${lead.company}.` : "";
  const painContext = lead.biggest_pain
    ? ` Recebi no formulário que o maior ponto hoje é "${lead.biggest_pain.toLowerCase()}" — já vou puxar esse recorte pra call.`
    : "";

  // Fallback sem OpenAI
  if (!OPENAI_API_KEY) {
    if (channel === "whatsapp") {
      return {
        body: `${greeting}! Aqui é o ${SDR_NAME} do Vyzon.

Obrigado por agendar a demo.${companyContext}${painContext}

Vou preparar tudo em função do seu cenário pra call ser útil de verdade, sem pitch genérico. Qualquer dúvida antes, é só me chamar por aqui.`,
      };
    }
    return {
      subject: `${greeting}, tudo certo pra sua demo do Vyzon`,
      body: `${greeting}!

Aqui é o ${SDR_NAME} do Vyzon. Recebi seu agendamento${companyContext ? ` e os dados da ${lead.company}` : ""} — já começo a preparar a call focada no seu cenário real, sem pitch genérico.${painContext}

Tudo que você precisa saber pra nossa conversa está logo abaixo. Se precisar reagendar ou tirar alguma dúvida antes, é só responder esse email.`,
    };
  }

  // OpenAI personalizado
  const systemBase = `Você é ${SDR_NAME} do Vyzon, um CRM gamificado para times de vendas. Tom: amigável, direto, brasileiro. NUNCA use emojis. NUNCA diga que é "SDR" ou mencione cargo. NUNCA faça perguntas de qualificação no primeiro contato. Se o lead forneceu dados específicos (dor, time, objetivo), incorpore naturalmente 1-2 pontos. Se só tem nome/empresa, foque no que VOCÊ vai trazer pra call (demo focada, sem pitch genérico) — não invente dados. NUNCA repita construções ("Vi que..." em frases seguidas).`;

  const leadContext = [
    `Nome: ${lead.name || "não informado"}`,
    `Empresa: ${lead.company || "não informada"}`,
    lead.team_size ? `Time de vendas: ${lead.team_size} vendedores` : "",
    lead.uses_spreadsheets === true ? "Usa planilhas hoje" : "",
    lead.uses_spreadsheets === false ? "Já usa CRM (não planilhas)" : "",
    lead.biggest_pain ? `Maior dor: ${lead.biggest_pain}` : "",
    lead.improvement_goal ? `Quer melhorar: ${lead.improvement_goal}` : "",
  ].filter(Boolean).join("\n");

  const systemPrompt = channel === "whatsapp"
    ? `${systemBase} Formato WhatsApp: máx 500 caracteres, quebras naturais, sem markdown. NÃO inclua data/link da reunião — isso vai em outra mensagem separada. Retorne APENAS JSON: {"body": "..."}`
    : `${systemBase} Formato email: texto plano, direto, termina sem assinatura (o template adiciona). NÃO inclua dados da reunião no corpo — eles aparecem num bloco separado. Retorne JSON: {"subject": "...", "body": "..."}`;

  const userPrompt = channel === "whatsapp"
    ? `Escreva a PRIMEIRA mensagem de WhatsApp pra um lead que acabou de agendar a demo. Tom humano e direto.

Contexto do lead:
${leadContext}

A mensagem deve:
1. Cumprimentar pelo nome
2. Se apresentar ("aqui é o ${SDR_NAME} do Vyzon")
3. Agradecer o agendamento
4. Se houver dados específicos no contexto (dor/time/objetivo), incorpore 1-2 naturalmente; se não, mencione que vai puxar o contexto do site/empresa pra call
5. Dizer que vai preparar a call focada no cenário dele — sem pitch genérico
6. Fechar convidando a tirar dúvidas

NÃO invente dados que não estão no contexto. NÃO mencione data/link (vai na próxima msg).`
    : `Escreva o corpo de um email de confirmação pra lead que acabou de agendar demo.

Contexto do lead:
${leadContext}

O email deve:
1. Ter assunto curto (max 60 chars, sem emojis)
2. Cumprimentar pelo nome
3. Se apresentar ("aqui é o ${SDR_NAME} do Vyzon")
4. Confirmar o agendamento. Se o contexto tem dor/time/objetivo específicos, incorpore 1-2 naturalmente; se só tem empresa, fale que vai olhar o contexto dela antes da call
5. Mencionar que os dados da reunião estão logo abaixo (o template insere um bloco visual)
6. Fechar com "se precisar reagendar ou tirar dúvidas, é só responder esse email"

NÃO invente dados. NÃO inclua data/link no texto.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(content);
    if (channel === "whatsapp") return { body: parsed.body || "" };
    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    console.error("[sdr] OpenAI greeting failed, using fallback:", err);
    return channel === "whatsapp"
      ? {
        body: `${greeting}! Aqui é o ${SDR_NAME} do Vyzon.

Obrigado por agendar a demo.${companyContext}${painContext}

Vou preparar tudo em função do seu cenário pra call ser útil de verdade, sem pitch genérico. Qualquer dúvida antes, é só me chamar por aqui.`,
      }
      : {
        subject: `${greeting}, tudo certo pra sua demo do Vyzon`,
        body: `${greeting}!

Aqui é o ${SDR_NAME} do Vyzon. Recebi seu agendamento${companyContext} — já começo a preparar a call focada no seu cenário real, sem pitch genérico.${painContext}

Tudo que você precisa saber pra nossa conversa está logo abaixo. Se precisar reagendar ou tirar alguma dúvida antes, é só responder esse email.`,
      };
  }
}

function buildMeetingDetailsWhatsApp(lead: Lead): string | null {
  if (!lead.scheduled_at) return null;
  const when = formatMeetingBRT(lead.scheduled_at);
  const lines: string[] = [];
  lines.push("Aqui estão os dados da reunião pra não se esquecer:");
  lines.push("");
  lines.push(`Data: ${when} (horário de Brasília)`);
  lines.push("Duração: 30 minutos");
  if (lead.google_meet_link) {
    lines.push(`Link do Meet: ${lead.google_meet_link}`);
  }
  lines.push("");
  lines.push("Já tá no seu Google Calendar também. Se precisar reagendar, só me avisar por aqui.");
  return lines.join("\n");
}

// ──────────────────── Envio ────────────────────

async function sendWhatsApp(phone: string, message: string): Promise<{ sent: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !SDR_EVOLUTION_INSTANCE) {
    const err = `Evolution API not configured`;
    console.warn("[sdr] " + err);
    return { sent: false, error: err };
  }
  const normalizedPhone = normalizePhone(phone);
  const url = `${EVOLUTION_API_URL}/message/sendText/${SDR_EVOLUTION_INSTANCE}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[sdr] WhatsApp send failed:", res.status, errorText);
      return { sent: false, error: `${res.status}: ${errorText.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[sdr] WhatsApp send error:", err);
    return { sent: false, error: String((err as Error)?.message || err) };
  }
}

async function sendWhatsAppSequence(lead: Lead): Promise<{
  greetingSent: boolean;
  detailsSent: boolean;
  error?: string;
}> {
  const greeting = await generateGreeting(lead, "whatsapp");
  const details = buildMeetingDetailsWhatsApp(lead);

  const r1 = await sendWhatsApp(lead.phone, greeting.body);
  if (!r1.sent) {
    return { greetingSent: false, detailsSent: false, error: r1.error };
  }

  // Espera 2.5s pra parecer natural (conversação humana, não robô cuspindo 2 msgs juntas)
  if (details) {
    await new Promise((r) => setTimeout(r, 2500));
    const r2 = await sendWhatsApp(lead.phone, details);
    return {
      greetingSent: true,
      detailsSent: r2.sent,
      error: r2.sent ? undefined : r2.error,
    };
  }
  return { greetingSent: true, detailsSent: false };
}

async function sendEmail(to: string, subject: string, body: string, lead: Lead): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { sent: false, error: "Resend API not configured" };
  }

  const bodyHtml = body.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    return `<p style="margin:0 0 16px 0;color:#CCFFFF;font-size:16px;line-height:1.6;">${trimmed}</p>`;
  }).join("");

  // Bloco da reunião
  let meetingBlock = "";
  if (lead.scheduled_at) {
    const when = formatMeetingBRT(lead.scheduled_at);
    const meetBtn = lead.google_meet_link
      ? `<a href="${lead.google_meet_link}" style="display:inline-block;background-color:#10B77F;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;box-shadow:0 4px 16px rgba(16,183,127,0.3);">Entrar no Google Meet</a>`
      : "";
    meetingBlock = `
          <tr>
            <td style="padding:8px 40px 16px 40px;">
              <div style="background-color:#0B0E1A;border:1px solid #1F2540;border-radius:12px;padding:20px 24px;">
                <p style="margin:0 0 12px 0;color:#10B77F;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Dados da reunião</p>
                <p style="margin:0 0 6px 0;color:#FFFFFF;font-size:16px;font-weight:600;line-height:1.4;">${when}</p>
                <p style="margin:0 0 4px 0;color:#8B9CB4;font-size:14px;line-height:1.5;">Horário de Brasília · 30 minutos</p>
                ${lead.google_meet_link ? `<p style="margin:12px 0 0 0;color:#8B9CB4;font-size:13px;line-height:1.5;word-break:break-all;">${lead.google_meet_link}</p>` : ""}
              </div>
            </td>
          </tr>
          ${meetBtn ? `<tr><td style="padding:8px 40px 24px 40px;text-align:center;">${meetBtn}</td></tr>` : ""}`;
  }

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
          <tr>
            <td style="padding:40px 40px 24px 40px;text-align:center;">
              <img src="https://vyzon.com.br/logo.png" alt="Vyzon" width="140" style="display:block;margin:0 auto;max-width:140px;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 16px 40px;">
              ${bodyHtml}
            </td>
          </tr>
          ${meetingBlock}
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #1F2540;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 16px 40px;">
              <p style="margin:0 0 4px 0;color:#FFFFFF;font-size:15px;font-weight:600;line-height:1.4;">${SDR_NAME}</p>
              <p style="margin:0;color:#8B9CB4;font-size:13px;line-height:1.5;">Vyzon — CRM gamificado para times de vendas</p>
            </td>
          </tr>
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
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
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
    return { sent: false, error: String((err as Error)?.message || err) };
  }
}

// ──────────────────── Entrypoint ────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const record = body.record || body;

    const lead: Lead = {
      id: record.id,
      name: record.name || null,
      email: record.email,
      company: record.company || null,
      phone: record.phone,
      scheduled_at: record.scheduled_at || null,
      google_meet_link: record.google_meet_link || null,
      team_size: record.team_size || null,
      uses_spreadsheets: typeof record.uses_spreadsheets === "boolean" ? record.uses_spreadsheets : null,
      biggest_pain: record.biggest_pain || null,
      improvement_goal: record.improvement_goal || null,
    };

    if (!lead.email || !lead.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[sdr] Processing lead:", {
      email: lead.email,
      phone: lead.phone,
      hasName: !!lead.name,
      scheduled: !!lead.scheduled_at,
    });

    // Email (1 mensagem com bloco de reunião) em paralelo com WhatsApp (2 mensagens sequenciais)
    const emailMsg = await generateGreeting(lead, "email");

    const [whatsappResult, emailResult] = await Promise.all([
      sendWhatsAppSequence(lead),
      sendEmail(lead.email, emailMsg.subject || "Sua demo do Vyzon está confirmada", emailMsg.body, lead),
    ]);

    if (lead.id) {
      const noteParts = [
        `WA greeting=${whatsappResult.greetingSent ? "✓" : "✗"}`,
        `WA details=${whatsappResult.detailsSent ? "✓" : "✗"}`,
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
      JSON.stringify({ success: true, whatsapp: whatsappResult, email: emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sdr] Error:", err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
