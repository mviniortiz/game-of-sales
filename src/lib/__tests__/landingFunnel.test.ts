// logLandingEvent: grava no banco e espelha as ações no GA4.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
const trackEvent = vi.fn();
let interno = false;
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a), ehInterno: () => interno }));

import { logLandingEvent } from "@/lib/landingFunnel";

const gravados = () => rpc.mock.calls.map((c) => (c[1] as { payload: { event: string; page: string; props: Record<string, unknown> } }).payload);

beforeEach(() => {
    sessionStorage.clear();
    rpc.mockClear();
    trackEvent.mockClear();
    interno = false;
});

describe("espelho no GA4", () => {
    it.each([
        ["proposta", "planilha-proposta-energia-solar", "cta_click", { placement: "download", arquivo: "Planilha" }, "landing_download"],
        ["proposta", "gerador-proposta-energia-solar", "cta_click", { placement: "baixar_pdf" }, "landing_download"],
        ["blog", "follow-up", "cta_click", { placement: "download", arquivo: "Modelo" }, "landing_download"],
        ["blog", "follow-up", "cta_click", { placement: "final" }, "landing_cta_click"],
        ["solar", "sumiu", "whatsapp_click", { placement: "footer" }, "landing_whatsapp_click"],
        ["proposta", "gerador-proposta-energia-solar", "form_start", {}, "landing_form_start"],
        ["signup", "solar", "form_submit", { step: "account" }, "landing_form_submit"],
    ] as const)("%s/%s %s vira %s", (page, variant, event, props, ga4) => {
        logLandingEvent(page, variant, event, props);
        expect(trackEvent).toHaveBeenCalledWith(ga4, { page, variant, ...props });
        expect(gravados()).toHaveLength(1);
        expect(gravados()[0]).toMatchObject({ event, page, props });
    });

    it.each(["view", "scroll_50", "scroll_90", "section_view", "form_error"] as const)("%s fica só no banco", (event) => {
        logLandingEvent("solar", "sumiu", event);
        expect(trackEvent).not.toHaveBeenCalled();
        expect(gravados()).toHaveLength(1);
    });
});

describe("teto da sessão", () => {
    it("seção vista para em 40 e o envio do cadastro ainda entra", () => {
        for (let i = 0; i < 55; i++) logLandingEvent("solar", "sumiu", "section_view", { secao: `s${i}` });
        expect(gravados()).toHaveLength(40);
        logLandingEvent("solar", "sumiu", "cta_click", { placement: "topo" });
        logLandingEvent("signup", "solar", "form_submit", { step: "account" });
        expect(gravados().slice(-2).map((p) => p.event)).toEqual(["cta_click", "form_submit"]);
    });
});

describe("aparelho do time", () => {
    it("leva interno=1 nas props do banco", () => {
        interno = true;
        logLandingEvent("signup", "solar", "view");
        expect(gravados()[0].props).toEqual({ interno: 1 });
    });
});
