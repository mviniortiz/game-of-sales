// Gera as capas do blog a partir de PNGs numeradas (1.png..N.png), mapeadas aos
// posts NA ORDEM de blogPosts.content.json. Para cada post produz:
//   public/blog-covers/<slug>.webp  → capa on-page (otimizada, ~1280w)
//   public/blog-covers/<slug>.jpg   → OG image 1200x630 (compat. social máxima)
//
// Uso:  node scripts/gen-blog-covers.mjs --src "C:/caminho/das/pngs"
// (1.png vira a 1ª capa, 2.png a 2ª, etc. — mesma ordem dos posts.)
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const srcIdx = process.argv.indexOf("--src");
const SRC = srcIdx !== -1 ? process.argv[srcIdx + 1] : path.join(ROOT, "blog-covers-src");
const OUT = path.join(ROOT, "public", "blog-covers");

const posts = JSON.parse(
    await readFile(path.join(ROOT, "src/data/landing/blogPosts.content.json"), "utf8")
);
await mkdir(OUT, { recursive: true });

for (let i = 0; i < posts.length; i++) {
    const slug = posts[i].slug;
    const src = path.join(SRC, `${i + 1}.png`);
    if (!existsSync(src)) {
        console.warn(`! ${src} não existe — pulando ${slug}`);
        continue;
    }
    await sharp(src)
        .resize(1280, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(OUT, `${slug}.webp`));
    await sharp(src)
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(OUT, `${slug}.jpg`));
    console.log(`✓ ${slug}  (webp + og jpg)`);
}
console.log("Done.");
