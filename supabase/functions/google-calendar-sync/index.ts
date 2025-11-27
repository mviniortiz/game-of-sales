import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, agendamentoData } = await req.json();

    console.log(`[Google Calendar Sync] Starting - Action: ${action}, User: ${userId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar tokens do usuário
    console.log(`[Google Calendar Sync] Fetching user tokens...`);
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select(
        "google_access_token, google_refresh_token, google_token_expires_at"
      )
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(`[Google Calendar Sync] Error fetching user:`, userError);
      return new Response(JSON.stringify({ error: "Failed to fetch user data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Google Calendar Sync] User data found:`, {
      hasAccessToken: !!user?.google_access_token,
      hasRefreshToken: !!user?.google_refresh_token,
      expiresAt: user?.google_token_expires_at
    });

    if (!user?.google_access_token) {
      console.log(`[Google Calendar Sync] No access token found`);
      return new Response(JSON.stringify({ error: "User not connected to Google" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se token expirou e renovar se necessário
    let accessToken = user.google_access_token;
    const tokenExpired = user.google_token_expires_at && new Date(user.google_token_expires_at) < new Date();
    
    console.log(`[Google Calendar Sync] Token expired: ${tokenExpired}`);
    
    if (tokenExpired && user.google_refresh_token) {
      console.log(`[Google Calendar Sync] Refreshing token...`);
      try {
        accessToken = await refreshGoogleToken(
          user.google_refresh_token,
          userId,
          supabase
        );
        console.log(`[Google Calendar Sync] Token refreshed successfully`);
      } catch (refreshError) {
        console.error(`[Google Calendar Sync] Token refresh failed:`, refreshError);
        return new Response(JSON.stringify({ error: "Failed to refresh token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Executar ação
    let result;
    switch (action) {
      case "create_event":
        result = await createGoogleCalendarEvent(accessToken, agendamentoData);
        break;
      case "update_event":
        result = await updateGoogleCalendarEvent(accessToken, agendamentoData);
        break;
      case "delete_event":
        result = await deleteGoogleCalendarEvent(
          accessToken,
          agendamentoData.google_event_id
        );
        break;
      case "sync_all":
        result = await syncAllEvents(accessToken, userId, supabase);
        break;
      default:
        throw new Error("Invalid action");
    }

    console.log(`[Google Calendar Sync] Success:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Google Calendar Sync] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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

  // Salvar novo token
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

async function createGoogleCalendarEvent(
  accessToken: string,
  agendamento: any
) {
  const event = {
    summary: `Call com ${agendamento.cliente_nome}`,
    description: agendamento.observacoes || "",
    start: {
      dateTime: agendamento.data_agendamento,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: new Date(
        new Date(agendamento.data_agendamento).getTime() + 60 * 60 * 1000
      ).toISOString(),
      timeZone: "America/Sao_Paulo",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  return { eventId: data.id, htmlLink: data.htmlLink };
}

async function updateGoogleCalendarEvent(
  accessToken: string,
  agendamento: any
) {
  const event = {
    summary: `Call com ${agendamento.cliente_nome}`,
    description: agendamento.observacoes || "",
    start: {
      dateTime: agendamento.data_agendamento,
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: new Date(
        new Date(agendamento.data_agendamento).getTime() + 60 * 60 * 1000
      ).toISOString(),
      timeZone: "America/Sao_Paulo",
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${agendamento.google_event_id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  return { eventId: data.id };
}

async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return { success: true };
}

async function syncAllEvents(accessToken: string, userId: string, supabase: any) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  const events = data.items || [];

  if (events.length === 0) {
    return { synced: 0, inserted: 0 };
  }

  // Buscar TODOS os eventos existentes de uma vez
  const googleEventIds = events.map((e: any) => e.id).filter(Boolean);
  const { data: existingEvents } = await supabase
    .from("agendamentos")
    .select("google_event_id")
    .eq("user_id", userId)
    .in("google_event_id", googleEventIds);

  const existingIds = new Set(
    existingEvents?.map((e: any) => e.google_event_id) || []
  );

  // Filtrar apenas eventos novos com summary válido
  const newEvents = events
    .filter((event: any) => 
      event.summary && 
      (event.start?.dateTime || event.start?.date) && 
      !existingIds.has(event.id)
    )
    .map((event: any) => ({
      user_id: userId,
      cliente_nome: event.summary.replace("Call com ", ""),
      data_agendamento: event.start.dateTime || event.start.date + "T09:00:00",
      observacoes: event.description || "Sincronizado do Google Calendar",
      google_event_id: event.id,
      synced_with_google: true,
      last_synced_at: new Date().toISOString(),
      status: "agendado", // Importante: definir status padrão
    }));

  // Insert em batch
  console.log(`[Google Calendar Sync] Found ${events.length} events from Google`);
  console.log(`[Google Calendar Sync] New events to insert: ${newEvents.length}`);
  
  if (newEvents.length > 0) {
    console.log(`[Google Calendar Sync] Sample event:`, JSON.stringify(newEvents[0]));
    
    const { data: insertedData, error: insertError } = await supabase
      .from("agendamentos")
      .insert(newEvents)
      .select();
    
    if (insertError) {
      console.error(`[Google Calendar Sync] Insert error:`, insertError);
      throw new Error(`Failed to insert events: ${insertError.message}`);
    }
    
    console.log(`[Google Calendar Sync] Successfully inserted ${insertedData?.length || 0} events`);
    return { synced: events.length, inserted: insertedData?.length || 0 };
  }

  return { synced: events.length, inserted: 0 };
}
