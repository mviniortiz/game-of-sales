import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { analyzeConversation, rankItems, summarize, type RxMessage } from "./raioX.ts";

const NOW = Date.parse("2026-10-08T12:00:00Z");
const daysAgo = (d: number, h = 0) => new Date(NOW - d * 86_400_000 - h * 3_600_000).toISOString();

const out = (ts: string, body: string | null, extra: Partial<RxMessage> = {}): RxMessage => ({
    conversation_id: "c1", direction: "outbound", message_type: "text", body, media_ref: null, ts, ...extra,
});
const inn = (ts: string, body: string): RxMessage => ({
    conversation_id: "c1", direction: "inbound", message_type: "text", body, media_ref: null, ts,
});
const pdf = (ts: string, fileName: string, live = false): RxMessage =>
    out(ts, null, {
        message_type: "document",
        media_ref: live
            ? { mimetype: "application/pdf", caption: null, file_name: fileName }
            : { mimetype: "application/pdf", caption: fileName },
    });

Deno.test("PDF sem resposta há 5 dias, valor na mensagem do lado", () => {
    const item = analyzeConversation([
        inn(daysAgo(6), "Quero um orçamento, minha conta é 600"),
        out(daysAgo(5, 1), "Segue a proposta do sistema de 6,2 kWp. Valor total R$ 24.900"),
        pdf(daysAgo(5), "Proposta_Oliveira.pdf"),
    ], NOW)!;
    assertEquals(item.status, "no_reply");
    assertEquals(item.days_silent, 5);
    assertEquals(item.amount, 24900);
    assertEquals(item.kwp, 6.2);
    assertEquals(item.detected_by, "pdf");
});

Deno.test("PDF ao vivo usa file_name e ignora boleto", () => {
    const item = analyzeConversation([pdf(daysAgo(3), "proposta.pdf", true)], NOW)!;
    assertEquals(item.detected_by, "pdf");
    assertEquals(analyzeConversation([pdf(daysAgo(3), "boleto_outubro.pdf", true)], NOW), null);
});

Deno.test("cliente respondeu depois e a empresa não voltou: sua vez", () => {
    const item = analyzeConversation([
        out(daysAgo(8), "O orçamento fica em R$ 31.500 à vista"),
        inn(daysAgo(4), "Vou pensar e te falo"),
    ], NOW)!;
    assertEquals(item.status, "your_turn");
    assertEquals(item.days_silent, 4);
    assertEquals(item.amount, 31500);
});

Deno.test("cliente respondeu, empresa voltou e ele sumiu", () => {
    const item = analyzeConversation([
        out(daysAgo(10), "Proposta: investimento de R$ 52.300"),
        inn(daysAgo(9), "E parcelado?"),
        out(daysAgo(8, 23), "Dá em 60x pelo financiamento"),
    ], NOW)!;
    assertEquals(item.status, "went_quiet");
    assertEquals(item.days_silent, 9);
});

Deno.test("proposta de ontem ainda não está parada", () => {
    const item = analyzeConversation([out(daysAgo(1), "Segue o orçamento, valor total R$ 18.700")], NOW)!;
    assertEquals(item.status, "talking");
});

Deno.test("conversa sem proposta não entra", () => {
    assertEquals(analyzeConversation([out(daysAgo(2), "Te mando o orçamento amanhã"), inn(daysAgo(2), "ok")], NOW), null);
});

Deno.test("resumo separa recentes e soma só o que tem valor", () => {
    const items = [
        analyzeConversation([out(daysAgo(5), "Orçamento: R$ 20.000")], NOW)!,
        analyzeConversation([{ ...pdf(daysAgo(40), "proposta.pdf"), conversation_id: "c2" }], NOW)!,
        analyzeConversation([{ ...out(daysAgo(1), "Orçamento: R$ 99.000"), conversation_id: "c3" }], NOW)!,
    ];
    const s = summarize(items);
    assertEquals(s.quotes, 3);
    assertEquals(s.stuck, 2);
    assertEquals(s.stuck_recent, 1);
    assertEquals(s.stuck_value_recent, 20000);
    assertEquals(s.stuck_without_value, 1);
    assertEquals(rankItems(items).map((i) => i.conversation_id), ["c1", "c2", "c3"]);
});
