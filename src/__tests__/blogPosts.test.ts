import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    BLOG_CATEGORIES,
    BLOG_POSTS,
    SEO_DESCRIPTION_MAX,
    SEO_TITLE_MAX,
    headingId,
    readMinutes,
    relatedPosts,
} from "@/data/landing/blogPosts";

// O blog lê um JSON só (React e prerender). Estes testes travam o que quebraria
// em silêncio: capa sem tipo, arquivo de download que não existe, h2 repetido
// (o sumário usa o texto como âncora) e o estilo da casa (sem travessão).
const PUBLIC = path.resolve(__dirname, "../../public");
const KINDS = ["conversa", "aviso", "proposta", "lista", "prompt", "comparativo"];
const PLATES = ["sol", "noite", "creme", "azul"];

describe("posts do blog", () => {
    it("têm slug único, categoria conhecida e capa válida", () => {
        const slugs = new Set<string>();
        for (const p of BLOG_POSTS) {
            expect(slugs.has(p.slug), p.slug).toBe(false);
            slugs.add(p.slug);
            expect(BLOG_CATEGORIES).toContain(p.category);
            expect(KINDS, p.slug).toContain(p.cover?.kind);
            expect(PLATES, p.slug).toContain(p.cover?.plate);
            expect(readMinutes(p)).toBeGreaterThanOrEqual(2);
        }
    });

    it("apontam só para arquivos que existem em public/", () => {
        for (const p of BLOG_POSTS) {
            const hrefs = [...(p.downloads ?? []).map((d) => d.href)];
            for (const b of p.content) {
                if (b.type === "modelos") for (const m of b.items) hrefs.push(m.previa, ...m.arquivos.map((a) => a.href));
            }
            hrefs.push(`/blog-covers/${p.slug}.jpg`);
            for (const h of hrefs) expect(existsSync(path.join(PUBLIC, h)), `${p.slug}: ${h}`).toBe(true);
        }
    });

    it("não repetem a âncora de um h2 no mesmo post", () => {
        for (const p of BLOG_POSTS) {
            const ids = p.content.filter((b) => b.type === "h2").map((b) => headingId((b as { text: string }).text));
            expect(new Set(ids).size, p.slug).toBe(ids.length);
        }
    });

    it("têm título de busca que cabe no Google e descrição curta quando definida", () => {
        for (const p of BLOG_POSTS) {
            expect(p.seoTitle, `${p.slug}: falta seoTitle`).toBeTruthy();
            expect([...(p.seoTitle ?? "")].length, `${p.slug}: seoTitle`).toBeLessThanOrEqual(SEO_TITLE_MAX);
            if (p.seoDescription) expect([...p.seoDescription].length, `${p.slug}: seoDescription`).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
        }
    });

    it("estão todos no sitemap.xml", () => {
        const sitemap = readFileSync(path.join(PUBLIC, "sitemap.xml"), "utf8");
        for (const p of BLOG_POSTS) expect(sitemap, p.slug).toContain(`<loc>https://vyzon.com.br/blog/${p.slug}</loc>`);
    });

    it("recebem link de pelo menos 2 outros posts no Leia também", () => {
        const entradas = new Map(BLOG_POSTS.map((p) => [p.slug, 0]));
        for (const p of BLOG_POSTS) {
            const leia = relatedPosts(p);
            expect(leia.map((r) => r.slug), p.slug).not.toContain(p.slug);
            for (const r of leia) entradas.set(r.slug, (entradas.get(r.slug) ?? 0) + 1);
        }
        for (const [slug, n] of entradas) expect(n, slug).toBeGreaterThanOrEqual(2);
    });

    it("não usam travessão", () => {
        const texto = JSON.stringify(BLOG_POSTS);
        expect(texto).not.toMatch(/[—–]/);
    });
});
