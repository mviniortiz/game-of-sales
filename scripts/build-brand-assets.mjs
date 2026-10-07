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
    '<link href="https://fonts.googleapis.com/css2?family=Geist:wght@500;600&family=Newsreader:ital,wght@0,400;1,400&display=block" rel="stylesheet">';
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

// Imagem de compartilhamento: a mesma promessa da home solar (SolarLanding.tsx).
await shot(
    "og-image.jpg",
    1200,
    630,
    `<div style="box-sizing:border-box;width:1200px;height:630px;padding:72px 80px;display:flex;justify-content:space-between;align-items:stretch;background:${PAPER};color:${INK};font-family:Geist">
      <div style="display:flex;flex-direction:column;justify-content:space-between;max-width:680px">
        ${lockup(46)}
        <div>
          <div style="font-family:Newsreader;font-size:78px;line-height:1.02;letter-spacing:-0.03em">Mandou a proposta e o cliente <i>sumiu?</i></div>
          <div style="margin-top:26px;font-size:28px;line-height:1.35;color:rgba(13,20,33,0.7);font-weight:500">O Vyzon mostra quais propostas de energia solar pararam no seu WhatsApp e entrega a retomada pronta.</div>
        </div>
        <div style="font-size:24px;font-weight:600;color:rgba(13,20,33,0.55)">Raio-X grátis em vyzon.com.br</div>
      </div>
      <div style="display:flex;align-items:center">
        <div style="filter:drop-shadow(0 30px 50px rgba(13,20,33,0.22)) drop-shadow(0 4px 10px rgba(13,20,33,0.12))">${sized(icon, 300)}</div>
      </div>
    </div>`,
    { transparent: false, type: "jpeg" },
);

await browser.close();
