import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bodyFor, llmChat, providerOrder } from "./llm.ts";

const realFetch = globalThis.fetch;

function setKeys(keys: Record<string, string | undefined>) {
    for (const k of ["DEEPSEEK_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "LLM_PROVIDERS"]) Deno.env.delete(k);
    for (const [k, v] of Object.entries(keys)) if (v) Deno.env.set(k, v);
}

function completion(content: string) {
    return JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }] });
}

/** Responde por host, na ordem dada; guarda os corpos enviados. */
function mockFetch(byHost: Record<string, Array<[number, string]>>) {
    const sent: Array<{ host: string; body: any }> = [];
    globalThis.fetch = ((url: string, init: RequestInit) => {
        const host = new URL(url).host;
        sent.push({ host, body: JSON.parse(String(init.body)) });
        const next = byHost[host]?.shift();
        if (!next) return Promise.reject(new Error(`sem resposta para ${host}`));
        return Promise.resolve(new Response(next[1], { status: next[0] }));
    }) as typeof fetch;
    return sent;
}

const JSON_BODY = {
    model: "gpt-5.4-mini",
    messages: [{ role: "user", content: "responda em json" }],
    max_completion_tokens: 200,
    response_format: { type: "json_object" },
};

Deno.test("ordem pula provedor sem chave e respeita prefer", () => {
    setKeys({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" });
    assertEquals(providerOrder(), ["gemini", "openai"]);
    assertEquals(providerOrder("openai"), ["openai", "gemini"]);
    setKeys({ DEEPSEEK_API_KEY: "d", OPENAI_API_KEY: "o", LLM_PROVIDERS: "openai,deepseek" });
    assertEquals(providerOrder(), ["openai", "deepseek"]);
});

Deno.test("corpo traduzido por provedor", () => {
    setKeys({});
    const ds = bodyFor("deepseek", JSON_BODY);
    assertEquals(ds.model, "deepseek-flash");
    assertEquals(ds.max_tokens, 200);
    assertEquals(ds.max_completion_tokens, undefined);
    assertEquals(ds.thinking, { type: "disabled" });
    const gm = bodyFor("gemini", JSON_BODY);
    assertEquals(gm.model, "gemini-2.5-flash");
    assertEquals(gm.max_tokens, 200);
    assertEquals(gm.reasoning_effort, "none");
    const oa = bodyFor("openai", JSON_BODY);
    assertEquals(oa.model, "gpt-5.4-mini");
    assertEquals(oa.max_completion_tokens, 200);
});

Deno.test("429 no primeiro cai no segundo", async () => {
    setKeys({ DEEPSEEK_API_KEY: "d", GEMINI_API_KEY: "g" });
    const sent = mockFetch({
        "api.deepseek.com": [[429, '{"error":"rate"}']],
        "generativelanguage.googleapis.com": [[200, completion('{"ok":true}')]],
    });
    try {
        const res = await llmChat(JSON_BODY, { label: "t1" });
        assertEquals(res.ok, true);
        assertEquals(res.provider, "gemini");
        assertEquals((await res.json()).choices[0].message.content, '{"ok":true}');
        assertEquals(sent.map((s) => s.host), ["api.deepseek.com", "generativelanguage.googleapis.com"]);
    } finally {
        globalThis.fetch = realFetch;
    }
});

Deno.test("deepseek em espera depois do 429 vai direto ao gemini", async () => {
    setKeys({ DEEPSEEK_API_KEY: "d", GEMINI_API_KEY: "g" });
    const sent = mockFetch({ "generativelanguage.googleapis.com": [[200, completion('{"ok":1}')]] });
    try {
        const res = await llmChat(JSON_BODY, { label: "t2" });
        assertEquals(res.provider, "gemini");
        assertEquals(sent.length, 1);
    } finally {
        globalThis.fetch = realFetch;
    }
});

Deno.test("JSON inválido quando pedido JSON passa para o próximo", async () => {
    setKeys({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" });
    mockFetch({
        "generativelanguage.googleapis.com": [[200, completion("desculpe, não sei")], [200, completion("")]],
        "api.openai.com": [[200, completion('```json\n{"valor": 10}\n```')]],
    });
    try {
        const res = await llmChat(JSON_BODY, { label: "t3" });
        assertEquals(res.provider, "openai");
        assertEquals(res.attempts.length, 3);
    } finally {
        globalThis.fetch = realFetch;
    }
});

Deno.test("503 no primeiro modelo do gemini tenta o segundo", async () => {
    setKeys({ GEMINI_API_KEY: "g" });
    const sent = mockFetch({
        "generativelanguage.googleapis.com": [[503, '{"error":"high demand"}'], [200, completion('{"ok":2}')]],
    });
    try {
        const res = await llmChat(JSON_BODY, { label: "t5" });
        assertEquals(res.model, "gemini-2.5-flash-lite");
        assertEquals(sent.map((s) => s.body.model), ["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
    } finally {
        globalThis.fetch = realFetch;
    }
});

Deno.test("todos falhando devolve ok=false com o último status", async () => {
    setKeys({ OPENAI_API_KEY: "o" });
    mockFetch({ "api.openai.com": [[500, '{"error":"boom"}']] });
    try {
        const res = await llmChat({ messages: [] }, { label: "t4" });
        assertEquals(res.ok, false);
        assertEquals(res.status, 500);
        assertEquals(await res.text(), '{"error":"boom"}');
    } finally {
        globalThis.fetch = realFetch;
    }
});

Deno.test("sem chave nenhuma devolve 503", async () => {
    setKeys({});
    const res = await llmChat({ messages: [] });
    assertEquals(res.ok, false);
    assertEquals(res.status, 503);
});
