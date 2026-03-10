import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "status"
  | "connect"
  | "chats"
  | "messages"
  | "send"
  | "logout";

type Body = {
  action?: Action;
  companyId?: string | null;
  chatId?: string;
  text?: string;
  limit?: number;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractNumberFromJid(value?: string | null) {
  if (!value) return "";
  return String(value).split("@")[0].replace(/\D/g, "");
}

function getInstanceName(companyId: string) {
  return `wa_${companyId.replace(/-/g, "")}`;
}

function extractQrBase64(payload: any): string | null {
  return (
    payload?.qrcode?.base64 ||
    payload?.base64 ||
    payload?.qrcode ||
    payload?.qrCode?.base64 ||
    null
  );
}

async function evolutionRequest(
  path: string,
  init: RequestInit = {},
) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API não configurada no servidor");
  }

  const response = await fetch(`${EVOLUTION_API_URL}${path}`, {
    ...init,
    headers: {
      apikey: EVOLUTION_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(
      parsed?.response?.message ||
      parsed?.message ||
      parsed?.error ||
      `Evolution API error (${response.status})`,
    );
    (err as any).status = response.status;
    (err as any).payload = parsed;
    throw err;
  }

  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return json(500, {
        error: "Evolution API não configurada no servidor",
        code: "EVOLUTION_NOT_CONFIGURED",
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const body = (await req.json()) as Body;
    const action = body.action;
    if (!action) return json(400, { error: "action is required" });

    const { data: profile } = await (adminSupabase as any)
      .from("profiles")
      .select("id, company_id, is_super_admin")
      .eq("id", user.id)
      .single();

    if (!profile) return json(403, { error: "Profile not found" });

    const isSuperAdmin = profile.is_super_admin === true;

    if (!isSuperAdmin && body.companyId && body.companyId !== profile.company_id) {
      return json(403, { error: "Forbidden company context" });
    }

    const targetCompanyId = isSuperAdmin
      ? (body.companyId || profile.company_id)
      : profile.company_id;

    if (!targetCompanyId) {
      return json(400, { error: "No company context" });
    }

    const instanceName = getInstanceName(targetCompanyId);

    if (action === "status") {
      try {
        const data = await evolutionRequest(`/instance/connectionState/${instanceName}`, {
          method: "GET",
        });
        const state = data?.instance?.state || data?.state || "unknown";
        return json(200, {
          success: true,
          instanceName,
          state,
          connected: String(state).toLowerCase() === "open",
        });
      } catch (error: any) {
        if ((error as any)?.status === 404) {
          return json(200, {
            success: true,
            instanceName,
            state: "not_created",
            connected: false,
          });
        }
        throw error;
      }
    }

    if (action === "connect") {
      try {
        const stateRes = await evolutionRequest(`/instance/connectionState/${instanceName}`, { method: "GET" });
        const state = stateRes?.instance?.state || stateRes?.state;
        if (String(state).toLowerCase() === "open") {
          return json(200, {
            success: true,
            instanceName,
            state: "open",
            connected: true,
            qrCodeBase64: null,
          });
        }
      } catch (error: any) {
        if ((error as any)?.status !== 404) throw error;
      }

      let qrCodeBase64: string | null = null;

      try {
        const createRes = await evolutionRequest("/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            qrcode: true,
          }),
        });
        qrCodeBase64 = extractQrBase64(createRes);
      } catch (error: any) {
        const payload = (error as any)?.payload;
        const msg = String(payload?.error || payload?.message || error?.message || "").toLowerCase();
        const alreadyExists = msg.includes("already exists") || (error as any)?.status === 400 || (error as any)?.status === 403;
        if (!alreadyExists) throw error;
      }

      if (!qrCodeBase64) {
        const connectRes = await evolutionRequest(`/instance/connect/${instanceName}`, { method: "GET" });
        qrCodeBase64 = extractQrBase64(connectRes);
      }

      return json(200, {
        success: true,
        instanceName,
        state: "connecting",
        connected: false,
        qrCodeBase64,
      });
    }

    if (action === "chats") {
      const chats = await evolutionRequest(`/chat/findChats/${instanceName}`, { method: "GET" });
      return json(200, { success: true, instanceName, chats });
    }

    if (action === "messages") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      const limit = Math.max(1, Math.min(Number(body.limit || 50), 100));
      const messages = await evolutionRequest(`/chat/findMessages/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          where: { key: { remoteJid: body.chatId } },
          options: {
            limit,
            orderBy: { messageTimestamp: "asc" },
          },
        }),
      });
      return json(200, { success: true, instanceName, messages });
    }

    if (action === "send") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.text || !String(body.text).trim()) return json(400, { error: "text is required" });
      const number = extractNumberFromJid(body.chatId);
      if (!number) return json(400, { error: "invalid chatId/number" });

      const sendRes = await evolutionRequest(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          number,
          text: String(body.text).trim(),
        }),
      });
      return json(200, { success: true, instanceName, result: sendRes });
    }

    if (action === "logout") {
      try {
        await evolutionRequest(`/instance/logout/${instanceName}`, { method: "DELETE" });
      } catch {
        try {
          await evolutionRequest(`/instance/logout/${instanceName}`, { method: "POST", body: JSON.stringify({}) });
        } catch {
          // best effort
        }
      }
      return json(200, { success: true, instanceName });
    }

    return json(400, { error: "invalid action" });
  } catch (error: any) {
    console.error("[evolution-whatsapp] error:", error);
    return json(500, {
      error: error?.message || "Internal server error",
      code: "EVOLUTION_PROXY_ERROR",
    });
  }
});
