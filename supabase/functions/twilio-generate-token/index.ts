// Supabase Edge Function: Generate Twilio Access Token for WebRTC browser calling
// Uses Twilio's API Key + Secret to generate short-lived tokens

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
const TWILIO_API_SECRET = Deno.env.get("TWILIO_API_SECRET");
const TWILIO_TWIML_APP_SID = Deno.env.get("TWILIO_TWIML_APP_SID");

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

// Minimal JWT builder for Twilio Access Token (no external deps needed)
function base64url(input: Uint8Array): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    for (let i = 0; i < input.length; i += 3) {
        const a = input[i];
        const b = input[i + 1] || 0;
        const c = input[i + 2] || 0;
        result += chars[a >> 2];
        result += chars[((a & 3) << 4) | (b >> 4)];
        result += i + 1 < input.length ? chars[((b & 15) << 2) | (c >> 6)] : "=";
        result += i + 2 < input.length ? chars[c & 63] : "=";
    }
    return result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function strToUint8(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

async function hmacSha256(key: string, data: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        strToUint8(key),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, strToUint8(data));
    return base64url(new Uint8Array(sig));
}

async function generateTwilioAccessToken(params: {
    accountSid: string;
    apiKey: string;
    apiSecret: string;
    identity: string;
    twimlAppSid: string;
    ttl?: number;
}): Promise<string> {
    const { accountSid, apiKey, apiSecret, identity, twimlAppSid, ttl = 3600 } = params;

    const now = Math.floor(Date.now() / 1000);

    const header = {
        typ: "JWT",
        alg: "HS256",
        cty: "twilio-fpa;v=1",
    };

    const grants: Record<string, unknown> = {
        identity,
        voice: {
            incoming: { allow: true },
            outgoing: { application_sid: twimlAppSid },
        },
    };

    const payload = {
        jti: `${apiKey}-${now}`,
        iss: apiKey,
        sub: accountSid,
        iat: now,
        exp: now + ttl,
        grants,
    };

    const headerB64 = base64url(strToUint8(JSON.stringify(header)));
    const payloadB64 = base64url(strToUint8(JSON.stringify(payload)));
    const signature = await hmacSha256(apiSecret, `${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
            return json(500, {
                error: "Twilio WebRTC nao configurado. Defina TWILIO_API_KEY, TWILIO_API_SECRET e TWILIO_TWIML_APP_SID.",
                code: "TWILIO_WEBRTC_NOT_CONFIGURED",
            });
        }

        // Authenticate user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return json(401, { error: "Unauthorized" });

        const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: { user }, error: userError } = await userSupabase.auth.getUser();
        if (userError || !user) return json(401, { error: "Unauthorized" });

        // Verify user has calls access
        const { data: profile } = await (adminSupabase as any)
            .from("profiles")
            .select("is_super_admin, company_id")
            .eq("id", user.id)
            .single();

        if (!profile) return json(403, { error: "Profile not found" });

        const isSuperAdmin = profile.is_super_admin === true;
        if (!isSuperAdmin) {
            const { data: company } = await (adminSupabase as any)
                .from("companies")
                .select("plan")
                .eq("id", profile.company_id)
                .single();

            const plan = String(company?.plan || "starter").toLowerCase();
            if (!["plus", "pro"].includes(plan)) {
                return json(403, { error: "Plano Plus ou Pro necessario", code: "PLAN_UPGRADE_REQUIRED" });
            }

            const { data: addon } = await (adminSupabase as any)
                .from("company_addons")
                .select("calls_enabled")
                .eq("company_id", profile.company_id)
                .maybeSingle();

            if (addon?.calls_enabled !== true) {
                return json(403, { error: "Add-on de ligacoes nao ativo", code: "CALLS_ADDON_REQUIRED" });
            }
        }

        // Generate identity: user_id truncated for Twilio (max 128 chars)
        const identity = `user_${user.id.replace(/-/g, "").slice(0, 24)}`;

        const token = await generateTwilioAccessToken({
            accountSid: TWILIO_ACCOUNT_SID,
            apiKey: TWILIO_API_KEY,
            apiSecret: TWILIO_API_SECRET,
            identity,
            twimlAppSid: TWILIO_TWIML_APP_SID,
            ttl: 3600,
        });

        return json(200, {
            success: true,
            token,
            identity,
            ttl: 3600,
        });
    } catch (error) {
        console.error("[twilio-generate-token] error:", error);
        return json(500, { error: "Internal server error" });
    }
});
