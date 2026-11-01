// Gera os PNGs da marca a partir dos SVGs-mestre em public/brand/.
//   node scripts/build-brand-assets.mjs
// Usa o Chromium do Playwright (não o sharp) porque a assinatura e a imagem de
// compartilhamento levam texto em Geist, e só um navegador carrega a fonte.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC = path.resolve("public");
const read = (f) => readFile(path.join(PUBLIC, "brand", f), "utf8");

const icon = await read("vyzon-icon.svg");
const mark = await read("vyzon-mark.svg");
// iOS arredonda o apple-touch-icon sozinho: o fundo precisa ir até a borda.
const iconFullBleed = icon.replace(/<rect width="100" height="100" rx="22.5"/g, '<rect width="100" height="100" rx="0"');

const FONTS =
    '<link href="https://fonts.googleapis.com/css2?family=Geist:wght@500;600&family=Gabarito:wght@500;700;900&family=Newsreader:ital,wght@0,400;1,400&display=block" rel="stylesheet">';
const PAPER = "#faf9f5";
const INK = "#0d1421";

/** Assinatura: mesmas medidas do ThemeLogo (viewBox 0 0 251 69). */
function lockup(heightPx, color = INK) {
    const inner = mark.replace(/<svg[^>]*>/, "").replace("</svg>", "").replace('fill="#0d1421"', `fill="${color}"`);
    const widthPx = Math.round((heightPx * 251) / 69);
    return `<svg viewBox="0 0 251 69" width="${widthPx}" height="${heightPx}" style="display:block;overflow:visible">
      <g transform="translate(-16 -14.5)">${inner}</g>
      <text x="82" y="51.5" fill="${color}" font-family="Geist" font-weight="600" font-size="64" letter-spacing="-3.2">vyzon</text>
    </svg>`;
}

const sized = (svg, px) => svg.replace(/width="\d+" height="\d+"/, `width="${px}" height="${px}"`);

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(file, w, h, body, { transparent = true, type = "png" } = {}) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<!doctype html><html><head>${FONTS}<style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? "transparent" : PAPER}}</style></head><body>${body}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
        path: path.join(PUBLIC, file),
        omitBackground: transparent,
        type,
        ...(type === "jpeg" ? { quality: 90 } : {}),
    });
    console.log(`✓ ${file} (${w}x${h})`);
}

await shot("favicon-32.png", 32, 32, sized(icon, 32));
await shot("icon-192.png", 192, 192, sized(icon, 192));
await shot("icon-512.png", 512, 512, sized(icon, 512));
await shot("apple-touch-icon.png", 180, 180, sized(iconFullBleed, 180));
// E-mails (templates do Supabase e sdr-auto-outreach) mostram a 140px de largura.
await shot("logo.png", 560, 154, lockup(154));

// A EVA na pose padrão, com as medidas de src/components/eva/evaBot.css.
const eva = (px) => {
    const cel = Array.from({ length: 10 }, (_, i) => `<rect x="${5 + (i % 5) * 24.6}" y="${5 + Math.floor(i / 5) * 19.5}" width="22" height="17" rx="2" fill="#2c62c4"/>`).join("");
    return `<svg viewBox="0 0 240 240" width="${px}" height="${px}" style="display:block">
      <rect x="115" y="46" width="10" height="36" rx="5" fill="#0f1730"/>
      <g transform="translate(54 8) rotate(-7 66 24)"><rect width="132" height="48" rx="8" fill="#0f1730"/>${cel}</g>
      <rect x="14" y="125" width="20" height="50" rx="10" fill="#0f1730"/><rect x="206" y="125" width="20" height="50" rx="10" fill="#0f1730"/>
      <rect x="24" y="76" width="192" height="148" rx="62" fill="#1556c0"/><rect x="44" y="100" width="152" height="96" rx="42" fill="#0f1730"/>
      <rect x="89.5" y="126" width="24" height="44" rx="12" fill="#ffc933"/><rect x="150.5" y="126" width="24" height="44" rx="12" fill="#ffc933"/>
    </svg>`;
};

// Imagem de compartilhamento: a mesma promessa e o mesmo sistema da home solar
// (SolarLanding.tsx, bloco LP.9 do index.css).
await shot(
    "og-image.jpg",
    1200,
    630,
    `<div style="position:relative;box-sizing:border-box;width:1200px;height:630px;padding:64px 72px;overflow:hidden;background:#ffc933;color:#0f1730;font-family:Gabarito">
      ${lockup(46, "#0f1730")}
      <div style="margin-top:52px;max-width:760px;font-size:92px;line-height:1;font-weight:900;letter-spacing:-0.02em">Mandou a proposta e o cliente sumiu?</div>
      <div style="position:absolute;left:72px;bottom:60px;font-size:30px;font-weight:700">Raio-X grátis em vyzon.com.br</div>
      <div style="position:absolute;right:-30px;bottom:-34px">${eva(460)}</div>
    </div>`,
    { transparent: false, type: "jpeg" },
);

await browser.close();
