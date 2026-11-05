#!/usr/bin/env node
// Exporta um carrossel (carrosseis/<slug>/index.html, um slide por segundo da
// composição) em PNG 1080×1350 para ~/Movies/vyzon-film/entregas/carrosseis/<slug>/.
// Uso: node scripts/carrossel.mjs <slug>
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const VF = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) { console.error("uso: node scripts/carrossel.mjs <slug>"); process.exit(1); }
const dir = join(VF, "carrosseis", slug);
const html = readFileSync(join(dir, "index.html"), "utf8");
const n = (html.match(/<section class="s /g) || []).length;
const at = Array.from({ length: n }, (_, i) => (i + 0.5).toFixed(1)).join(",");
execFileSync("hyperframes", ["snapshot", ".", "--at", at], { cwd: dir, stdio: "inherit" });
const base = join(dir, ".hyperframes/artifacts/snapshots");
const ultimo = readdirSync(base).map((d) => join(base, d)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const out = join(process.env.HOME, "Movies/vyzon-film/entregas/carrosseis", slug);
mkdirSync(out, { recursive: true });
for (let i = 0; i < n; i++) {
    const f = readdirSync(ultimo).find((x) => x.startsWith(`frame-${String(i).padStart(2, "0")}-`));
    copyFileSync(join(ultimo, f), join(out, `${slug}-${String(i + 1).padStart(2, "0")}.png`));
}
copyFileSync(join(ultimo, "contact-sheet.jpg"), join(out, `${slug}-folha.jpg`));
console.log(`${n} slides → ${out}`);
