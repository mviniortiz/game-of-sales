// Tradução entre o formato "chat completions" (o que as funções da EVA falam)
// e a Messages API da Anthropic, usada pelo llm.ts para o Claude Haiku 5.5.
//
// Regras do Haiku 5.5 que moldam a tradução (docs oficiais, 07/10/2026):
// - raciocínio adaptativo ligado por padrão; o esforço controla quanto pensa,
//   e os tokens de raciocínio contam no max_tokens;
// - temperature/top_p/top_k fora do padrão dão 400, então nunca são enviados;
// - num loop com ferramentas, os blocos de raciocínio voltam intactos. Por isso
//   a resposta leva o conteúdo original em `provider_content`, e o agente
//   devolve esse campo na mensagem do assistente.

import Anthropic, { APIError } from "npm:@anthropic-ai/sdk@0.131.0";

type ChatMessage = {
    role: string;
    content?: unknown;
    tool_calls?: { id: string; function?: { name?: string; arguments?: string } }[];
    tool_call_id?: string;
    provider_content?: unknown;
};

type ChatBody = Record<string, unknown> & { messages: unknown[] };

// Folga para o raciocínio: o limite de cada função foi medido para a resposta
// final, sem contar o que o modelo pensa antes.
const THINKING_HEADROOM = 4096;

function textOf(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text ?? "") : ""))
            .join("");
    }
    return content == null ? "" : String(content);
}

function parseArgs(raw: string | undefined): Record<string, unknown> {
    try {
        const v = JSON.parse(raw || "{}");
        return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
        return {};
    }
}

/** Corpo da Messages API a partir do corpo no formato chat completions. */
export function toAnthropicBody(body: ChatBody, model: string, effort: string): Record<string, unknown> {
    const system: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] = [];
    const messages: { role: "user" | "assistant"; content: unknown[] }[] = [];

    const push = (role: "user" | "assistant", blocks: unknown[]) => {
        if (!blocks.length) return;
        const last = messages[messages.length - 1];
        if (last && last.role === role) last.content.push(...blocks);
        else messages.push({ role, content: [...blocks] });
    };

    for (const raw of body.messages as ChatMessage[]) {
        if (raw.role === "system" || raw.role === "developer") {
            const text = textOf(raw.content);
            if (text) system.push({ type: "text", text });
        } else if (raw.role === "assistant") {
            if (Array.isArray(raw.provider_content)) {
                push("assistant", raw.provider_content);
                continue;
            }
            const blocks: unknown[] = [];
            const text = textOf(raw.content);
            if (text) blocks.push({ type: "text", text });
            for (const call of raw.tool_calls ?? []) {
                blocks.push({ type: "tool_use", id: call.id, name: call.function?.name ?? "", input: parseArgs(call.function?.arguments) });
            }
            push("assistant", blocks);
        } else if (raw.role === "tool") {
            push("user", [{ type: "tool_result", tool_use_id: raw.tool_call_id, content: textOf(raw.content) }]);
        } else {
            const text = textOf(raw.content);
            if (text) push("user", [{ type: "text", text }]);
        }
    }

    // O começo do pedido (instruções e contexto fixo da empresa) se repete
    // entre chamadas da mesma função; abaixo do mínimo do modelo, o cache só
    // não é criado.
    if (system.length) system[system.length - 1].cache_control = { type: "ephemeral" };

    const limit = Number(body.max_completion_tokens ?? body.max_tokens) || 4096;
    const out: Record<string, unknown> = {
        model,
        max_tokens: limit + THINKING_HEADROOM,
        messages,
        output_config: { effort },
    };
    if (system.length) out.system = system;

    const tools = (body.tools as { type?: string; function?: { name: string; description?: string; parameters?: unknown } }[] | undefined) ?? [];
    if (tools.length) {
        out.tools = tools
            .filter((t) => t.function?.name)
            .map((t) => ({
                name: t.function!.name,
                description: t.function!.description ?? "",
                input_schema: t.function!.parameters ?? { type: "object", properties: {} },
            }));
        const choice = body.tool_choice as string | { function?: { name?: string } } | undefined;
        if (choice === "none") out.tool_choice = { type: "none" };
        else if (choice === "required") out.tool_choice = { type: "any" };
        else if (choice && typeof choice === "object" && choice.function?.name) out.tool_choice = { type: "tool", name: choice.function.name };
    }
    return out;
}

/** Tira cerca de código e texto em volta, para quem faz JSON.parse direto. */
export function extractJson(text: string): string {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? match[0] : cleaned;
}

const FINISH: Record<string, string> = { end_turn: "stop", stop_sequence: "stop", tool_use: "tool_calls", max_tokens: "length" };

type AnthropicMessage = {
    id: string;
    model: string;
    stop_reason: string | null;
    content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
    usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
};

/** Resposta no formato chat completions, com o conteúdo original para replay. */
export function toChatCompletion(msg: AnthropicMessage, wantsJson: boolean) {
    let text = msg.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    if (wantsJson) text = extractJson(text);
    const toolCalls = msg.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
    const u = msg.usage;
    const cached = u.cache_read_input_tokens ?? 0;
    return {
        id: msg.id,
        model: msg.model,
        choices: [{
            index: 0,
            finish_reason: FINISH[msg.stop_reason ?? ""] ?? "stop",
            message: {
                role: "assistant",
                content: text || null,
                ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
                provider_content: msg.content,
            },
        }],
        usage: {
            prompt_tokens: u.input_tokens + cached + (u.cache_creation_input_tokens ?? 0),
            completion_tokens: u.output_tokens,
            prompt_tokens_details: { cached_tokens: cached },
        },
    };
}

/**
 * Chama a Anthropic e devolve status + corpo no formato chat completions.
 * Recusa (stop_reason "refusal") e corte sem resposta viram falha, para o
 * llm.ts tentar o próximo provedor.
 */
export async function anthropicChat(
    body: ChatBody,
    model: string,
    opts: { apiKey: string; timeoutMs: number; effort: string; wantsJson: boolean },
): Promise<{ status: number; text: string }> {
    const client = new Anthropic({ apiKey: opts.apiKey, timeout: opts.timeoutMs, maxRetries: 0 });
    try {
        const msg = await client.messages.create(toAnthropicBody(body, model, opts.effort) as never) as unknown as AnthropicMessage;
        if (msg.stop_reason === "refusal") {
            return { status: 422, text: JSON.stringify({ error: "refusal", stop_details: (msg as { stop_details?: unknown }).stop_details ?? null }) };
        }
        const completion = toChatCompletion(msg, opts.wantsJson);
        const m = completion.choices[0].message;
        if (msg.stop_reason === "max_tokens" && !m.content && !m.tool_calls) {
            return { status: 502, text: JSON.stringify({ error: "max_tokens sem resposta" }) };
        }
        return { status: 200, text: JSON.stringify(completion) };
    } catch (e) {
        if (e instanceof APIError) {
            const { status, message } = e as { status?: number; message: string };
            if (typeof status === "number") return { status, text: JSON.stringify({ error: message }) };
        }
        return { status: 504, text: JSON.stringify({ error: (e as Error).message }) };
    }
}
