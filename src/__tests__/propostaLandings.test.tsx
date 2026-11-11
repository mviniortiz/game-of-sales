import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CanonicalManager } from "@/components/CanonicalManager";
import { getBlogPost } from "@/data/landing/blogPosts";
import { PROPOSTA_LANDINGS, PROPOSTA_POST, outrosFormatos } from "@/data/landing/propostaLandings";
import { montarPropostaPdf, nomeDoArquivo, parseNumeroBR, textoDaProposta } from "@/lib/proposta/propostaPdf";

// As 3 landings de proposta leem um JSON só (React e prerender). Estes testes
// travam o que quebraria em silêncio: título que o Google corta, arquivo de
// download que não existe, página fora do sitemap ou sem link das outras.
const PUBLIC = path.resolve(__dirname, "../../public");
const ROOT = path.resolve(__dirname, "../..");

describe("landings de proposta", () => {
    it("têm título até 60, descrição até 155, H1 único e FAQ de 3 a 4 perguntas", () => {
        expect(PROPOSTA_LANDINGS).toHaveLength(3);
        for (const l of PROPOSTA_LANDINGS) {
            expect([...l.seoTitle].length, `${l.slug}: seoTitle`).toBeLessThanOrEqual(60);
            expect([...l.seoDescription].length, `${l.slug}: seoDescription`).toBeLessThanOrEqual(155);
            expect(l.faq.length, `${l.slug}: faq`).toBeGreaterThanOrEqual(3);
            expect(l.faq.length, `${l.slug}: faq`).toBeLessThanOrEqual(4);
        }
        for (const campo of ["slug", "seoTitle", "seoDescription", "h1"] as const) {
            expect(new Set(PROPOSTA_LANDINGS.map((l) => l[campo])).size, campo).toBe(PROPOSTA_LANDINGS.length);
        }
    });

    it("apontam só para arquivos que existem em public/", () => {
        for (const l of PROPOSTA_LANDINGS) {
            const hrefs = [...(l.arquivos ?? []).map((a) => a.href), ...(l.previa ? [l.previa.src] : [])];
            for (const h of hrefs) expect(existsSync(path.join(PUBLIC, h)), `${l.slug}: ${h}`).toBe(true);
        }
    });

    it("ligam umas nas outras e no post, e o post liga de volta", () => {
        const todas = PROPOSTA_LANDINGS.map((l) => `/${l.slug}`);
        for (const l of PROPOSTA_LANDINGS) {
            const destinos = outrosFormatos(l.slug).map((o) => o.href);
            expect(destinos.sort()).toEqual([...todas.filter((h) => h !== `/${l.slug}`), PROPOSTA_POST.href].sort());
            if (l.atalho) expect(todas, `${l.slug}: atalho`).toContain(l.atalho.href);
        }
        const post = getBlogPost(PROPOSTA_POST.href.replace("/blog/", ""));
        expect(post, "post de modelos").toBeTruthy();
        const atalhos = post!.content.flatMap((b) => (b.type === "atalhos" ? b.items.map((i) => i.href) : []));
        expect(atalhos.sort()).toEqual([...todas].sort());
    });

    it("estão no sitemap, na lista de canonical próprio e nas rotas", () => {
        const sitemap = readFileSync(path.join(PUBLIC, "sitemap.xml"), "utf8");
        const canonical = readFileSync(path.join(ROOT, "src/components/CanonicalManager.tsx"), "utf8");
        const rotas = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
        for (const l of PROPOSTA_LANDINGS) {
            expect(sitemap, l.slug).toContain(`<loc>https://vyzon.com.br/${l.slug}</loc>`);
            expect(canonical, l.slug).toContain(`"/${l.slug}"`);
            expect(rotas, l.slug).toContain(`path="/${l.slug}"`);
        }
    });

    it("mantêm o canonical próprio depois que o app carrega, com ou sem barra no fim", () => {
        const link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
        for (const l of PROPOSTA_LANDINGS) {
            for (const caminho of [`/${l.slug}`, `/${l.slug}/`]) {
                link.href = "https://vyzon.com.br/";
                const { unmount } = render(
                    <MemoryRouter initialEntries={[caminho]}>
                        <CanonicalManager />
                    </MemoryRouter>,
                );
                expect(link.href, caminho).toBe(`https://vyzon.com.br/${l.slug}`);
                unmount();
            }
        }
        link.remove();
    });

    it("recebem link da home e do índice do blog, e o post de modelos não disputa a busca do Word", () => {
        const home = readFileSync(path.join(ROOT, "index.html"), "utf8");
        const rodape = readFileSync(path.join(ROOT, "src/pages/SolarLanding.tsx"), "utf8");
        const blog = readFileSync(path.join(ROOT, "src/pages/BlogV2.tsx"), "utf8");
        expect(rodape).toContain("PROPOSTA_LANDINGS.map");
        expect(blog).toContain("PROPOSTA_LANDINGS.map");
        for (const l of PROPOSTA_LANDINGS) {
            expect(l.rodape.length).toBeGreaterThan(0);
            // A versão sem JavaScript da home é escrita à mão no index.html.
            expect(home).toContain(`href="/${l.slug}"`);
            expect(home).toContain(`>${l.rodape}</a>`);
        }
        const post = getBlogPost(PROPOSTA_POST.href.replace("/blog/", ""));
        expect(post!.seoTitle).not.toMatch(/word|excel|planilha|gerador/i);
    });

    it("não usam travessão", () => {
        expect(JSON.stringify([PROPOSTA_LANDINGS, PROPOSTA_POST])).not.toMatch(/[—–]/);
    });
});

describe("gerador de proposta", () => {
    it("lê número digitado do jeito brasileiro", () => {
        expect(parseNumeroBR("24.900,50")).toBe(24900.5);
        expect(parseNumeroBR("24.900")).toBe(24900);
        expect(parseNumeroBR("1.250.000")).toBe(1250000);
        expect(parseNumeroBR("R$ 24900")).toBe(24900);
        expect(parseNumeroBR("6,2")).toBe(6.2);
        expect(parseNumeroBR("6.2")).toBe(6.2);
        expect(parseNumeroBR("650 kWh")).toBe(650);
        expect(parseNumeroBR("")).toBeNaN();
        expect(parseNumeroBR("abc")).toBeNaN();
    });

    const dados = {
        cliente: "João Antônio",
        consumoKwh: 650,
        potenciaKwp: 5.5,
        valor: 24900,
        pagamento: "À vista no Pix.",
        validadeDias: 10,
        data: new Date(2026, 10, 11),
    };

    it("escreve só o que foi informado, no formato brasileiro", () => {
        const t = textoDaProposta(dados);
        expect(t.titulo).toBe("Sistema de energia solar para João Antônio");
        expect(t.consumo).toBe("650 kWh");
        expect(t.potencia).toBe("5,5 kWp");
        expect(t.valor.replace(/\s/g, " ")).toBe("R$ 24.900,00");
        expect(t.data).toBe("11/11/2026");
        expect(t.validade).toBe("21/11/2026");
        expect(textoDaProposta({ ...dados, validadeDias: undefined }).validade).toBe("");
        expect(nomeDoArquivo("João Antônio")).toBe("proposta-energia-solar-joao-antonio.pdf");
        expect(nomeDoArquivo("  ")).toBe("proposta-energia-solar.pdf");
    });

    it("monta um PDF de uma página e quebra página com texto longo", () => {
        const curto = montarPropostaPdf(jsPDF, dados);
        expect(curto.getNumberOfPages()).toBe(1);
        expect(new TextDecoder("latin1").decode(curto.output("arraybuffer")).startsWith("%PDF-")).toBe(true);
        const longo = montarPropostaPdf(jsPDF, { ...dados, cliente: "Mercado “Bom Preço” 😀", pagamento: Array.from({ length: 80 }, (_, i) => `Linha ${i}`).join("\n") });
        expect(longo.getNumberOfPages()).toBeGreaterThan(1);
    });
});
