import { describe, expect, it } from "vitest";
import { lerPedido, whatsDigitos } from "../../../supabase/functions/_shared/novaIntegradora";

describe("pedido de nova integradora", () => {
    it("limpa os campos e põe 55 no WhatsApp", () => {
        const r = lerPedido({ empresa: "  Foco   Energia Solar ", email: " Alve@Gmail.com ", nome: "", whats: "(48) 99169-6887", fundadora: true });
        expect(r).toEqual({ ok: true, pedido: { empresa: "Foco Energia Solar", email: "alve@gmail.com", nome: null, whats: "5548991696887", fundadora: true } });
    });

    it("fundadora só com true de verdade", () => {
        const r = lerPedido({ empresa: "Sol Sul", email: "a@b.com", fundadora: "true" });
        expect(r.ok && r.pedido.fundadora).toBe(false);
    });

    it("recusa empresa vazia, e-mail ruim e WhatsApp curto", () => {
        expect(lerPedido({ empresa: " ", email: "a@b.com" })).toEqual({ ok: false, erro: "Informe o nome da empresa." });
        expect(lerPedido({ empresa: "Sol", email: "a@b" })).toEqual({ ok: false, erro: "E-mail inválido." });
        expect(lerPedido({ empresa: "Sol", email: "a@b.com", whats: "9999" })).toEqual({ ok: false, erro: "WhatsApp com DDD, só números." });
        expect(lerPedido(null).ok).toBe(false);
    });

    it("WhatsApp vazio vira null e com 55 fica igual", () => {
        expect(whatsDigitos("")).toBeNull();
        expect(whatsDigitos("+55 48 99169-6887")).toBe("5548991696887");
    });
});
