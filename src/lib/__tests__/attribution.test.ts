// AWARENESS.1 — trava o mapeamento canal → hipótese de consciência.
// Se alguém mexer na precedência dos sinais, o teste quebra antes de ir pro ar.
import { describe, it, expect } from "vitest";
import { deriveAwareness, type Attribution } from "../attribution";

const D = (a: Attribution) => deriveAwareness(a);

describe("deriveAwareness — 5 níveis por sinal de origem", () => {
    it("gclid → busca paga → solution_aware (com query_intent do utm_term)", () => {
        const r = D({ gclid: "abc123", utm_term: "crm para whatsapp" });
        expect(r.traffic_source).toBe("paid_search");
        expect(r.awareness_hypothesis).toBe("solution_aware");
        expect(r.query_intent).toBe("crm para whatsapp");
    });

    it("utm_medium=cpc sem gclid ainda cai em busca paga", () => {
        expect(D({ utm_source: "google", utm_medium: "cpc" }).traffic_source).toBe("paid_search");
    });

    it("cold email do Markus → outbound nominal → product_aware", () => {
        expect(D({ utm_medium: "email", utm_source: "outreach" }).awareness_hypothesis).toBe("product_aware");
        expect(D({ utm_source: "markus" }).traffic_source).toBe("email_outreach");
    });

    it("indicação → referral → product_aware", () => {
        expect(D({ utm_medium: "referral" }).awareness_hypothesis).toBe("product_aware");
        expect(D({ utm_source: "indicacao" }).traffic_source).toBe("referral");
    });

    it("social frio (fbclid ou referrer social) → problem_aware", () => {
        expect(D({ fbclid: "x" }).awareness_hypothesis).toBe("problem_aware");
        expect(D({ referrer: "https://instagram.com/vyzon" }).traffic_source).toBe("social");
    });

    it("busca orgânica (referrer de buscador, sem gclid) → solution_aware", () => {
        const r = D({ referrer: "https://www.google.com/search?q=x" });
        expect(r.traffic_source).toBe("organic_search");
        expect(r.awareness_hypothesis).toBe("solution_aware");
    });

    it("direto (sem referrer e sem utm) → most_aware", () => {
        const r = D({});
        expect(r.traffic_source).toBe("direct");
        expect(r.awareness_hypothesis).toBe("most_aware");
    });

    it("precedência: busca paga vence social quando os dois sinais coexistem", () => {
        // gclid (paga) + fbclid (social) juntos → paga ganha.
        expect(D({ gclid: "g", fbclid: "f" }).traffic_source).toBe("paid_search");
    });
});
