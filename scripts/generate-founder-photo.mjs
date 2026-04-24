#!/usr/bin/env node
// Gera 4 variações de "founder photo" via HeyGen Photo Avatar Generate API
// Salva em public/avatar/founder/
// Uso: node scripts/generate-founder-photo.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
    const env = {};
    try {
        const raw = readFileSync(".env", "utf8");
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
            if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    } catch {}
    return { ...process.env, ...env };
}

const env = loadEnv();
const KEY = env.HEYGEN_API_KEY;
if (!KEY) {
    console.error("✗ HEYGEN_API_KEY ausente em .env");
    process.exit(1);
}

const OUT_DIR = resolve("public/avatar/founder");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const PROMPT =
    "Brazilian male founder in his early 30s, short dark curly hair, light beard, " +
    "wearing a plain white or light grey cotton t-shirt, confident serious expression, " +
    "direct eye contact with the camera, cinematic studio portrait, dark moody background " +
    "with subtle rim lighting, shoulders-up framing, hyper-realistic, 8k, professional photography, " +
    "soft key light from front, atmospheric depth, photographic, not illustrated";

async function generate() {
    const res = await fetch("https://api.heygen.com/v2/photo_avatar/photo/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Api-Key": KEY,
            accept: "application/json",
        },
        body: JSON.stringify({
            name: "Vyzon Founder Hero",
            age: "Young Adult",
            gender: "Man",
            ethnicity: "Hispanic",
            orientation: "horizontal",
            pose: "half_body",
            style: "Realistic",
            appearance: PROMPT,
        }),
    });
    const j = await res.json();
    console.log("[generate]", JSON.stringify(j, null, 2));
    if (j.error || !j.data?.generation_id) throw new Error(j.error?.message ?? "no generation_id");
    return j.data.generation_id;
}

async function poll(id, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
        const res = await fetch(`https://api.heygen.com/v2/photo_avatar/generation/${id}`, {
            headers: { "X-Api-Key": KEY, accept: "application/json" },
        });
        const j = await res.json();
        const status = j.data?.status ?? j.status;
        console.log(`[${i + 1}/${maxAttempts}] status=${status}`);
        if (status === "success") return j.data;
        if (status === "failed") throw new Error(JSON.stringify(j));
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error("timeout");
}

async function download(url, dest) {
    const r = await fetch(url);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`  → ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
}

(async () => {
    console.log("→ HeyGen: generating founder photos…");
    const id = await generate();
    console.log(`  generation_id=${id}`);
    const data = await poll(id);
    const urls = data.image_url_list ?? data.image_urls ?? data.urls ?? [];
    if (!urls.length) {
        console.error("✗ no image urls in response:", JSON.stringify(data, null, 2));
        process.exit(1);
    }
    for (let i = 0; i < urls.length; i++) {
        await download(urls[i], resolve(OUT_DIR, `founder-${String(i + 1).padStart(2, "0")}.png`));
    }
    writeFileSync(resolve(OUT_DIR, "_meta.json"), JSON.stringify({ id, prompt: PROMPT, urls }, null, 2));
    console.log(`\n✓ ${urls.length} photos saved in ${OUT_DIR}`);
})();
