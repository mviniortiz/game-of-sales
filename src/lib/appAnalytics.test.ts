import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn().mockResolvedValue({ error: null });
// Contagem da empresa: from(tabela).select(..., { count, head }).eq("company_id", empresa)
const contagem = vi.fn().mockResolvedValue({ count: 1, error: null });
const from = vi.fn((_tabela: string) => ({ select: () => ({ eq: (_c: string, empresa: string) => contagem(empresa) }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (t: string) => from(t) } }));
const trackBehavior = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackBehavior: (...a: unknown[]) => trackBehavior(...a) }));

import { APP_EVENTS, _fila, _limparFila, contarDaEmpresa, setAppContext, telaDaRota, trackApp, trackPrimeiroDaEmpresa } from "./appAnalytics";

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

    it("se o banco falhar, a tela segue", async () => {
        rpc.mockRejectedValueOnce(new Error("fora do ar"));
        trackApp(APP_EVENTS.SEARCH_USED, { resultados: 0, abriu: false });
        await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
    });
});

describe("trackPrimeiroDaEmpresa", () => {
    const primeira = () => trackPrimeiroDaEmpresa(APP_EVENTS.FIRST_PROPOSAL_GENERATED, () => contarDaEmpresa("proposals"), { origem: "editor" });
    const disparos = () => trackBehavior.mock.calls.filter((c) => c[0] === "first_proposal_generated");

    beforeEach(() => {
        localStorage.clear();
        _limparFila();
        trackBehavior.mockClear();
        contagem.mockReset().mockResolvedValue({ count: 1, error: null });
        from.mockClear();
        setAppContext({ empresa: "emp-1", tela: "negocio", aba: "" });
    });

    it("dispara na primeira da empresa e não conta de novo depois", async () => {
        await primeira();
        expect(from).toHaveBeenCalledWith("proposals");
        expect(contagem).toHaveBeenCalledWith("emp-1");
        expect(disparos()).toHaveLength(1);
        expect(disparos()[0][1]).toMatchObject({ origem: "editor", tela: "negocio" });

        await primeira();
        expect(disparos()).toHaveLength(1);
        expect(contagem).toHaveBeenCalledTimes(1);
    });

    it("empresa que já tinha proposta não dispara, nem na próxima", async () => {
        contagem.mockResolvedValue({ count: 7, error: null });
        await primeira();
        await primeira();
        expect(disparos()).toHaveLength(0);
        expect(contagem).toHaveBeenCalledTimes(1);
    });

    it("se a contagem falha, tenta de novo na próxima ação", async () => {
        contagem.mockResolvedValueOnce({ count: null, error: { message: "rede" } });
        await primeira();
        expect(disparos()).toHaveLength(0);
        await primeira();
        expect(disparos()).toHaveLength(1);
    });

    it("cada empresa tem o seu marco", async () => {
        await primeira();
        setAppContext({ empresa: "emp-2" });
        await primeira();
        expect(disparos()).toHaveLength(2);
    });
});
