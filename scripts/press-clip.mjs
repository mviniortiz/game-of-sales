import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

// uso: node scripts/press-clip.mjs <html> <out.webm> <width> <height> <durationMs> [clean]
const [, , htmlArg, outArg, wArg, hArg, durArg, cleanArg] = process.argv;
const htmlPath = path.resolve(htmlArg);
const out = path.resolve(outArg);
const width = Number(wArg ?? 1440);
const height = Number(hArg ?? 900);
const dur = Number(durArg ?? 12000);
const query = cleanArg ? (cleanArg === "clean" ? "?clean=1" : cleanArg) : "";
const dir = path.dirname(out);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width, height },
  recordVideo: { dir, size: { width, height } },
});
const page = await context.newPage();
const url = pathToFileURL(htmlPath).href + query;
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(dur);
const video = page.video();
await context.close(); // finaliza a gravação
await browser.close();
const tmp = await video.path();
fs.copyFileSync(tmp, out);
fs.rmSync(tmp, { force: true });
console.log("OK:", out);
