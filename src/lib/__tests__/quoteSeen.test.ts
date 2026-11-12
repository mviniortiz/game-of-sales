import { describe, expect, it } from "vitest";
import { quando, seenLine } from "@/lib/quoteText";

const agora = new Date(2026, 10, 12, 16, 0);

describe("seenLine", () => {
  it("só fala de orçamento sem resposta com tique azul", () => {
    expect(seenLine({ state: "no_reply", seen: false, seen_at: null }, agora)).toBeNull();
    expect(seenLine({ state: "went_quiet", seen: true, seen_at: null }, agora)).toBeNull();
    expect(seenLine({ state: "no_reply", seen: undefined, seen_at: undefined }, agora)).toBeNull();
  });

  it("mostra a hora quando sabe e não inventa quando não sabe", () => {
    expect(seenLine({ state: "no_reply", seen: true, seen_at: new Date(2026, 10, 12, 14, 32).toISOString() }, agora))
      .toBe("Viu a mensagem hoje às 14:32");
    expect(seenLine({ state: "no_reply", seen: true, seen_at: null }, agora)).toBe("Viu a mensagem");
  });
});

describe("quando", () => {
  it("hoje, ontem e data", () => {
    expect(quando(new Date(2026, 10, 11, 9, 5).toISOString(), agora)).toBe("ontem às 09:05");
    expect(quando(new Date(2026, 10, 8, 18, 5).toISOString(), agora)).toBe("08/11 às 18:05");
  });
});
