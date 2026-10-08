import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    // Only super admins can access the inbox
    const { data: profile } = await (supabaseAdmin as any)
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_super_admin) return json({ error: "Forbidden" }, 403);

    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action || "list";

    // LIST: get all received emails
    if (action === "list") {
      const limit = body.limit ?? 50;
      const url = `https://api.resend.com/emails/receiving?limit=${limit}`;
      console.log("[admin-support-inbox] GET", url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      const rawText = await res.text();
      let data: any;
      try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }
      if (!res.ok) return json({ error: data?.message || `Resend API returned ${res.status}`, status: res.status, details: data }, 200);

      // Marca quem escreveu: usuário do Vyzon ou lead que já pediu algo. É o
      // que separa cliente de newsletter na aba de Suporte.
      const emails = (data?.data || []) as Array<Record<string, any>>;
      const addr = (from: string) => (from.match(/<([^>]+)>/)?.[1] || from).trim().toLowerCase();
      const senders = [...new Set(emails.map((e) => addr(String(e.from || ""))))].filter(Boolean);
      if (senders.length) {
        const [{ data: users }, { data: leads }] = await Promise.all([
          (supabaseAdmin as any).from("profiles").select("email").in("email", senders),
          (supabaseAdmin as any).from("demo_requests").select("email").in("email", senders),
        ]);
        const usuarios = new Set((users || []).map((r: any) => String(r.email).toLowerCase()));
        const contatos = new Set((leads || []).map((r: any) => String(r.email).toLowerCase()));
        for (const e of emails) {
          const a = addr(String(e.from || ""));
          e.vyzon_contact = usuarios.has(a) ? "usuario" : contatos.has(a) ? "lead" : null;
        }
      }
      return json(data);
    }

    // GET: retrieve single received email with body
    if (action === "get") {
      const { id } = body;
      if (!id) return json({ error: "id is required" }, 400);
      const res = await fetch(`https://api.resend.com/emails/receiving/${id}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Resend API error", details: data }, res.status);
      return json(data);
    }

    // REPLY: send email using Resend send API
    if (action === "reply") {
      const { to, subject, html, text, inReplyTo, from } = body;
      if (!to || !subject || (!html && !text)) {
        return json({ error: "to, subject and (html or text) are required" }, 400);
      }

      const fromAddress = from || Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon Suporte <suporte@vyzon.com.br>";

      const payload: Record<string, unknown> = {
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
      };
      if (html) payload.html = html;
      if (text) payload.text = text;
      if (inReplyTo) {
        payload.headers = { "In-Reply-To": inReplyTo, "References": inReplyTo };
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Resend send error", details: data }, res.status);
      return json({ success: true, id: data?.id });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("admin-support-inbox error", error);
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});
