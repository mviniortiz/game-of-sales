import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const password = generatePassword();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: { nome, role: "vendedor" },
    });

    if (createError) {
      console.error("createUser error", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail);

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

    return new Response(JSON.stringify({ password: sendPassword ? password : null }), {
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
