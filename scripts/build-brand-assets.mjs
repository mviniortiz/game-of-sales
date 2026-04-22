import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SRC_DIR = "C:\\Users\\vinao\\Desktop\\marca-vyzon";
const OUT_DIR = path.resolve("public");

const ICON_SRC = path.join(SRC_DIR, "versao-1-favicon.png");
const HORIZONTAL_SRC = path.join(SRC_DIR, "versao-horizontal.png");
const STACKED_SRC = path.join(SRC_DIR, "versao-empilhada.png");

const BG = "#0D1421";

if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
}

async function buildFavicons() {
    const src = await readFile(ICON_SRC);

    // 32: browser tab
    await sharp(src).resize(32, 32, { fit: "contain", background: BG }).png({ quality: 95 }).toFile(path.join(OUT_DIR, "favicon-32.png"));
    console.log("✓ favicon-32.png");

    // 180: apple-touch-icon
    await sharp(src).resize(180, 180, { fit: "contain", background: BG }).png({ quality: 95 }).toFile(path.join(OUT_DIR, "apple-touch-icon.png"));
    console.log("✓ apple-touch-icon.png (180x180)");

    // 192 + 512: PWA / manifest + schema.org logo
    await sharp(src).resize(192, 192, { fit: "contain", background: BG }).png({ quality: 95 }).toFile(path.join(OUT_DIR, "icon-192.png"));
    await sharp(src).resize(512, 512, { fit: "contain", background: BG }).png({ quality: 95 }).toFile(path.join(OUT_DIR, "icon-512.png"));
    console.log("✓ icon-192.png, icon-512.png");
}

async function buildOgImage() {
    // Compõe o OG do zero: só o ícone V + tipografia SVG (Sora/Inter).
    // Evita a versao-horizontal.png porque ela tem "CRM DE VENDAS GAMIFICADO"
    // embutido, e a tagline muda independente da marca.
    const iconSrc = await readFile(ICON_SRC);
    const logo = await sharp(iconSrc)
        .resize(150, 150, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    const canvas = sharp({
        create: {
            width: 1200,
            height: 630,
            channels: 3,
            background: BG,
        },
    });

    // Glows radiais: verde top-left + azul bottom-right (paleta da marca).
    const glow = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <defs>
             <radialGradient id="g" cx="15%" cy="12%" r="55%">
               <stop offset="0%" stop-color="#00E37A" stop-opacity="0.22"/>
               <stop offset="55%" stop-color="#00E37A" stop-opacity="0.04"/>
               <stop offset="100%" stop-color="#00E37A" stop-opacity="0"/>
             </radialGradient>
             <radialGradient id="b" cx="88%" cy="92%" r="55%">
               <stop offset="0%" stop-color="#1556C0" stop-opacity="0.22"/>
               <stop offset="100%" stop-color="#1556C0" stop-opacity="0"/>
             </radialGradient>
             <linearGradient id="grid" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stop-color="#ffffff" stop-opacity="0.03"/>
               <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
             </linearGradient>
           </defs>
           <rect width="1200" height="630" fill="url(#g)"/>
           <rect width="1200" height="630" fill="url(#b)"/>
           <rect x="0" y="0" width="1200" height="1" fill="#00E37A" fill-opacity="0.25"/>
         </svg>`
    );

    // Wordmark + tagline + descriptor.
    // Sora como brand font; Arial como fallback se não estiver instalada no sistema.
    const typography = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <text x="260" y="168" font-family="Sora, Arial, sans-serif"
                 font-size="80" font-weight="700"
                 fill="#ffffff" letter-spacing="-2.5">Vyzon</text>

           <rect x="80" y="278" width="64" height="3" rx="1.5" fill="#00E37A"/>

           <text x="80" y="358" font-family="Sora, Arial, sans-serif"
                 font-size="64" font-weight="700"
                 fill="#ffffff" letter-spacing="-2.2">Seu time bate meta.</text>
           <text x="80" y="438" font-family="Sora, Arial, sans-serif"
                 font-size="64" font-weight="700"
                 fill="#ffffff" fill-opacity="0.5" letter-spacing="-2.2">A IA cuida do resto.</text>

           <text x="80" y="528" font-family="Inter, Arial, sans-serif"
                 font-size="22" font-weight="500"
                 fill="#ffffff" fill-opacity="0.45" letter-spacing="0.4">CRM com IA · Pipeline ao vivo · Integra Hotmart, Kiwify, Greenn</text>
         </svg>`
    );

    // URL badge canto inferior direito (com dot verde indicando "live").
    const badge = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <g transform="translate(1070, 560)">
             <rect x="-120" y="-24" width="200" height="48" rx="24"
                   fill="#00E37A" fill-opacity="0.08"
                   stroke="#00E37A" stroke-opacity="0.35" stroke-width="1.2"/>
             <circle cx="-92" cy="0" r="4" fill="#00E37A"/>
             <text x="8" y="7" font-family="Inter, Arial, sans-serif"
                   font-size="18" font-weight="700" fill="#6EE7B7"
                   text-anchor="middle" letter-spacing="0.2">vyzon.com.br</text>
           </g>
         </svg>`
    );

    const composed = await canvas
        .composite([
            { input: glow, top: 0, left: 0 },
            { input: logo, top: 60, left: 80 },
            { input: typography, top: 0, left: 0 },
            { input: badge, top: 0, left: 0 },
        ])
        .jpeg({ quality: 88, progressive: true, mozjpeg: true })
        .toBuffer();

    await writeFile(path.join(OUT_DIR, "og-image.jpg"), composed);
    console.log("✓ og-image.jpg (1200x630)");

    await writeFile(path.join(OUT_DIR, "og-image.png"), await sharp(composed).png({ quality: 92, compressionLevel: 9 }).toBuffer());
    console.log("✓ og-image.png (fallback)");
}

console.log("Building brand assets...\n");
await buildFavicons();
await buildOgImage();
console.log("\nDone.");
