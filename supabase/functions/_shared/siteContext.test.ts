import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hostPermitido, htmlToText, paginasInternas, REDE_SOCIAL } from "./siteContext.ts";

Deno.test("hostPermitido barra endereço interno e aceita domínio público", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "172.20.1.1", "192.168.0.1", "169.254.169.254", "100.70.0.1", "0.0.0.0", "[::1]", "intranet", "x.local", "api.internal"]) {
        assertEquals(hostPermitido(h), false, h);
    }
    for (const h of ["solarbrasil.com.br", "www.exemplo.com", "8.8.8.8", "172.32.0.1"]) {
        assertEquals(hostPermitido(h), true, h);
    }
});

Deno.test("rede social não é lida", () => {
    assertEquals(REDE_SOCIAL.test("www.instagram.com"), true);
    assertEquals(REDE_SOCIAL.test("solarinstagram.com.br"), false);
});

Deno.test("htmlToText tira script e estilo", () => {
    assertEquals(htmlToText("<style>a{}</style><p>Energia&nbsp;solar</p><script>x()</script> em Campinas"), "Energia solar em Campinas");
});

Deno.test("paginasInternas pega até 2 páginas do mesmo site", () => {
    const html = `<a href="/sobre">Sobre</a><a href="https://outro.com/servicos">x</a><a href="/servicos#a">S</a><a href="/contato">C</a><a href="/">Início</a>`;
    assertEquals(paginasInternas(html, new URL("https://solar.com.br/")), ["https://solar.com.br/sobre", "https://solar.com.br/servicos"]);
});
