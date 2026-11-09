import { describe, expect, it, vi } from "vitest";
import { criarCadeado } from "@/integrations/supabase/cadeado";

// Gerente de cadeado de mentira: "ocupado" simula outra aba parada segurando
// o cadeado para sempre. Pedido com signal espera até abortar; steal entra.
function gerente(ocupado: boolean) {
    const pedidos: string[] = [];
    const request = vi.fn((nome: string, opcoes: LockOptions, cb: (lock: Lock | null) => Promise<unknown>) => {
        const lock = { name: nome, mode: "exclusive" } as Lock;
        if (opcoes.steal) {
            pedidos.push("steal");
            return cb(lock);
        }
        if (opcoes.ifAvailable) {
            pedidos.push("ifAvailable");
            return cb(ocupado ? null : lock);
        }
        pedidos.push("espera");
        if (!ocupado) return cb(lock);
        return new Promise((_, rejeita) => {
            opcoes.signal?.addEventListener("abort", () =>
                rejeita(new DOMException("aborted", "AbortError")),
            );
        });
    });
    return { request: request as unknown as LockManager["request"], pedidos };
}

describe("cadeado do login entre abas", () => {
    it("cadeado livre: roda na hora", async () => {
        const g = gerente(false);
        const cadeado = criarCadeado(g, 50);
        await expect(cadeado("lock:x", -1, async () => "ok")).resolves.toBe("ok");
        expect(g.pedidos).toEqual(["espera"]);
    });

    it("outra aba parada segurando: passa do teto e toma o cadeado", async () => {
        const g = gerente(true);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const cadeado = criarCadeado(g, 30);
        await expect(cadeado("lock:x", -1, async () => "sessão")).resolves.toBe("sessão");
        expect(g.pedidos).toEqual(["espera", "steal"]);
        warn.mockRestore();
    });

    it("erro AbortError de dentro da operação não vira roubo do cadeado", async () => {
        const g = gerente(false);
        const fn = vi.fn(async () => {
            throw new DOMException("fetch abortado", "AbortError");
        });
        const cadeado = criarCadeado(g, 30);
        await expect(cadeado("lock:x", -1, fn)).rejects.toThrow("fetch abortado");
        expect(fn).toHaveBeenCalledTimes(1);
        expect(g.pedidos).toEqual(["espera"]);
    });

    it("pedido com prazo próprio recebe erro de prazo, sem roubar", async () => {
        const g = gerente(true);
        const cadeado = criarCadeado(g, 10_000);
        await expect(cadeado("lock:x", 20, async () => "x")).rejects.toMatchObject({ isAcquireTimeout: true });
        expect(g.pedidos).toEqual(["espera"]);
    });

    it("prazo zero e ocupado: erro na hora", async () => {
        const g = gerente(true);
        const cadeado = criarCadeado(g, 30);
        await expect(cadeado("lock:x", 0, async () => "x")).rejects.toMatchObject({ isAcquireTimeout: true });
    });

    it("sem navigator.locks: só roda", async () => {
        const cadeado = criarCadeado(undefined, 30);
        await expect(cadeado("lock:x", -1, async () => 1)).resolves.toBe(1);
    });
});
