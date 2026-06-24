import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

// uso: node scripts/press-shot.mjs <html> <png> <width> <height>
const [, , htmlArg, pngArg, wArg, hArg] = process.argv;
const htmlPath = path.resolve(htmlArg ?? "scripts/press-eva.html");
const out = path.resolve(pngArg ?? "scripts/press-eva.png");
const width = Number(wArg ?? 1440);
const height = Number(hArg ?? 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
await page.waitForTimeout(800); // deixa as fontes assentarem
await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
await browser.close();
console.log("OK:", out);
