// Bloco "Prospecção de hoje" do Início: some para quem não prospecta, diz o
// próximo passo de cada integradora e degrada com aviso quando a leitura falha.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProspeccaoCard } from "@/components/inicio/ProspeccaoCard";
import { ordenarItens, proximoPasso, type ProspectItem } from "@/lib/prospeccaoPasso";

const base: ProspectItem = {
    id: "1", agency_name: "Sol do Vale", city: "Blumenau", status: "respondeu", reply_kind: "duvida",
    replied_at: "2026-11-04T13:00:00Z", reply_code: null, last_reply: "pode falar", reply_draft: null,
    meeting_at: null, sent_at: "2026-11-04T12:00:00Z",
};

describe("proximoPasso", () => {
    it("rascunho esperando aprovação vem com o código do grupo", () => {
        const p = proximoPasso({ ...base, reply_code: "PK4" });
        expect(p.agir).toBe(true);
        expect(p.texto).toContain("PK4 1");
    });
    it("interesse pede marcar a chamada com a vaga grátis", () => {
        const p = proximoPasso({ ...base, reply_kind: "interesse" });
        expect(p.agir).toBe(true);
        expect(p.texto).toMatch(/vaga grátis/);
    });
    it("robô e dúvida são espera, não ação", () => {
        expect(proximoPasso({ ...base, reply_kind: "automatico" }).agir).toBe(false);
        expect(proximoPasso(base).agir).toBe(false);
    });
    it("quem pede você vem antes", () => {
        const ordem = ordenarItens([
            { ...base, id: "espera", replied_at: "2026-11-04T15:00:00Z" },
            { ...base, id: "acao", reply_kind: "interesse", replied_at: "2026-11-04T10:00:00Z" },
        ]);
        expect(ordem.map((i) => i.id)).toEqual(["acao", "espera"]);
    });
});

describe("ProspeccaoCard", () => {
    it("não aparece para quem não prospecta", () => {
        const { container } = render(<ProspeccaoCard data={{ ativo: false }} loading={false} />);
        expect(container.textContent).toBe("");
    });
    it("falha de leitura vira aviso", () => {
        render(<ProspeccaoCard loading={false} error="boom" />);
        expect(screen.getByRole("status").textContent).toMatch(/Não consegui carregar/);
    });
    it("mostra lote pendente, número e o próximo passo", () => {
        render(
            <ProspeccaoCard
                loading={false}
                data={{
                    ativo: true, numero: "5511936247836", enviados_hoje: 0, seguimentos: 0,
                    lote: { code: "PQ7", status: "pendente", total: 3, created_at: "2026-11-04T12:00:00Z" },
                    itens: [{ ...base, reply_kind: "interesse" }],
                }}
            />,
        );
        expect(screen.getByText(/\(11\) 93624-7836/)).toBeTruthy();
        expect(screen.getByText(/3 integradoras esperando sua aprovação: PQ7 1/)).toBeTruthy();
        expect(screen.getByText(/1 integradora esperando você/)).toBeTruthy();
        expect(screen.getByText(/marcar a chamada/)).toBeTruthy();
    });
});
