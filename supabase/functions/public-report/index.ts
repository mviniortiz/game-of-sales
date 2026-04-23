// public-report
// Endpoint público (sem auth) que resolve um share_token em dados agregados
// pro dashboard white-label. Roda com service_role pra bypass RLS; toda
// validação (token ativo, não revogado, não expirado) é feita na RPC.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") ?? "";

    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body?.token ?? "";
      } catch {
        // ignore
      }
    }

    token = token.trim();
    if (!token || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
      return json({ ok: false, error: "invalid_token" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("get_public_report", { p_token: token });

    if (error) {
      console.error("public-report rpc error", error);
      return json({ ok: false, error: "rpc_error" }, 500);
    }

    if (!data || (data as Record<string, unknown>).error === "not_found") {
      return json({ ok: false, error: "not_found" }, 404);
    }

    return json(data, 200, {
      "Cache-Control": "public, max-age=60",
    });
  } catch (err) {
    console.error("public-report fatal", err);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extra,
    },
  });
}
