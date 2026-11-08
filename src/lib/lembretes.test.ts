import { describe, expect, it } from "vitest";
import { amanhaNove, grupoDo, quandoTexto } from "./lembretes";

const agora = new Date(2026, 10, 7, 15, 0); // sáb 07/11/2026 15:00
const em = (d: number, h: number, m = 0) => new Date(2026, 10, 7 + d, h, m).toISOString();

describe("lembretes", () => {
    it("agrupa em atrasado, hoje e próximo", () => {
        expect(grupoDo(em(0, 14), agora)).toBe("atrasado");
        expect(grupoDo(em(0, 18), agora)).toBe("hoje");
        expect(grupoDo(em(1, 9), agora)).toBe("proximo");
    });
    it("escreve o horário como gente", () => {
        expect(quandoTexto(em(0, 14, 30), agora)).toBe("há 30 min");
        expect(quandoTexto(em(-1, 15), agora)).toBe("ontem");
        expect(quandoTexto(em(-3, 15), agora)).toBe("há 3 dias");
        expect(quandoTexto(em(0, 18), agora)).toBe("às 18:00");
        expect(quandoTexto(em(1, 9), agora)).toBe("amanhã 09:00");
        expect(quandoTexto(em(3, 10), agora)).toBe("ter 10:00");
        expect(quandoTexto(em(10, 10), agora)).toBe("17/11");
    });
    it("adia pra amanhã às 9h", () => {
        const d = amanhaNove(agora);
        expect([d.getDate(), d.getHours()]).toEqual([8, 9]);
    });
});
