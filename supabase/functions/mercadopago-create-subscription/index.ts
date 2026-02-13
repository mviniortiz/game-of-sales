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

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { token, email, planId, companyId, payerInfo } = await req.json();

        // Validate required fields
        if (!token || !email || !planId || !companyId) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: token, email, planId, companyId" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create subscription in Mercado Pago
        const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                preapproval_plan_id: planId,
                reason: "Assinatura Game Sales",
                external_reference: companyId,
                payer_email: email,
                card_token_id: token,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: "months",
                    start_date: new Date().toISOString(),
                    end_date: null,
                    transaction_amount: null, // Will use plan amount
                    currency_id: "BRL",
                    free_trial: {
                        frequency: 7,
                        frequency_type: "days"
                    }
                },
                back_url: "https://gamesales.app/admin/dashboard",
                status: "authorized"
            })
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error("MP Error:", mpData);
            return new Response(
                JSON.stringify({ error: mpData.message || "Error creating subscription" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update company with subscription info
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        const { error: updateError } = await supabase
            .from("companies")
            .update({
                mp_subscription_id: mpData.id,
                mp_customer_id: mpData.payer_id,
                subscription_status: "trialing"
            })
            .eq("id", companyId);

        if (updateError) {
            console.error("Supabase update error:", updateError);
            // Don't fail - subscription was created successfully
        }

        return new Response(
            JSON.stringify({
                success: true,
                subscriptionId: mpData.id,
                status: mpData.status
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
