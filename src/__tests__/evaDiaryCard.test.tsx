// O card é a única superfície onde a pessoa vê o que a EVA fez sozinha. Os dois
// estados que importam: conta vazia (o que ela VAI fazer) e conta trabalhando.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvaDiaryCard } from "@/components/inicio/EvaDiaryCard";

const diary = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/hooks/useEvaDiary", () => ({ useEvaDiary: () => diary.valor }));

const VAZIO = { linhas: [], rascunhos: [], traces: [], primeiraAcao: null, trabalhou: false, loading: false };

beforeEach(() => {
    diary.valor = { ...VAZIO };
});

describe("EvaDiaryCard", () => {
    it("na conta que ainda não rodou, promete o que vai fazer", () => {
        render(<EvaDiaryCard />);
        expect(screen.getByText(/Ainda não fiz nada hoje/)).toBeTruthy();
        expect(screen.getByText(/Ler cada conversa que chegar no seu WhatsApp/)).toBeTruthy();
    });

    it("mostra o contrato mesmo sem nenhuma ação", () => {
        render(<EvaDiaryCard />);
        expect(screen.getByText(/nunca faço: falar com o lead sem você aprovar/)).toBeTruthy();
    });

    it("lista o que ela fez, com os nomes", () => {
        diary.valor = {
            ...VAZIO,
            trabalhou: true,
            primeiraAcao: new Date("2026-08-24T12:04:00Z"),
            linhas: [
                { chave: "create_deal", texto: "Abri 2 oportunidades", detalhe: "Maria Costa, Studio Alfa" },
                { chave: "leitura", texto: "Li 5 contextos de conversa", detalhe: null },
            ],
        };
        render(<EvaDiaryCard />);
        expect(screen.getByText("Abri 2 oportunidades")).toBeTruthy();
        expect(screen.getByText("Maria Costa, Studio Alfa")).toBeTruthy();
        expect(screen.queryByText(/Ainda não fiz nada/)).toBeNull();
    });

    it("destaca o que está esperando aprovação e como responder", () => {
        diary.valor = {
            ...VAZIO,
            trabalhou: true,
            linhas: [{ chave: "create_deal", texto: "Abri 1 oportunidade", detalhe: "Promax" }],
            rascunhos: [
                { id: "a", codigo: "A2", quem: "Promax", noWhatsapp: true },
                { id: "b", codigo: null, quem: "Studio Alfa", noWhatsapp: false },
            ],
        };
        render(<EvaDiaryCard />);
        expect(screen.getByText("2 mensagens esperando você aprovar")).toBeTruthy();
        expect(screen.getByText("A2")).toBeTruthy();
        expect(screen.getByText("no seu WhatsApp")).toBeTruthy();
        expect(screen.getByText("preparando")).toBeTruthy();
    });

    it("não inventa fila quando não há rascunho", () => {
        diary.valor = { ...VAZIO, trabalhou: true, linhas: [{ chave: "leitura", texto: "Li 1 contexto de conversa", detalhe: null }] };
        render(<EvaDiaryCard />);
        expect(screen.queryByText(/esperando você aprovar/)).toBeNull();
    });

    it("guarda o passo a passo fechado e abre quando pedem", () => {
        diary.valor = {
            ...VAZIO,
            trabalhou: true,
            linhas: [{ chave: "create_deal", texto: "Abri 1 oportunidade", detalhe: "Promax" }],
            traces: [
                {
                    runId: "r1",
                    hora: new Date("2026-08-25T12:00:00Z"),
                    sobre: "Promax",
                    passos: [
                        { ordem: 1, texto: "Leu o card", duracaoMs: 63 },
                        { ordem: 2, texto: "Registrou a leitura", duracaoMs: 58 },
                    ],
                },
            ],
        };
        render(<EvaDiaryCard />);

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
        diary.valor = { ...VAZIO, trabalhou: true, linhas: [{ chave: "leitura", texto: "Li 1 contexto de conversa", detalhe: null }] };
        render(<EvaDiaryCard />);
        expect(screen.queryByText(/Ver como ela chegou nisso/i)).toBeNull();
    });
});