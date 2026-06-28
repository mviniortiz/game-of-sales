// notify-signup — pinga o admin no WhatsApp quando alguém CRIA UMA CONTA (signup
// real self-service). Disparado por trigger em companies (only plan IS NOT NULL,
// que separa signup real das contas-demo auto-criadas pelo digest, que têm plan
// NULL). Reusa a Evolution (mesmo sender do admin-lead-digest).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const SDR_EVOLUTION_INSTANCE = Deno.env.get("SDR_EVOLUTION_INSTANCE");
const ADMIN_WHATSAPP = Deno.env.get("ADMIN_WHATSAPP");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

async function sendAdminWhatsApp(text: string): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !SDR_EVOLUTION_INSTANCE || !ADMIN_WHATSAPP) {
    console.warn("[notify-signup] WhatsApp env incompletas — pulando");
    return false;
  }
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${SDR_EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: normalizePhone(ADMIN_WHATSAPP), text }),
    });
    if (!res.ok) {
      console.error("[notify-signup] evolution status", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify-signup] evolution error", err);
    return false;
  }
}

const PLAN_LABEL: Record<string, string> = { starter: "Starter", plus: "Plus", pro: "Pro" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { record } = await req.json() as {
      record: { id: string; name?: string; plan?: string; subscription_status?: string };
    };
    const companyId = record?.id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "missing_record" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // O profile do dono é vinculado LOGO APÓS o insert da company (handle_new_user
    // no email signup, onboarding_assign_company no Google). Pequeno retry pra
    // pegar o e-mail sem corrida.
    let owner: { email?: string; nome?: string } | null = null;
    for (let i = 0; i < 4 && !owner?.email; i++) {
      const { data } = await admin
        .from("profiles")
        .select("email, nome")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.email) { owner = data; break; }
      await sleep(1500);
    }

    const plan = PLAN_LABEL[record.plan || ""] || record.plan || "—";
    const lines = [
      "🆕 Novo cadastro na Vyzon",
      "",
      record.name || "Empresa",
      `Plano: ${plan} (trial)`,
    ];
    if (owner?.nome) lines.push(`Nome: ${owner.nome}`);
    if (owner?.email) lines.push(`Email: ${owner.email}`);
    lines.push("");
    lines.push(owner?.email ? "Acabou de criar a conta agora. Dá um oi?" : "Acabou de criar a conta agora.");

    const ok = await sendAdminWhatsApp(lines.join("\n"));
    return new Response(JSON.stringify({ ok, found_owner: !!owner?.email }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-signup] erro", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
