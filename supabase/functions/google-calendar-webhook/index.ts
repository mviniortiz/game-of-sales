import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-resource-state, x-goog-resource-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar se é uma notificação do Google
    const resourceState = req.headers.get("x-goog-resource-state");
    const channelId = req.headers.get("x-goog-channel-id");

    console.log(
      `[Google Calendar Webhook] Resource State: ${resourceState}, Channel: ${channelId}`
    );

    // Se for sync, apenas confirmar o webhook
    if (resourceState === "sync") {
      return new Response("Webhook verified", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Se for exists, processar mudanças
    if (resourceState === "exists" && channelId) {
      // Buscar usuário baseado no channel ID
      // O channel ID deve ser salvo quando criamos a inscrição
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, google_access_token, google_refresh_token, google_token_expires_at")
        .eq("google_calendar_id", channelId)
        .single();

      if (!profile) {
        console.error("[Google Calendar Webhook] Profile not found for channel:", channelId);
        return new Response("Profile not found", {
          status: 404,
          headers: corsHeaders,
        });
      }

      // Verificar e renovar token se necessário
      let accessToken = profile.google_access_token;
      if (new Date(profile.google_token_expires_at) < new Date()) {
        accessToken = await refreshGoogleToken(
          profile.google_refresh_token,
          profile.id,
          supabase
        );
      }

      // Buscar eventos recentes do Google Calendar
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${oneMonthAgo.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!calendarResponse.ok) {
        throw new Error("Failed to fetch calendar events");
      }

      const calendarData = await calendarResponse.json();
      const events = calendarData.items || [];

      console.log(`[Google Calendar Webhook] Found ${events.length} events`);

      // Processar cada evento
      for (const event of events) {
        if (!event.start?.dateTime) continue;

        // Verificar se já existe agendamento com este google_event_id
        const { data: existingAgendamento } = await supabase
          .from("agendamentos")
          .select("id")
          .eq("google_event_id", event.id)
          .eq("user_id", profile.id)
          .single();

        if (!existingAgendamento) {
          // Criar novo agendamento
          const { error: insertError } = await supabase
            .from("agendamentos")
            .insert({
              user_id: profile.id,
              cliente_nome: event.summary || "Sem título",
              data_agendamento: event.start.dateTime,
              observacoes: event.description || null,
              google_event_id: event.id,
              synced_with_google: true,
              status: "agendado",
            });

          if (insertError) {
            console.error("[Google Calendar Webhook] Insert error:", insertError);
          } else {
            console.log("[Google Calendar Webhook] Created agendamento for event:", event.id);
          }
        }
      }

      // Log de sincronização
      await supabase.from("sync_logs").insert({
        user_id: profile.id,
        action: "webhook_sync",
        resource_type: "google_calendar",
        success: true,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Google Calendar Webhook] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshGoogleToken(
  refreshToken: string,
  userId: string,
  supabase: any
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  await supabase
    .from("profiles")
    .update({
      google_access_token: data.access_token,
      google_token_expires_at: new Date(
        Date.now() + data.expires_in * 1000
      ).toISOString(),
    })
    .eq("id", userId);

  return data.access_token;
}
