import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const generatePassword = (length = 14) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@$%&*?";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

async function consumeRateLimit(
  supabaseAdminClient: any,
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  try {
    const { data, error } = await supabaseAdminClient.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("consume_rate_limit")) {
        return { enabled: false, allowed: true };
      }
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      enabled: true,
      allowed: row?.allowed !== false,
      currentCount: row?.current_count ?? null,
      remaining: row?.remaining ?? null,
      resetAt: row?.reset_at ?? null,
    };
  } catch (error) {
    console.warn("[admin-create-seller] rate limit unavailable:", error);
    return { enabled: false, allowed: true };
  }
}

function buildWelcomeEmailHtml(opts: {
  nome: string;
  normalizedEmail: string;
  password: string;
  companyName: string;
  appUrl: string;
}) {
  const { nome, normalizedEmail, password, companyName, appUrl } = opts;
  const firstName = nome.split(" ")[0];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Bem-vindo ao ${companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#080c14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080c14;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo + Badge -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);border-radius:14px;padding:12px 24px;">
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Game of Sales</span>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:20px;border:1px solid #1f2937;overflow:hidden;">

                <!-- Green Accent Bar -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#059669,#10b981,#34d399);"></td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 32px;">

                    <!-- Greeting -->
                    <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:700;">
                      Ola, ${firstName}! &#128075;
                    </h1>
                    <p style="margin:0 0 28px;color:#9ca3af;font-size:15px;line-height:1.6;">
                      Voce foi convidado(a) para a equipe <strong style="color:#e5e7eb;">${companyName}</strong>. Sua conta ja esta ativa e pronta para uso.
                    </p>

                    <!-- Divider -->
                    <div style="height:1px;background:#1f2937;margin:0 0 28px;"></div>

                    <!-- Credentials Section -->
                    <p style="margin:0 0 16px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">
                      Suas credenciais de acesso
                    </p>

                    <!-- Email Field -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                      <tr>
                        <td style="background:#0a0f1a;border:1px solid #1f2937;border-radius:12px;padding:16px 20px;">
                          <span style="display:block;color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">E-mail</span>
                          <span style="display:block;color:#f3f4f6;font-size:15px;font-family:'SF Mono',Monaco,Consolas,'Courier New',monospace;">${normalizedEmail}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Password Field -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#052e16,#064e3b);border:1px solid #065f46;border-radius:12px;padding:16px 20px;">
                          <span style="display:block;color:#6ee7b7;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Senha</span>
                          <span style="display:block;color:#ecfdf5;font-size:17px;font-family:'SF Mono',Monaco,Consolas,'Courier New',monospace;font-weight:700;letter-spacing:0.5px;">${password}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}/auth"
                             target="_blank"
                             style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                            Acessar Plataforma &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Tip -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                      <tr>
                        <td style="background:#0a0f1a;border:1px solid #1f2937;border-radius:10px;padding:14px 18px;">
                          <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
                            &#128274; <strong style="color:#9ca3af;">Dica de seguranca:</strong> Recomendamos trocar sua senha apos o primeiro acesso em Perfil &rarr; Alterar Senha.
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0;">
              <p style="margin:0 0 4px;color:#374151;font-size:11px;">
                Enviado automaticamente pelo Game of Sales
              </p>
              <p style="margin:0;color:#1f2937;font-size:10px;">
                Se voce nao solicitou esta conta, ignore este e-mail.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nome, email, sendPassword = true, companyId } = await req.json();

    if (!nome || !email) {
      return new Response(JSON.stringify({ error: "Nome e e-mail sao obrigatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "E-mail invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requesterProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, company_id, is_super_admin")
      .eq("id", user.id)
      .single();

    if (!requesterProfile) {
      return new Response(JSON.stringify({ error: "Perfil nao encontrado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRole } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isSuperAdmin = requesterProfile.is_super_admin === true;
    const isAdmin = !!adminRole;

    if (!isSuperAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSuperAdmin && companyId && companyId !== requesterProfile.company_id) {
      return new Response(JSON.stringify({ error: "Forbidden: Tenant mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetCompanyId = isSuperAdmin
      ? (companyId || requesterProfile.company_id)
      : requesterProfile.company_id;

    if (!targetCompanyId) {
      return new Response(JSON.stringify({ error: "Empresa nao definida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = await consumeRateLimit(
      supabaseAdmin,
      `admin-create-seller:user:${user.id}:company:${targetCompanyId}`,
      20,
      3600,
    );
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: "Muitas tentativas para criar vendedores. Tente novamente mais tarde.",
        code: "RATE_LIMITED",
        reset_at: rateLimit.resetAt ?? null,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = generatePassword();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { nome, role: "vendedor" },
    });

    if (createError) {
      console.error("createUser error", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (created?.user?.id) {
      await (supabaseAdmin as any)
        .from("profiles")
        .upsert({
          id: created.user.id,
          nome,
          email: normalizedEmail,
          company_id: targetCompanyId,
          role: "vendedor",
        }, { onConflict: "id" });
    }

    // Get company name for the email
    let companyName = "Game of Sales";
    const { data: company } = await (supabaseAdmin as any)
      .from("companies")
      .select("name")
      .eq("id", targetCompanyId)
      .single();
    if (company?.name) companyName = company.name;

    // Send welcome email via Resend
    let emailSent = false;
    let emailError: string | null = null;
    const appUrl = Deno.env.get("APP_URL") || "https://gameofsales.com.br";

    if (RESEND_API_KEY && sendPassword) {
      try {
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Game of Sales <onboarding@resend.dev>";
        console.log(`[admin-create-seller] Sending email from=${fromEmail} to=${normalizedEmail}`);

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [normalizedEmail],
            subject: `${nome}, sua conta no ${companyName} esta pronta!`,
            html: buildWelcomeEmailHtml({ nome, normalizedEmail, password, companyName, appUrl }),
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log("[admin-create-seller] Email sent successfully");
        } else {
          const errBody = await emailRes.text();
          emailError = errBody;
          console.error("[admin-create-seller] Resend error:", emailRes.status, errBody);
        }
      } catch (emailErr: any) {
        emailError = emailErr?.message || "Unknown email error";
        console.error("[admin-create-seller] Email send failed:", emailErr);
      }
    } else if (!RESEND_API_KEY) {
      emailError = "RESEND_API_KEY not configured";
      console.warn("[admin-create-seller] RESEND_API_KEY not set, skipping email");
    }

    return new Response(JSON.stringify({
      password: sendPassword ? password : null,
      emailSent,
      emailError: emailSent ? null : emailError,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-create-seller error", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
