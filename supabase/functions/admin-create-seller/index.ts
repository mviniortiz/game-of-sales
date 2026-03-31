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
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Bem-vindo ao ${companyName}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#050810;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${firstName}, sua conta na equipe ${companyName} esta pronta! Acesse agora.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050810;">
    <tr>
      <td align="center" style="padding:48px 16px 32px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#06b6d4 100%);border-radius:16px;padding:14px 28px;box-shadow:0 8px 32px rgba(16,185,129,0.25);">
                    <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">Vyzon</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1629;border-radius:24px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.03);">

                <!-- Gradient Accent -->
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#059669 0%,#10b981 30%,#06b6d4 70%,#8b5cf6 100%);"></td>
                </tr>

                <!-- Hero Section -->
                <tr>
                  <td style="padding:48px 40px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- Welcome badge -->
                          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                            <tr>
                              <td style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:20px;padding:6px 14px;">
                                <span style="color:#34d399;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">&#9889; Novo membro</span>
                              </td>
                            </tr>
                          </table>

                          <h1 style="margin:0 0 12px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;">
                            Bem-vindo(a), ${firstName}!
                          </h1>
                          <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">
                            Voce foi convidado(a) para fazer parte da equipe
                            <strong style="color:#e2e8f0;">${companyName}</strong>.
                            Sua conta esta ativa e pronta para voce comecar a vender.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Credentials Section -->
                <tr>
                  <td style="padding:32px 40px 0;">
                    <!-- Section label -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td>
                          <span style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">&#128272; Credenciais de acesso</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Credentials Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
                      <!-- Email row -->
                      <tr>
                        <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.04);">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="80" valign="top">
                                <span style="color:#64748b;font-size:11px;font-weight:600;">E-mail</span>
                              </td>
                              <td valign="top">
                                <span style="color:#e2e8f0;font-size:14px;font-family:'SF Mono',Monaco,Consolas,'Courier New',monospace;word-break:break-all;">${normalizedEmail}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <!-- Password row -->
                      <tr>
                        <td style="padding:20px 24px;background:linear-gradient(135deg,rgba(5,46,22,0.4),rgba(6,78,59,0.3));">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="80" valign="top">
                                <span style="color:#6ee7b7;font-size:11px;font-weight:600;">Senha</span>
                              </td>
                              <td valign="top">
                                <span style="color:#ecfdf5;font-size:18px;font-family:'SF Mono',Monaco,Consolas,'Courier New',monospace;font-weight:700;letter-spacing:1px;">${password}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding:32px 40px 0;" align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="border-radius:14px;background:linear-gradient(135deg,#059669 0%,#10b981 50%,#06b6d4 100%);box-shadow:0 8px 24px rgba(16,185,129,0.3),0 2px 8px rgba(16,185,129,0.2);">
                          <a href="${appUrl}/auth"
                             target="_blank"
                             style="display:block;color:#ffffff;text-decoration:none;padding:18px 32px;font-size:15px;font-weight:700;letter-spacing:0.3px;text-align:center;">
                            Acessar Plataforma &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Quick Start Tips -->
                <tr>
                  <td style="padding:32px 40px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td>
                          <span style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">&#128640; Primeiros passos</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="top" width="28">
                                <span style="display:inline-block;background:rgba(16,185,129,0.15);color:#34d399;width:20px;height:20px;border-radius:6px;text-align:center;font-size:11px;line-height:20px;font-weight:700;">1</span>
                              </td>
                              <td style="color:#94a3b8;font-size:13px;line-height:1.5;">
                                Faca login com suas credenciais acima
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="top" width="28">
                                <span style="display:inline-block;background:rgba(6,182,212,0.15);color:#22d3ee;width:20px;height:20px;border-radius:6px;text-align:center;font-size:11px;line-height:20px;font-weight:700;">2</span>
                              </td>
                              <td style="color:#94a3b8;font-size:13px;line-height:1.5;">
                                Troque sua senha em <strong style="color:#cbd5e1;">Perfil &rarr; Alterar Senha</strong>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="top" width="28">
                                <span style="display:inline-block;background:rgba(139,92,246,0.15);color:#a78bfa;width:20px;height:20px;border-radius:6px;text-align:center;font-size:11px;line-height:20px;font-weight:700;">3</span>
                              </td>
                              <td style="color:#94a3b8;font-size:13px;line-height:1.5;">
                                Comece a registrar vendas e acompanhar seus resultados
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Security Note -->
                <tr>
                  <td style="padding:28px 40px 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(234,179,8,0.05);border:1px solid rgba(234,179,8,0.12);border-radius:12px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0;color:#a3865a;font-size:12px;line-height:1.6;">
                            &#128274; Este e-mail contem suas credenciais. Nao compartilhe com terceiros.
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
            <td align="center" style="padding:32px 0 16px;">
              <p style="margin:0 0 8px;color:#334155;font-size:12px;">
                Enviado por <strong style="color:#475569;">Vyzon</strong>
              </p>
              <p style="margin:0;color:#1e293b;font-size:11px;line-height:1.6;">
                Se voce nao solicitou esta conta, ignore este e-mail.
              </p>
              <p style="margin:12px 0 0;color:#1e293b;font-size:10px;">
                &copy; ${year} Vyzon. Todos os direitos reservados.
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
    let companyName = "Vyzon";
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
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <onboarding@resend.dev>";
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
