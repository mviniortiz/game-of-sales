import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sellerId } = await req.json();
    if (!sellerId) {
      return new Response(JSON.stringify({ error: "sellerId é obrigatório" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (sellerId === user.id) {
      return new Response(JSON.stringify({ error: "Você não pode remover sua própria conta" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check requester is admin or super admin
    const { data: requesterProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, company_id, is_super_admin")
      .eq("id", user.id)
      .single();

    if (!requesterProfile) {
      return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRole } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isSuperAdmin = requesterProfile.is_super_admin === true;
    const isAdmin = !!adminRole;

    if (!isSuperAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão para realizar esta ação" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check seller exists and belongs to same company (unless super admin)
    const { data: sellerProfile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, nome, company_id")
      .eq("id", sellerId)
      .single();

    if (!sellerProfile) {
      return new Response(JSON.stringify({ error: "Vendedor não encontrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSuperAdmin && sellerProfile.company_id !== requesterProfile.company_id) {
      return new Response(JSON.stringify({ error: "Vendedor pertence a outra empresa" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check seller is not an admin (prevent deleting admins)
    const { data: sellerAdminRole } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", sellerId)
      .eq("role", "admin")
      .maybeSingle();

    if (sellerAdminRole && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Não é possível remover um administrador" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // deals.user_id é NOT NULL e apaga em cascata com o usuário: sem repassar,
    // remover alguém da equipe apagaria todas as oportunidades dela.
    let heirId: string | null = requesterProfile.company_id === sellerProfile.company_id ? user.id : null;
    if (!heirId) {
      const { data: adminRows } = await (supabaseAdmin as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .neq("user_id", sellerId);
      const adminIds = (adminRows ?? []).map((r: { user_id: string }) => r.user_id);
      if (adminIds.length) {
        const { data: heir } = await (supabaseAdmin as any)
          .from("profiles")
          .select("id")
          .eq("company_id", sellerProfile.company_id)
          .in("id", adminIds)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        heirId = heir?.id ?? null;
      }
    }
    if (!heirId) {
      return new Response(JSON.stringify({ error: "A empresa não tem outro admin para receber as oportunidades desta pessoa" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error: moveError } = await (supabaseAdmin as any)
      .from("deals")
      .update({ user_id: heirId })
      .eq("user_id", sellerId);
    if (moveError) {
      console.error("[admin-delete-seller] repasse de deals falhou:", moveError);
      return new Response(JSON.stringify({ error: "Não deu para repassar as oportunidades; nada foi removido" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete from auth.users (cascades to profiles via FK or trigger)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(sellerId);

    if (deleteError) {
      console.error("[admin-delete-seller] deleteUser error:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up profile and roles explicitly (in case cascade doesn't cover it)
    await (supabaseAdmin as any).from("user_roles").delete().eq("user_id", sellerId);
    await (supabaseAdmin as any).from("profiles").delete().eq("id", sellerId);

    console.log(`[admin-delete-seller] User ${sellerId} (${sellerProfile.nome}) deleted by ${user.id}; deals -> ${heirId}`);

    return new Response(JSON.stringify({ success: true, deletedName: sellerProfile.nome }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[admin-delete-seller] error:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao remover vendedor" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
