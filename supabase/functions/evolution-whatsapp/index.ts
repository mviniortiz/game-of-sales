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
  | "sendMedia"
  | "sendAudio"
  | "logout"
  | "profilePic"
  | "instances"
  | "getMedia";

type Body = {
  action?: Action;
  companyId?: string | null;
  targetUserId?: string | null;
  chatId?: string;
  text?: string;
  limit?: number;
  number?: string;
  messageId?: string;
  /** Base64-encoded media data (without data URI prefix) */
  mediaBase64?: string;
  /** MIME type of the media */
  mimetype?: string;
  /** Filename for documents */
  fileName?: string;
  /** Caption for images/videos */
  caption?: string;
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

function getInstanceName(userId: string) {
  return `wa_${userId.replace(/-/g, "")}`;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(`${EVOLUTION_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Evolution API timeout after 8s: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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
      .select("id, company_id, is_super_admin, role")
      .eq("id", user.id)
      .single();

    if (!profile) return json(403, { error: "Profile not found" });

    const isSuperAdmin = profile.is_super_admin === true;
    const isAdmin = isSuperAdmin || profile.role === "admin";

    if (!isSuperAdmin && body.companyId && body.companyId !== profile.company_id) {
      return json(403, { error: "Forbidden company context" });
    }

    const targetCompanyId = isSuperAdmin
      ? (body.companyId || profile.company_id)
      : profile.company_id;

    if (!targetCompanyId) {
      return json(400, { error: "No company context" });
    }

    // Determine which user's instance to operate on
    let effectiveUserId = user.id;

    if (body.targetUserId && isAdmin) {
      // Verify the target user belongs to the same company (unless super admin)
      if (!isSuperAdmin) {
        const { data: targetProfile } = await (adminSupabase as any)
          .from("profiles")
          .select("id, company_id")
          .eq("id", body.targetUserId)
          .single();

        if (!targetProfile || targetProfile.company_id !== profile.company_id) {
          return json(403, { error: "Target user not in your company" });
        }
      }
      effectiveUserId = body.targetUserId;
    }

    const instanceName = getInstanceName(effectiveUserId);

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
        const errStatus = Number((error as any)?.status);
        const errMsg = String((error as any)?.message || "").toLowerCase();
        if (errStatus === 404 || errMsg.includes("not exist") || errMsg.includes("not found")) {
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
      // 1. Check if already connected
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
      } catch {
        // Instance doesn't exist yet — that's fine, we'll create it
      }

      let qrCodeBase64: string | null = null;

      // 2. Try to create instance
      try {
        const createRes = await evolutionRequest("/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });
        console.log("[connect] create response:", JSON.stringify(createRes));
        qrCodeBase64 = extractQrBase64(createRes);
        console.log("[connect] qr from create:", qrCodeBase64 ? "found" : "null");
      } catch (err: any) {
        console.log("[connect] create error:", err?.message, "status:", (err as any)?.status, "payload:", JSON.stringify((err as any)?.payload));
      }

      // 3. If no QR yet, try connect endpoint
      if (!qrCodeBase64) {
        try {
          const connectRes = await evolutionRequest(`/instance/connect/${instanceName}`, { method: "GET" });
          console.log("[connect] connect response:", JSON.stringify(connectRes));
          qrCodeBase64 = extractQrBase64(connectRes);
          console.log("[connect] qr from connect:", qrCodeBase64 ? "found" : "null");
        } catch (err: any) {
          console.log("[connect] connect error:", err?.message, "status:", (err as any)?.status, "payload:", JSON.stringify((err as any)?.payload));
        }
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
      const chats = await evolutionRequest(`/chat/findChats/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      return json(200, { success: true, instanceName, chats });
    }

    if (action === "messages") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      const limit = Math.max(1, Math.min(Number(body.limit || 50), 100));
      const rawMessages = await evolutionRequest(`/chat/findMessages/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          where: { key: { remoteJid: body.chatId } },
          limit,
        }),
      });

      // Normalize: Evolution API v2.3.7 may return messages in different formats
      let messages: any[];
      if (Array.isArray(rawMessages)) {
        messages = rawMessages;
      } else if (Array.isArray(rawMessages?.messages)) {
        messages = rawMessages.messages;
      } else if (Array.isArray(rawMessages?.messages?.records)) {
        messages = rawMessages.messages.records;
      } else if (Array.isArray(rawMessages?.records)) {
        messages = rawMessages.records;
      } else {
        messages = [];
      }

      console.log(`[messages] chatId=${body.chatId} rawType=${typeof rawMessages} isArray=${Array.isArray(rawMessages)} count=${messages.length}`);
      if (messages.length > 0) {
        console.log("[messages] sample keys:", JSON.stringify(Object.keys(messages[0])));
      }

      return json(200, { success: true, instanceName, messages });
    }

    if (action === "send") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.text || !String(body.text).trim()) return json(400, { error: "text is required" });

      // For groups (@g.us), send using the full remoteJid.
      // For contacts (@s.whatsapp.net), extract the number.
      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup ? body.chatId : extractNumberFromJid(body.chatId);
      if (!target) return json(400, { error: "invalid chatId/number" });

      console.log(`[send] target=${target} isGroup=${isGroup} chatId=${body.chatId} instanceName=${instanceName}`);

      try {
        const sendRes = await evolutionRequest(`/message/sendText/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number: target,
            text: String(body.text).trim(),
          }),
        });
        console.log("[send] success:", JSON.stringify(sendRes));
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[send] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        throw sendErr;
      }
    }

    if (action === "profilePic") {
      if (!body.number) return json(400, { error: "number is required" });
      try {
        const data = await evolutionRequest(`/chat/fetchProfilePictureUrl/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({ number: body.number }),
        });
        return json(200, { success: true, profilePicUrl: data?.profilePictureUrl || data?.url || null });
      } catch {
        return json(200, { success: true, profilePicUrl: null });
      }
    }

    if (action === "sendMedia") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.mediaBase64) return json(400, { error: "mediaBase64 is required" });
      if (!body.mimetype) return json(400, { error: "mimetype is required" });

      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup ? body.chatId : extractNumberFromJid(body.chatId);
      if (!target) return json(400, { error: "invalid chatId/number" });

      const mime = String(body.mimetype).toLowerCase();
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");

      const payload: any = {
        number: target,
        mediatype: isImage ? "image" : isVideo ? "video" : "document",
        mimetype: body.mimetype,
        media: body.mediaBase64,
      };

      if (body.caption) payload.caption = body.caption;
      if (body.fileName) payload.fileName = body.fileName;

      console.log(`[sendMedia] target=${target} type=${payload.mediatype} mime=${body.mimetype} base64Length=${body.mediaBase64.length}`);

      try {
        const sendRes = await evolutionRequest(`/message/sendMedia/${instanceName}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        console.log("[sendMedia] success:", JSON.stringify(sendRes));
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[sendMedia] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        return json(sendErr?.status || 502, { error: sendErr?.message || "Evolution API error", details: sendErr?.payload });
      }
    }

    if (action === "sendAudio") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.mediaBase64) return json(400, { error: "mediaBase64 is required" });

      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup ? body.chatId : extractNumberFromJid(body.chatId);
      if (!target) return json(400, { error: "invalid chatId/number" });

      // Accept mimetype from client, default to audio/mp4 (widely supported by WhatsApp)
      const audioMime = body.mimetype || "audio/mp4";
      console.log(`[sendAudio] target=${target} mime=${audioMime} base64Length=${body.mediaBase64.length}`);

      try {
        const sendRes = await evolutionRequest(`/message/sendWhatsAppAudio/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number: target,
            audio: `data:${audioMime};base64,${body.mediaBase64}`,
          }),
        });
        console.log("[sendAudio] success:", JSON.stringify(sendRes));
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[sendAudio] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        return json(sendErr?.status || 502, { error: sendErr?.message || "Evolution API error", details: sendErr?.payload });
      }
    }

    if (action === "getMedia") {
      if (!body.messageId) return json(400, { error: "messageId is required" });
      try {
        // Evolution API v2: convert message to base64
        const data = await evolutionRequest(`/chat/getBase64FromMediaMessage/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            message: { key: { id: body.messageId } },
            convertToMp4: false,
          }),
        });
        const base64 = data?.base64 || data?.mediaBase64 || data?.data || null;
        const mimetype = data?.mimetype || data?.mediaType || "audio/ogg";
        if (!base64) {
          return json(404, { error: "Media not found or expired" });
        }
        return json(200, {
          success: true,
          base64,
          mimetype,
        });
      } catch (err: any) {
        console.error("[getMedia] error:", err?.message);
        return json(500, { error: err?.message || "Failed to fetch media" });
      }
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

    if (action === "instances") {
      if (!isAdmin) {
        return json(403, { error: "Only admins can list instances" });
      }

      const { data: companyUsers } = await (adminSupabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("company_id", targetCompanyId);

      if (!companyUsers || companyUsers.length === 0) {
        return json(200, { success: true, sellers: [] });
      }

      // Process sellers in batches of 5 to avoid overwhelming the API
      const BATCH_SIZE = 5;
      const sellers: any[] = [];
      for (let i = 0; i < companyUsers.length; i += BATCH_SIZE) {
        const batch = companyUsers.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (u: any) => {
            const uInstanceName = getInstanceName(u.id);
            let connectedStatus = false;
            try {
              const stateRes = await evolutionRequest(
                `/instance/connectionState/${uInstanceName}`,
                { method: "GET" },
              );
              const state = stateRes?.instance?.state || stateRes?.state || "";
              connectedStatus = String(state).toLowerCase() === "open";
            } catch {
              // instance doesn't exist or error — not connected
            }
            return {
              userId: u.id,
              name: u.full_name || "Sem nome",
              avatarUrl: u.avatar_url || null,
              role: u.role || "seller",
              connected: connectedStatus,
            };
          }),
        );
        sellers.push(...batchResults);
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < companyUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return json(200, { success: true, sellers });
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
