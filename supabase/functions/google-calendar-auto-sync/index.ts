import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    console.log("[Auto-Sync] Starting automatic calendar sync...");

    // Buscar todos os usuários com Google Calendar conectado
    const { data: connectedUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, google_access_token, google_refresh_token, google_token_expires_at")
      .not("google_access_token", "is", null);

    if (usersError) {
      throw usersError;
    }

    if (!connectedUsers || connectedUsers.length === 0) {
      console.log("[Auto-Sync] No users with Google Calendar connected");
      return new Response(
        JSON.stringify({ message: "No users to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Auto-Sync] Found ${connectedUsers.length} users to sync`);

    const results = [];

    for (const user of connectedUsers) {
      try {
        // Chamar a função de sync para cada usuário
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
          "google-calendar-sync",
          {
            body: {
              action: "sync_all",
              userId: user.id,
            },
          }
        );

        if (syncError) {
          console.error(`[Auto-Sync] Error syncing user ${user.id}:`, syncError);
          results.push({ userId: user.id, success: false, error: syncError.message });
        } else {
          console.log(`[Auto-Sync] Successfully synced user ${user.id}:`, syncResult);
          results.push({ userId: user.id, success: true, ...syncResult });
        }
      } catch (error) {
        console.error(`[Auto-Sync] Exception syncing user ${user.id}:`, error);
        results.push({ 
          userId: user.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Auto-Sync] Completed. ${successCount}/${connectedUsers.length} users synced successfully`);

    return new Response(
      JSON.stringify({
        message: "Auto-sync completed",
        totalUsers: connectedUsers.length,
        successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Auto-Sync] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
