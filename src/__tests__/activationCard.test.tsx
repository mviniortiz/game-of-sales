// ActivationCard é o primeiro (e único) passo que a conta nova vê. Se ele
// quebra, a pessoa entra e não tem o que fazer.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivationCard } from "@/components/inicio/ActivationCard";

vi.mock("@/lib/analytics", () => ({ isDemoSession: () => false }));

describe("ActivationCard", () => {
    it("mostra o único passo e leva pro Inbox", () => {
        const onNavigate = vi.fn();
        render(<ActivationCard onNavigate={onNavigate} />);

        expect(screen.getByText("Conecte seu WhatsApp")).toBeTruthy();
        screen.getByRole("button", { name: /Conectar/i }).click();
        expect(onNavigate).toHaveBeenCalledWith("/inbox");
    });
});
