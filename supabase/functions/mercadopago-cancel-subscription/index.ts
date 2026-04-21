// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        console.warn("[mercadopago-cancel-subscription] rate limit unavailable:", error);
        return { enabled: false, allowed: true };
    }
}

serve(async (req) => {
    const corsOrigin = req.headers.get("origin") || "";
    const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:8080",
        "https://vyzon.com.br",
        "https://www.vyzon.com.br",
    ];
    const origin = allowedOrigins.includes(corsOrigin) ? corsOrigin : allowedOrigins[0];

    const strictCorsHeaders = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
    };

    if (req.method === "OPTIONS") {
        return new Response(null, { headers: strictCorsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: strictCorsHeaders,
            });
        }

        const userSupabase = createClient(SUPABASE_URL!, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await userSupabase.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: strictCorsHeaders,
            });
        }

        const { companyId, reason } = await req.json();

        if (!companyId) {
            return new Response(JSON.stringify({ error: "Missing companyId" }), {
                status: 400,
                headers: strictCorsHeaders,
            });
        }

        // Tenant ownership + admin role check
        const { data: profile } = await userSupabase
            .from("profiles")
            .select("company_id, is_super_admin")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return new Response(JSON.stringify({ error: "Profile not found" }), {
                status: 403,
                headers: strictCorsHeaders,
            });
        }

        const isSuperAdmin = profile.is_super_admin === true;
        const isSameTenant = profile.company_id === companyId;

        if (!isSameTenant && !isSuperAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden: Tenant mismatch" }), {
                status: 403,
                headers: strictCorsHeaders,
            });
        }

        // Must be admin of the tenant (checked via user_roles) unless super admin
        if (!isSuperAdmin) {
            const { data: roleRow } = await userSupabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .eq("company_id", companyId)
                .eq("role", "admin")
                .maybeSingle();

            if (!roleRow) {
                return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
                    status: 403,
                    headers: strictCorsHeaders,
                });
            }
        }

        const adminSupabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        const rateLimit = await consumeRateLimit(
            adminSupabase,
            `mercadopago-cancel-subscription:company:${companyId}`,
            5,
            3600,
        );
        if (!rateLimit.allowed) {
            return new Response(
                JSON.stringify({
                    error: "Too many cancellation attempts",
                    code: "RATE_LIMITED",
                    reset_at: rateLimit.resetAt ?? null,
                }),
                { status: 429, headers: strictCorsHeaders },
            );
        }

        const { data: company, error: companyError } = await adminSupabase
            .from("companies")
            .select("id, mp_subscription_id, subscription_status, subscription_cancelled_at")
            .eq("id", companyId)
            .single();

        if (companyError || !company) {
            return new Response(JSON.stringify({ error: "Company not found" }), {
                status: 404,
                headers: strictCorsHeaders,
            });
        }

        if (company.subscription_status === "cancelled" || company.subscription_cancelled_at) {
            return new Response(
                JSON.stringify({
                    error: "Subscription already cancelled",
                    code: "ALREADY_CANCELLED",
                }),
                { status: 409, headers: strictCorsHeaders },
            );
        }

        // Cancel on Mercado Pago (non-fatal: we still record locally even if MP fails
        // because the tenant already requested cancellation, and MP webhook will reconcile).
        let mpCancelled = false;
        let nextBillingDate: string | null = null;

        if (company.mp_subscription_id) {
            try {
                const getRes = await fetch(
                    `https://api.mercadopago.com/preapproval/${company.mp_subscription_id}`,
                    { headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } },
                );
                if (getRes.ok) {
                    const info = await getRes.json();
                    nextBillingDate = info.next_payment_date || info.auto_recurring?.end_date || null;
                }

                const cancelRes = await fetch(
                    `https://api.mercadopago.com/preapproval/${company.mp_subscription_id}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ status: "cancelled" }),
                    },
                );
                mpCancelled = cancelRes.ok;
                if (!cancelRes.ok) {
                    const errBody = await cancelRes.text();
                    console.error("[MP] Cancel failed:", cancelRes.status, errBody);
                }
            } catch (mpError) {
                console.error("[MP] Cancel network error:", mpError);
            }
        }

        // Access stays until end of paid cycle (or now, if trialing / never paid).
        const endsAt = nextBillingDate || new Date().toISOString();
        const cancelledAt = new Date().toISOString();

        const sanitizedReason =
            typeof reason === "string" ? reason.trim().slice(0, 500) || null : null;

        const { error: updateError } = await adminSupabase
            .from("companies")
            .update({
                subscription_status: "cancelled",
                subscription_cancelled_at: cancelledAt,
                subscription_ends_at: endsAt,
                cancellation_reason: sanitizedReason,
            })
            .eq("id", companyId);

        if (updateError) {
            console.error("[cancel] Supabase update error:", updateError);
            return new Response(
                JSON.stringify({ error: "Failed to update subscription status" }),
                { status: 500, headers: strictCorsHeaders },
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                cancelled_at: cancelledAt,
                ends_at: endsAt,
                mp_cancelled: mpCancelled,
            }),
            { status: 200, headers: strictCorsHeaders },
        );
    } catch (error) {
        console.error("[mercadopago-cancel-subscription] Error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: strictCorsHeaders,
        });
    }
});
