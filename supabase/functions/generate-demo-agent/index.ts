import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// generate-demo-agent — recebe a URL do site do lead, faz scraping do PRÓPRIO
// site dele (consentido; não é enriquecimento externo de terceiros) e gera um
// "agente demo" (blueprint de contexto) com o mesmo LLM da EVA (gpt-5.4-nano).
// Pública (a landing é pública), com SSRF guard, timeout, rate-limit fail-open
// e fallback "thin" quando o site bloqueia/vem pobre. NÃO clona ambiente nem
// cria usuário — devolve só a PRÉVIA; o ambiente completo fica no fluxo de demo
// agendada (create-personalized-demo).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

// Bloqueia hosts internos/privados (SSRF). Literais — DNS rebinding fica fora
// do escopo deste MVP (sem resolução de DNS no edge).
function isUnsafeHost(host: string): boolean {
    const h = host.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
    if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
    return false;
}

// Provedores de e-mail gratuitos/pessoais — exigimos e-mail de trabalho
// (domínio próprio), como na referência (work email). Inclui os comuns no BR.
const FREE_EMAIL_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com",
    "outlook.com.br", "live.com", "live.com.br", "msn.com", "yahoo.com", "yahoo.com.br",
    "ymail.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
    "pm.me", "gmx.com", "gmx.net", "aol.com", "zoho.com", "mail.com", "yandex.com",
    "tutanota.com", "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br",
    "globo.com", "globomail.com", "r7.com", "oi.com.br", "pop.com.br",
]);

function classifyEmail(raw: string): "ok" | "invalid" | "free" {
    const e = (raw || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "invalid";
    const domain = e.split("@")[1];
    if (FREE_EMAIL_DOMAINS.has(domain)) return "free";
    return "ok";
}

function normalizeUrl(raw: string): URL | null {
    let s = (raw || "").trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    try {
        const u = new URL(s);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        if (isUnsafeHost(u.hostname)) return null;
        return u;
    } catch {
        return null;
    }
}

// Extrai texto útil do HTML: title, meta description, OG, JSON-LD e o corpo
// (sem script/style/nav). Funciona em SSR/estático e capta o que a SPA expõe
// (meta/OG quase sempre estão no HTML inicial).
function extractText(html: string): string {
    const parts: string[] = [];
    const pick = (re: RegExp) => {
        const m = html.match(re);
        if (m && m[1]) parts.push(m[1].trim());
    };
    pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

    // JSON-LD (nome/descrição de Organization etc.)
    const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (ld && ld[1]) parts.push(ld[1].slice(0, 1200));

    // Corpo: remove script/style/noscript, tira tags, colapsa espaços
    let body = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    parts.push(body);

    return parts.join("\n").slice(0, 12000);
}

async function scrape(u: URL): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
        const resp = await fetch(u.toString(), {
            redirect: "follow",
            signal: ctrl.signal,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
        });
        if (!resp.ok) return "";
        const ct = resp.headers.get("content-type") || "";
        if (!ct.includes("html") && !ct.includes("text")) return "";
        const html = await resp.text();
        return extractText(html);
    } catch {
        return "";
    } finally {
        clearTimeout(timer);
    }
}

const SYSTEM_PROMPT = `Você analisa o site de uma agência/empresa que vende por conversa e monta o contexto de um agente comercial (a EVA) especializado em QUALIFICAÇÃO. Responda SOMENTE com JSON válido neste formato:
{
  "empresa": "nome da empresa (string curta)",
  "segmento": "nicho/segmento em poucas palavras",
  "resumo": "1 frase do que a empresa faz",
  "servicos": ["3 a 5 serviços/ofertas principais"],
  "icp": "quem é o cliente ideal, 1 frase",
  "tom_de_voz": "tom sugerido em poucas palavras (ex: consultivo e direto)",
  "perguntas_qualificacao": ["3 a 4 perguntas que a EVA faria para qualificar um lead dessa empresa"]
}
Regras: use só o que dá pra inferir do conteúdo; não invente números, preços, prêmios nem clientes; português do Brasil; objetivo e comercial.`;

async function generateBlueprint(siteText: string): Promise<Record<string, unknown> | null> {
    if (!OPENAI_API_KEY) return null;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gpt-5.4-nano",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Conteúdo do site:\n\n${siteText}` },
            ],
            max_completion_tokens: 2000,
            response_format: { type: "json_object" },
        }),
    });
    if (!resp.ok) return null;
    const completion = await resp.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
        return JSON.parse(String(content).replace(/```json\n?/g, "").replace(/```\n?/g, ""));
    } catch {
        return null;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    try {
        const body = await req.json().catch(() => ({}));
        const { url, email, context, used_context, attribution } = body as {
            url?: string;
            email?: string;
            context?: string;
            used_context?: boolean;
            attribution?: Record<string, string>;
        };

        const u = normalizeUrl(url || "");
        if (!u) return json(400, { ok: false, error: "url", message: "URL inválida" });

        // e-mail é OPCIONAL: se vier (Agent Builder), validamos work-email e
        // capturamos o lead; se não vier (demo do hero, sem fricção), só geramos
        // a prévia sem inserir lead.
        const emailProvided = !!(email && String(email).trim());
        const cleanEmail = (email || "").trim().toLowerCase();
        if (emailProvided) {
            const emailClass = classifyEmail(cleanEmail);
            if (emailClass === "invalid") return json(400, { ok: false, error: "email", message: "E-mail inválido." });
            if (emailClass === "free") return json(400, { ok: false, error: "email_free", message: "Use um e-mail de trabalho (domínio da sua agência)." });
        }

        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // rate-limit por IP (fail-open se o RPC não existir)
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
        try {
            const { data } = await admin.rpc("consume_rate_limit", {
                p_bucket: `demo-agent:${ip}`,
                p_limit: 6,
                p_window_seconds: 3600,
            });
            if (data === false) return json(429, { ok: false, error: "rate_limit", message: "Muitas tentativas. Tente novamente em alguns minutos." });
        } catch {
            /* fail-open */
        }

        const siteText = await scrape(u);

        // contexto enviado pelo lead (material .md/.txt/.pdf já extraído no front)
        const ctx = typeof context === "string" ? context.trim().slice(0, 8000) : "";
        const combined = [
            siteText && `Conteúdo do site:\n${siteText}`,
            ctx && `Materiais enviados pela empresa:\n${ctx}`,
        ].filter(Boolean).join("\n\n").slice(0, 16000);

        if (combined.replace(/\s/g, "").length < 220) {
            // site bloqueou/veio pobre e sem contexto suficiente => fallback
            return json(200, { ok: true, thin: true });
        }

        const blueprint = await generateBlueprint(combined);
        if (!blueprint) return json(200, { ok: true, thin: true });

        // captura do lead em demo_requests (service role bypassa RLS). Sem phone,
        // o trigger de SDR outreach NÃO dispara; o demo→deal cria o card.
        const usedCtx = !!used_context && ctx.length > 0;
        const att = attribution || {};
        if (emailProvided) try {
            await admin.from("demo_requests").insert({
                name: String(blueprint.empresa || "Lead").slice(0, 120),
                email: cleanEmail,
                company: String(blueprint.empresa || u.hostname).slice(0, 160),
                source: "agent_builder",
                status: "pending",
                website: u.toString(),
                agent_blueprint: blueprint,
                agent_used_context: usedCtx,
                utm_source: att.utm_source ?? null,
                utm_medium: att.utm_medium ?? null,
                utm_campaign: att.utm_campaign ?? null,
                utm_term: att.utm_term ?? null,
                utm_content: att.utm_content ?? null,
                gclid: att.gclid ?? null,
                fbclid: att.fbclid ?? null,
                referrer: att.referrer ?? null,
                landing_page: att.landing_page ?? null,
                traffic_source: att.traffic_source ?? null,
                awareness_hypothesis: att.awareness_hypothesis ?? null,
                query_intent: att.query_intent ?? null,
            });
        } catch (e) {
            console.error("[generate-demo-agent] lead insert failed:", e);
            /* não bloqueia a prévia */
        }

        return json(200, {
            ok: true,
            thin: false,
            model: "gpt-5.4-nano",
            scraped_chars: siteText.length,
            used_context: usedCtx,
            blueprint,
        });
    } catch (error) {
        console.error("[generate-demo-agent] error:", error);
        return json(500, { ok: false, error: "Erro ao gerar o agente. Tente novamente." });
    }
});
