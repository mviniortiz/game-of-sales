// A conta de luz que a Lume leu aparece no painel; o dono confirma, corrige ou descarta.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContaLuzCard } from "@/components/inbox/ContaLuzCard";
import { numeroDigitado, resumoConta, type ContaLuz } from "@/lib/contaLuz";

const estado = vi.hoisted(() => ({ conta: null as ContaLuz | null, chamadas: [] as unknown[] }));
vi.mock("@/hooks/useContaLuz", () => ({
    useContaLuz: () => ({
        conta: estado.conta,
        revisar: { isPending: false, mutate: (p: unknown) => estado.chamadas.push(p) },
    }),
}));

const lida: ContaLuz = {
    id: "c1", consumo_kwh: 450, valor_reais: 412.37, distribuidora: "Celesc", cidade: "Florianópolis",
    uf: "SC", classe: "residencial", mes_referencia: "2026-10", fonte: "foto", status: "lida", created_at: "2026-11-06T12:00:00Z",
};

describe("conta de luz no painel", () => {
    beforeEach(() => {
        estado.conta = { ...lida };
        estado.chamadas = [];
    });

    it("resume a conta em uma linha", () => {
        expect(resumoConta(lida)).toBe("450 kWh/mês, R$ 412, Celesc, Florianópolis/SC, residencial");
        expect(numeroDigitado("1.200")).toBe(1200);
        expect(numeroDigitado("412,37")).toBe(412.37);
        expect(numeroDigitado("")).toBeNull();
    });

    it("sem leitura, não mostra nada", () => {
        estado.conta = null;
        const { container } = render(<ContaLuzCard conversationId="v1" />);
        expect(container.textContent).toBe("");
    });

    it("confirma com um toque", () => {
        render(<ContaLuzCard conversationId="v1" />);
        expect(screen.getByText(/450 kWh\/mês, R\$ 412, Celesc/)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
        expect(estado.chamadas).toEqual([{ id: "c1", status: "confirmada" }]);
    });

    it("corrige o consumo e salva como corrigida", () => {
        render(<ContaLuzCard conversationId="v1" />);
        fireEvent.click(screen.getByRole("button", { name: "Corrigir" }));
        fireEvent.change(screen.getByLabelText("Consumo (kWh/mês)"), { target: { value: "520" } });
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
        const p = estado.chamadas[0] as { status: string; campos: { consumo_kwh: number; valor_reais: number; uf: string } };
        expect(p.status).toBe("corrigida");
        expect(p.campos.consumo_kwh).toBe(520);
        expect(p.campos.valor_reais).toBe(412.37);
        expect(p.campos.uf).toBe("SC");
    });

    it("descarta quando não é conta de luz", () => {
        render(<ContaLuzCard conversationId="v1" />);
        fireEvent.click(screen.getByRole("button", { name: "Não é conta de luz" }));
        expect(estado.chamadas).toEqual([{ id: "c1", status: "descartada" }]);
    });

    it("depois de confirmada, só sobra Corrigir", () => {
        estado.conta = { ...lida, status: "confirmada" };
        render(<ContaLuzCard conversationId="v1" />);
        expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
        expect(screen.getByRole("button", { name: "Corrigir" })).toBeTruthy();
    });
});
