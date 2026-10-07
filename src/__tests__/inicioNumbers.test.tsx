// Coluna de números do Início: o que o dono lê pra saber se o mês está indo.
// Número errado aqui vira decisão errada, então as contas ficam testadas.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MonthCard, type MonthNumbers } from "@/components/inicio/MonthCard";
import { QuinzenaCard } from "@/components/inicio/QuinzenaCard";

const MES: MonthNumbers = {
    wonTotal: 35_500,
    wonCount: 2,
    goal: 60_000,
    recoveredAmount: 23_900,
    recoveredCount: 1,
    talkingAmount: 142_000,
    lostCount: 1,
    expiredCount: 1,
};

describe("MonthCard", () => {
    it("mostra a porcentagem da meta e quanto vale cada traço", () => {
        render(<MemoryRouter><MonthCard numbers={MES} loading={false} /></MemoryRouter>);
        expect(screen.getByText(/59% da meta de R\$ 60 mil · cada traço é R\$ 2 mil/)).toBeTruthy();
        expect(screen.getByRole("img", { name: /59% da meta/ })).toBeTruthy();
        expect(screen.getByText("1 disse não, 1 morreu")).toBeTruthy();
    });

    it("sem meta, diz isso e leva pra cadastrar", () => {
        render(<MemoryRouter><MonthCard numbers={{ ...MES, goal: null }} loading={false} /></MemoryRouter>);
        expect(screen.getByText(/2 negócios no mês. Sem meta cadastrada./)).toBeTruthy();
        expect(screen.getByRole("link", { name: "Definir meta" }).getAttribute("href")).toBe("/admin?aba=meta");
    });
});

describe("QuinzenaCard", () => {
    it("soma cada tipo na legenda e avisa quando um dia passa do limite de quadrados", () => {
        const days = Array.from({ length: 14 }, (_, i) => ({ day: `2026-09-${String(16 + i).padStart(2, "0")}`, label: `${16 + i}/9`, leads: 0, quotes: 0, won: 0 }));
        days[13] = { ...days[13], leads: 5, quotes: 3, won: 1 };
        days[2] = { ...days[2], leads: 1 };
        render(<QuinzenaCard days={days} responseMedianMin={60} loading={false} />);
        expect(screen.getByText("+3")).toBeTruthy(); // 9 no dia, 6 cabem
        expect(screen.getByRole("img", { name: "29/9: 5 leads novos, 3 orçamentos, 1 fechados" })).toBeTruthy();
        const legenda = screen.getAllByRole("listitem").find((li) => li.textContent?.startsWith("lead novo"));
        expect(legenda?.textContent).toBe("lead novo 6");
        expect(screen.getByText("1h00")).toBeTruthy();
    });
});
