import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FRONTEND_URL = Deno.env.get("VITE_SUPABASE_URL") || SUPABASE_URL;

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // userId
    const error = url.searchParams.get("error");

    // Se usuário cancelou ou houve erro
    if (error || !code || !state) {
      console.error("[Google OAuth Callback] Error:", error || "Missing code/state");
      return Response.redirect(
        `${FRONTEND_URL}/integracoes?error=auth_failed`,
        302
      );
    }

    const userId = state;
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    console.log("[Google OAuth Callback] Processing for user:", userId);

    // Trocar código por tokens
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
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();

    // Obter informações do calendário principal
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const calendarData = await calendarResponse.json();

    // Salvar tokens no perfil do usuário
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expires_at: expiresAt.toISOString(),
        google_calendar_id: calendarData.id,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[Google OAuth Callback] Database update failed:", updateError);
      throw updateError;
    }

    // Log de sucesso
    await supabase.from("sync_logs").insert({
      user_id: userId,
      action: "connect",
      resource_type: "google_calendar",
      success: true,
    });

    // Registrar webhook para sincronização bidirecional
    try {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/google-calendar-webhook`;
      
      const watchResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/watch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: calendarData.id, // usar calendar ID como channel ID
            type: "web_hook",
            address: webhookUrl,
            token: userId,
          }),
        }
      );

      if (watchResponse.ok) {
        const watchData = await watchResponse.json();
        console.log("[Google OAuth Callback] Webhook registered:", watchData);
        
        // Salvar informações do webhook
        await supabase.from("sync_logs").insert({
          user_id: userId,
          action: "webhook_registered",
          resource_type: "google_calendar",
          success: true,
        });
      } else {
        console.error("[Google OAuth Callback] Failed to register webhook:", await watchResponse.text());
      }
    } catch (webhookError) {
      console.error("[Google OAuth Callback] Webhook registration error:", webhookError);
      // Não falhar a conexão se o webhook falhar
    }

    console.log("[Google OAuth Callback] Successfully connected user:", userId);

    // Redirecionar de volta para a página de integrações
    return Response.redirect(
      `${FRONTEND_URL}/integracoes?success=true`,
      302
    );
  } catch (error) {
    console.error("[Google OAuth Callback] Error:", error);
    return Response.redirect(
      `${FRONTEND_URL}/integracoes?error=connection_failed`,
      302
    );
  }
});
