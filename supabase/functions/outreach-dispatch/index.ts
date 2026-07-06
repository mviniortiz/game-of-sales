// ─────────────────────────────────────────────────────────────────────────────
// OUTREACH.1 — outreach-dispatch: envia os emails de prospecção devidos
// (outreach_emails queued com scheduled_at vencido) via Resend, com CAP por
// rodada. Chamada 3x/dia útil pelo pg_cron (trigger_outreach_dispatch) — o cap
// de 2 por rodada dá no máximo 6/dia (ramp de deliverability de propósito;
// não subir sem histórico de entrega limpo).
//
// Regras:
//   - Só envia se o prospect está 'active' (replied/opted_out/bounced param a
//     sequência: o email é marcado 'cancelled', não enviado).
//   - Texto puro (cold email não é HTML), reply-to no Gmail do Markus.
//   - Envs: RESEND_API_KEY, OUTREACH_FROM ("Markus <m@dominio>"),
//     OUTREACH_REPLY_TO. Auth: x-cron-secret === EVA_CRON_SECRET (mesmo
//     secret do padrão de cron do projeto).
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Reusa a infra de email que o SDR já usava (domínio já verificado no Resend);
// OUTREACH_* sobrescreve se um dia houver domínio de envio dedicado.
const FROM = Deno.env.get("OUTREACH_FROM") ?? Deno.env.get("RESEND_FROM_EMAIL") ?? "";
const REPLY_TO = Deno.env.get("OUTREACH_REPLY_TO") ?? Deno.env.get("SDR_REPLY_TO") ?? "";

const PER_RUN_CAP = 2;

Deno.serve(async (req) => {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    const provided = req.headers.get("x-cron-secret");
    if (!EVA_CRON_SECRET || provided !== EVA_CRON_SECRET) {
        return new Response("unauthorized", { status: 401 });
    }
    if (!RESEND_API_KEY || !FROM) {
        return new Response(JSON.stringify({ error: "RESEND_API_KEY/OUTREACH_FROM não configurados" }), { status: 500 });
    }

    const db = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: due, error } = await db
        .from("outreach_emails")
        .select("id, step, subject, body, prospect:outreach_prospects(id, name, email, status)")
        .eq("status", "queued")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(PER_RUN_CAP * 3); // folga pra pular cancelados sem perder a rodada

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    let sent = 0, cancelled = 0, failed = 0;
    for (const row of due ?? []) {
        if (sent >= PER_RUN_CAP) break;
        const p = row.prospect as unknown as { id: string; name: string; email: string | null; status: string };

        // Prospect saiu da sequência (respondeu/opt-out/bounce) ou sem email → cancela o toque.
        if (!p || p.status !== "active" || !p.email) {
            await db.from("outreach_emails").update({ status: "cancelled" }).eq("id", row.id);
            cancelled++;
            continue;
        }

        const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                from: FROM,
                to: [p.email],
                ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
                subject: row.subject,
                text: row.body,
            }),
        });

        if (r.ok) {
            const { id: resendId } = await r.json();
            await db.from("outreach_emails").update({
                status: "sent",
                sent_at: new Date().toISOString(),
                resend_id: resendId ?? null,
            }).eq("id", row.id);
            sent++;
        } else {
            const detail = await r.text();
            await db.from("outreach_emails").update({ status: "error", error: detail.slice(0, 500) }).eq("id", row.id);
            failed++;
            console.error(`outreach-dispatch: falha pro prospect ${p.id}: ${detail.slice(0, 200)}`);
        }
    }

    return new Response(JSON.stringify({ sent, cancelled, failed }), {
        headers: { "Content-Type": "application/json" },
    });
});
