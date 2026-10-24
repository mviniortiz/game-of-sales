#!/usr/bin/env node
// Folha de quadros do filme renderizado: um quadro a cada --cada s (padrão 1,5)
// mais os tempos de --extra (transições), com o tempo escrito em cada quadro.
// Uso: node scripts/folha.mjs <video.mp4> <saida.jpg> [--cada 1.5] [--extra 6.8,7.0] [--colunas 6]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { probeDuration, tmp } from "./lib/audio.mjs";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const [video, saida, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const cada = Number(opt("--cada", 1.5)), cols = Number(opt("--colunas", 6));
const extra = String(opt("--extra", "")).split(",").filter(Boolean).map(Number);
const dur = probeDuration(video);
const ts = [...new Set([...Array.from({ length: Math.floor(dur / cada) + 1 }, (_, i) => +(i * cada).toFixed(2)), ...extra])].filter((t) => t < dur - 0.02).sort((a, b) => a - b);
const W = 300, H = 534, d = tmp();
const tiles = ts.map((t, i) => {
    const f = join(d, `f${i}.png`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", `scale=${W}:${H}`, f]);
    return { f, t };
});
const rows = Math.ceil(tiles.length / cols), lab = 34;
const comp = await Promise.all(tiles.map(async ({ f, t }, i) => {
    const svg = Buffer.from(`<svg width="${W}" height="${lab}"><rect width="100%" height="100%" fill="#0d1421"/><text x="10" y="24" font-family="Menlo" font-size="20" fill="#fff">${t.toFixed(2)} s</text></svg>`);
    const x = (i % cols) * (W + 8), y = Math.floor(i / cols) * (H + lab + 8);
    return [{ input: svg, left: x, top: y }, { input: readFileSync(f), left: x, top: y + lab }];
}));
await sharp({ create: { width: cols * (W + 8), height: rows * (H + lab + 8), channels: 3, background: "#222" } })
    .composite(comp.flat()).jpeg({ quality: 82 }).toFile(saida);
console.log(`${tiles.length} quadros → ${saida}`);
