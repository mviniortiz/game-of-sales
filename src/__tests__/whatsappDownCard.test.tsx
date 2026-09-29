// WhatsappDownCard é o que a conta vê quando o WhatsApp não está ligado. Se ele
// some ou aponta pro lugar errado, a pessoa não tem como voltar a funcionar.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WhatsappDownCard } from "@/components/inicio/WhatsappDownCard";

vi.mock("@/lib/analytics", () => ({ isDemoSession: () => false }));

const renderCard = (props: Parameters<typeof WhatsappDownCard>[0]) =>
    render(
        <MemoryRouter>
            <WhatsappDownCard {...props} />
        </MemoryRouter>,
    );

describe("WhatsappDownCard", () => {
    it("conta que nunca conectou: pede para conectar e abre a conexão no Inbox", () => {
        renderCard({ neverConnected: true, lastInboundAt: null });
        expect(screen.getByText("Conecte seu WhatsApp para a EVA começar")).toBeTruthy();
        const link = screen.getByRole("link", { name: "Conectar WhatsApp" });
        expect(link.getAttribute("href")).toBe("/inbox?connect=1");
    });

    it("conexão caída: pede para reconectar e diz quando chegou a última conversa", () => {
        renderCard({ neverConnected: false, lastInboundAt: "2026-06-28T14:10:00-03:00" });
        expect(screen.getByText("Reconecte para a EVA voltar a trabalhar")).toBeTruthy();
        expect(screen.getByText(/A última conversa chegou em 28\/06/)).toBeTruthy();
        expect(screen.getByRole("link", { name: "Reconectar WhatsApp" }).getAttribute("href")).toBe("/inbox?connect=1");
    });
});
