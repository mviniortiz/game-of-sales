// O palco de Hoje conta o que aconteceu com o rascunho: ele só diz que saiu do
// número do dono quando o rascunho foi aprovado de verdade.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PalcoEva } from "@/components/inicio/PalcoEva";
import type { RascunhoPendente } from "@/hooks/useEvaDiary";

vi.mock("@/components/eva/EvaBot", () => ({ EvaBot: ({ state }: { state: string }) => <span data-testid="eva">{state}</span> }));
vi.mock("@/vendor/stageshow/motion/Swap", () => ({ Swap: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const rascunho: RascunhoPendente = { id: "a", codigo: "A2", quem: "Carlos", noWhatsapp: true, texto: "Oi, Carlos", porque: "2 dias sem resposta" };
const base = { enviados: [] as string[], acompanhando: 3, carregando: false };

describe("PalcoEva", () => {
    it("mostra o rascunho que espera o 1", () => {
        render(<PalcoEva {...base} rascunho={rascunho} />);
        expect(screen.getByText("Falta o seu 1 no WhatsApp")).toBeTruthy();
        expect(screen.getByText("Oi, Carlos")).toBeTruthy();
        expect(screen.getByTestId("eva").textContent).toBe("alert");
    });

    it("conta que saiu quando o rascunho foi aprovado", () => {
        const { rerender } = render(<PalcoEva {...base} rascunho={rascunho} />);
        rerender(<PalcoEva {...base} rascunho={null} enviados={["a"]} />);
        expect(screen.getByText("Saiu do seu número")).toBeTruthy();
        expect(screen.getByTestId("eva").textContent).toBe("happy");
    });

    it("não diz que saiu quando o rascunho só expirou", () => {
        const { rerender } = render(<PalcoEva {...base} rascunho={rascunho} />);
        rerender(<PalcoEva {...base} rascunho={null} />);
        expect(screen.queryByText("Saiu do seu número")).toBeNull();
        expect(screen.getByText("Nada esperando o seu 1")).toBeTruthy();
    });

    it("sem rascunho fica calmo e diz o que acompanha", () => {
        render(<PalcoEva {...base} rascunho={null} />);
        expect(screen.getByText("De olho em 3 orçamentos")).toBeTruthy();
    });
});
