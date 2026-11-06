// A faixa da conta grátis fala do que está parado no placar, com o número real.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FaixaPlanoGratis } from "@/components/layout/PlanoGratis";

const board = vi.hoisted(() => ({ parados: 0, dias: [] as number[] }));
vi.mock("@/components/eva/EvaBot", () => ({ EvaBot: () => null }));
vi.mock("@/components/inbox/WhatsAppConnectModal", () => ({ WhatsAppConnectModal: () => null }));
vi.mock("@/hooks/useQuoteBoard", () => ({
    useQuoteBoard: (dias: number) => {
        board.dias.push(dias);
        return { query: { data: { totals: { parked_count: board.parados } } } };
    },
}));

const faixa = (url = "/orcamentos") => render(<MemoryRouter initialEntries={[url]}><FaixaPlanoGratis /></MemoryRouter>);

describe("faixa da conta grátis", () => {
    it("conta os orçamentos parados da mesma janela do placar", () => {
        board.parados = 3;
        faixa("/orcamentos?dias=90");
        expect(screen.getByText(/3 orçamentos parados sem a Lume acompanhando/)).toBeTruthy();
        expect(board.dias.at(-1)).toBe(90);
    });
    it("sem parado, volta para a frase geral", () => {
        board.parados = 0;
        faixa();
        expect(screen.getByText(/A Lume ainda não está acompanhando/)).toBeTruthy();
        expect(board.dias.at(-1)).toBe(30);
    });
});
