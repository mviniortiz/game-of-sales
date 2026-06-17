import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@2.8.0";

// gemini-live-token — gera um token efêmero (curta duração, uso único) do Gemini
// Live API server-side, pra o browser conectar no WebSocket SEM expor a
// GEMINI_API_KEY. Token expira em 15min (teto da sessão) e a sessão precisa
// iniciar em 2min. Rate-limit por IP. Fallback { ok:false, reason } pro front
// mostrar mensagem clara (ou cair na demo narrada da Fase 1) quando não dá.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = Deno.env.get("GEMINI_LIVE_MODEL") || "gemini-2.5-flash-native-audio-preview-12-2025";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    if (!GEMINI_API_KEY) return json(200, { ok: false, reason: "no_key" });

    // rate-limit por IP (fail-open)
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    try {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data } = await admin.rpc("consume_rate_limit", {
            p_bucket: `gemini-live:${ip}`,
            p_limit: 8,
            p_window_seconds: 3600,
        });
        if (data === false) return json(429, { ok: false, reason: "rate_limit", message: "Muitas sessões. Tente em alguns minutos." });
    } catch {
        /* fail-open */
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY, httpOptions: { apiVersion: "v1alpha" } });
        const now = Date.now();
        const token = await ai.authTokens.create({
            config: {
                uses: 1,
                expireTime: new Date(now + 15 * 60 * 1000).toISOString(),
                newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
            },
        });
        return json(200, { ok: true, token: token.name, model: MODEL });
    } catch (e) {
        console.error("[gemini-live-token] mint error:", e);
        return json(200, { ok: false, reason: "mint_error", message: String(e instanceof Error ? e.message : e) });
    }
});
