// Gera a imagem de compartilhamento (OG, 1200x630) de cada post a partir da capa
// feita em código (src/components/blog/BlogCover.tsx). Abre cada post num
// servidor que já esteja rodando, fotografa a capa no quadro final (movimento
// reduzido mostra o poster) e grava public/blog-covers/<slug>.jpg, que é o
// og:image que o prerender (scripts/prerender-seo.mjs) aponta.
//
// Uso:  npm run dev  (ou vite preview)  e, em outro terminal:
//       node scripts/gen-blog-covers.mjs --url http://localhost:8080 [slug ...]
// Sem slug, gera de todos os posts de blogPosts.content.json.
import { chromium } from "playwright";
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "blog-covers");

const args = process.argv.slice(2);
const urlIdx = args.indexOf("--url");
const BASE = (urlIdx !== -1 ? args[urlIdx + 1] : "http://localhost:8080").replace(/\/$/, "");
const pedidos = args.filter((a, i) => a !== "--url" && args[i - 1] !== "--url");

const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/landing/blogPosts.content.json"), "utf8"));
const alvo = pedidos.length ? posts.filter((p) => pedidos.includes(p.slug)) : posts;
await mkdir(OUT, { recursive: true });

// O Chromium do Playwright, ou o chrome-headless-shell do cache se ele não estiver instalado.
async function abrirNavegador() {
    try {
        return await chromium.launch();
    } catch {
        const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
        for (const d of readdirSync(cache).filter((n) => n.startsWith("chromium_headless_shell")).sort().reverse()) {
            for (const sub of ["chrome-headless-shell-mac-arm64", "chrome-headless-shell-linux64"]) {
                const exe = path.join(cache, d, sub, "chrome-headless-shell");
                if (existsSync(exe)) return chromium.launch({ executablePath: exe });
            }
        }
        throw new Error("Nenhum Chromium encontrado. Rode: npx playwright install chromium");
    }
}

const browser = await abrirNavegador();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
for (const post of alvo) {
    await page.goto(`${BASE}/blog/${post.slug}`, { waitUntil: "networkidle" });
    const capa = page.locator(".vb-post-capa .vbc").first();
    await capa.waitFor({ state: "visible" });
    await page.waitForTimeout(600);
    const png = await capa.screenshot({ type: "png" });
    await sharp(png)
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .jpeg({ quality: 84, mozjpeg: true })
        .toFile(path.join(OUT, `${post.slug}.jpg`));
    console.log(`✓ public/blog-covers/${post.slug}.jpg`);
}
await browser.close();
