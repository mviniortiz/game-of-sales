// Follow this Supabase Functions Deno style.
// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports  
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function consumeRateLimit(
    supabaseAdminClient: any,
    bucket: string,
    limit: number,
    windowSeconds: number,
) {
    try {
        const { data, error } = await supabaseAdminClient.rpc("consume_rate_limit", {
            p_bucket: bucket,
            p_limit: limit,
            p_window_seconds: windowSeconds,
        });
        if (error) {
            const msg = String(error.message || "").toLowerCase();
            if (msg.includes("consume_rate_limit")) return { enabled: false, allowed: true };
            throw error;
        }
        const row = Array.isArray(data) ? data[0] : data;
        return { enabled: true, allowed: row?.allowed !== false, resetAt: row?.reset_at ?? null };
    } catch (error) {
        console.warn("[mercadopago-create-subscription] rate limit unavailable:", error);
        return { enabled: false, allowed: true };
    }
}

serve(async (req) => {
    try {
        const corsOrigin = req.headers.get('origin') || '';
        const allowedOrigins = ['http://localhost:5173', 'http://localhost:8080', 'https://gamesales.app', 'https://game-of-sales.vercel.app'];
        const origin = allowedOrigins.includes(corsOrigin) ? corsOrigin : allowedOrigins[0];

        const strictCorsHeaders = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
        };

        if (req.method === "OPTIONS") {
            return new Response(null, { headers: strictCorsHeaders });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: strictCorsHeaders });
        }

        const userSupabase = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await userSupabase.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: strictCorsHeaders });
        }

        const { token, email, planId, companyId, payerInfo, billingConfig } = await req.json();

        if (!token || !email || !companyId) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: strictCorsHeaders });
        }

        // billingConfig: { frequency, frequencyType, transactionAmount }
        if (!billingConfig && !planId) {
            return new Response(JSON.stringify({ error: "Missing billingConfig or planId" }), { status: 400, headers: strictCorsHeaders });
        }

        // P0: Validar ownership do tenant
        const { data: profile } = await userSupabase.from('profiles').select('company_id, is_super_admin').eq('id', user.id).single();
        if (!profile || (profile.company_id !== companyId && !profile.is_super_admin)) {
            return new Response(JSON.stringify({ error: "Forbidden: Tenant mismatch" }), { status: 403, headers: strictCorsHeaders });
        }

        const adminSupabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const rateLimit = await consumeRateLimit(
            adminSupabase,
            `mercadopago-create-subscription:user:${user.id}:company:${companyId}`,
            10,
            3600,
        );
        if (!rateLimit.allowed) {
            return new Response(
                JSON.stringify({ error: "Too many subscription attempts", code: "RATE_LIMITED", reset_at: rateLimit.resetAt ?? null }),
                { status: 429, headers: strictCorsHeaders }
            );
        }

        // Build MP subscription body
        const subscriptionBody: Record<string, any> = {
            reason: "Assinatura Game Sales",
            external_reference: companyId,
            payer_email: email,
            card_token_id: token,
            back_url: "https://gamesales.com.br/dashboard",
            status: "authorized",
        };

        if (billingConfig) {
            // Transparent checkout: send amount/frequency directly (no preapproval_plan_id)
            subscriptionBody.auto_recurring = {
                frequency: billingConfig.frequency,
                frequency_type: billingConfig.frequencyType || "months",
                transaction_amount: billingConfig.transactionAmount,
                currency_id: "BRL",
                free_trial: {
                    frequency: 7,
                    frequency_type: "days",
                },
            };
        } else {
            // Legacy: use pre-created MP plan
            subscriptionBody.preapproval_plan_id = planId;
            subscriptionBody.auto_recurring = {
                frequency: 1,
                frequency_type: "months",
                start_date: new Date().toISOString(),
                end_date: null,
                transaction_amount: null,
                currency_id: "BRL",
                free_trial: {
                    frequency: 7,
                    frequency_type: "days",
                },
            };
        }

        const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(subscriptionBody)
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error("MP Error:", mpData);
            return new Response(
                JSON.stringify({ error: mpData.message || "Error creating subscription" }),
                { status: 400, headers: strictCorsHeaders }
            );
        }

        const companyUpdate: Record<string, any> = {
            mp_subscription_id: mpData.id,
            mp_customer_id: mpData.payer_id?.toString() || null,
            subscription_status: "trialing",
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const { error: updateError } = await adminSupabase
            .from("companies")
            .update(companyUpdate)
            .eq("id", companyId);

        if (updateError) {
            console.error("Supabase update error:", updateError);
        }

        return new Response(
            JSON.stringify({ success: true, subscriptionId: mpData.id, status: mpData.status }),
            { status: 200, headers: strictCorsHeaders }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
