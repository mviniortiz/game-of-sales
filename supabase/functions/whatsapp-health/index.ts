// ─────────────────────────────────────────────────────────────────────────────
// whatsapp-health (2026-10-08) — vigia o servidor de WhatsApp (Whatsmiau no
// Railway). Todos os clientes conectam por ele: se cai, ninguém recebe nem
// manda mensagem pelo Vyzon e nada avisa.
//
// A cada 5 minutos (cron trigger_whatsapp_health) pede a lista de instâncias.
// Guarda o resultado em service_health e manda e-mail ao Markus (ADMIN_EMAIL)
// quando o servidor fica fora em duas checagens seguidas e quando volta.
// Também registra quantas sessões de cliente estão conectadas de verdade, que
// é o que channel_connections.status não sabe dizer.
//
// Invocação: POST com x-cron-secret (cron) ou Bearer service_role. Com
// {"simular_queda": true} no corpo, finge o servidor fora para testar o aviso
// sem derrubar nada (o cron nunca manda isso).
// Env: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVA_CRON_SECRET, RESEND_API_KEY,
//      RESEND_FROM_EMAIL, ADMIN_EMAIL.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");
const API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
const API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Vyzon <suporte@vyzon.com.br>";

const SERVICE = "whatsapp_server";
/** Falhas seguidas antes de avisar: um soluço de rede não vira alarme. */
const FAILS_TO_ALERT = 2;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

type Probe = { ok: boolean; ms: number; error: string | null; instances: number; connected: number; states: Record<string, number> };

/** A lista de instâncias da Whatsmiau não traz o estado; ele vem por instância
 *  em /instance/connectionState/{nome} (rota da Evolution). */
async function stateOf(name: string): Promise<string> {
    try {
        const res = await fetch(`${API_URL}/instance/connectionState/${encodeURIComponent(name)}`, {
            headers: { apikey: API_KEY! },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return `http_${res.status}`;
        const body = await res.json().catch(() => null);
        return String(body?.instance?.state ?? body?.state ?? body?.status ?? "desconhecido").toLowerCase();
    } catch {
        return "sem_resposta";
    }
}

async function probe(): Promise<Probe> {
    const started = Date.now();
    if (!API_URL || !API_KEY) return { ok: false, ms: 0, error: "EVOLUTION_API_URL/KEY ausentes", instances: 0, connected: 0, states: {} };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
        const res = await fetch(`${API_URL}/instance/fetchInstances`, { headers: { apikey: API_KEY }, signal: ctrl.signal });
        const ms = Date.now() - started;
        if (!res.ok) return { ok: false, ms, error: `HTTP ${res.status}`, instances: 0, connected: 0, states: {} };
        const body = await res.json().catch(() => null);
        const list: Record<string, any>[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        const nomes = list.map((e) => String(e?.instanceName ?? e?.id ?? e?.name ?? "")).filter(Boolean);
        const estados = await Promise.all(nomes.map(stateOf));
        const states: Record<string, number> = {};
        for (const s of estados) states[s] = (states[s] || 0) + 1;
        const connected = estados.filter((s) => ["open", "connected", "online"].includes(s)).length;
        return { ok: true, ms, error: null, instances: list.length, connected, states };
    } catch (e) {
        const msg = (e as Error).name === "AbortError" ? "sem resposta em 15s" : (e as Error).message;
        return { ok: false, ms: Date.now() - started, error: msg, instances: 0, connected: 0, states: {} };
    } finally {
        clearTimeout(timer);
    }
}

async function avisar(assunto: string, linhas: string[]): Promise<boolean> {
    if (!ADMIN_EMAIL || !RESEND_API_KEY) {
        console.warn("[whatsapp-health] ADMIN_EMAIL ou RESEND_API_KEY ausente, aviso não enviado:", assunto);
        return false;
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [ADMIN_EMAIL],
            subject: assunto,
            text: linhas.join("\n"),
        }),
    });
    if (!res.ok) console.error("[whatsapp-health] resend", res.status, await res.text().catch(() => ""));
    return res.ok;
}

serve(async (req) => {
    const bearer = (req.headers.get("authorization") || "").replace(/^bearer\s+/i, "").trim();
    const cronOk = EVA_CRON_SECRET && req.headers.get("x-cron-secret") === EVA_CRON_SECRET;
    if (!cronOk && bearer !== SERVICE_ROLE_KEY) return json(401, { error: "unauthorized" });

    const body = await req.json().catch(() => ({}));
    const simular = body?.simular_queda === true;
    const p: Probe = simular
        ? { ok: false, ms: 0, error: "queda simulada", instances: 0, connected: 0, states: {} }
        : await probe();
    const agora = new Date().toISOString();
    const { data: antes } = await supabase.from("service_health").select("*").eq("service", SERVICE).maybeSingle();

    const fails = p.ok ? 0 : (antes?.consecutive_fails ?? 0) + 1;
    const status = p.ok ? "up" : fails >= FAILS_TO_ALERT ? "down" : (antes?.status ?? "up");
    const mudou = status !== (antes?.status ?? "up");
    const painel = "https://railway.com/dashboard";

    let avisado = false;
    if (mudou && status === "down") {
        avisado = await avisar("Servidor de WhatsApp do Vyzon fora do ar", [
            `O servidor de WhatsApp não responde há ${fails} checagens seguidas (cerca de ${fails * 5} minutos).`,
            `Erro: ${p.error}`,
            "",
            "Enquanto ele estiver fora, nenhum cliente recebe nem envia mensagem pelo Vyzon.",
            `Veja o serviço no Railway: ${painel}`,
        ]);
    } else if (mudou && status === "up") {
        avisado = await avisar("Servidor de WhatsApp do Vyzon voltou", [
            `O servidor voltou a responder em ${p.ms} ms.`,
            `Sessões conectadas: ${p.connected} de ${p.instances}.`,
            antes?.since ? `Ficou fora desde ${new Date(antes.since).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "",
        ].filter(Boolean));
    }

    const linha = {
        service: SERVICE,
        status,
        since: mudou || !antes?.since ? agora : antes.since,
        last_checked_at: agora,
        consecutive_fails: fails,
        last_error: p.error,
        details: { ms: p.ms, instances: p.instances, connected: p.connected, states: p.states, last_alert_sent: avisado ? agora : antes?.details?.last_alert_sent ?? null },
    };
    const { error } = await supabase.from("service_health").upsert(linha);
    if (error) return json(500, { error: error.message });
    return json(200, { ...linha, mudou, avisado });
});
