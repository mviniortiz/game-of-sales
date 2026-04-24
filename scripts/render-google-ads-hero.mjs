#!/usr/bin/env node
// Renderiza as variantes Founder Hero em 3 aspect ratios pro Google Ads PMax
// Uso: node scripts/render-google-ads-hero.mjs
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve("out/google-ads");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// 4 variantes que o Markus aprovou (sem Duotone)
const variants = ["Green", "Blue", "Block", "Violet"];
const aspects = ["4x5", "1x1", "191x1"];

console.log(`[google-ads] rendering ${variants.length * aspects.length} stills → ${OUT_DIR}\n`);

for (const v of variants) {
    for (const a of aspects) {
        const id = `IG-FounderHero-${v}-${a}`;
        const out = resolve(OUT_DIR, `hero-${v.toLowerCase()}-${a}.png`);
        console.log(`→ ${id}`);
        execSync(`npx remotion still ${id} "${out}" --image-format=png`, {
            stdio: "inherit",
        });
    }
}

console.log(`\n✓ done — ${variants.length * aspects.length} PNGs em ${OUT_DIR}`);
