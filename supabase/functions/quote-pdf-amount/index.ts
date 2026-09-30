// ─────────────────────────────────────────────────────────────────────────────
// quote-pdf-amount (QUOTE.2, 2026-09-29) — valor do orçamento enviado em PDF.
//
// Proposta costuma sair como PDF sem legenda (caso típico do integrador solar),
// e o detectQuote só lê texto e legenda. Esta função abre o PDF, acha o preço
// total e completa quote_tracking.amount e deals.value (só se estiverem vazios).
//
// Escolha do valor: o modelo recebe o texto e a lista de valores em R$ que
// existem no PDF, e só vale resposta que esteja nessa lista (texto do PDF é
// dado de terceiro, o modelo não pode inventar número). Sem modelo, ou sem
// resposta válida, vale a heurística de rótulos do pickProposalAmount.
//
// Função isolada porque a biblioteca de PDF é pesada: fora do webhook, que
// recebe toda mensagem, e um PDF que estoure CPU derruba só esta chamada.
//
// Invocação: POST { quote_id } com Bearer service_role. Quem chama é o
// trackOutboundQuote, depois de criar o rastreio e o card.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY ou OPENAI_API_KEY.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocumentProxy } from "npm:unpdf@1.8.1";
import { extractAmounts, pickProposalAmount } from "../_shared/quoteDetection.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PAGES = 20;
const MAX_MODEL_CHARS = 12_000;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function loadPdf(mediaRef: Record<string, unknown>): Promise<Uint8Array | null> {
    const path = mediaRef.storage_path as string | undefined;
    if (path) {
        const { data } = await admin.storage.from("whatsapp-media").download(path);
        if (data) return new Uint8Array(await data.arrayBuffer());
    }
    // URL da Kapso é baixável; a da CDN do WhatsApp (Evolution) vem cifrada.
    const url = mediaRef.url as string | undefined;
    if (url && url.startsWith("https://") && !url.includes("whatsapp.net")) {
        const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (res.ok) return new Uint8Array(await res.arrayBuffer());
    }
    return null;
}

async function pdfText(bytes: Uint8Array): Promise<string> {
    const pdf = await getDocumentProxy(bytes);
    const parts: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES); i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        // deno-lint-ignore no-explicit-any
        parts.push(content.items.map((it: any) => (it.str ?? "") + (it.hasEOL ? "\n" : " ")).join(""));
    }
    return parts.join("\n");
}

const SYSTEM = `Você lê o texto extraído de um PDF de orçamento ou proposta comercial e responde qual é o preço total que o cliente pagaria pelo produto ou serviço (o total, ou o valor à vista quando não houver total).
Não é preço: economia, conta de luz, parcela, valor financiado, entrada, retorno, payback, VPL, lucro, valor por kWh ou por Wp, subtotal de item.
Escolha exatamente um dos valores candidatos. Se nenhum for claramente o preço total, responda null.
Responda só JSON: {"valor": 23900.00} ou {"valor": null}.`;

async function askModel(text: string, candidates: number[]): Promise<number | null> {
    const user = `Valores candidatos: ${JSON.stringify(candidates)}\n\nTexto do PDF:\n${text.slice(0, MAX_MODEL_CHARS)}`;
    let raw = "";
    try {
        if (ANTHROPIC_API_KEY) {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                body: JSON.stringify({
                    model: "claude-haiku-4-5-20251001",
                    max_tokens: 100,
                    system: SYSTEM,
                    messages: [{ role: "user", content: user }],
                }),
                signal: AbortSignal.timeout(25_000),
            });
            if (!res.ok) throw new Error(`anthropic ${res.status}`);
            raw = (await res.json())?.content?.[0]?.text ?? "";
        } else if (OPENAI_API_KEY) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
                    response_format: { type: "json_object" },
                    max_completion_tokens: 100,
                }),
                signal: AbortSignal.timeout(25_000),
            });
            if (!res.ok) throw new Error(`openai ${res.status}`);
            raw = (await res.json())?.choices?.[0]?.message?.content ?? "";
        } else {
            return null;
        }
        const valor = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}")?.valor;
        if (typeof valor !== "number") return null;
        return candidates.find((c) => Math.abs(c - valor) < 0.01) ?? null;
    } catch (e) {
        console.warn("[quote-pdf] modelo falhou:", (e as Error).message, raw.slice(0, 120));
        return null;
    }
}

serve(async (req) => {
    if (req.headers.get("Authorization") !== `Bearer ${SERVICE_ROLE_KEY}`) return json(401, { error: "Unauthorized" });

    const { quote_id } = await req.json().catch(() => ({}));
    if (!quote_id) return json(400, { error: "quote_id obrigatório" });

    const { data: quote } = await admin
        .from("quote_tracking")
        .select("id, amount, deal_id, channel_message_id")
        .eq("id", quote_id)
        .maybeSingle();
    if (!quote) return json(404, { error: "rastreio não encontrado" });
    if (quote.amount !== null) return json(200, { ok: true, skipped: "já tem valor", amount: quote.amount });

    const { data: msg } = await admin
        .from("channel_messages")
        .select("media_ref")
        .eq("id", quote.channel_message_id)
        .maybeSingle();

    try {
        const bytes = await loadPdf((msg?.media_ref as Record<string, unknown>) || {});
        if (!bytes) return json(200, { ok: false, reason: "PDF indisponível" });
        if (bytes.length > MAX_BYTES) return json(200, { ok: false, reason: `PDF grande demais (${bytes.length} bytes)` });

        const text = await pdfText(bytes);
        const candidates = [...new Set(extractAmounts(text))];
        if (!candidates.length) return json(200, { ok: false, reason: "PDF sem valor em reais no texto" });

        const heuristic = pickProposalAmount(text);
        const model = await askModel(text, candidates);
        const amount = model ?? heuristic;
        console.log(`[quote-pdf] rastreio ${quote.id} modelo=${model ?? "-"} heuristica=${heuristic ?? "-"} candidatos=${candidates.length}`);
        if (amount === null) return json(200, { ok: false, reason: "nenhum valor com cara de preço total", candidates: candidates.length });

        await admin.from("quote_tracking").update({ amount }).eq("id", quote.id).is("amount", null);
        if (quote.deal_id) {
            await admin.from("deals").update({ value: amount }).eq("id", quote.deal_id).or("value.is.null,value.eq.0");
        }
        return json(200, { ok: true, amount, via: model !== null ? "modelo" : "heuristica", heuristic, candidates: candidates.length });
    } catch (e) {
        console.warn("[quote-pdf] falhou:", (e as Error).message);
        return json(200, { ok: false, reason: (e as Error).message });
    }
});
