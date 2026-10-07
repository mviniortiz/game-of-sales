import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractJson, toAnthropicBody, toChatCompletion } from "./llmAnthropic.ts";

Deno.test("traduz sistema, ferramentas e resultados para a Messages API", () => {
    const out = toAnthropicBody({
        model: "gpt-5.4-mini",
        temperature: 0.2,
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: "Contexto fixo da empresa" },
            { role: "user", content: "Oi" },
            { role: "assistant", content: null, tool_calls: [{ id: "c1", function: { name: "get_deal", arguments: "{\"id\":\"d1\"}" } }, { id: "c2", function: { name: "get_contact", arguments: "{}" } }] },
            { role: "tool", tool_call_id: "c1", content: "{\"ok\":true}" },
            { role: "tool", tool_call_id: "c2", content: "{\"ok\":true}" },
        ],
        tools: [{ type: "function", function: { name: "get_deal", description: "Lê o card", parameters: { type: "object", properties: { id: { type: "string" } } } } }],
    }, "claude-haiku-5-5", "low");

    assertEquals(out.model, "claude-haiku-5-5");
    assertEquals(out.max_tokens, 500 + 4096);
    assertEquals(out.output_config, { effort: "low" });
    assertEquals("temperature" in out, false);
    assertEquals("response_format" in out, false);
    assertEquals(out.system, [{ type: "text", text: "Contexto fixo da empresa", cache_control: { type: "ephemeral" } }]);
    const msgs = out.messages as { role: string; content: { type: string }[] }[];
    assertEquals(msgs.map((m) => m.role), ["user", "assistant", "user"]);
    assertEquals(msgs[1].content.map((b) => b.type), ["tool_use", "tool_use"]);
    // Os dois resultados vão juntos numa mensagem só.
    assertEquals(msgs[2].content.map((b) => b.type), ["tool_result", "tool_result"]);
    assertEquals((out.tools as { name: string; input_schema: unknown }[])[0].name, "get_deal");
});

Deno.test("reenvia o conteúdo original do Claude no loop", () => {
    const original = [{ type: "thinking", thinking: "", signature: "sig" }, { type: "tool_use", id: "t1", name: "x", input: {} }];
    const out = toAnthropicBody({
        messages: [
            { role: "user", content: "Oi" },
            { role: "assistant", content: null, tool_calls: [{ id: "t1", function: { name: "x", arguments: "{}" } }], provider_content: original },
            { role: "tool", tool_call_id: "t1", content: "ok" },
        ],
    }, "claude-haiku-5-5", "low");
    const msgs = out.messages as { content: unknown[] }[];
    assertEquals(msgs[1].content, original);
});

Deno.test("resposta volta no formato chat completions", () => {
    const res = toChatCompletion({
        id: "m1",
        model: "claude-haiku-5-5",
        stop_reason: "tool_use",
        content: [
            { type: "thinking" },
            { type: "text", text: "Vou ler o card." },
            { type: "tool_use", id: "t1", name: "get_deal", input: { id: "d1" } },
        ],
        usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 },
    }, false);
    const msg = res.choices[0].message;
    assertEquals(res.choices[0].finish_reason, "tool_calls");
    assertEquals(msg.content, "Vou ler o card.");
    assertEquals(msg.tool_calls?.[0].function.arguments, "{\"id\":\"d1\"}");
    assertEquals(res.usage.prompt_tokens, 1000);
    assertEquals(res.usage.prompt_tokens_details.cached_tokens, 900);
});

Deno.test("limpa cerca de código quando o pedido exige JSON", () => {
    assertEquals(extractJson("Claro:\n```json\n{\"a\":1}\n```"), "{\"a\":1}");
});
