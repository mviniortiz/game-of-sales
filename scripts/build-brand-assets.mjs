import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// SRC_DIR é o diretório original com os PNGs da marca usado pelo dev (Windows).
// Quando indisponível (CI, Linux, ambientes secundários), usa fallback nos
// assets já versionados em /public — assim o OG segue regenerável em qualquer lugar.
const SRC_DIR_PRIMARY = "C:\\Users\\vinao\\Desktop\\marca-vyzon";
const PUBLIC_DIR = path.resolve("public");
const OUT_DIR = PUBLIC_DIR;

const HAS_PRIMARY_SRC = existsSync(SRC_DIR_PRIMARY);
const ICON_SRC = HAS_PRIMARY_SRC
    ? path.join(SRC_DIR_PRIMARY, "versao-1-favicon.png")
    : path.join(PUBLIC_DIR, "logo.png");

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
    // OG image 1200x630 — direção visual aprovada (wave 4):
    //
    // ┌──────────────────────────────────────────────────────────────┐
    // │ [V logo 3D]    O CRM que seu               ┌──────────────┐  │
    // │                time comercial (emerald)    │ Ranking ao..  │ │
    // │  Vyzon         realmente usa               └──────────────┘  │
    // │                                            ┌──────────────┐  │
    // │                IA para orientar...         │ Meta 128%    │  │
    // │                                            └──────────────┘  │
    // │                                            ┌──────────────┐  │
    // │                                            │ Pipeline...  │  │
    // │                                            └──────────────┘  │
    // └──────────────────────────────────────────────────────────────┘
    //
    // Posicionamento da IA: camada de inteligência comercial que ORIENTA
    // vendedor + CLAREIA gestão. Não como ferramenta autônoma "que cuida
    // do resto". Não trocar a copy por formulações que sugiram autonomia
    // ou magia da IA.
    //
    // Logo real da Vyzon (V 3D): /public/logo.png (1024x1024 RGBA).
    // Renderizado em 280px à esquerda, com wordmark "Vyzon" abaixo.

    const logoSrc = await readFile(path.join(PUBLIC_DIR, "logo.png"));
    const logo = await sharp(logoSrc)
        .resize(280, 280, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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

    // Background: grid sutil + glow emerald esquerda + glow azul direita.
    const background = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <defs>
             <radialGradient id="emeraldGlow" cx="18%" cy="42%" r="60%">
               <stop offset="0%" stop-color="#00E37A" stop-opacity="0.20"/>
               <stop offset="50%" stop-color="#00E37A" stop-opacity="0.06"/>
               <stop offset="100%" stop-color="#00E37A" stop-opacity="0"/>
             </radialGradient>
             <radialGradient id="blueGlow" cx="92%" cy="60%" r="55%">
               <stop offset="0%" stop-color="#1556C0" stop-opacity="0.22"/>
               <stop offset="55%" stop-color="#1556C0" stop-opacity="0.06"/>
               <stop offset="100%" stop-color="#1556C0" stop-opacity="0"/>
             </radialGradient>
             <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
               <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
             </pattern>
           </defs>
           <rect width="1200" height="630" fill="url(#grid)"/>
           <rect width="1200" height="630" fill="url(#emeraldGlow)"/>
           <rect width="1200" height="630" fill="url(#blueGlow)"/>
           <rect x="0" y="0" width="1200" height="1" fill="#00E37A" fill-opacity="0.25"/>
         </svg>`
    );

    // Wordmark "Vyzon" abaixo do logo. Sora bold, branco.
    // Posição: logo ocupa 80,90 → 360,370. Wordmark centro-x ~220, baseline y=455.
    const wordmark = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <text x="220" y="455" font-family="Sora, 'DejaVu Sans', Arial, sans-serif"
                 font-size="68" font-weight="700"
                 fill="#ffffff" letter-spacing="-2"
                 text-anchor="middle">Vyzon</text>
         </svg>`
    );

    // Headline 3 linhas + subheadline. Sora 64 bold, "time comercial" em emerald.
    // Coluna central começa em x=420, com bastante respiro.
    const headline = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <text x="420" y="225" font-family="Sora, 'DejaVu Sans', Arial, sans-serif"
                 font-size="60" font-weight="700"
                 fill="#ffffff" letter-spacing="-2">O CRM que seu</text>
           <text x="420" y="298" font-family="Sora, 'DejaVu Sans', Arial, sans-serif"
                 font-size="60" font-weight="700"
                 fill="#00E37A" letter-spacing="-2">time comercial</text>
           <text x="420" y="371" font-family="Sora, 'DejaVu Sans', Arial, sans-serif"
                 font-size="60" font-weight="700"
                 fill="#ffffff" letter-spacing="-2">realmente usa</text>

           <text x="420" y="438" font-family="Inter, 'DejaVu Sans', Arial, sans-serif"
                 font-size="22" font-weight="500"
                 fill="#ffffff" fill-opacity="0.62" letter-spacing="0.1">IA para orientar vendedores</text>
           <text x="420" y="470" font-family="Inter, 'DejaVu Sans', Arial, sans-serif"
                 font-size="22" font-weight="500"
                 fill="#ffffff" fill-opacity="0.62" letter-spacing="0.1">e dar mais clareza ao gestor.</text>
         </svg>`
    );

    // 3 cards à direita, empilhados verticalmente.
    // Coluna direita: x=900–1170 (270 wide). Altura útil 80–600 (520).
    // Cada card: 150 high. Gap 30. → 3*150+2*30 = 510. ✓
    //
    // Notas de claim:
    // - "Meta 128%" é mockup de dashboard (representação visual), não promessa
    //   de resultado da Vyzon. Igual aos cards do hero do site.
    const cards = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
           <defs>
             <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06"/>
               <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
             </linearGradient>
           </defs>

           <!-- Card 1: Ranking ao vivo -->
           <g transform="translate(900, 80)">
             <rect width="270" height="150" rx="18"
                   fill="url(#cardBg)"
                   stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
             <!-- icon group (people) -->
             <g transform="translate(24, 30)" stroke="#00E37A" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="9" cy="8" r="4"/>
               <path d="M1 22 a8 8 0 0 1 16 0"/>
               <circle cx="22" cy="9" r="3"/>
               <path d="M16 22 a6 6 0 0 1 12 0"/>
             </g>
             <text x="68" y="48" font-family="Inter, 'DejaVu Sans', Arial, sans-serif"
                   font-size="22" font-weight="600" fill="#ffffff" fill-opacity="0.95">Ranking ao vivo</text>
             <!-- mini progress bars -->
             <g transform="translate(24, 96)">
               <rect width="44" height="6" rx="3" fill="#00E37A"/>
               <rect x="52" width="44" height="6" rx="3" fill="#00E37A" fill-opacity="0.6"/>
               <rect x="104" width="44" height="6" rx="3" fill="#ffffff" fill-opacity="0.18"/>
               <rect x="156" width="44" height="6" rx="3" fill="#ffffff" fill-opacity="0.10"/>
               <rect x="208" width="38" height="6" rx="3" fill="#ffffff" fill-opacity="0.06"/>
             </g>
           </g>

           <!-- Card 2: Meta 128% -->
           <g transform="translate(900, 240)">
             <rect width="270" height="150" rx="18"
                   fill="url(#cardBg)"
                   stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
             <!-- target icon -->
             <g transform="translate(24, 30)" stroke="#1556C0" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="14" cy="14" r="13"/>
               <circle cx="14" cy="14" r="7"/>
               <circle cx="14" cy="14" r="2" fill="#1556C0"/>
             </g>
             <text x="68" y="42" font-family="Inter, 'DejaVu Sans', Arial, sans-serif"
                   font-size="14" font-weight="600" fill="#ffffff" fill-opacity="0.55"
                   letter-spacing="0.1">Meta</text>
             <text x="68" y="76" font-family="Sora, 'DejaVu Sans', Arial, sans-serif"
                   font-size="34" font-weight="700" fill="#ffffff" letter-spacing="-1">128<tspan font-size="22" fill="#1556C0" font-weight="600">%</tspan></text>
             <!-- mini wave/sparkline -->
             <path d="M 24 130 L 60 122 L 100 116 L 140 110 L 180 100 L 220 88 L 246 80"
                   stroke="#1556C0" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
             <path d="M 24 130 L 60 122 L 100 116 L 140 110 L 180 100 L 220 88 L 246 80 L 246 140 L 24 140 Z"
                   fill="#1556C0" fill-opacity="0.12"/>
           </g>

           <!-- Card 3: Pipeline visual -->
           <g transform="translate(900, 400)">
             <rect width="270" height="150" rx="18"
                   fill="url(#cardBg)"
                   stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
             <!-- funnel icon -->
             <g transform="translate(24, 30)" stroke="#00E37A" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
               <path d="M2 4 H28 L19 16 V26 L11 24 V16 Z"/>
             </g>
             <text x="68" y="48" font-family="Inter, 'DejaVu Sans', Arial, sans-serif"
                   font-size="22" font-weight="600" fill="#ffffff" fill-opacity="0.95">Pipeline visual</text>
             <!-- 3-stage chevrons -->
             <g transform="translate(24, 96)">
               <path d="M0 0 L60 0 L72 14 L60 28 L0 28 L12 14 Z" fill="#00E37A" fill-opacity="0.85"/>
               <path d="M82 0 L142 0 L154 14 L142 28 L82 28 L94 14 Z" fill="#1556C0" fill-opacity="0.70"/>
               <path d="M164 0 L222 0 L234 14 L222 28 L164 28 L176 14 Z" fill="#ffffff" fill-opacity="0.10" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1"/>
             </g>
           </g>
         </svg>`
    );

    const composed = await canvas
        .composite([
            { input: background, top: 0, left: 0 },
            { input: logo, top: 90, left: 80 },
            { input: wordmark, top: 0, left: 0 },
            { input: headline, top: 0, left: 0 },
            { input: cards, top: 0, left: 0 },
        ])
        .jpeg({ quality: 90, progressive: true, mozjpeg: true })
        .toBuffer();

    await writeFile(path.join(OUT_DIR, "og-image.jpg"), composed);
    console.log("✓ og-image.jpg (1200x630)");

    await writeFile(path.join(OUT_DIR, "og-image.png"), await sharp(composed).png({ quality: 92, compressionLevel: 9 }).toBuffer());
    console.log("✓ og-image.png (fallback)");
}

console.log("Building brand assets...\n");
if (HAS_PRIMARY_SRC) {
    await buildFavicons();
} else {
    console.log("ℹ skipping favicons (assets-fonte do dev em " + SRC_DIR_PRIMARY + " indisponíveis)\n");
}
await buildOgImage();
console.log("\nDone.");
