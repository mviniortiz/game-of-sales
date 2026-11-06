// ─────────────────────────────────────────────────────────────────────────────
// conta-luz-ler (CONTA.1, 06/11/2026): a Lume lê a conta de luz do cliente.
//
// O cliente manda foto ou PDF na conversa. O webhook guarda o arquivo no bucket
// whatsapp-media e chama esta função. Ela confere se vale ler (empresa paga,
// conversa com card, orçamento aberto ou lead novo), lê a conta e grava em
// conta_luz_leituras só os dados de venda. Nada sai para o cliente: o dono vê
// no painel da conversa e confirma, corrige ou descarta.
//
// PDF: texto extraído com unpdf, e consumo e valor só valem se o número
// aparecer no texto. Foto: modelo que lê imagem (Anthropic, Gemini ou OpenAI;
// a DeepSeek não lê). Abaixo da confiança mínima, não grava nada.
//
// Depois de gravar: marca "Conta de luz" como recebida na obra do card, se
// houver, e pede uma nova leitura da conversa para a Lume usar os dados.
//
// Função separada do webhook porque PDF e imagem são pesados: um arquivo que
// estoure CPU derruba só esta chamada.
//
// Invocação: POST { message_id } com Bearer service_role (quem chama é o
// evolution-message-webhook).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e a chave de um provedor que
// leia imagem (ver _shared/llm.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocumentProxy } from "npm:unpdf@1.8.1";
import { IMAGE_PROVIDERS, llmChat } from "../_shared/llm.ts";
import { conferirLeitura, type LeituraConta, SYSTEM_FOTO, SYSTEM_PDF } from "../_shared/contaLuz.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 4;
const MAX_MODEL_CHARS = 12_000;
const NEW_LEAD_HOURS = 24;
const MAX_POR_CONVERSA = 3;
const IMAGEM = /^image\/(jpeg|png|webp|gif)$/;
// Mesmo atraso da leitura normal (EVA.READ.1), para a Lume reler com os dados da conta.
const RELER_EM_MS = 60_000;

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function base64(bytes: Uint8Array): string {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}

async function pdfText(bytes: Uint8Array): Promise<string> {
    const pdf = await getDocumentProxy(bytes);
    const parts: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, MAX_PAGES); i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        const items = content.items as { str?: string; hasEOL?: boolean }[];
        parts.push(items.map((it) => (it.str ?? "") + (it.hasEOL ? "\n" : " ")).join(""));
    }
    return parts.join("\n");
}

async function perguntar(messages: unknown[], imagem: boolean): Promise<unknown> {
    const res = await llmChat({
        model: "gpt-5.4-mini",
        messages,
        response_format: { type: "json_object" },
        max_completion_tokens: 400,
    }, { label: "conta-luz-ler", timeoutMs: 40_000, only: imagem ? IMAGE_PROVIDERS : undefined });
    if (!res.ok) throw new Error(`ia ${res.status}`);
    const raw = (await res.json())?.choices?.[0]?.message?.content ?? "";
    return JSON.parse(String(raw).match(/\{[\s\S]*\}/)?.[0] ?? "{}");
}

/** Vale gastar uma leitura nesta conversa? Mesmo corte da eva-conversation-read. */
async function vale(companyId: string, conversationId: string, conv: { deal_id: string | null; created_at: string }): Promise<string | null> {
    const { data: pago } = await admin.rpc("company_is_paid", { p_company_id: companyId });
    if (pago !== true) return "empresa sem assinatura";

    const { count: lidas } = await admin
        .from("conta_luz_leituras")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId);
    if ((lidas ?? 0) >= MAX_POR_CONVERSA) return "conversa já tem leituras demais";

    if (conv.deal_id) return null;
    if (Date.now() - new Date(conv.created_at).getTime() < NEW_LEAD_HOURS * 3_600_000) return null;
    const { count: abertos } = await admin
        .from("quote_tracking")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .is("outcome", null)
        .neq("status", "closed");
    return (abertos ?? 0) > 0 ? null : "conversa fora do escopo";
}

async function marcarNaObra(companyId: string, dealId: string | null) {
    if (!dealId) return;
    const { data: obra } = await admin.from("obras").select("id").eq("company_id", companyId).eq("deal_id", dealId).maybeSingle();
    if (!obra) return;
    await admin
        .from("obra_documentos")
        .update({ recebido: true })
        .eq("obra_id", obra.id)
        .ilike("nome", "conta de luz")
        .eq("recebido", false);
}

serve(async (req) => {
    if (req.headers.get("Authorization") !== `Bearer ${SERVICE_ROLE_KEY}`) return json(401, { error: "Unauthorized" });

    const { message_id } = await req.json().catch(() => ({}));
    if (!message_id) return json(400, { error: "message_id obrigatório" });

    const { data: msg } = await admin
        .from("channel_messages")
        .select("id, company_id, conversation_id, contact_id, direction, media_ref")
        .eq("id", message_id)
        .maybeSingle();
    if (!msg) return json(404, { error: "mensagem não encontrada" });
    if (msg.direction !== "inbound") return json(200, { ok: false, reason: "mensagem enviada pela empresa" });

    const mediaRef = (msg.media_ref as Record<string, unknown>) || {};
    const path = mediaRef.storage_path as string | undefined;
    const mimetype = String(mediaRef.mimetype ?? "");
    const fonte = mimetype.includes("pdf") ? "pdf" : IMAGEM.test(mimetype) ? "foto" : null;
    if (!fonte) return json(200, { ok: false, reason: `tipo não lido (${mimetype || "sem tipo"})` });
    if (!path) return json(200, { ok: false, reason: "arquivo fora do Storage" });

    const { data: conv } = await admin
        .from("channel_conversations")
        .select("id, deal_id, created_at")
        .eq("id", msg.conversation_id)
        .maybeSingle();
    if (!conv) return json(200, { ok: false, reason: "conversa não encontrada" });

    const fora = await vale(msg.company_id, msg.conversation_id, conv);
    if (fora) return json(200, { ok: false, reason: fora });

    const { data: file } = await admin.storage.from("whatsapp-media").download(path);
    if (!file) return json(200, { ok: false, reason: "arquivo indisponível" });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_BYTES) return json(200, { ok: false, reason: `arquivo grande demais (${bytes.length} bytes)` });

    let leitura: LeituraConta | null;
    try {
        if (fonte === "pdf") {
            const text = await pdfText(bytes);
            // Conta de luz sempre fala em kWh; PDF sem isso é outra coisa e nem vai pro modelo.
            if (!/kwh/i.test(text)) return json(200, { ok: false, reason: "PDF sem kWh no texto" });
            const raw = await perguntar([
                { role: "system", content: SYSTEM_PDF },
                { role: "user", content: text.slice(0, MAX_MODEL_CHARS) },
            ], false);
            leitura = conferirLeitura(raw, text);
        } else {
            const raw = await perguntar([
                { role: "system", content: SYSTEM_FOTO },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Leia esta conta de luz." },
                        { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64(bytes)}` } },
                    ],
                },
            ], true);
            leitura = conferirLeitura(raw);
        }
    } catch (e) {
        console.warn(`[conta-luz] msg=${message_id} falhou:`, (e as Error).message);
        return json(200, { ok: false, reason: "leitura falhou" });
    }

    if (!leitura) {
        console.log(`[conta-luz] msg=${message_id} ${fonte}: não é conta de luz ou leitura sem confiança`);
        return json(200, { ok: false, reason: "não é conta de luz ou leitura sem confiança" });
    }

    const { error } = await admin.from("conta_luz_leituras").upsert({
        company_id: msg.company_id,
        conversation_id: msg.conversation_id,
        contact_id: msg.contact_id,
        deal_id: conv.deal_id,
        message_id: msg.id,
        storage_path: path,
        fonte,
        ...leitura,
    }, { onConflict: "message_id", ignoreDuplicates: true });
    if (error) return json(500, { error: error.message });

    await marcarNaObra(msg.company_id, conv.deal_id);
    await admin
        .from("channel_conversations")
        .update({ eva_read_due_at: new Date(Date.now() + RELER_EM_MS).toISOString() })
        .eq("id", msg.conversation_id);

    console.log(`[conta-luz] msg=${message_id} ${fonte} confianca=${leitura.confianca} kwh=${leitura.consumo_kwh ?? "-"} valor=${leitura.valor_reais ?? "-"}`);
    return json(200, { ok: true, fonte, leitura });
});
