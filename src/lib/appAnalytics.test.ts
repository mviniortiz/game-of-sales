import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
const trackBehavior = vi.fn();
let demo = false;
vi.mock("@/lib/analytics", () => ({ trackBehavior: (...a: unknown[]) => trackBehavior(...a), isDemoSession: () => demo }));

import { APP_EVENTS, _fila, _limparFila, setAppContext, telaDaRota, trackApp } from "./appAnalytics";

describe("telaDaRota", () => {
    it("dá nome curto às rotas do app", () => {
        expect(telaDaRota("/inbox")).toBe("conversas");
        expect(telaDaRota("/pipeline")).toBe("funil");
        expect(telaDaRota("/admin")).toBe("resultados");
        expect(telaDaRota("/deals/123")).toBe("negocio");
        expect(telaDaRota("/")).toBe("inicio");
        expect(telaDaRota("/algo-novo")).toBe("algo_novo");
    });
});

describe("trackApp", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        _limparFila();
        rpc.mockClear();
        trackBehavior.mockClear();
        demo = false;
        setAppContext({ empresa: "emp-1", tela: "conversas", aba: "" });
    });
    afterEach(() => vi.useRealTimers());

    it("manda pro GA4/Clarity na hora e pro banco em lote, com a tela e a empresa", async () => {
        trackApp(APP_EVENTS.CONVERSATION_OPENED, { nao_lidas: true });
        trackApp(APP_EVENTS.MESSAGE_SENT, { tipo: "texto", origem: "lume" });
        expect(trackBehavior).toHaveBeenCalledWith("conversation_opened", { nao_lidas: true, tela: "conversas" });
        expect(rpc).not.toHaveBeenCalled();
        expect(_fila()).toHaveLength(2);

        await vi.advanceTimersByTimeAsync(5000);
        await vi.dynamicImportSettled(); // o cliente do banco carrega só na hora de enviar
        await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
        const [nome, args] = rpc.mock.calls[0] as [string, { eventos: Array<Record<string, unknown>>; empresa: string }];
        expect(nome).toBe("log_app_events");
        expect(args.empresa).toBe("emp-1");
        expect(args.eventos.map((e) => e.event)).toEqual(["conversation_opened", "message_sent"]);
        expect(args.eventos[1]).toMatchObject({ tela: "conversas", props: { tipo: "texto", origem: "lume" } });
        expect(_fila()).toHaveLength(0);
    });

    it("na demo não grava no banco", () => {
        demo = true;
        trackApp(APP_EVENTS.SCREEN_VIEWED, { tela: "funil" });
        expect(trackBehavior).toHaveBeenCalled();
        expect(_fila()).toHaveLength(0);
    });

    it("se o banco falhar, a tela segue", async () => {
        rpc.mockRejectedValueOnce(new Error("fora do ar"));
        trackApp(APP_EVENTS.SEARCH_USED, { resultados: 0, abriu: false });
        await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
    });
});
