// Conta sem assinatura precisa conseguir conectar o WhatsApp: sem isso não existe
// Raio-X. Os links de conectar apontam para o Inbox, que é pago.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConectarSemPlano } from "@/components/layout/PlanoGratis";
import { conectandoWhatsapp, rotaGratis } from "@/hooks/usePlano";

vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ companies: [], loading: false }) }));
vi.mock("@/components/eva/EvaBot", () => ({ EvaBot: () => null }));
vi.mock("@/components/inbox/WhatsAppConnectModal", () => ({
    WhatsAppConnectModal: ({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: () => void }) =>
        open ? (
            <div role="dialog">
                <button onClick={onClose}>Fechar</button>
                <button onClick={onConnected}>Conectou</button>
            </div>
        ) : null,
}));

const renderTela = (entries: string[]) =>
    render(
        <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
            <Routes>
                <Route path="/inbox" element={<ConectarSemPlano />} />
                <Route path="/orcamentos" element={<p>Placar</p>} />
                <Route path="/configuracoes/aprovacao" element={<p>Aprovação</p>} />
            </Routes>
        </MemoryRouter>,
    );

describe("conectar o WhatsApp sem plano", () => {
    it("reconhece só o link de conexão e mantém o Inbox pago", () => {
        expect(conectandoWhatsapp("/inbox", "?connect=1")).toBe(true);
        expect(conectandoWhatsapp("/inbox", "?connect=1&chat=9")).toBe(true);
        expect(conectandoWhatsapp("/inbox", "")).toBe(false);
        expect(conectandoWhatsapp("/inbox", "?connect=0")).toBe(false);
        expect(conectandoWhatsapp("/pipeline", "?connect=1")).toBe(false);
        expect(rotaGratis("/inbox")).toBe(false);
    });

    it("abre a conexão e leva ao placar depois de conectar", () => {
        renderTela(["/configuracoes/aprovacao", "/inbox?connect=1"]);
        expect(screen.getByRole("dialog")).toBeTruthy();
        fireEvent.click(screen.getByText("Conectou"));
        expect(screen.getByText("Placar")).toBeTruthy();
    });

    it("fechar sem conectar volta para onde a pessoa estava", () => {
        renderTela(["/configuracoes/aprovacao", "/inbox?connect=1"]);
        fireEvent.click(screen.getByText("Fechar"));
        expect(screen.getByText("Aprovação")).toBeTruthy();
    });
});
