import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_CATEGORIES, BLOG_POSTS, headingId, readMinutes } from "@/data/landing/blogPosts";

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

    it("não usam travessão", () => {
        const texto = JSON.stringify(BLOG_POSTS);
        expect(texto).not.toMatch(/[—–]/);
    });
});
