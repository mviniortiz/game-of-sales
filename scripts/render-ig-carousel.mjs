#!/usr/bin/env node
// Renderiza os 8 slides do carrossel Instagram como PNG em out/ig-carousel/
// Uso: node scripts/render-ig-carousel.mjs
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve("out/ig-carousel");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const slides = [
    "IG-Slide-01-Hook",
    "IG-Slide-02-Reveal",
    "IG-Slide-03-Cost",
    "IG-Slide-04-Diagnosis",
    "IG-Slide-05-Reveal",
    "IG-Slide-06-Pulse",
    "IG-Slide-07-PipelineEva",
    "IG-Slide-08-CTA",
];

console.log(`[ig-carousel] rendering ${slides.length} slides → ${OUT_DIR}\n`);

for (const id of slides) {
    const num = id.match(/Slide-(\d+)/)[1];
    const out = resolve(OUT_DIR, `${num}.png`);
    console.log(`→ ${id}`);
    execSync(`npx remotion still ${id} "${out}" --image-format=png`, {
        stdio: "inherit",
    });
}

console.log(`\n✓ done — 8 PNGs em ${OUT_DIR}`);
console.log(`  Sobe na ordem: 01.png → 08.png`);
