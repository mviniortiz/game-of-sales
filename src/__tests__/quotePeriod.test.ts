import { describe, it, expect } from "vitest";
import { periodFromParam } from "@/lib/quotePeriod";

describe("janela do placar", () => {
    it("aceita só 7, 30 e 90 dias e cai em 30 no resto", () => {
        expect(periodFromParam("7")).toBe(7);
        expect(periodFromParam("90")).toBe(90);
        expect(periodFromParam(null)).toBe(30);
        expect(periodFromParam("15")).toBe(30);
        expect(periodFromParam("abc")).toBe(30);
    });
});
