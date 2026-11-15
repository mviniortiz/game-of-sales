import { describe, expect, it } from "vitest";
import { linkNoEndereco, montarLinkDeAcesso } from "@/lib/linkDeAcesso";

describe("link de acesso", () => {
    it("lê o código e o tipo do endereço", () => {
        expect(linkNoEndereco("?token_hash=abc123&type=invite")).toEqual({ token_hash: "abc123", type: "invite" });
        expect(linkNoEndereco("?token_hash=abc123&type=recovery")).toEqual({ token_hash: "abc123", type: "recovery" });
    });

    it("endereço sem código, sem tipo ou com tipo desconhecido não é link novo", () => {
        expect(linkNoEndereco("")).toBeNull();
        expect(linkNoEndereco("?type=invite")).toBeNull();
        expect(linkNoEndereco("?token_hash=abc123")).toBeNull();
        expect(linkNoEndereco("?token_hash=abc123&type=qualquer")).toBeNull();
    });

    it("monta o link que pode ir por WhatsApp e volta a ler igual", () => {
        const url = montarLinkDeAcesso("https://vyzon.com.br/", { token_hash: "a+b/c", type: "magiclink" });
        expect(url).toBe("https://vyzon.com.br/redefinir-senha?token_hash=a%2Bb%2Fc&type=magiclink");
        expect(linkNoEndereco(new URL(url).search)).toEqual({ token_hash: "a+b/c", type: "magiclink" });
    });
});
