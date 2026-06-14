// create-personalized-demo
// Depois que o lead agenda a demo e descreve a empresa, esta função:
//  1. salva o contexto no demo_request;
//  2. clona o ambiente base "Agência Metria Growth" renomeado pro negócio dele
//     (RPC clone_demo_environment, SECURITY DEFINER);
//  3. cria um usuário admin desse ambiente (login/senha gerados);
//  4. envia por email AO MARKUS o contexto do lead + as credenciais, pra ele
//     chegar preparado na call.
//
// Anti-abuso: só roda se o demo_request já tem horário agendado (scheduled_at)
// e ainda não gerou ambiente (demo_company_id nulo) — no máximo 1 por lead.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <onboarding@resend.dev>";
const ADMIN_DEMO_EMAIL = Deno.env.get("ADMIN_DEMO_EMAIL") || "mviniciusortiz48@gmail.com";
const APP_URL = (Deno.env.get("APP_URL") || "https://vyzon.com.br").replace(/\/$/, "");
// Ambiente base a clonar (Agência Metria Growth). Configurável por env.
const DEMO_SOURCE_COMPANY_ID =
  Deno.env.get("DEMO_SOURCE_COMPANY_ID") || "7e2e21ac-d834-448b-a61b-79ca01255702";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const generatePassword = (length = 12) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let pwd = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) pwd += chars.charAt(bytes[i] % chars.length);
  return pwd;
};

const slugify = (s: string) =>
  (s || "demo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "demo";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function buildAdminEmailHtml(o: {
  leadCompany: string; segment?: string; offer?: string; pain?: string; context?: string;
  leadName?: string; leadEmail?: string; leadPhone?: string; scheduledAt?: string | null;
  login: string; password: string; appUrl: string;
}) {
  const when = o.scheduledAt
    ? new Date(o.scheduledAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "short" })
    : "a confirmar";
  const row = (label: string, val?: string) =>
    val ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;color:#0b1220;font-size:13px">${esc(val)}</td></tr>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:14px;border:1px solid #e6edf5;overflow:hidden">
      <div style="background:linear-gradient(135deg,#1556c0,#0e3e8a);padding:20px 24px">
        <p style="margin:0;color:#cfe0ff;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Nova demo personalizada</p>
        <h1 style="margin:4px 0 0;color:#fff;font-size:20px">${esc(o.leadCompany)}</h1>
      </div>
      <div style="padding:20px 24px">
        <p style="margin:0 0 6px;color:#0b1220;font-size:14px;font-weight:600">Demo agendada para</p>
        <p style="margin:0 0 18px;color:#1556c0;font-size:14px;font-weight:600">${esc(when)}</p>

        <p style="margin:0 0 8px;color:#0b1220;font-size:14px;font-weight:600">Contexto do lead</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
          ${row("Empresa", o.leadCompany)}
          ${row("Segmento", o.segment)}
          ${row("O que vende", o.offer)}
          ${row("Principal dor", o.pain)}
          ${row("Notas", o.context)}
          ${row("Contato", [o.leadName, o.leadEmail, o.leadPhone].filter(Boolean).join(" · "))}
        </table>

        <div style="background:#f8fafc;border:1px solid #e6edf5;border-radius:10px;padding:14px 16px">
          <p style="margin:0 0 10px;color:#0b1220;font-size:14px;font-weight:600">Ambiente pronto pra você entrar</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:3px 12px 3px 0;color:#64748b;font-size:13px">Login</td><td style="padding:3px 0;color:#0b1220;font-size:13px;font-family:monospace">${esc(o.login)}</td></tr>
            <tr><td style="padding:3px 12px 3px 0;color:#64748b;font-size:13px">Senha</td><td style="padding:3px 0;color:#0b1220;font-size:13px;font-family:monospace">${esc(o.password)}</td></tr>
          </table>
          <a href="${esc(o.appUrl)}/login" style="display:inline-block;margin-top:12px;background:#1556c0;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:9px 16px;border-radius:8px">Abrir o ambiente</a>
        </div>
        <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">Ambiente clonado da Agência Metria Growth com o nome do lead. Dá pra mostrar na call como se fosse a operação dele.</p>
      </div>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { demo_request_id, company_name, segment, offer, pain, context } = await req.json();
    if (!demo_request_id || !company_name || String(company_name).trim().length < 2) {
      return json({ error: "demo_request_id e company_name são obrigatórios" }, 400);
    }
    const leadCompany = String(company_name).trim();

    // 1. Carrega o demo_request e valida o anti-abuso
    const { data: dr, error: drErr } = await supabaseAdmin
      .from("demo_requests")
      .select("id, name, email, phone, scheduled_at, demo_company_id")
      .eq("id", demo_request_id)
      .single();
    if (drErr || !dr) return json({ error: "Agendamento não encontrado" }, 404);
    if (!dr.scheduled_at) return json({ error: "Agende um horário antes de personalizar a demo." }, 409);
    if (dr.demo_company_id) {
      return json({ ok: true, already: true, company_id: dr.demo_company_id });
    }

    // 2. Salva o contexto informado pelo lead
    await supabaseAdmin
      .from("demo_requests")
      .update({
        company: leadCompany,
        company_segment: segment || null,
        company_offer: offer || null,
        biggest_pain: pain || null,
        company_context: context || null,
      })
      .eq("id", demo_request_id);

    // 3. Clona o ambiente base renomeado
    const { data: clonedId, error: cloneErr } = await supabaseAdmin.rpc("clone_demo_environment", {
      p_source_company: DEMO_SOURCE_COMPANY_ID,
      p_new_name: leadCompany,
      p_segment: segment || null,
    });
    if (cloneErr || !clonedId) {
      console.error("[create-personalized-demo] clone failed:", cloneErr);
      return json({ error: "Falha ao montar o ambiente." }, 500);
    }
    const companyId = clonedId as string;

    // 4. Cria o usuário admin do ambiente
    const login = `demo-${slugify(leadCompany)}-${crypto.randomUUID().slice(0, 6)}@vyzon.com.br`;
    const password = generatePassword();
    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: login,
      password,
      email_confirm: true,
      user_metadata: { nome: `${leadCompany} (demo)`, company_id: companyId },
    });
    if (userErr || !created?.user) {
      console.error("[create-personalized-demo] createUser failed:", userErr);
      await supabaseAdmin.rpc("delete_demo_environment", { p_company: companyId }); // rollback
      return json({ error: "Falha ao criar o acesso." }, 500);
    }

    // O trigger handle_new_user já cria o profile (company_id vindo do metadata)
    // e o registro em user_roles como 'admin' (autorização real do app). Aqui só
    // alinhamos a coluna cosmética profiles.role por consistência.
    await supabaseAdmin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", created.user.id);

    // 5. Marca o demo_request como personalizado
    await supabaseAdmin
      .from("demo_requests")
      .update({ demo_company_id: companyId, demo_credentials_sent_at: new Date().toISOString() })
      .eq("id", demo_request_id);

    // 6. Envia o email pro Markus
    let emailSent = false;
    if (RESEND_API_KEY) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [ADMIN_DEMO_EMAIL],
            subject: `Demo personalizada: ${leadCompany}`,
            html: buildAdminEmailHtml({
              leadCompany, segment, offer, pain, context,
              leadName: dr.name, leadEmail: dr.email, leadPhone: dr.phone,
              scheduledAt: dr.scheduled_at, login, password, appUrl: APP_URL,
            }),
          }),
        });
        emailSent = res.ok;
        if (!res.ok) console.error("[create-personalized-demo] resend error:", await res.text());
      } catch (e) {
        console.error("[create-personalized-demo] resend threw:", e);
      }
    } else {
      console.warn("[create-personalized-demo] RESEND_API_KEY ausente; pulando email");
    }

    return json({ ok: true, company_id: companyId, email_sent: emailSent });
  } catch (e) {
    console.error("[create-personalized-demo] fatal:", e);
    return json({ error: "Erro inesperado." }, 500);
  }
});
