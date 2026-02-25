import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:8080";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("[Google OAuth Callback] Starting...");
    console.log("[Google OAuth Callback] FRONTEND_URL:", FRONTEND_URL);
    console.log("[Google OAuth Callback] SUPABASE_URL:", SUPABASE_URL);

    // Se usuário cancelou ou houve erro
    if (error || !code || !state) {
      console.error("[Google OAuth Callback] Error:", error || "Missing code/state");
      return Response.redirect(
        `${FRONTEND_URL}/integracoes?error=auth_failed`,
        302
      );
    }

    // Processar validação do State CSRF
    if (!state.includes('.')) {
      console.error("[Google OAuth Callback] Invalid state format");
      return Response.redirect(`${FRONTEND_URL}/integracoes?error=invalid_state`, 302);
    }

    const [encodedPayload, signatureHex] = state.split('.');
    const payloadStr = atob(encodedPayload);
    const { userId, exp } = JSON.parse(payloadStr);

    if (Date.now() > exp) {
      console.error("[Google OAuth Callback] State expired");
      return Response.redirect(`${FRONTEND_URL}/integracoes?error=state_expired`, 302);
    }

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
    const expectedSignatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (signatureHex !== expectedSignatureHex) {
      console.error("[Google OAuth Callback] Invalid state signature");
      return Response.redirect(`${FRONTEND_URL}/integracoes?error=invalid_state_signature`, 302);
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    console.log("[Google OAuth Callback] Processing for user:", userId);
    console.log("[Google OAuth Callback] Redirect URI:", redirectUri);

    // Trocar código por tokens
    console.log("[Google OAuth Callback] Exchanging code for tokens...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Google OAuth Callback] Token exchange failed:", errorData);
      return Response.redirect(
        `${FRONTEND_URL}/integracoes?error=token_failed`,
        302
      );
    }

    const tokens = await tokenResponse.json();
    console.log("[Google OAuth Callback] Tokens received successfully");

    // Obter informações do calendário principal
    console.log("[Google OAuth Callback] Fetching calendar info...");
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    let calendarId = "primary";
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      calendarId = calendarData.id || "primary";
      console.log("[Google OAuth Callback] Calendar ID:", calendarId);
    } else {
      console.log("[Google OAuth Callback] Could not fetch calendar, using 'primary'");
    }

    // Salvar tokens no perfil do usuário
    console.log("[Google OAuth Callback] Saving tokens to database...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expires_at: expiresAt.toISOString(),
        google_calendar_id: calendarId,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[Google OAuth Callback] Database update failed:", updateError);
      return Response.redirect(
        `${FRONTEND_URL}/integracoes?error=db_failed`,
        302
      );
    }

    console.log("[Google OAuth Callback] Successfully connected user:", userId);

    // Redirecionar de volta para a página de integrações
    return Response.redirect(
      `${FRONTEND_URL}/integracoes?success=true`,
      302
    );
  } catch (error) {
    console.error("[Google OAuth Callback] Unexpected error:", error);
    return Response.redirect(
      `${FRONTEND_URL}/integracoes?error=connection_failed`,
      302
    );
  }
});
