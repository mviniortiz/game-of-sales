// Continua polling um video_id HeyGen existente até completar e baixa.
// Usage: node scripts/poll-avatar-host.mjs <video_id>

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function loadEnv() {
    try {
        const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    } catch {}
}
await loadEnv();

const API_KEY = process.env.HEYGEN_API_KEY;
const VIDEO_ID = process.argv[2] || "0d6a623cf14040e390d094afac2f880a";

const OUT = path.join(ROOT, "public", "avatar", "matilda-host.mp4");

console.log(`⏳ Polling ${VIDEO_ID} (timeout 30min)...`);
const start = Date.now();
let last = "";
while (Date.now() - start < 1800000) {
    const r = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${VIDEO_ID}`, {
        headers: { "X-API-KEY": API_KEY },
    });
    const j = await r.json();
    const status = j.data?.status;
    if (status !== last) {
        const elapsed = Math.round((Date.now() - start) / 1000);
        console.log(`  [+${elapsed}s] ${status}`);
        last = status;
    }
    if (status === "completed") {
        const url = j.data.video_url;
        console.log(`  Downloading ${url.slice(0, 60)}...`);
        const res = await fetch(url);
        await pipeline(Readable.fromWeb(res.body), createWriteStream(OUT));
        const stat = await fs.stat(OUT);
        console.log(`✓ ${path.relative(ROOT, OUT)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
        process.exit(0);
    }
    if (status === "failed") {
        console.error("FAIL:", JSON.stringify(j.data?.error || j.data));
        process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 8000));
}
console.error("Timeout após 30min");
process.exit(1);
