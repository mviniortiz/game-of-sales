// notify-signup — avisa o Markus por e-mail quando alguém CRIA UMA CONTA (signup
// real self-service). Disparado por trigger em companies (only plan IS NOT NULL,
// que separa signup real das contas-demo auto-criadas pelo digest, que têm plan
// NULL). O e-mail traz o WhatsApp do cadastro com o link já aberto numa
// mensagem: quem trava antes de conectar o WhatsApp vira conversa, não some.
//
// Env: RESEND_API_KEY, RESEND_FROM_EMAIL, ADMIN_EMAIL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <suporte@vyzon.com.br>";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function avisar(assunto: string, linhas: string[]): Promise<boolean> {
  if (!ADMIN_EMAIL || !RESEND_API_KEY) {
    console.warn("[notify-signup] ADMIN_EMAIL ou RESEND_API_KEY ausente, aviso não enviado");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [ADMIN_EMAIL], subject: assunto, text: linhas.join("\n") }),
  });
  if (!res.ok) console.error("[notify-signup] resend", res.status, await res.text().catch(() => ""));
  return res.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { record } = await req.json() as {
      record: { id: string; name?: string };
    };
    const companyId = record?.id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "missing_record" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // O profile do dono é vinculado LOGO APÓS o insert da company
    // (onboarding_assign_company). Pequeno retry pra pegar o e-mail sem corrida.
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

    // O gatilho só manda id e nome; WhatsApp e origem vêm da própria linha.
    const { data: c } = await admin.from("companies").select("phone, utm_source, utm_content").eq("id", companyId).maybeSingle();
    const phone = (c?.phone || "").replace(/\D/g, "");

    const empresa = record.name || "Empresa";
    const primeiroNome = (owner?.nome || "").trim().split(/\s+/)[0];
    const linhas = [`${empresa} acabou de criar a conta no Vyzon.`, ""];
    if (owner?.nome) linhas.push(`Nome: ${owner.nome}`);
    if (owner?.email) linhas.push(`E-mail: ${owner.email}`);
    if (phone) linhas.push(`WhatsApp: ${phone}`);
    linhas.push(`Origem: ${c?.utm_source ? `${c.utm_source} / ${c.utm_content || "-"}` : "direto"}`);
    if (phone) {
      const oi = `Oi${primeiroNome ? `, ${primeiroNome}` : ""}! Aqui é o Markus, do Vyzon. Vi que você criou a conta agora. Conseguiu conectar o WhatsApp e ver o seu Raio-X? Se travou em algum passo, te ajudo por aqui.`;
      linhas.push("", "Chamar agora:", `https://wa.me/${phone}?text=${encodeURIComponent(oi)}`);
    }

    const ok = await avisar(`Novo cadastro: ${empresa}`, linhas);
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
