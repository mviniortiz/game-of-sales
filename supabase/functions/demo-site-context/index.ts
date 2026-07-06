// demo-site-context — DEMO.C: lê o site que o visitante informou no intake e
// devolve um contexto COMPACTO pra EVA personalizar a narração do tour.
// Best-effort com timeout curto: a demo nunca espera além do "preparando".
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// HTML → texto cru (o suficiente pro modelo entender o negócio).
function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z#0-9]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    let body: { site?: string };
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "Invalid JSON" });
    }

    const raw = (body.site || "").trim().slice(0, 200);
    if (!raw) return json(400, { error: "site vazio" });
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const host = new URL(url).hostname;
        // sem alvo interno/local (SSRF básico)
        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(host)) return json(400, { error: "site inválido" });
    } catch {
        return json(400, { error: "site inválido" });
    }

    // Fetch do site com teto de 5s e 200KB.
    let text = "";
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; VyzonDemo/1.0)" },
            redirect: "follow",
        });
        clearTimeout(t);
        const html = (await res.text()).slice(0, 200_000);
        text = htmlToText(html).slice(0, 6000);
    } catch {
        return json(200, { context: null, reason: "fetch_failed" });
    }
    if (text.length < 80 || !OPENAI_API_KEY) {
        return json(200, { context: null, reason: text.length < 80 ? "empty_site" : "no_key" });
    }

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-5.4-nano",
                messages: [
                    {
                        role: "system",
                        content: "Você resume o site de uma empresa pra personalizar uma demo. Responda SÓ um JSON válido: {\"name\": \"nome da empresa\", \"segment\": \"segmento em 2-4 palavras (ex.: agência de tráfego pago)\", \"oneliner\": \"o que ela faz, em UMA frase curta\"}. Em português. Se o texto não permitir concluir, use null nos campos.",
                    },
                    { role: "user", content: text },
                ],
                max_completion_tokens: 150,
                response_format: { type: "json_object" },
            }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
        const context = {
            name: clean(parsed.name, 60),
            segment: clean(parsed.segment, 60),
            oneliner: clean(parsed.oneliner, 140),
        };
        if (!context.name && !context.segment) return json(200, { context: null, reason: "no_signal" });
        return json(200, { context });
    } catch (err) {
        console.error("[demo-site-context] openai error", err);
        return json(200, { context: null, reason: "llm_failed" });
    }
});
