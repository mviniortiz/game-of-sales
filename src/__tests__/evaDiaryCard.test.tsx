// A seção é a única superfície onde a pessoa vê o que a EVA fez sozinha. Os dois
// estados que importam: conta vazia (o que ela VAI fazer) e conta trabalhando.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvaDiaryCard } from "@/components/inicio/EvaDiaryCard";
import type { EvaDiary } from "@/hooks/useEvaDiary";

const VAZIO: EvaDiary = { eventos: [], rascunhos: [], traces: [], loading: false };

const hoje = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};

describe("EvaDiaryCard", () => {
    it("na conta que ainda não rodou, promete o que vai fazer", () => {
        render(<EvaDiaryCard diary={VAZIO} />);
        expect(screen.getByText(/Ainda não fiz nada desde ontem/)).toBeTruthy();
        expect(screen.getByText(/Ler cada conversa que chegar no seu WhatsApp/)).toBeTruthy();
    });

    it("mostra o contrato mesmo sem nenhuma ação", () => {
        render(<EvaDiaryCard diary={VAZIO} />);
        expect(screen.getByText("Ela nunca fala com o cliente sem o seu ok.")).toBeTruthy();
    });

    it("lista o que ela fez, com hora e nome, mais recente primeiro", () => {
        const diary: EvaDiary = {
            ...VAZIO,
            eventos: [
                { id: "a", quando: hoje(9, 12), texto: "Escreveu a retomada de Padaria Trigo Bom e mandou no seu WhatsApp para aprovar", rascunho: true },
                { id: "b", quando: hoje(8, 40), texto: "Abriu uma oportunidade para Mayara Sampaio", rascunho: false },
            ],
        };
        render(<EvaDiaryCard diary={diary} />);
        const itens = screen.getAllByRole("listitem");
        expect(itens[0].textContent).toContain("hoje 09:12");
        expect(itens[0].textContent).toContain("Padaria Trigo Bom");
        expect(itens[1].textContent).toContain("Mayara Sampaio");
        expect(screen.queryByText(/Ainda não fiz nada/)).toBeNull();
    });

    it("destaca o que está esperando aprovação e como responder", () => {
        const diary: EvaDiary = {
            ...VAZIO,
            eventos: [{ id: "a", quando: hoje(9, 0), texto: "Abriu uma oportunidade para Promax", rascunho: false }],
            rascunhos: [
                { id: "a", codigo: "A2", quem: "Promax", noWhatsapp: true },
                { id: "b", codigo: null, quem: "Studio Alfa", noWhatsapp: false },
            ],
        };
        render(<EvaDiaryCard diary={diary} />);
        expect(screen.getByText("2 mensagens esperando você aprovar")).toBeTruthy();
        expect(screen.getByText("A2")).toBeTruthy();
        expect(screen.getByText("preparando")).toBeTruthy();
        expect(screen.getByText(/para enviar, 2 para descartar/)).toBeTruthy();
    });

    it("não inventa fila quando não há rascunho", () => {
        const diary: EvaDiary = { ...VAZIO, eventos: [{ id: "a", quando: hoje(9, 0), texto: "Leu 1 conversa", rascunho: false }] };
        render(<EvaDiaryCard diary={diary} />);
        expect(screen.queryByText(/esperando você aprovar/)).toBeNull();
    });

    it("guarda o passo a passo fechado e abre quando pedem", () => {
        const diary: EvaDiary = {
            ...VAZIO,
            eventos: [{ id: "a", quando: hoje(12, 0), texto: "Abriu uma oportunidade para Promax", rascunho: false }],
            traces: [
                {
                    runId: "r1",
                    hora: hoje(12, 0),
                    sobre: "Promax",
                    passos: [
                        { ordem: 1, texto: "Leu o card", duracaoMs: 63 },
                        { ordem: 2, texto: "Registrou a leitura", duracaoMs: 58 },
                    ],
                },
            ],
        };
        render(<EvaDiaryCard diary={diary} />);
        // fechado: o passo não está na tela, só o convite
        expect(screen.queryByText("Leu o card")).toBeNull();
        const botao = screen.getByRole("button", { name: /Ver como ela chegou nisso/i });
        expect(botao.getAttribute("aria-expanded")).toBe("false");
        // fireEvent envolve em act(): o .click() nativo não re-renderiza
        fireEvent.click(botao);
        expect(screen.getByText("Leu o card")).toBeTruthy();
        expect(screen.getByText("63ms")).toBeTruthy();
    });

    it("não oferece o passo a passo quando não há execução", () => {
        const diary: EvaDiary = { ...VAZIO, eventos: [{ id: "a", quando: hoje(9, 0), texto: "Leu 1 conversa", rascunho: false }] };
        render(<EvaDiaryCard diary={diary} />);
        expect(screen.queryByText(/Ver como ela chegou nisso/i)).toBeNull();
    });
});
