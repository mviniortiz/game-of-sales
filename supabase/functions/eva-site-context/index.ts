// eva-site-context — lê o site da própria empresa do usuário logado (ele pede,
// na conversa de configuração da EVA) e devolve um rascunho do negócio para ele
// conferir. Nunca grava nada: quem salva é a tela, depois do "É isso".
// Só o site da empresa; dado de lead nunca é buscado fora (regra do CLAUDE.md).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { hasLlmKey, llmChat } from "../_shared/llm.ts";
import { hostPermitido, htmlToText, paginasInternas, REDE_SOCIAL } from "../_shared/siteContext.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

// Redirecionamento seguido à mão para checar o host de cada salto.
async function buscar(url: string): Promise<{ html: string; final: URL } | null> {
    let atual = new URL(url);
    for (let salto = 0; salto < 4; salto++) {
        if (!/^https?:$/.test(atual.protocol) || !hostPermitido(atual.hostname)) return null;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        try {
            const res = await fetch(atual.href, {
                signal: ctrl.signal,
                redirect: "manual",
                headers: { "User-Agent": "Mozilla/5.0 (compatible; VyzonEVA/1.0; +https://vyzon.com.br)", Accept: "text/html" },
            });
            if (res.status >= 300 && res.status < 400) {
                const loc = res.headers.get("location");
                await res.body?.cancel();
                if (!loc) return null;
                atual = new URL(loc, atual);
                continue;
            }
            if (!res.ok || !/html/i.test(res.headers.get("content-type") || "html")) {
                await res.body?.cancel();
                return null;
            }
            return { html: (await res.text()).slice(0, 300_000), final: atual };
        } catch {
            return null;
        } finally {
            clearTimeout(t);
        }
    }
    return null;
}

const PROMPT = `Você lê o site de uma empresa brasileira para preencher o cadastro dela num sistema de vendas.
Responda SÓ um JSON válido, em português, neste formato:
{"nome": string|null, "e_energia_solar": boolean, "descricao": string|null, "cidades": string[], "tipos_cliente": string[], "financiamento": boolean|null, "servicos": [{"nome": string, "descricao": string}], "diferenciais": string[]}
Regras:
- Só o que está escrito no texto. Se não estiver explícito, use null ou lista vazia. Nunca invente cidade, preço, prazo ou garantia.
- "descricao": 1 ou 2 frases simples sobre o que a empresa faz e para quem.
- "tipos_cliente": só entre "residencial", "comercial", "rural", "industrial" e "condomínio".
- "financiamento": true só se o site falar em financiamento ou parcelamento.
- "servicos": no máximo 5, cada descrição com no máximo 120 caracteres.
- "diferenciais": no máximo 4, curtos, do jeito que o site diz (ex.: "garantia de 25 anos nos painéis").
- Não use travessão.`;

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const auth = req.headers.get("Authorization");
    if (!auth) return json(401, { error: "Unauthorized" });
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });

    let body: { site?: string };
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "Invalid JSON" });
    }

    const raw = (body.site || "").trim().slice(0, 200);
    if (!raw) return json(400, { error: "site vazio" });
    let url: URL;
    try {
        url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
        return json(200, { draft: null, reason: "site_invalido" });
    }
    if (REDE_SOCIAL.test(url.hostname)) return json(200, { draft: null, reason: "rede_social" });
    if (!hostPermitido(url.hostname)) return json(200, { draft: null, reason: "site_invalido" });

    const home = await buscar(url.href);
    if (!home) return json(200, { draft: null, reason: "fetch_failed" });
    const partes = [htmlToText(home.html).slice(0, 6000)];
    for (const p of paginasInternas(home.html, home.final)) {
        const r = await buscar(p);
        if (r) partes.push(htmlToText(r.html).slice(0, 3000));
    }
    const texto = partes.join("\n\n").slice(0, 12000);
    if (texto.length < 80) return json(200, { draft: null, reason: "empty_site" });
    if (!hasLlmKey()) return json(200, { draft: null, reason: "no_key" });

    try {
        const res = await llmChat({
            model: "gpt-5.4-mini",
            messages: [{ role: "system", content: PROMPT }, { role: "user", content: texto }],
            max_completion_tokens: 900,
            response_format: { type: "json_object" },
        }, { label: "eva-site-context" });
        const data = await res.json();
        const p = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        const str = (v: unknown, max: number) =>
            typeof v === "string" && v.trim() ? v.trim().replace(/\s*—\s*/g, ", ").slice(0, max) : null;
        const lista = (v: unknown, n: number, max: number) =>
            (Array.isArray(v) ? v : []).map((x) => str(x, max)).filter((x): x is string => !!x).slice(0, n);
        const draft = {
            site: home.final.origin,
            nome: str(p.nome, 80),
            e_energia_solar: p.e_energia_solar === true,
            descricao: str(p.descricao, 400),
            cidades: lista(p.cidades, 12, 60),
            tipos_cliente: lista(p.tipos_cliente, 5, 20),
            financiamento: typeof p.financiamento === "boolean" ? p.financiamento : null,
            servicos: (Array.isArray(p.servicos) ? p.servicos : [])
                .map((s: { nome?: unknown; descricao?: unknown }) => ({ nome: str(s?.nome, 80), descricao: str(s?.descricao, 160) }))
                .filter((s: { nome: string | null }) => !!s.nome)
                .slice(0, 5),
            diferenciais: lista(p.diferenciais, 4, 120),
        };
        if (!draft.descricao && !draft.nome) return json(200, { draft: null, reason: "no_signal" });
        return json(200, { draft });
    } catch (err) {
        console.error("[eva-site-context] llm error", err);
        return json(200, { draft: null, reason: "llm_failed" });
    }
});
