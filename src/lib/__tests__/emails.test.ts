// O layout único dos e-mails mora em supabase/functions/_shared/email/ (as edges
// usam direto); o teste fica aqui para rodar no `npm test`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as m from "../../../supabase/functions/_shared/email/mensagens";
import type { EmailPronto } from "../../../supabase/functions/_shared/email/layout";

const raiz = join(__dirname, "..", "..", "..");

const todos: Array<[string, EmailPronto]> = [
    ...Object.entries(m.TEMPLATES_AUTH).map(([nome, gerar]) => [nome, gerar()] as [string, EmailPronto]),
    ["boas-vindas", m.boasVindasVendedor({ nome: "Rafael Lima", email: "r@x.com", senha: "abc123", empresa: "Solar Sul", appUrl: "https://vyzon.com.br" })],
    ["boas-vindas sem empresa", m.boasVindasVendedor({ nome: "Rafael", email: "r@x.com", senha: "abc123", empresa: "Vyzon", appUrl: "https://vyzon.com.br" })],
    ["demo", m.demoMarcada({ assunto: "Oi", corpo: "Oi Carla!\n\nTudo certo.", quando: "Quinta, 6 de novembro às 14:00", linkMeet: "https://meet.google.com/x", quemAssina: "Markus" })],
    ["suporte", m.respostaSuporte({ assunto: "Re: ajuda", texto: "Oi.\n\nResolvido." })],
    ["cadastro", m.avisoNovoCadastro({ empresa: "Solar Sul", nome: "Carla", email: "c@x.com", whatsapp: "5548", origem: "direto", linkWhatsapp: "https://wa.me/5548" })],
    ["interno", m.avisoInterno({ assunto: "A", titulo: "A", linhas: ["Texto.", "Erro: x"] })],
    ["demo personalizada", m.avisoDemoPersonalizada({ empresa: "Solar Sul", quando: "amanhã", login: "l", senha: "s", appUrl: "https://vyzon.com.br" })],
];

describe("e-mails do Vyzon", () => {
    it.each(todos)("%s: sem travessão, sem emoji, com texto puro e layout de 600px", (_nome, e) => {
        for (const parte of [e.assunto, e.html, e.text]) {
            expect(parte).not.toMatch(/[–—]/);
            expect(parte).not.toMatch(/\p{Extended_Pictographic}/u);
        }
        expect(e.html).toContain('lang="pt-BR"');
        expect(e.html).toContain("max-width:600px");
        expect(e.html).toContain('name="color-scheme"');
        expect(e.text.trim().length).toBeGreaterThan(20);
        expect(e.text).not.toMatch(/<[a-z]/i);
    });

    it("templates de auth no repo batem com o gerador e com os assuntos do config.toml", () => {
        const config = readFileSync(join(raiz, "supabase", "config.toml"), "utf8");
        for (const [arquivo, gerar] of Object.entries(m.TEMPLATES_AUTH)) {
            const e = gerar();
            const noDisco = readFileSync(join(raiz, "supabase", "email-templates", arquivo), "utf8");
            expect(noDisco, `${arquivo} desatualizado: rode node scripts/emails/gerar.mjs`).toBe(e.html);
            const bloco = config.split("[auth.email.template.").find((b) => b.includes(`email-templates/${arquivo}`));
            expect(bloco, `${arquivo} fora do config.toml`).toBeTruthy();
            expect(bloco).toContain(`subject = "${e.assunto}"`);
        }
    });

    it("placeholders do Go passam intactos", () => {
        expect(m.authRecuperarSenha().html).toContain('href="{{ .ConfirmationURL }}"');
        expect(m.authTrocarEmail().html).toContain("{{ .NewEmail }}");
        expect(m.authReautenticar().html).toContain("{{ .Token }}");
    });

    it("escapa o que vem de fora", () => {
        const e = m.respostaSuporte({ assunto: "Re: <b>", texto: "<script>alert(1)</script>" });
        expect(e.html).not.toContain("<script>");
        expect(e.html).toContain("&lt;script&gt;");
    });

    it("aviso interno: link vira botão e o rótulo antes dele some", () => {
        const e = m.avisoInterno({
            assunto: "Novo pedido de Raio-X: Carla",
            titulo: "Novo pedido de Raio-X",
            linhas: ["Novo pedido de Raio-X", "", "Carla, Solar Sul", "WhatsApp: +5548", "E-mail: c@x.com", "", "Chamar agora:", "https://wa.me/5548?text=Oi"],
        });
        expect(e.html).toContain(">Chamar no WhatsApp</a>");
        expect(e.html).not.toContain("Chamar agora:");
        expect(e.html.match(/Novo pedido de Raio-X<\/h1>/g)).toHaveLength(1);
        expect(e.text).toContain("WhatsApp: +5548");
        expect(e.html).toMatch(/>E-mail<\/td>/);
    });
});
