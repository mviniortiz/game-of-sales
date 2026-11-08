import { describe, expect, it } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { useMostrarMais } from "./useMostrarMais";
import { MostrarMais } from "@/components/ui/MostrarMais";

const itens = Array.from({ length: 75 }, (_, i) => i);

describe("useMostrarMais", () => {
    it("mostra de 30 em 30 e volta ao começo quando a chave muda", () => {
        const { result, rerender } = renderHook(({ chave }) => useMostrarMais(itens, 30, chave), { initialProps: { chave: "a" } });
        expect(result.current.visiveis).toHaveLength(30);
        expect(result.current.restante).toBe(45);
        act(() => result.current.mostrarMais());
        expect(result.current.visiveis).toHaveLength(60);
        act(() => result.current.mostrarMais());
        expect(result.current.visiveis).toHaveLength(75);
        expect(result.current.restante).toBe(0);
        rerender({ chave: "b" });
        expect(result.current.visiveis).toHaveLength(30);
    });
});

describe("MostrarMais", () => {
    it("diz quantos vêm e some quando acaba", () => {
        const { rerender } = render(<MostrarMais restante={45} passo={30} total={75} onClick={() => {}} />);
        expect(screen.getByRole("button").textContent).toContain("Mostrar mais 30");
        expect(screen.getByRole("button").textContent).toContain("30 de 75");
        rerender(<MostrarMais restante={15} passo={30} total={75} onClick={() => {}} />);
        expect(screen.getByRole("button").textContent).toContain("Mostrar mais 15");
        rerender(<MostrarMais restante={0} passo={30} total={75} onClick={() => {}} />);
        expect(screen.queryByRole("button")).toBeNull();
    });
});
