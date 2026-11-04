import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { boasVindasVendedor } from "../_shared/email/mensagens.ts";

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

    // Enforce do limite de usuários do plano (espelha src/config/plans.ts:
    // piso free=1, plano único pro=10. Só assinatura ativa vale o plano
    // contratado; o resto é o piso. essential/escala/enterprise legados = pro).
    // Conta todos os profiles da empresa (inclui admin), igual à barra de uso
    // em /configuracoes/faturamento.
    if (!isSuperAdmin) {
      const PLAN_MAX_USERS: Record<string, number> = { free: 1, pro: 10 };
      const { data: planRow } = await (supabaseAdmin as any)
        .from("companies")
        .select("plan, subscription_status")
        .eq("id", targetCompanyId)
        .single();
      // Espelho de normalizePlanId (src/config/plans.ts)
      const normalizePlan = (raw: string | null | undefined): string => {
        const v = (raw || "").toLowerCase();
        if (["pro", "plus", "essential", "essencial", "escala", "enterprise"].includes(v)) return "pro";
        return "free";
      };
      const plan = planRow?.subscription_status === "active"
        ? normalizePlan(planRow?.plan)
        : "free";
      const maxUsers = PLAN_MAX_USERS[plan] ?? 1;
      if (Number.isFinite(maxUsers)) {
        const { count } = await (supabaseAdmin as any)
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", targetCompanyId);
        if ((count ?? 0) >= maxUsers) {
          return new Response(JSON.stringify({
            error: plan === "free"
              ? `O piso interno permite 1 usuário. Assine o Vyzon para ter até 10 pessoas no time.`
              : `Seu plano ${plan} permite até ${maxUsers} usuários. Fale com a gente para um plano maior.`,
            code: "PLAN_LIMIT",
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
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
    const appUrl = Deno.env.get("APP_URL") || "https://vyzon.com.br";

    if (RESEND_API_KEY && sendPassword) {
      try {
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <suporte@vyzon.com.br>";
        console.log(`[admin-create-seller] Sending email from=${fromEmail} to=${normalizedEmail}`);
        const boasVindas = boasVindasVendedor({ nome, email: normalizedEmail, senha: password, empresa: companyName, appUrl });

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [normalizedEmail],
            subject: boasVindas.assunto,
            html: boasVindas.html,
            text: boasVindas.text,
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
