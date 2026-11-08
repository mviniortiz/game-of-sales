import { describe, expect, it } from "vitest";
import { buscarClientes, trechoAchado, type ClienteBusca } from "./buscaClientes";

const c = (id: string, nome: string, tel: string | null, upd: string, title: string | null = null): ClienteBusca => ({
    id, customer_name: nome, title, customer_phone: tel, value: null, updated_at: upd,
});
const LISTA = [
    c("1", "João Pereira", "5548999110022", "2026-11-01"),
    c("2", "Maria Joana Souza", "5548988776655", "2026-11-05"),
    c("3", "Padaria São José", null, "2026-11-06", "Usina 12 kWp"),
    c("4", "Ana", "5511912345678", "2026-10-01"),
];

describe("buscarClientes", () => {
    it("sem termo, mostra os recentes", () => {
        expect(buscarClientes(LISTA, "").map((x) => x.id)).toEqual(["3", "2", "1", "4"]);
    });
    it("ignora acento e prioriza começo do nome", () => {
        expect(buscarClientes(LISTA, "joao").map((x) => x.id)).toEqual(["1"]);
        expect(buscarClientes(LISTA, "jo").map((x) => x.id)).toEqual(["1", "3", "2"]); // empate: o mais recente antes
    });
    it("acha pelo telefone e pelo nome do negócio", () => {
        expect(buscarClientes(LISTA, "9887").map((x) => x.id)).toEqual(["2"]);
        expect(buscarClientes(LISTA, "usina").map((x) => x.id)).toEqual(["3"]);
    });
    it("marca o trecho no nome com acento", () => {
        expect(trechoAchado("João Pereira", "joao")).toEqual([0, 4]);
        expect(trechoAchado("Padaria São José", "sao")).toEqual([8, 11]);
    });
});
