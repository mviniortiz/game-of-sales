import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";

const DIR = "src/assets/integrations";
const MAX_SIZE = 128;
const QUALITY = 82;

const files = await readdir(DIR);
let totalBefore = 0;
let totalAfter = 0;

for (const f of files) {
    const ext = parse(f).ext.toLowerCase();
    if (ext !== ".png") continue;
    const input = join(DIR, f);
    const output = join(DIR, parse(f).name + ".webp");

    const before = (await stat(input)).size;
    await sharp(input)
        .resize(MAX_SIZE, MAX_SIZE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(output);
    const after = (await stat(output)).size;

    totalBefore += before;
    totalAfter += after;
    const pct = ((1 - after / before) * 100).toFixed(0);
    console.log(`${f.padEnd(40)} ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB  (-${pct}%)`);
}

console.log(
    `\nTotal: ${(totalBefore / 1024).toFixed(1)}KB → ${(totalAfter / 1024).toFixed(1)}KB  (saved ${((totalBefore - totalAfter) / 1024).toFixed(1)}KB)`,
);
