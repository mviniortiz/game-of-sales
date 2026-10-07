// Chamada de chat com troca automática de provedor.
//
// Todas as funções da EVA falam o formato "chat completions" da OpenAI.
// DeepSeek, Gemini e OpenAI aceitam esse formato; a Anthropic passa pelo
// tradutor em llmAnthropic.ts. Este módulo recebe o corpo de sempre e tenta
// os provedores em ordem. Erro de cota (429), saldo
// (402), chave (401/403), fora do ar (5xx), tempo esgotado ou JSON inválido
// quando o pedido exigia JSON: passa para o próximo.
//
// A resposta imita a do fetch (ok, status, json(), text()), para cada função
// só trocar a linha da chamada.
//
// Ordem: LLM_PROVIDERS (ex.: "anthropic,deepseek,gemini,openai"). Provedor sem chave é
// pulado. Troca de modelo sem deploy: LLM_<PROVEDOR>_MODEL.

import { anthropicChat } from "./llmAnthropic.ts";

export type LlmProvider = "anthropic" | "deepseek" | "gemini" | "openai";

type Body = Record<string, unknown> & { model?: string; messages: unknown[] };

export interface LlmOptions {
    /** Nome da função, só para log. */
    label?: string;
    timeoutMs?: number;
    /** Provedor a tentar primeiro (ex.: o que já respondeu neste loop de agente). */
    prefer?: LlmProvider;
}

export interface LlmResponse {
    ok: boolean;
    status: number;
    provider: LlmProvider | null;
    model: string | null;
    attempts: string[];
    json(): Promise<any>;
    text(): Promise<string>;
}

interface ProviderSpec {
    url: string;
    keyEnv: string;
    /** Em ordem: o seguinte só entra se o anterior falhar. */
    models: string[];
    /** Nome do campo de limite de saída aceito pelo provedor. */
    maxTokensField: "max_tokens" | "max_completion_tokens";
    extra?: Record<string, unknown>;
}

// Modelos conferidos nas páginas oficiais em 07/10/2026 (US$ por 1M tokens):
// claude-haiku-5-5 0,10 / 0,50 em pedidos de até 100 mil tokens, leitura de
// cache 0,01;
// deepseek-flash (V4.1) 0,15 entrada / 0,60 saída fora do pico, o dobro no pico;
// gemini-2.5-flash 0,30 / 2,50; gemini-2.5-flash-lite 0,10 / 0,40;
// gpt-5.4-mini 0,75 / 4,50.
const PROVIDERS: Record<LlmProvider, ProviderSpec> = {
    anthropic: {
        url: "https://api.anthropic.com/v1/messages",
        keyEnv: "ANTHROPIC_API_KEY",
        models: ["claude-haiku-5-5"],
        maxTokensField: "max_tokens",
    },
    deepseek: {
        url: "https://api.deepseek.com/chat/completions",
        keyEnv: "DEEPSEEK_API_KEY",
        models: ["deepseek-flash"],
        maxTokensField: "max_tokens",
        // Pensa por padrão. Desligado: as tarefas são curtas, e no modo pensando
        // o loop com ferramentas exige devolver o raciocínio a cada volta.
        extra: { thinking: { type: "disabled" } },
    },
    gemini: {
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        keyEnv: "GEMINI_API_KEY",
        // Medido em 07/10/2026: 2.5 Flash respondeu em 0,5 a 1,2 s; o Flash-Lite
        // variou de 1,6 a 9 s; o 3.1 Flash-Lite deu 503 por sobrecarga. Os
        // Gemini 3 não desligam o raciocínio, que conta como saída.
        models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
        maxTokensField: "max_tokens",
        extra: { reasoning_effort: "none" },
    },
    openai: {
        url: "https://api.openai.com/v1/chat/completions",
        keyEnv: "OPENAI_API_KEY",
        models: ["gpt-5.4-mini"],
        maxTokensField: "max_completion_tokens",
    },
};

const DEFAULT_ORDER: LlmProvider[] = ["anthropic", "deepseek", "gemini", "openai"];

// O Haiku 5.5 pensa por padrão (esforço "medium"). As tarefas da EVA são
// leitura e extração curtas, então "low" corta tempo e saída.
const ANTHROPIC_EFFORT_DEFAULT = "low";

// Modelo que falhou por cota/saldo fica de fora por um tempo, no mesmo
// isolate, para não pagar a latência do erro em toda chamada.
const COOLDOWN_MS = 90_000;
const cooldownUntil = new Map<string, number>();

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) ?? "";

export function providerOrder(prefer?: LlmProvider): LlmProvider[] {
    const raw = env("LLM_PROVIDERS");
    const listed = raw
        ? raw.split(",").map((s) => s.trim().toLowerCase()).filter((s): s is LlmProvider => s in PROVIDERS)
        : DEFAULT_ORDER;
    const withKey = listed.filter((p) => env(PROVIDERS[p].keyEnv));
    if (prefer && withKey.includes(prefer)) return [prefer, ...withKey.filter((p) => p !== prefer)];
    return withKey;
}

/** LLM_<PROVEDOR>_MODEL aceita lista separada por vírgula. */
export function modelsFor(provider: LlmProvider, originalModel?: string): string[] {
    const override = env(`LLM_${provider.toUpperCase()}_MODEL`);
    if (override) return override.split(",").map((m) => m.trim()).filter(Boolean);
    // Na OpenAI mantém o modelo que a função já usava.
    if (provider === "openai" && originalModel) return [originalModel];
    return PROVIDERS[provider].models;
}

/** Monta o corpo para um provedor a partir do corpo no formato OpenAI. */
export function bodyFor(provider: LlmProvider, body: Body, model = modelsFor(provider, body.model)[0]): Record<string, unknown> {
    const spec = PROVIDERS[provider];
    const out: Record<string, unknown> = { ...body, model };
    // provider_content é o conteúdo original da Anthropic, para o replay no
    // loop do agente; os outros provedores rejeitam campo desconhecido.
    out.messages = (body.messages as Record<string, unknown>[]).map((m) => {
        if (!m || typeof m !== "object" || !("provider_content" in m)) return m;
        const { provider_content: _drop, ...rest } = m;
        return rest;
    });
    const limit = body.max_completion_tokens ?? body.max_tokens;
    delete out.max_completion_tokens;
    delete out.max_tokens;
    if (typeof limit === "number") out[spec.maxTokensField] = limit;
    Object.assign(out, spec.extra ?? {});
    return out;
}

function wantsJson(body: Body): boolean {
    const rf = body.response_format as { type?: string } | undefined;
    return rf?.type === "json_object" || rf?.type === "json_schema";
}

export function contentIsJson(content: unknown): boolean {
    if (typeof content !== "string" || !content.trim()) return false;
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    try {
        JSON.parse(match ? match[0] : cleaned);
        return true;
    } catch {
        return false;
    }
}

function isCooldownStatus(status: number) {
    return status === 401 || status === 402 || status === 403 || status === 429 || status === 529;
}

function makeResponse(
    ok: boolean,
    status: number,
    payload: string,
    provider: LlmProvider | null,
    model: string | null,
    attempts: string[],
): LlmResponse {
    return {
        ok,
        status,
        provider,
        model,
        attempts,
        json: async () => JSON.parse(payload),
        text: async () => payload,
    };
}

/**
 * Faz a chamada de chat tentando os provedores em ordem.
 * `body` é o mesmo que iria para a OpenAI.
 */
export async function llmChat(body: Body, opts: LlmOptions = {}): Promise<LlmResponse> {
    const label = opts.label ?? "llm";
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const order = providerOrder(opts.prefer);
    const attempts: string[] = [];
    let lastStatus = 503;
    let lastText = JSON.stringify({ error: "nenhum provedor de IA configurado" });

    const candidates = order.flatMap((provider) => modelsFor(provider, body.model).map((model) => ({ provider, model })));
    const now = Date.now();
    const active = candidates.filter((c) => (cooldownUntil.get(`${c.provider}/${c.model}`) ?? 0) <= now);
    // Se todos estão em espera, tenta mesmo assim (melhor que falhar sem tentar).
    const queue = active.length ? active : candidates;

    for (const { provider, model } of queue) {
        const spec = PROVIDERS[provider];
        const started = Date.now();
        try {
            const res = provider === "anthropic"
                ? await anthropicChat(body, model, {
                    apiKey: env(spec.keyEnv),
                    timeoutMs,
                    effort: env("LLM_ANTHROPIC_EFFORT") || ANTHROPIC_EFFORT_DEFAULT,
                    wantsJson: wantsJson(body),
                }).then(({ status, text }) => ({ ok: status >= 200 && status < 300, status, text: async () => text }))
                : await fetch(spec.url, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${env(spec.keyEnv)}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(bodyFor(provider, body, model)),
                    signal: AbortSignal.timeout(timeoutMs),
                });
            const text = await res.text();
            const ms = Date.now() - started;
            if (!res.ok) {
                attempts.push(`${provider}/${model} ${res.status} ${ms}ms`);
                console.warn(`[${label}] ${provider}/${model} ${res.status} em ${ms}ms: ${text.slice(0, 200)}`);
                if (isCooldownStatus(res.status)) cooldownUntil.set(`${provider}/${model}`, Date.now() + COOLDOWN_MS);
                lastStatus = res.status;
                lastText = text;
                continue;
            }
            if (wantsJson(body)) {
                let content: unknown = null;
                try {
                    content = JSON.parse(text)?.choices?.[0]?.message?.content;
                } catch { /* corpo inválido, trata abaixo */ }
                if (!contentIsJson(content)) {
                    attempts.push(`${provider}/${model} json-invalido ${ms}ms`);
                    console.warn(`[${label}] ${provider}/${model} devolveu JSON inválido; tentando o próximo`);
                    lastStatus = 502;
                    lastText = text;
                    continue;
                }
            }
            attempts.push(`${provider}/${model} ok ${ms}ms`);
            if (attempts.length > 1) console.log(`[${label}] respondeu via ${provider}/${model} após: ${attempts.join(" | ")}`);
            return makeResponse(true, res.status, text, provider, model, attempts);
        } catch (e) {
            const ms = Date.now() - started;
            attempts.push(`${provider}/${model} erro ${ms}ms`);
            console.warn(`[${label}] ${provider}/${model} falhou em ${ms}ms: ${(e as Error).message}`);
            lastStatus = 504;
            lastText = JSON.stringify({ error: (e as Error).message });
        }
    }

    console.error(`[${label}] todos os provedores falharam: ${attempts.join(" | ") || "nenhum com chave"}`);
    return makeResponse(false, lastStatus, lastText, null, null, attempts);
}

/** Algum provedor de chat tem chave? Substitui checagens de OPENAI_API_KEY. */
export function hasLlmKey(): boolean {
    return providerOrder().length > 0;
}
